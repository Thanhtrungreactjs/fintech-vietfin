const express = require("express");
const prisma = require("../lib/prisma");
const { requireAuth } = require("../middleware/auth");
const { recordLedgerEntry } = require("../lib/ledger");

const router = express.Router();

function generateInvoiceNumber() {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `INV-${stamp}-${rand}`;
}

router.get("/invoices", requireAuth, async (req, res) => {
  const now = new Date();
  await prisma.invoice.updateMany({
    where: { userId: req.userId, status: "SENT", dueDate: { lt: now } },
    data: { status: "OVERDUE" },
  });
  const invoices = await prisma.invoice.findMany({
    where: { userId: req.userId },
    orderBy: { issueDate: "desc" },
  });
  res.json({ invoices });
});

router.post("/invoices", requireAuth, async (req, res) => {
  const { counterparty, amount, dueDate } = req.body;
  if (!counterparty || !amount || amount <= 0 || !dueDate) {
    return res.status(400).json({ error: "Thiếu thông tin hoá đơn" });
  }
  const invoice = await prisma.invoice.create({
    data: {
      userId: req.userId,
      number: generateInvoiceNumber(),
      counterparty,
      amount,
      dueDate: new Date(dueDate),
      status: "DRAFT",
    },
  });
  res.status(201).json({ invoice });
});

router.post("/invoices/:id/send", requireAuth, async (req, res) => {
  const invoice = await prisma.invoice.findFirst({ where: { id: req.params.id, userId: req.userId } });
  if (!invoice) return res.status(404).json({ error: "Không tìm thấy hoá đơn" });
  if (invoice.status !== "DRAFT") return res.status(400).json({ error: "Hoá đơn đã được gửi" });

  const updated = await prisma.invoice.update({ where: { id: invoice.id }, data: { status: "SENT" } });
  res.json({ invoice: updated });
});

router.post("/invoices/:id/pay", requireAuth, async (req, res) => {
  const invoice = await prisma.invoice.findFirst({ where: { id: req.params.id, userId: req.userId } });
  if (!invoice) return res.status(404).json({ error: "Không tìm thấy hoá đơn" });
  if (invoice.status === "PAID") return res.status(400).json({ error: "Hoá đơn đã được thanh toán" });

  const result = await prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.findUnique({ where: { userId: req.userId } });
    const balanceAfter = wallet.balance + invoice.amount;
    await tx.wallet.update({ where: { id: wallet.id }, data: { balance: balanceAfter } });

    await tx.transaction.create({
      data: {
        walletId: wallet.id,
        type: "DEPOSIT",
        amount: invoice.amount,
        balanceAfter,
        category: "Doanh thu hoá đơn",
        description: `Thanh toán hoá đơn ${invoice.number} từ ${invoice.counterparty}`,
      },
    });

    await recordLedgerEntry(tx, {
      userId: req.userId,
      source: "INVOICE",
      sourceRefId: invoice.id,
      type: "INCOME",
      amount: invoice.amount,
      description: `Thanh toán hoá đơn ${invoice.number}`,
    });

    return tx.invoice.update({ where: { id: invoice.id }, data: { status: "PAID", paidAt: new Date() } });
  });

  res.json({ invoice: result });
});

router.get("/ledger", requireAuth, async (req, res) => {
  const { source, type, from, to } = req.query;
  const where = { userId: req.userId };
  if (source) where.source = source;
  if (type) where.type = type;
  if (from || to) {
    where.occurredAt = {};
    if (from) where.occurredAt.gte = new Date(from);
    if (to) where.occurredAt.lte = new Date(to);
  }
  const entries = await prisma.ledgerEntry.findMany({ where, orderBy: { occurredAt: "desc" } });
  res.json({ entries });
});

// Projects liquidity over the next N days using known upcoming obligations
// (loan installments due) and receivables (unpaid invoices due).
router.get("/cashflow-forecast", requireAuth, async (req, res) => {
  const horizonDays = Number(req.query.days) || 90;
  const now = new Date();
  const horizon = new Date(now.getTime() + horizonDays * 86400000);

  const [upcomingInstallments, receivableInvoices, wallet] = await Promise.all([
    prisma.loanRepaymentSchedule.findMany({
      where: {
        loan: { userId: req.userId },
        status: { in: ["UPCOMING", "OVERDUE"] },
        dueDate: { lte: horizon },
      },
      orderBy: { dueDate: "asc" },
    }),
    prisma.invoice.findMany({
      where: { userId: req.userId, status: { in: ["SENT", "OVERDUE"] }, dueDate: { lte: horizon } },
      orderBy: { dueDate: "asc" },
    }),
    prisma.wallet.findUnique({ where: { userId: req.userId } }),
  ]);

  const events = [
    ...upcomingInstallments.map((i) => ({
      date: i.dueDate,
      type: "OUTFLOW",
      label: `Trả nợ kỳ ${i.periodNumber}`,
      amount: i.principalDue + i.interestDue + i.lateFee,
    })),
    ...receivableInvoices.map((inv) => ({
      date: inv.dueDate,
      type: "INFLOW",
      label: `Thu hoá đơn ${inv.number}`,
      amount: inv.amount,
    })),
  ].sort((a, b) => new Date(a.date) - new Date(b.date));

  let runningBalance = wallet?.balance || 0;
  const projection = events.map((e) => {
    runningBalance += e.type === "INFLOW" ? e.amount : -e.amount;
    return { ...e, projectedBalance: runningBalance };
  });

  const totalInflow = events.filter((e) => e.type === "INFLOW").reduce((s, e) => s + e.amount, 0);
  const totalOutflow = events.filter((e) => e.type === "OUTFLOW").reduce((s, e) => s + e.amount, 0);

  res.json({
    horizonDays,
    currentBalance: wallet?.balance || 0,
    totalInflow,
    totalOutflow,
    netChange: totalInflow - totalOutflow,
    projectedEndingBalance: runningBalance,
    events: projection,
  });
});

router.get("/reports", requireAuth, async (req, res) => {
  const month = req.query.month || new Date().toISOString().slice(0, 7);
  const start = new Date(`${month}-01T00:00:00`);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);

  const entries = await prisma.ledgerEntry.findMany({
    where: { userId: req.userId, occurredAt: { gte: start, lt: end } },
  });

  const totalIncome = entries.filter((e) => e.type === "INCOME").reduce((s, e) => s + e.amount, 0);
  const totalExpense = entries.filter((e) => e.type === "EXPENSE").reduce((s, e) => s + e.amount, 0);

  const bySource = {};
  for (const e of entries) {
    if (!bySource[e.source]) bySource[e.source] = { income: 0, expense: 0 };
    if (e.type === "INCOME") bySource[e.source].income += e.amount;
    else bySource[e.source].expense += e.amount;
  }

  res.json({
    month,
    totalIncome,
    totalExpense,
    netProfit: totalIncome - totalExpense,
    bySource,
    entryCount: entries.length,
  });
});

module.exports = router;
