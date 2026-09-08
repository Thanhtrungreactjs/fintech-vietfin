const prisma = require("./prisma");

/**
 * Automatic bookkeeping: every income/expense event from Wallet, Lending,
 * Insurance or Invoicing modules is mirrored here so the Corporate Finance
 * module can reconcile books and build reports without manual entry.
 */
async function recordLedgerEntry(tx, { userId, source, sourceRefId, type, amount, description }) {
  const client = tx || prisma;
  return client.ledgerEntry.create({
    data: { userId, source, sourceRefId, type, amount, description },
  });
}

module.exports = { recordLedgerEntry };
