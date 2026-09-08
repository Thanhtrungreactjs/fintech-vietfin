// Term-deposit (savings) interest schedule, modeled after typical Vietnamese
// bank savings rates: longer lock-in terms earn a higher annual rate.
const TERM_RATES = [
  { months: 1, rate: 3.0 },
  { months: 3, rate: 3.7 },
  { months: 6, rate: 4.8 },
  { months: 12, rate: 5.6 },
  { months: 18, rate: 5.8 },
  { months: 24, rate: 6.2 },
  { months: 36, rate: 6.4 },
];

// Rate applied when a deposit is broken before maturity — mirrors real banks
// paying only the much lower non-term ("không kỳ hạn") rate in that case.
const EARLY_WITHDRAWAL_RATE = 0.5;

function getRateForTerm(termMonths) {
  const tier = TERM_RATES.find((t) => t.months === Number(termMonths));
  if (!tier) throw new Error("Kỳ hạn không hợp lệ");
  return tier.rate;
}

function calcMaturityInterest(principal, rate, termMonths) {
  return Math.round(principal * (rate / 100) * (termMonths / 12));
}

function calcEarlyWithdrawalInterest(principal, startDate, now) {
  const daysHeld = Math.max(0, Math.floor((now - new Date(startDate)) / 86400000));
  return Math.round(principal * (EARLY_WITHDRAWAL_RATE / 100) * (daysHeld / 365));
}

module.exports = {
  TERM_RATES,
  EARLY_WITHDRAWAL_RATE,
  getRateForTerm,
  calcMaturityInterest,
  calcEarlyWithdrawalInterest,
};
