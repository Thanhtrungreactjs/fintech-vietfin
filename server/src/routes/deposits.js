const express = require("express");
const prisma = require("../lib/prisma");
const { requireAuth } = require("../middleware/auth");
const { recordLedgerEntry } = require("../lib/ledger");
const {
  listBanks,
  getRateForBankTerm,
  calcMaturityInterest,
  calcEarlyWithdrawalInterest,
} = require("../lib/deposit-engine");

const router = express.Router();

function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

router.get("/banks", requireAuth, (req, res) => {
  res.json({ banks: listBanks() });
});

router.post("/", requireAuth, async (req, res) => {
  const { bankCode, amount, termMonths } = req.body;
  if (!bankCode || !amount || amount <= 0 || !termMonths) {
    return res.status(400).json({ error: "Thiếu thông tin gửi tiết kiệm" });
  }

  let rate, bankName;
  try {
    ({ rate, bankName } = getRateForBankTerm(bankCode, termMonths));
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  const startDate = new Date();
  const maturityDate = addMonths(startDate, Number(termMonths));

  try {
    const result = await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { userId: req.userId } });
      if (wallet.balance < amount) throw new Error("INSUFFICIENT_FUNDS");

      const balanceAfter = wallet.balance - amount;
      await tx.wallet.update({ where: { id: wallet.id }, data: { balance: balanceAfter } });

      const deposit = await tx.termDeposit.create({
        data: {
          userId: req.userId,
          bankCode,
          bankName,
          principal: amount,
          termMonths: Number(termMonths),
          interestRate: rate,
          startDate,
          maturityDate,
        },
      });

      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          type: "DEPOSIT_LOCK",
          amount,
          balanceAfter,
          category: "Tiết kiệm",
          description: `Mở sổ tiết kiệm ${bankName} kỳ hạn ${termMonths} tháng`,
        },
      });

      return deposit;
    });
    res.status(201).json({ deposit: result });
  } catch (err) {
    if (err.message === "INSUFFICIENT_FUNDS") {
      return res.status(400).json({ error: "Số dư ví không đủ để gửi tiết kiệm" });
    }
    throw err;
  }
});

router.get("/", requireAuth, async (req, res) => {
  const now = new Date();
  await prisma.termDeposit.updateMany({
    where: { userId: req.userId, status: "ACTIVE", maturityDate: { lte: now } },
    data: { status: "MATURED" },
  });

  const deposits = await prisma.termDeposit.findMany({
    where: { userId: req.userId },
    orderBy: { createdAt: "desc" },
  });
  res.json({ deposits });
});

function previewPayout(deposit) {
  const now = new Date();
  const isMatured = deposit.status === "MATURED" || now >= new Date(deposit.maturityDate);
  const interest = isMatured
    ? calcMaturityInterest(deposit.principal, deposit.interestRate, deposit.termMonths)
    : calcEarlyWithdrawalInterest(deposit.principal, deposit.startDate, now);
  return { isMatured, interest, totalPayout: deposit.principal + interest };
}

router.get("/:id/preview-withdraw", requireAuth, async (req, res) => {
  const deposit = await prisma.termDeposit.findFirst({ where: { id: req.params.id, userId: req.userId } });
  if (!deposit) return res.status(404).json({ error: "Không tìm thấy sổ tiết kiệm" });
  if (deposit.status !== "ACTIVE" && deposit.status !== "MATURED") {
    return res.status(400).json({ error: "Sổ tiết kiệm đã được tất toán" });
  }
  res.json(previewPayout(deposit));
});

router.post("/:id/withdraw", requireAuth, async (req, res) => {
  const deposit = await prisma.termDeposit.findFirst({ where: { id: req.params.id, userId: req.userId } });
  if (!deposit) return res.status(404).json({ error: "Không tìm thấy sổ tiết kiệm" });
  if (deposit.status !== "ACTIVE" && deposit.status !== "MATURED") {
    return res.status(400).json({ error: "Sổ tiết kiệm đã được tất toán" });
  }

  const { isMatured, interest, totalPayout } = previewPayout(deposit);
  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.findUnique({ where: { userId: req.userId } });
    const balanceAfter = wallet.balance + totalPayout;
    await tx.wallet.update({ where: { id: wallet.id }, data: { balance: balanceAfter } });

    await tx.transaction.create({
      data: {
        walletId: wallet.id,
        type: "DEPOSIT_SETTLEMENT",
        amount: totalPayout,
        balanceAfter,
        category: "Tiết kiệm",
        description: isMatured ? "Tất toán sổ tiết kiệm đến hạn" : "Tất toán sổ tiết kiệm trước hạn",
      },
    });

    if (interest > 0) {
      await recordLedgerEntry(tx, {
        userId: req.userId,
        source: "DEPOSIT",
        sourceRefId: deposit.id,
        type: "INCOME",
        amount: interest,
        description: "Lãi tiền gửi tiết kiệm",
      });
    }

    return tx.termDeposit.update({
      where: { id: deposit.id },
      data: {
        status: isMatured ? "WITHDRAWN" : "WITHDRAWN_EARLY",
        settledAt: now,
        interestPaid: interest,
      },
    });
  });

  res.json({ deposit: result, interest, totalPayout });
});

module.exports = router;
