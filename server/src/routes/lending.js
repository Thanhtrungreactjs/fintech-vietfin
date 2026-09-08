const express = require("express");
const prisma = require("../lib/prisma");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const { computeCreditScore, decideLoanOffer } = require("../lib/credit-engine");
const { recordLedgerEntry } = require("../lib/ledger");

const router = express.Router();
const LATE_FEE_RATE = 0.02; // 2% of the installment amount once it becomes overdue

function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function buildAmortizationSchedule(approvedAmount, annualRate, termMonths, startDate) {
  const monthlyRate = annualRate / 12 / 100;
  const flatPrincipal = approvedAmount / termMonths;
  const schedule = [];
  let remaining = approvedAmount;

  for (let period = 1; period <= termMonths; period++) {
    const interestDue = Math.round(remaining * monthlyRate);
    const principalDue = Math.round(flatPrincipal);
    schedule.push({
      periodNumber: period,
      dueDate: addMonths(startDate, period),
      principalDue,
      interestDue,
    });
    remaining -= flatPrincipal;
  }
  return schedule;
}

// Lazily flips any past-due UPCOMING installments to OVERDUE and applies the
// late fee, so status is always accurate whenever a loan is read.
async function syncOverdueInstallments(loanId) {
  const now = new Date();
  const overdue = await prisma.loanRepaymentSchedule.findMany({
    where: { loanId, status: "UPCOMING", dueDate: { lt: now } },
  });
  for (const item of overdue) {
    const lateFee = Math.round((item.principalDue + item.interestDue) * LATE_FEE_RATE);
    await prisma.loanRepaymentSchedule.update({
      where: { id: item.id },
      data: { status: "OVERDUE", lateFee },
    });
  }
}

router.post("/apply", requireAuth, async (req, res) => {
  const { amount, purpose, termMonths } = req.body;
  if (!amount || amount <= 0 || !purpose || !termMonths || termMonths <= 0) {
    return res.status(400).json({ error: "Thiếu hoặc sai thông tin khoản vay" });
  }

  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (user.kycStatus !== "VERIFIED") {
    return res.status(403).json({ error: "Cần xác minh danh tính (KYC) trước khi đăng ký khoản vay" });
  }

  const { score, factors } = await computeCreditScore(req.userId);
  const offer = decideLoanOffer(score, amount);

  // The scoring engine only produces a *suggestion* for the admin — every
  // application lands in PENDING and stays there for a real human review;
  // nothing here can self-approve or self-reject a loan.
  const loan = await prisma.loanApplication.create({
    data: {
      userId: req.userId,
      amount,
      purpose,
      termMonths,
      status: "PENDING",
      creditScore: score,
      interestRate: offer.interestRate,
      decisionNote: `Gợi ý từ hệ thống chấm điểm: ${offer.reason}`,
    },
  });

  res.status(201).json({ loan, creditScore: score, factors, offer });
});

// ---- Admin review ---------------------------------------------------------

router.get("/admin/applications", requireAuth, requireAdmin, async (req, res) => {
  const status = req.query.status || "PENDING";
  const loans = await prisma.loanApplication.findMany({
    where: status === "ALL" ? {} : { status },
    include: { user: { select: { id: true, fullName: true, email: true, kycStatus: true } } },
    orderBy: { createdAt: "asc" },
  });
  res.json({ loans });
});

router.post("/admin/applications/:id/approve", requireAuth, requireAdmin, async (req, res) => {
  const loan = await prisma.loanApplication.findUnique({ where: { id: req.params.id } });
  if (!loan) return res.status(404).json({ error: "Không tìm thấy khoản vay" });
  if (loan.status !== "PENDING") return res.status(400).json({ error: "Khoản vay đã được xử lý trước đó" });

  const interestRate = req.body.interestRate != null ? Number(req.body.interestRate) : loan.interestRate;
  if (!interestRate || interestRate <= 0) {
    return res.status(400).json({ error: "Cần chỉ định lãi suất để phê duyệt" });
  }

  const updated = await prisma.loanApplication.update({
    where: { id: loan.id },
    data: {
      status: "APPROVED",
      interestRate,
      decisionNote: req.body.note || "Được admin phê duyệt",
      decisionAt: new Date(),
      reviewedByAdminId: req.userId,
    },
  });
  res.json({ loan: updated });
});

router.post("/admin/applications/:id/reject", requireAuth, requireAdmin, async (req, res) => {
  const loan = await prisma.loanApplication.findUnique({ where: { id: req.params.id } });
  if (!loan) return res.status(404).json({ error: "Không tìm thấy khoản vay" });
  if (loan.status !== "PENDING") return res.status(400).json({ error: "Khoản vay đã được xử lý trước đó" });

  const updated = await prisma.loanApplication.update({
    where: { id: loan.id },
    data: {
      status: "REJECTED",
      decisionNote: req.body.reason || "Bị admin từ chối",
      decisionAt: new Date(),
      reviewedByAdminId: req.userId,
    },
  });
  res.json({ loan: updated });
});

router.get("/applications", requireAuth, async (req, res) => {
  const loans = await prisma.loanApplication.findMany({
    where: { userId: req.userId },
    orderBy: { createdAt: "desc" },
  });
  res.json({ loans });
});

router.get("/applications/:id", requireAuth, async (req, res) => {
  const loan = await prisma.loanApplication.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!loan) return res.status(404).json({ error: "Không tìm thấy khoản vay" });

  await syncOverdueInstallments(loan.id);
  const schedule = await prisma.loanRepaymentSchedule.findMany({
    where: { loanId: loan.id },
    orderBy: { periodNumber: "asc" },
  });
  res.json({ loan, schedule });
});

router.post("/applications/:id/disburse", requireAuth, async (req, res) => {
  const loan = await prisma.loanApplication.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!loan) return res.status(404).json({ error: "Không tìm thấy khoản vay" });
  if (loan.status !== "APPROVED") {
    return res.status(400).json({ error: "Khoản vay chưa được phê duyệt hoặc đã giải ngân" });
  }

  const disbursedAt = new Date();
  const scheduleRows = buildAmortizationSchedule(loan.amount, loan.interestRate, loan.termMonths, disbursedAt);

  const result = await prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.findUnique({ where: { userId: req.userId } });
    const balanceAfter = wallet.balance + loan.amount;
    await tx.wallet.update({ where: { id: wallet.id }, data: { balance: balanceAfter } });

    const disburseTx = await tx.transaction.create({
      data: {
        walletId: wallet.id,
        type: "LOAN_DISBURSEMENT",
        amount: loan.amount,
        balanceAfter,
        description: `Giải ngân khoản vay #${loan.id.slice(0, 8)}`,
      },
    });

    await recordLedgerEntry(tx, {
      userId: req.userId,
      source: "LOAN",
      sourceRefId: loan.id,
      type: "INCOME",
      amount: loan.amount,
      description: "Giải ngân khoản vay P2P",
    });

    await tx.loanApplication.update({
      where: { id: loan.id },
      data: { status: "ACTIVE", disbursedAt },
    });

    await tx.loanRepaymentSchedule.createMany({
      data: scheduleRows.map((row) => ({ loanId: loan.id, ...row })),
    });

    return disburseTx;
  });

  res.json({ transaction: result });
});

router.post("/applications/:id/repay", requireAuth, async (req, res) => {
  const loan = await prisma.loanApplication.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!loan) return res.status(404).json({ error: "Không tìm thấy khoản vay" });

  await syncOverdueInstallments(loan.id);

  const nextInstallment = await prisma.loanRepaymentSchedule.findFirst({
    where: { loanId: loan.id, status: { in: ["UPCOMING", "OVERDUE"] } },
    orderBy: { periodNumber: "asc" },
  });
  if (!nextInstallment) return res.status(400).json({ error: "Không còn kỳ trả nợ nào" });

  const totalDue = nextInstallment.principalDue + nextInstallment.interestDue + nextInstallment.lateFee;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { userId: req.userId } });
      if (wallet.balance < totalDue) throw new Error("INSUFFICIENT_FUNDS");

      const balanceAfter = wallet.balance - totalDue;
      await tx.wallet.update({ where: { id: wallet.id }, data: { balance: balanceAfter } });

      const repayTx = await tx.transaction.create({
        data: {
          walletId: wallet.id,
          type: "LOAN_REPAYMENT",
          amount: totalDue,
          balanceAfter,
          description: `Trả nợ kỳ ${nextInstallment.periodNumber} - khoản vay #${loan.id.slice(0, 8)}`,
        },
      });

      await recordLedgerEntry(tx, {
        userId: req.userId,
        source: "LOAN",
        sourceRefId: loan.id,
        type: "EXPENSE",
        amount: totalDue,
        description: `Trả nợ kỳ ${nextInstallment.periodNumber}`,
      });

      await tx.loanRepaymentSchedule.update({
        where: { id: nextInstallment.id },
        data: { status: "PAID", paidAt: new Date() },
      });

      const remaining = await tx.loanRepaymentSchedule.count({
        where: { loanId: loan.id, status: { in: ["UPCOMING", "OVERDUE"] } },
      });
      if (remaining === 0) {
        await tx.loanApplication.update({ where: { id: loan.id }, data: { status: "CLOSED" } });
      }

      return repayTx;
    });
    res.json({ transaction: result, installmentPaid: nextInstallment.periodNumber });
  } catch (err) {
    if (err.message === "INSUFFICIENT_FUNDS") {
      return res.status(400).json({ error: "Số dư ví không đủ để trả nợ kỳ này" });
    }
    throw err;
  }
});

module.exports = router;
