const express = require("express");
const prisma = require("../lib/prisma");
const { recordLedgerEntry } = require("../lib/ledger");
const { getIO } = require("../lib/socket");

const router = express.Router();

// Codes are embedded in the VietQR transfer content as e.g. "NAPX7K9F2".
// Bank apps often strip accents/spaces from the memo, so we normalize
// (uppercase, strip non-alphanumerics) before matching.
function extractTopUpCode(content) {
  if (!content) return null;
  const normalized = content.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const match = normalized.match(/NAP[A-Z0-9]{6}/);
  return match ? match[0] : null;
}

// SePay webhook: fires on every incoming/outgoing transaction on the linked
// bank account. Docs: https://docs.sepay.vn/tich-hop-webhooks.html
router.post("/sepay", async (req, res) => {
  const apiKey = process.env.SEPAY_API_KEY;
  const auth = req.headers.authorization || "";
  if (!apiKey || auth !== `Apikey ${apiKey}`) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  const payload = req.body || {};
  if (payload.transferType && payload.transferType !== "in") {
    return res.json({ success: true });
  }

  // SePay retries webhooks (network errors, manual resend); the transaction
  // id makes each delivery idempotent regardless of how many times it fires.
  const idempotencyKey = `sepay-${payload.id}`;
  const existing = await prisma.transaction.findUnique({ where: { idempotencyKey } });
  if (existing) return res.json({ success: true, alreadyProcessed: true });

  const code = extractTopUpCode(payload.content);
  if (!code) return res.json({ success: true, matched: false });

  const intent = await prisma.topUpIntent.findFirst({ where: { code, status: "PENDING" } });
  if (!intent) return res.json({ success: true, matched: false });

  const amount = Number(payload.transferAmount);
  if (!amount || amount <= 0) return res.json({ success: true, matched: false });

  const result = await prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.findUnique({ where: { userId: intent.userId } });
    const balanceAfter = wallet.balance + amount;
    await tx.wallet.update({ where: { id: wallet.id }, data: { balance: balanceAfter } });

    const transaction = await tx.transaction.create({
      data: {
        walletId: wallet.id,
        type: "DEPOSIT",
        amount,
        balanceAfter,
        idempotencyKey,
        category: "Chuyển khoản ngân hàng",
        description: `Nạp tiền qua chuyển khoản${payload.gateway ? ` (${payload.gateway})` : ""}`,
      },
    });

    await recordLedgerEntry(tx, {
      userId: intent.userId,
      source: "WALLET",
      sourceRefId: transaction.id,
      type: "INCOME",
      amount,
      description: "Nạp tiền qua chuyển khoản ngân hàng thật (SePay)",
    });

    await tx.topUpIntent.update({
      where: { id: intent.id },
      data: { status: "COMPLETED", matchedTxId: String(payload.id), completedAt: new Date() },
    });

    return { transaction, balanceAfter };
  });

  const io = getIO();
  if (io) {
    io.to(`user:${intent.userId}`).emit("wallet:credited", {
      transaction: result.transaction,
      balance: result.balanceAfter,
    });
  }

  res.json({ success: true, matched: true });
});

module.exports = router;
