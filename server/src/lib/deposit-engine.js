// Real Vietnamese bank savings interest rates (%/year, counter/quầy rates),
// sourced from public rate-comparison aggregators as of September 2026.
// Only bank+term combinations that are actually published are included —
// nothing here is invented. Rates change over time in reality; this table
// is a snapshot for demo purposes, not a live feed.
const BANKS = {
  VCB: { name: "Vietcombank", rates: { 1: 2.1, 3: 2.4, 6: 3.5, 12: 5.9, 24: 6.0, 36: 5.3 } },
  ICB: { name: "VietinBank", rates: { 1: 2.1, 3: 2.4, 6: 3.5, 12: 5.9, 24: 5.9, 36: 6.0 } },
  BIDV: { name: "BIDV", rates: { 1: 2.1, 3: 2.4, 6: 3.5, 12: 5.9, 24: 5.9, 36: 6.0 } },
  VBA: { name: "Agribank", rates: { 1: 2.6, 3: 2.9, 6: 4.0, 12: 5.9, 24: 5.9, 36: 6.0 } },
  MB: { name: "MBBank", rates: { 1: 3.7, 3: 4.1, 6: 4.6, 12: 6.2, 24: 7.0, 36: 7.0 } },
  TCB: { name: "Techcombank", rates: { 1: 4.05, 3: 4.35, 6: 6.05, 12: 6.25, 24: 5.35, 36: 5.35 } },
  ACB: { name: "ACB", rates: { 1: 4.0, 3: 4.4, 6: 4.5, 12: 5.3, 24: 5.4, 36: 5.4 } },
  VPB: { name: "VPBank", rates: { 1: 4.75, 3: 4.75, 6: 6.2, 12: 6.2, 24: 6.0 } },
  TPB: { name: "TPBank", rates: { 1: 4.2, 3: 4.2, 6: 5.5, 36: 6.0 } },
  STB: { name: "Sacombank", rates: { 1: 4.5, 3: 4.5, 6: 6.2, 12: 5.9, 24: 6.7, 36: 6.7 } },
  HDB: { name: "HDBank", rates: { 1: 3.5, 3: 3.6, 6: 4.9, 12: 5.2, 24: 4.9, 36: 4.9 } },
  VIB: { name: "VIB", rates: { 1: 4.25, 3: 4.35, 6: 5.5, 12: 6.5, 24: 5.7, 36: 5.8 } },
  SHB: { name: "SHB", rates: { 1: 4.4, 3: 4.5, 6: 5.8, 12: 6.2, 24: 6.4, 36: 6.5 } },
};

// Rate applied when a deposit is broken before maturity — mirrors real banks
// paying only the much lower non-term ("không kỳ hạn") rate in that case.
const EARLY_WITHDRAWAL_RATE = 0.5;

function listBanks() {
  return Object.entries(BANKS).map(([code, b]) => ({ code, name: b.name, rates: b.rates }));
}

function getRateForBankTerm(bankCode, termMonths) {
  const bank = BANKS[bankCode];
  if (!bank) throw new Error("Ngân hàng không hợp lệ");
  const rate = bank.rates[Number(termMonths)];
  if (!rate) throw new Error("Ngân hàng này chưa niêm yết lãi suất cho kỳ hạn đã chọn");
  return { rate, bankName: bank.name };
}

function calcMaturityInterest(principal, rate, termMonths) {
  return Math.round(principal * (rate / 100) * (termMonths / 12));
}

function calcEarlyWithdrawalInterest(principal, startDate, now) {
  const daysHeld = Math.max(0, Math.floor((now - new Date(startDate)) / 86400000));
  return Math.round(principal * (EARLY_WITHDRAWAL_RATE / 100) * (daysHeld / 365));
}

module.exports = {
  BANKS,
  EARLY_WITHDRAWAL_RATE,
  listBanks,
  getRateForBankTerm,
  calcMaturityInterest,
  calcEarlyWithdrawalInterest,
};
