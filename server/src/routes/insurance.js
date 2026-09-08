const express = require("express");
const prisma = require("../lib/prisma");
const { requireAuth } = require("../middleware/auth");
const { computePremium } = require("../lib/premium-engine");
const { recordLedgerEntry } = require("../lib/ledger");

const router = express.Router();

router.get("/plans", requireAuth, async (req, res) => {
  const plans = await prisma.insurancePlan.findMany({ orderBy: { category: "asc" } });
  res.json({ plans });
});

router.post("/quote", requireAuth, async (req, res) => {
  const { planId, sumInsured } = req.body;
  if (!planId || !sumInsured || sumInsured <= 0) {
    return res.status(400).json({ error: "Thiếu thông tin để báo phí" });
  }
  const plan = await prisma.insurancePlan.findUnique({ where: { id: planId } });
  if (!plan) return res.status(404).json({ error: "Không tìm thấy gói bảo hiểm" });

  const quote = await computePremium(req.userId, plan, sumInsured);
  res.json({ plan, ...quote });
});

router.post("/policies", requireAuth, async (req, res) => {
  const { planId, sumInsured, subjectInfo, termMonths } = req.body;
  if (!planId || !sumInsured || sumInsured <= 0 || !subjectInfo) {
    return res.status(400).json({ error: "Thiếu thông tin đăng ký hợp đồng" });
  }
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (user.kycStatus !== "VERIFIED") {
    return res.status(403).json({ error: "Cần xác minh danh tính (KYC) trước khi mua bảo hiểm" });
  }

  const plan = await prisma.insurancePlan.findUnique({ where: { id: planId } });
  if (!plan) return res.status(404).json({ error: "Không tìm thấy gói bảo hiểm" });

  const { premium, riskScore } = await computePremium(req.userId, plan, sumInsured);
  const months = termMonths && termMonths > 0 ? termMonths : 12;
  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + months);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { userId: req.userId } });
      if (wallet.balance < premium) throw new Error("INSUFFICIENT_FUNDS");

      const balanceAfter = wallet.balance - premium;
      await tx.wallet.update({ where: { id: wallet.id }, data: { balance: balanceAfter } });

      const policy = await tx.insurancePolicy.create({
        data: {
          userId: req.userId,
          planId,
          subjectInfo: JSON.stringify(subjectInfo),
          sumInsured,
          premium,
          riskScore,
          startDate,
          endDate,
        },
      });

      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          type: "INSURANCE_PREMIUM",
          amount: premium,
          balanceAfter,
          description: `Phí bảo hiểm - ${plan.name}`,
        },
      });

      await recordLedgerEntry(tx, {
        userId: req.userId,
        source: "INSURANCE",
        sourceRefId: policy.id,
        type: "EXPENSE",
        amount: premium,
        description: `Phí bảo hiểm - ${plan.name}`,
      });

      return policy;
    });
    res.status(201).json({ policy: result });
  } catch (err) {
    if (err.message === "INSUFFICIENT_FUNDS") {
      return res.status(400).json({ error: "Số dư ví không đủ để thanh toán phí bảo hiểm" });
    }
    throw err;
  }
});

router.get("/policies", requireAuth, async (req, res) => {
  const now = new Date();
  await prisma.insurancePolicy.updateMany({
    where: { userId: req.userId, status: "ACTIVE", endDate: { lt: now } },
    data: { status: "EXPIRED" },
  });

  const policies = await prisma.insurancePolicy.findMany({
    where: { userId: req.userId },
    include: { plan: true },
    orderBy: { createdAt: "desc" },
  });
  res.json({ policies });
});

router.get("/policies/:id", requireAuth, async (req, res) => {
  const policy = await prisma.insurancePolicy.findFirst({
    where: { id: req.params.id, userId: req.userId },
    include: { plan: true, claims: { orderBy: { submittedAt: "desc" } } },
  });
  if (!policy) return res.status(404).json({ error: "Không tìm thấy hợp đồng" });
  res.json({ policy });
});

router.post("/policies/:id/cancel", requireAuth, async (req, res) => {
  const policy = await prisma.insurancePolicy.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!policy) return res.status(404).json({ error: "Không tìm thấy hợp đồng" });
  if (policy.status !== "ACTIVE") return res.status(400).json({ error: "Hợp đồng không ở trạng thái hiệu lực" });

  const updated = await prisma.insurancePolicy.update({
    where: { id: policy.id },
    data: { status: "CANCELLED" },
  });
  res.json({ policy: updated });
});

router.post("/policies/:id/renew", requireAuth, async (req, res) => {
  const policy = await prisma.insurancePolicy.findFirst({
    where: { id: req.params.id, userId: req.userId },
    include: { plan: true },
  });
  if (!policy) return res.status(404).json({ error: "Không tìm thấy hợp đồng" });
  if (policy.status !== "ACTIVE" && policy.status !== "EXPIRED") {
    return res.status(400).json({ error: "Hợp đồng đã huỷ, không thể gia hạn" });
  }

  const { premium, riskScore } = await computePremium(req.userId, policy.plan, policy.sumInsured);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { userId: req.userId } });
      if (wallet.balance < premium) throw new Error("INSUFFICIENT_FUNDS");
      const balanceAfter = wallet.balance - premium;
      await tx.wallet.update({ where: { id: wallet.id }, data: { balance: balanceAfter } });

      const newEndDate = new Date(policy.endDate);
      newEndDate.setFullYear(newEndDate.getFullYear() + 1);

      const updated = await tx.insurancePolicy.update({
        where: { id: policy.id },
        data: { status: "ACTIVE", endDate: newEndDate, premium, riskScore },
      });

      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          type: "INSURANCE_PREMIUM",
          amount: premium,
          balanceAfter,
          description: `Gia hạn hợp đồng - ${policy.plan.name}`,
        },
      });

      await recordLedgerEntry(tx, {
        userId: req.userId,
        source: "INSURANCE",
        sourceRefId: policy.id,
        type: "EXPENSE",
        amount: premium,
        description: `Gia hạn hợp đồng - ${policy.plan.name}`,
      });

      return updated;
    });
    res.json({ policy: result });
  } catch (err) {
    if (err.message === "INSUFFICIENT_FUNDS") {
      return res.status(400).json({ error: "Số dư ví không đủ để gia hạn hợp đồng" });
    }
    throw err;
  }
});

router.post("/policies/:id/claims", requireAuth, async (req, res) => {
  const { description, amountRequested } = req.body;
  if (!description || !amountRequested || amountRequested <= 0) {
    return res.status(400).json({ error: "Thiếu thông tin yêu cầu bồi thường" });
  }
  const policy = await prisma.insurancePolicy.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!policy) return res.status(404).json({ error: "Không tìm thấy hợp đồng" });
  if (policy.status !== "ACTIVE") return res.status(400).json({ error: "Hợp đồng không ở trạng thái hiệu lực" });

  const claim = await prisma.insuranceClaim.create({
    data: { policyId: policy.id, description, amountRequested },
  });
  res.status(201).json({ claim });
});

// Automated underwriting review against the policy's contract terms
// (claim amount cannot exceed the insured sum).
router.post("/claims/:id/review", requireAuth, async (req, res) => {
  const claim = await prisma.insuranceClaim.findFirst({
    where: { id: req.params.id, policy: { userId: req.userId } },
    include: { policy: true },
  });
  if (!claim) return res.status(404).json({ error: "Không tìm thấy yêu cầu bồi thường" });
  if (claim.status !== "SUBMITTED") return res.status(400).json({ error: "Yêu cầu đã được xử lý" });

  const withinTerms = claim.amountRequested <= claim.policy.sumInsured;
  const amountApproved = withinTerms ? claim.amountRequested : Math.round(claim.policy.sumInsured * 0.5);

  const updated = await prisma.insuranceClaim.update({
    where: { id: claim.id },
    data: {
      status: withinTerms ? "APPROVED" : "REJECTED",
      amountApproved: withinTerms ? amountApproved : null,
      decisionAt: new Date(),
    },
  });
  res.json({ claim: updated });
});

router.post("/claims/:id/payout", requireAuth, async (req, res) => {
  const claim = await prisma.insuranceClaim.findFirst({
    where: { id: req.params.id, policy: { userId: req.userId } },
    include: { policy: { include: { plan: true } } },
  });
  if (!claim) return res.status(404).json({ error: "Không tìm thấy yêu cầu bồi thường" });
  if (claim.status !== "APPROVED") return res.status(400).json({ error: "Yêu cầu chưa được phê duyệt" });

  const result = await prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.findUnique({ where: { userId: req.userId } });
    const balanceAfter = wallet.balance + claim.amountApproved;
    await tx.wallet.update({ where: { id: wallet.id }, data: { balance: balanceAfter } });

    await tx.transaction.create({
      data: {
        walletId: wallet.id,
        type: "INSURANCE_PAYOUT",
        amount: claim.amountApproved,
        balanceAfter,
        description: `Bồi thường bảo hiểm - ${claim.policy.plan.name}`,
      },
    });

    await recordLedgerEntry(tx, {
      userId: req.userId,
      source: "INSURANCE",
      sourceRefId: claim.id,
      type: "INCOME",
      amount: claim.amountApproved,
      description: `Bồi thường bảo hiểm - ${claim.policy.plan.name}`,
    });

    return tx.insuranceClaim.update({ where: { id: claim.id }, data: { status: "PAID" } });
  });

  res.json({ claim: result });
});

module.exports = router;
