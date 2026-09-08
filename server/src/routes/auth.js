const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

function signToken(userId) {
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

function publicUser(user) {
  const { passwordHash, ...rest } = user;
  return rest;
}

router.post("/register", async (req, res) => {
  const { email, password, fullName, phone, role } = req.body;
  if (!email || !password || !fullName) {
    return res.status(400).json({ error: "email, password, fullName là bắt buộc" });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: "Email đã được sử dụng" });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      fullName,
      phone: phone || null,
      role: role === "BUSINESS" ? "BUSINESS" : "PERSONAL",
      wallet: { create: { balance: 0 } },
    },
    include: { wallet: true },
  });

  const token = signToken(user.id);
  res.status(201).json({ token, user: publicUser(user) });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: "Email hoặc mật khẩu không đúng" });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: "Email hoặc mật khẩu không đúng" });

  const token = signToken(user.id);
  res.json({ token, user: publicUser(user) });
});

router.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    include: { kyc: true, wallet: true },
  });
  if (!user) return res.status(404).json({ error: "Không tìm thấy người dùng" });
  res.json({ user: publicUser(user) });
});

router.post("/kyc", requireAuth, async (req, res) => {
  const { idType, idNumber, dob, address } = req.body;
  if (!idType || !idNumber || !dob || !address) {
    return res.status(400).json({ error: "Thiếu thông tin xác minh danh tính" });
  }

  const existing = await prisma.kycDocument.findUnique({ where: { userId: req.userId } });
  // Simplified automated eKYC decision: valid-looking ID number + full fields => verified.
  const looksValid = /^[0-9A-Za-z]{8,20}$/.test(idNumber);
  const status = looksValid ? "VERIFIED" : "REJECTED";

  const kyc = existing
    ? await prisma.kycDocument.update({
        where: { userId: req.userId },
        data: { idType, idNumber, dob, address, status, reviewedAt: new Date() },
      })
    : await prisma.kycDocument.create({
        data: { userId: req.userId, idType, idNumber, dob, address, status, reviewedAt: new Date() },
      });

  await prisma.user.update({ where: { id: req.userId }, data: { kycStatus: status } });

  res.json({ kyc, status });
});

module.exports = router;
