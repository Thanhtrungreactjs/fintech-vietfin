const express = require("express");
const prisma = require("../lib/prisma");
const { requireAuth } = require("../middleware/auth");
const { recordLedgerEntry } = require("../lib/ledger");
const { getPrice, normalizeSymbol } = require("../lib/market-data");

const router = express.Router();

router.get("/price/:symbol", requireAuth, async (req, res) => {
  try {
    const quote = await getPrice(req.params.symbol);
    res.json(quote);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/positions", requireAuth, async (req, res) => {
  const positions = await prisma.tradingPosition.findMany({
    where: { userId: req.userId },
    orderBy: { createdAt: "desc" },
  });

  const enriched = await Promise.all(
    positions.map(async (p) => {
      try {
        const { price } = await getPrice(p.symbol);
        const unrealizedPnl = p.quantity * (price - p.avgEntryPrice);
        return { ...p, currentPrice: price, unrealizedPnl };
      } catch {
        return { ...p, currentPrice: null, unrealizedPnl: null };
      }
    })
  );

  res.json({ positions: enriched });
});

router.get("/orders", requireAuth, async (req, res) => {
  const orders = await prisma.tradingOrder.findMany({
    where: { userId: req.userId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  res.json({ orders });
});

router.post("/orders", requireAuth, async (req, res) => {
  const { symbol: rawSymbol, side, quantity } = req.body;
  const symbol = normalizeSymbol(rawSymbol);
  if (!symbol || !["BUY", "SELL"].includes(side) || !quantity || quantity <= 0) {
    return res.status(400).json({ error: "Thiếu hoặc sai thông tin lệnh giao dịch" });
  }

  let price;
  try {
    ({ price } = await getPrice(symbol));
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  const amount = quantity * price;

  try {
    if (side === "BUY") {
      const result = await prisma.$transaction(async (tx) => {
        const wallet = await tx.wallet.findUnique({ where: { userId: req.userId } });
        if (wallet.balance < amount) throw new Error("INSUFFICIENT_FUNDS");

        const balanceAfter = wallet.balance - amount;
        await tx.wallet.update({ where: { id: wallet.id }, data: { balance: balanceAfter } });

        const existing = await tx.tradingPosition.findUnique({
          where: { userId_symbol: { userId: req.userId, symbol } },
        });
        if (existing) {
          const newQuantity = existing.quantity + quantity;
          const newAvgEntry = (existing.quantity * existing.avgEntryPrice + amount) / newQuantity;
          await tx.tradingPosition.update({
            where: { id: existing.id },
            data: { quantity: newQuantity, avgEntryPrice: newAvgEntry },
          });
        } else {
          await tx.tradingPosition.create({
            data: { userId: req.userId, symbol, quantity, avgEntryPrice: price },
          });
        }

        await tx.transaction.create({
          data: {
            walletId: wallet.id,
            type: "TRADE_BUY",
            amount,
            balanceAfter,
            category: "Đầu tư",
            description: `Mua ${quantity} ${symbol} @ ${price}`,
          },
        });

        return tx.tradingOrder.create({
          data: { userId: req.userId, symbol, side: "BUY", quantity, price, amount },
        });
      });
      return res.status(201).json({ order: result, price });
    }

    // SELL
    const result = await prisma.$transaction(async (tx) => {
      const position = await tx.tradingPosition.findUnique({
        where: { userId_symbol: { userId: req.userId, symbol } },
      });
      if (!position || position.quantity < quantity) throw new Error("INSUFFICIENT_POSITION");

      const wallet = await tx.wallet.findUnique({ where: { userId: req.userId } });
      const balanceAfter = wallet.balance + amount;
      await tx.wallet.update({ where: { id: wallet.id }, data: { balance: balanceAfter } });

      const realizedPnl = quantity * (price - position.avgEntryPrice);
      const remainingQuantity = position.quantity - quantity;
      if (remainingQuantity <= 1e-9) {
        await tx.tradingPosition.delete({ where: { id: position.id } });
      } else {
        await tx.tradingPosition.update({ where: { id: position.id }, data: { quantity: remainingQuantity } });
      }

      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          type: "TRADE_SELL",
          amount,
          balanceAfter,
          category: "Đầu tư",
          description: `Bán ${quantity} ${symbol} @ ${price}`,
        },
      });

      if (Math.abs(realizedPnl) > 0.01) {
        await recordLedgerEntry(tx, {
          userId: req.userId,
          source: "TRADING",
          sourceRefId: symbol,
          type: realizedPnl > 0 ? "INCOME" : "EXPENSE",
          amount: Math.abs(realizedPnl),
          description: `${realizedPnl > 0 ? "Lãi" : "Lỗ"} giao dịch mô phỏng ${symbol}`,
        });
      }

      return tx.tradingOrder.create({
        data: { userId: req.userId, symbol, side: "SELL", quantity, price, amount, realizedPnl },
      });
    });
    res.status(201).json({ order: result, price });
  } catch (err) {
    if (err.message === "INSUFFICIENT_FUNDS") {
      return res.status(400).json({ error: "Số dư ví không đủ để đặt lệnh mua" });
    }
    if (err.message === "INSUFFICIENT_POSITION") {
      return res.status(400).json({ error: "Bạn không sở hữu đủ số lượng để bán" });
    }
    throw err;
  }
});

module.exports = router;
