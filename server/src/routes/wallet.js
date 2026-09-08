const express = require("express");
const prisma = require("../lib/prisma");
const { requireAuth } = require("../middleware/auth");
const { recordLedgerEntry } = require("../lib/ledger");

const router = express.Router();

async function getWalletOrThrow(userId) {
  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet) throw new Error("Wallet not found");
  return wallet;
}

router.get("/", requireAuth, async (req, res) => {
  const wallet = await getWalletOrThrow(req.userId);
  res.json({ wallet });
});

router.get("/transactions", requireAuth, async (req, res) => {
  const wallet = await getWalletOrThrow(req.userId);
  const { type, status, from, to } = req.query;

  const where = { walletId: wallet.id };
  if (type) where.type = type;
  if (status) where.status = status;
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(to);
  }

  const transactions = await prisma.transaction.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
  res.json({ transactions });
});

// Returns an already-processed transaction for a repeated idempotency key,
// so retries or dropped connections never double-charge the wallet.
async function findByIdempotencyKey(idempotencyKey) {
  if (!idempotencyKey) return null;
  return prisma.transaction.findUnique({ where: { idempotencyKey } });
}

router.post("/deposit", requireAuth, async (req, res) => {
  const { amount, idempotencyKey, description } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: "Số tiền không hợp lệ" });

  const existing = await findByIdempotencyKey(idempotencyKey);
  if (existing) return res.json({ transaction: existing, idempotent: true });

  const result = await prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.findUnique({ where: { userId: req.userId } });
    const balanceAfter = wallet.balance + amount;
    await tx.wallet.update({ where: { id: wallet.id }, data: { balance: balanceAfter } });
    const transaction = await tx.transaction.create({
      data: {
        walletId: wallet.id,
        type: "DEPOSIT",
        amount,
        balanceAfter,
        idempotencyKey: idempotencyKey || null,
        description: description || "Nạp tiền vào ví",
      },
    });
    await recordLedgerEntry(tx, {
      userId: req.userId,
      source: "WALLET",
      sourceRefId: transaction.id,
      type: "INCOME",
      amount,
      description: "Nạp tiền vào ví",
    });
    return transaction;
  });

  res.status(201).json({ transaction: result });
});

router.post("/withdraw", requireAuth, async (req, res) => {
  const { amount, idempotencyKey, description, category } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: "Số tiền không hợp lệ" });

  const existing = await findByIdempotencyKey(idempotencyKey);
  if (existing) return res.json({ transaction: existing, idempotent: true });

  try {
    const result = await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { userId: req.userId } });
      if (wallet.balance < amount) throw new Error("INSUFFICIENT_FUNDS");
      const balanceAfter = wallet.balance - amount;
      await tx.wallet.update({ where: { id: wallet.id }, data: { balance: balanceAfter } });
      const transaction = await tx.transaction.create({
        data: {
          walletId: wallet.id,
          type: "WITHDRAW",
          amount,
          balanceAfter,
          idempotencyKey: idempotencyKey || null,
          category: category || "Khác",
          description: description || "Rút tiền khỏi ví",
        },
      });
      await recordLedgerEntry(tx, {
        userId: req.userId,
        source: "WALLET",
        sourceRefId: transaction.id,
        type: "EXPENSE",
        amount,
        description: "Rút tiền khỏi ví",
      });
      return transaction;
    });
    res.status(201).json({ transaction: result });
  } catch (err) {
    if (err.message === "INSUFFICIENT_FUNDS") {
      return res.status(400).json({ error: "Số dư không đủ để thực hiện giao dịch" });
    }
    throw err;
  }
});

router.post("/transfer", requireAuth, async (req, res) => {
  const { toEmail, amount, idempotencyKey, description, category } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: "Số tiền không hợp lệ" });
  if (!toEmail) return res.status(400).json({ error: "Thiếu email người nhận" });

  const existing = await findByIdempotencyKey(idempotencyKey);
  if (existing) return res.json({ transaction: existing, idempotent: true });

  const recipient = await prisma.user.findUnique({ where: { email: toEmail }, include: { wallet: true } });
  if (!recipient || !recipient.wallet) return res.status(404).json({ error: "Không tìm thấy người nhận" });
  if (recipient.id === req.userId) return res.status(400).json({ error: "Không thể tự chuyển cho chính mình" });

  try {
    const result = await prisma.$transaction(async (tx) => {
      const senderWallet = await tx.wallet.findUnique({ where: { userId: req.userId } });
      if (senderWallet.balance < amount) throw new Error("INSUFFICIENT_FUNDS");

      const senderBalanceAfter = senderWallet.balance - amount;
      const recipientBalanceAfter = recipient.wallet.balance + amount;

      await tx.wallet.update({ where: { id: senderWallet.id }, data: { balance: senderBalanceAfter } });
      await tx.wallet.update({ where: { id: recipient.wallet.id }, data: { balance: recipientBalanceAfter } });

      const outTx = await tx.transaction.create({
        data: {
          walletId: senderWallet.id,
          type: "TRANSFER_OUT",
          amount,
          balanceAfter: senderBalanceAfter,
          idempotencyKey: idempotencyKey || null,
          counterpartyWalletId: recipient.wallet.id,
          category: category || "Khác",
          description: description || `Chuyển tiền đến ${toEmail}`,
        },
      });
      await tx.transaction.create({
        data: {
          walletId: recipient.wallet.id,
          type: "TRANSFER_IN",
          amount,
          balanceAfter: recipientBalanceAfter,
          counterpartyWalletId: senderWallet.id,
          description: description || `Nhận tiền chuyển khoản`,
        },
      });

      await recordLedgerEntry(tx, {
        userId: req.userId,
        source: "WALLET",
        sourceRefId: outTx.id,
        type: "EXPENSE",
        amount,
        description: `Chuyển khoản đến ${toEmail}`,
      });
      await recordLedgerEntry(tx, {
        userId: recipient.id,
        source: "WALLET",
        sourceRefId: outTx.id,
        type: "INCOME",
        amount,
        description: `Nhận chuyển khoản`,
      });

      return outTx;
    });
    res.status(201).json({ transaction: result });
  } catch (err) {
    if (err.message === "INSUFFICIENT_FUNDS") {
      return res.status(400).json({ error: "Số dư không đủ để thực hiện giao dịch" });
    }
    throw err;
  }
});

module.exports = router;
