const express = require("express");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// Bank/e-wallet account that receives real deposits/withdrawals via VietQR.
// Configured through env vars (server/.env) instead of being hardcoded in
// client code, so the receiving account can change without a code deploy.
router.get("/bank-account", requireAuth, (req, res) => {
  res.json({
    bin: process.env.BANK_BIN || "",
    name: process.env.BANK_NAME || "",
    accountNumber: process.env.BANK_ACCOUNT_NUMBER || "",
  });
});

module.exports = router;
