require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
require("express-async-errors");

const { initSocket } = require("./lib/socket");
const authRoutes = require("./routes/auth");
const walletRoutes = require("./routes/wallet");
const lendingRoutes = require("./routes/lending");
const insuranceRoutes = require("./routes/insurance");
const bankingRoutes = require("./routes/banking");
const corporateRoutes = require("./routes/corporate");
const depositsRoutes = require("./routes/deposits");
const webhooksRoutes = require("./routes/webhooks");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/lending", lendingRoutes);
app.use("/api/insurance", insuranceRoutes);
app.use("/api/banking", bankingRoutes);
app.use("/api/corporate", corporateRoutes);
app.use("/api/deposits", depositsRoutes);
app.use("/api/webhooks", webhooksRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Đã xảy ra lỗi hệ thống" });
});

const httpServer = http.createServer(app);
initSocket(httpServer);

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => console.log(`Fintech API + WebSocket listening on http://localhost:${PORT}`));
