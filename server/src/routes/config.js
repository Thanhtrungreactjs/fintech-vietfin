const express = require("express");
const prisma = require("../lib/prisma");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();

const BANK_KEYS = { bin: "bank_bin", name: "bank_name", accountNumber: "bank_account_number" };

// Bank/e-wallet account that receives real deposits/withdrawals via VietQR.
// Stored in the AppSetting table so an admin can change it from a settings
// screen; falls back to server/.env (BANK_BIN/BANK_NAME/BANK_ACCOUNT_NUMBER)
// for values that were never set in the database.
async function readBankAccount() {
  const rows = await prisma.appSetting.findMany({ where: { key: { in: Object.values(BANK_KEYS) } } });
  const byKey = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    bin: byKey[BANK_KEYS.bin] ?? process.env.BANK_BIN ?? "",
    name: byKey[BANK_KEYS.name] ?? process.env.BANK_NAME ?? "",
    accountNumber: byKey[BANK_KEYS.accountNumber] ?? process.env.BANK_ACCOUNT_NUMBER ?? "",
  };
}

router.get("/bank-account", requireAuth, async (req, res) => {
  res.json(await readBankAccount());
});

router.put("/bank-account", requireAuth, requireAdmin, async (req, res) => {
  const { bin, name, accountNumber } = req.body;
  if (!bin || !name || !accountNumber) {
    return res.status(400).json({ error: "Thiếu thông tin tài khoản nhận tiền" });
  }

  await Promise.all([
    prisma.appSetting.upsert({ where: { key: BANK_KEYS.bin }, update: { value: bin }, create: { key: BANK_KEYS.bin, value: bin } }),
    prisma.appSetting.upsert({ where: { key: BANK_KEYS.name }, update: { value: name }, create: { key: BANK_KEYS.name, value: name } }),
    prisma.appSetting.upsert({
      where: { key: BANK_KEYS.accountNumber },
      update: { value: accountNumber },
      create: { key: BANK_KEYS.accountNumber, value: accountNumber },
    }),
  ]);

  res.json(await readBankAccount());
});

module.exports = router;
