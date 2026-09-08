const { computeCreditScore } = require("./credit-engine");

/**
 * Insurance premium calculation reuses the same behavioral scoring engine
 * as P2P lending (transaction history, account age, repayment behavior)
 * as a proxy for risk, then applies a multiplier on top of the plan's
 * base rate against the sum insured.
 */
async function computePremium(userId, plan, sumInsured) {
  const { score, factors } = await computeCreditScore(userId);

  let riskMultiplier;
  if (score >= 750) riskMultiplier = 0.8;
  else if (score >= 650) riskMultiplier = 1.0;
  else if (score >= 550) riskMultiplier = 1.2;
  else if (score >= 450) riskMultiplier = 1.5;
  else riskMultiplier = 2.0;

  const premium = Math.round(sumInsured * (plan.baseRate / 100) * riskMultiplier);

  return { premium, riskScore: score, riskMultiplier, factors };
}

module.exports = { computePremium };
