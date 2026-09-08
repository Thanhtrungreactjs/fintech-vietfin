const prisma = require("./prisma");

const MIN_SCORE = 300;
const MAX_SCORE = 850;

/**
 * Rule-based credit scoring using alternative data already present in the
 * platform (wallet age, transaction behavior, loan repayment history)
 * instead of a traditional credit bureau file.
 */
async function computeCreditScore(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { kyc: true, wallet: true },
  });
  if (!user) throw new Error("User not found");

  let score = 500;
  const factors = [];

  if (user.kycStatus === "VERIFIED") {
    score += 100;
    factors.push({ label: "Đã xác minh danh tính (KYC)", impact: 100 });
  } else {
    score -= 150;
    factors.push({ label: "Chưa xác minh danh tính (KYC)", impact: -150 });
  }

  if (user.wallet) {
    const ageDays = (Date.now() - new Date(user.wallet.createdAt).getTime()) / 86400000;
    const ageBonus = Math.min(Math.round(ageDays / 3), 100);
    score += ageBonus;
    factors.push({ label: "Tuổi tài khoản ví", impact: ageBonus });

    if (user.wallet.balance > 0) {
      score += 20;
      factors.push({ label: "Số dư ví dương", impact: 20 });
    }

    const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000);
    const recentTx = await prisma.transaction.count({
      where: { walletId: user.wallet.id, createdAt: { gte: ninetyDaysAgo }, status: "COMPLETED" },
    });
    const activityBonus = Math.min(recentTx * 4, 80);
    score += activityBonus;
    factors.push({ label: "Mức độ hoạt động giao dịch (90 ngày)", impact: activityBonus });
  } else {
    score -= 50;
    factors.push({ label: "Chưa có ví điện tử", impact: -50 });
  }

  const pastLoans = await prisma.loanApplication.findMany({ where: { userId } });
  const defaulted = pastLoans.filter((l) => l.status === "DEFAULTED").length;
  const closedOnTime = pastLoans.filter((l) => l.status === "CLOSED").length;

  if (defaulted > 0) {
    const penalty = Math.min(defaulted * 200, 300);
    score -= penalty;
    factors.push({ label: `${defaulted} khoản vay từng vỡ nợ`, impact: -penalty });
  }
  if (closedOnTime > 0) {
    const bonus = Math.min(closedOnTime * 30, 90);
    score += bonus;
    factors.push({ label: `${closedOnTime} khoản vay đã tất toán đúng hạn`, impact: bonus });
  }

  const overdueCount = await prisma.loanRepaymentSchedule.count({
    where: { loan: { userId }, status: "OVERDUE" },
  });
  if (overdueCount > 0) {
    const penalty = Math.min(overdueCount * 30, 120);
    score -= penalty;
    factors.push({ label: `${overdueCount} kỳ trả nợ quá hạn`, impact: -penalty });
  }

  score = Math.max(MIN_SCORE, Math.min(MAX_SCORE, Math.round(score)));

  return { score, factors };
}

function decideLoanOffer(score, requestedAmount) {
  let tier;
  if (score >= 750) tier = { rate: 8, maxMultiplier: 8 };
  else if (score >= 650) tier = { rate: 12, maxMultiplier: 5 };
  else if (score >= 550) tier = { rate: 16, maxMultiplier: 3 };
  else if (score >= 450) tier = { rate: 22, maxMultiplier: 1.5 };
  else tier = null;

  if (!tier) {
    return { approved: false, interestRate: null, approvedAmount: 0, reason: "Điểm tín dụng quá thấp để được duyệt vay" };
  }

  const baseCap = 50_000_000 * tier.maxMultiplier;
  const approvedAmount = Math.min(requestedAmount, baseCap);
  const approved = approvedAmount >= requestedAmount * 0.3;

  return {
    approved,
    interestRate: tier.rate,
    approvedAmount: approved ? approvedAmount : 0,
    reason: approved ? "Đủ điều kiện phê duyệt" : `Hạn mức tối đa cho phép ở điểm số này là ${baseCap.toLocaleString("vi-VN")} VND`,
  };
}

module.exports = { computeCreditScore, decideLoanOffer };
