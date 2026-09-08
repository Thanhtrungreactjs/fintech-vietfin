const express = require("express");
const prisma = require("../lib/prisma");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// Unified account overview: wallet + loans + policies + recent activity in
// one place, acting as the single access layer on top of the other modules.
router.get("/overview", requireAuth, async (req, res) => {
  const [wallet, loans, policies, recentTransactions] = await Promise.all([
    prisma.wallet.findUnique({ where: { userId: req.userId } }),
    prisma.loanApplication.findMany({ where: { userId: req.userId }, orderBy: { createdAt: "desc" } }),
    prisma.insurancePolicy.findMany({
      where: { userId: req.userId },
      include: { plan: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.transaction.findMany({
      where: { wallet: { userId: req.userId } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const activeLoansTotal = loans
    .filter((l) => l.status === "ACTIVE")
    .reduce((sum, l) => sum + l.amount, 0);
  const activePoliciesTotal = policies.filter((p) => p.status === "ACTIVE").length;

  res.json({
    wallet,
    summary: {
      walletBalance: wallet?.balance || 0,
      activeLoansCount: loans.filter((l) => l.status === "ACTIVE").length,
      activeLoansTotal,
      activePoliciesCount: activePoliciesTotal,
      pendingLoanApplications: loans.filter((l) => l.status === "PENDING").length,
    },
    loans,
    policies,
    recentTransactions,
  });
});

router.get("/budgets", requireAuth, async (req, res) => {
  const month = req.query.month || new Date().toISOString().slice(0, 7);
  const budgets = await prisma.budget.findMany({ where: { userId: req.userId, month } });

  const wallet = await prisma.wallet.findUnique({ where: { userId: req.userId } });
  const start = new Date(`${month}-01T00:00:00`);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);

  const spendTx = wallet
    ? await prisma.transaction.findMany({
        where: {
          walletId: wallet.id,
          type: { in: ["WITHDRAW", "TRANSFER_OUT"] },
          createdAt: { gte: start, lt: end },
        },
      })
    : [];

  const spentByCategory = spendTx.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + t.amount;
    return acc;
  }, {});

  const result = budgets.map((b) => {
    const spent = spentByCategory[b.category] || 0;
    return {
      ...b,
      spent,
      remaining: b.limitAmount - spent,
      overLimit: spent > b.limitAmount,
    };
  });

  res.json({ month, budgets: result, spentByCategory });
});

router.post("/budgets", requireAuth, async (req, res) => {
  const { category, limitAmount, month } = req.body;
  if (!category || !limitAmount || limitAmount <= 0) {
    return res.status(400).json({ error: "Thiếu thông tin ngân sách" });
  }
  const targetMonth = month || new Date().toISOString().slice(0, 7);

  const existing = await prisma.budget.findFirst({
    where: { userId: req.userId, category, month: targetMonth },
  });
  const budget = existing
    ? await prisma.budget.update({ where: { id: existing.id }, data: { limitAmount } })
    : await prisma.budget.create({ data: { userId: req.userId, category, limitAmount, month: targetMonth } });

  res.status(201).json({ budget });
});

router.delete("/budgets/:id", requireAuth, async (req, res) => {
  const budget = await prisma.budget.findFirst({ where: { id: req.params.id, userId: req.userId } });
  if (!budget) return res.status(404).json({ error: "Không tìm thấy ngân sách" });
  await prisma.budget.delete({ where: { id: budget.id } });
  res.json({ ok: true });
});

module.exports = router;
