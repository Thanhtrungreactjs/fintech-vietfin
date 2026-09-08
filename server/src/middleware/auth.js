const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing authorization token" });
  }
  const token = header.slice("Bearer ".length);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.sub;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// Must run after requireAuth. Re-checks isAdmin from the database on every
// request (not from the JWT payload) so revoking admin access takes effect
// immediately instead of waiting for the token to expire.
async function requireAdmin(req, res, next) {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user?.isAdmin) {
    return res.status(403).json({ error: "Chỉ tài khoản quản trị mới có quyền thực hiện thao tác này" });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };
