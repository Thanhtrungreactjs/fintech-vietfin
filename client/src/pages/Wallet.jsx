import { useEffect, useState } from "react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import { getSocket } from "../lib/socket";
import { formatVND, formatDateTime } from "../lib/format";
import { Card, SectionTitle, Button, Input, AmountInput, Select, Badge, EmptyState, Alert, Modal } from "../components/ui";
import { ArrowDownCircle, ArrowUpCircle, Send, Wallet as WalletIcon, QrCode, Loader2, Copy, Check } from "lucide-react";

// Real bank account used to demo top-up / withdrawal via VietQR (NAPAS BIN 970423 = TPBank).
const BANK = { bin: "970423", name: "TPBank (Ngân hàng TMCP Tiên Phong)", accountNumber: "12311111111" };

const TX_LABELS = {
  DEPOSIT: "Nạp tiền",
  WITHDRAW: "Rút tiền",
  TRANSFER_IN: "Nhận chuyển khoản",
  TRANSFER_OUT: "Chuyển khoản",
  LOAN_DISBURSEMENT: "Giải ngân vay",
  LOAN_REPAYMENT: "Trả nợ vay",
  INSURANCE_PREMIUM: "Phí bảo hiểm",
  INSURANCE_PAYOUT: "Bồi thường bảo hiểm",
  DEPOSIT_LOCK: "Gửi tiết kiệm",
  DEPOSIT_SETTLEMENT: "Tất toán tiết kiệm",
};

const CREDIT_TYPES = ["DEPOSIT", "TRANSFER_IN", "LOAN_DISBURSEMENT", "INSURANCE_PAYOUT", "DEPOSIT_SETTLEMENT"];

const CATEGORIES = ["Ăn uống", "Di chuyển", "Mua sắm", "Hoá đơn", "Giải trí", "Khác"];

function genKey() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

function BankTransferCard({ amount, note, hint }) {
  const params = new URLSearchParams();
  if (amount) params.set("amount", String(amount));
  if (note) params.set("addInfo", note);
  const qs = params.toString();
  const qrSrc = `https://img.vietqr.io/image/${BANK.bin}-${BANK.accountNumber}-compact2.png${qs ? `?${qs}` : ""}`;

  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-white">
        <QrCode size={16} className="text-emerald-400" /> Quét mã VietQR
      </div>
      <div className="flex gap-4">
        <img src={qrSrc} alt="Mã QR chuyển khoản" className="h-36 w-36 shrink-0 rounded-lg bg-white p-1.5" />
        <div className="flex-1 space-y-1.5 text-sm">
          <div>
            <p className="text-xs text-gray-500">Ngân hàng</p>
            <p className="text-white">{BANK.name}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Số tài khoản</p>
            <p className="font-mono text-white">{BANK.accountNumber}</p>
          </div>
          {amount > 0 && (
            <div>
              <p className="text-xs text-gray-500">Số tiền</p>
              <p className="text-white">{formatVND(amount)}</p>
            </div>
          )}
        </div>
      </div>
      <p className="mt-3 text-xs text-gray-500">{hint}</p>
    </div>
  );
}

const STATUS_LABEL = { COMPLETED: "Hoàn tất", FAILED: "Thất bại" };

function DetailRow({ label, children }) {
  return (
    <div className="flex items-center justify-between border-b border-white/5 py-2.5 text-sm last:border-0">
      <span className="text-gray-500">{label}</span>
      <span className="text-right text-white">{children}</span>
    </div>
  );
}

function CopyableCode({ value }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1.5 font-mono text-xs text-gray-300 hover:text-emerald-400"
      onClick={() => {
        navigator.clipboard?.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {value}
      {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
    </button>
  );
}

function TransactionDetail({ tx }) {
  const isCredit = CREDIT_TYPES.includes(tx.type);
  const counterpartyUser = tx.counterpartyWallet?.user;
  return (
    <div>
      <div className="mb-4 text-center">
        <p className={`text-2xl font-semibold ${isCredit ? "text-emerald-400" : "text-red-400"}`}>
          {isCredit ? "+" : "-"}
          {formatVND(tx.amount)}
        </p>
        <Badge tone={tx.status === "COMPLETED" ? "green" : "red"}>{STATUS_LABEL[tx.status] || tx.status}</Badge>
      </div>
      <div>
        <DetailRow label="Mã giao dịch">
          <CopyableCode value={tx.id} />
        </DetailRow>
        <DetailRow label="Loại giao dịch">{TX_LABELS[tx.type] || tx.type}</DetailRow>
        <DetailRow label="Thời gian">{formatDateTime(tx.createdAt)}</DetailRow>
        <DetailRow label="Danh mục">{tx.category}</DetailRow>
        {counterpartyUser && (
          <DetailRow label={tx.type === "TRANSFER_OUT" ? "Chuyển đến" : "Nhận từ"}>
            {counterpartyUser.fullName} ({counterpartyUser.email})
          </DetailRow>
        )}
        <DetailRow label="Số dư sau giao dịch">{formatVND(tx.balanceAfter)}</DetailRow>
        {tx.description && <DetailRow label="Ghi chú">{tx.description}</DetailRow>}
        {tx.idempotencyKey && (
          <DetailRow label="Mã tham chiếu">
            <CopyableCode value={tx.idempotencyKey} />
          </DetailRow>
        )}
      </div>
    </div>
  );
}

export default function WalletPage() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [filters, setFilters] = useState({ type: "", status: "" });
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ amount: "", toEmail: "", category: "Khác", description: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [topupIntent, setTopupIntent] = useState(null);
  const [selectedTx, setSelectedTx] = useState(null);

  const loadWallet = async () => {
    const { data } = await api.get("/wallet");
    setWallet(data.wallet);
  };

  const loadTransactions = async () => {
    const params = {};
    if (filters.type) params.type = filters.type;
    if (filters.status) params.status = filters.status;
    const { data } = await api.get("/wallet/transactions", { params });
    setTransactions(data.transactions);
  };

  useEffect(() => {
    loadWallet();
  }, []);

  useEffect(() => {
    loadTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  // When a real bank transfer lands and the SePay webhook matches it, the
  // server pushes this event so the balance/history update with no refresh
  // and, if the deposit QR is still open, it closes automatically.
  useEffect(() => {
    let cancelled = false;
    let socket = null;
    const onCredited = () => {
      loadWallet();
      loadTransactions();
      setModal((current) => (current === "deposit" ? null : current));
    };
    const attach = () => {
      socket = getSocket();
      if (socket) socket.on("wallet:credited", onCredited);
      else if (!cancelled) setTimeout(attach, 300);
    };
    attach();
    return () => {
      cancelled = true;
      if (socket) socket.off("wallet:credited", onCredited);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openModal = async (type) => {
    setForm({ amount: "", toEmail: "", category: "Khác", description: "" });
    setError("");
    setTopupIntent(null);
    setModal(type);
    if (type === "deposit") {
      try {
        const { data } = await api.post("/wallet/topup-intent");
        setTopupIntent(data.intent);
      } catch {
        // Fine to continue without a code — QR falls back to the generic note.
      }
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const payload = { amount: Number(form.amount), idempotencyKey: genKey(), description: form.description };
      if (modal === "deposit") await api.post("/wallet/deposit", payload);
      if (modal === "withdraw") await api.post("/wallet/withdraw", { ...payload, category: form.category });
      if (modal === "transfer")
        await api.post("/wallet/transfer", { ...payload, toEmail: form.toEmail, category: form.category });
      setModal(null);
      await Promise.all([loadWallet(), loadTransactions()]);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Ví điện tử</h1>
          <p className="text-sm text-gray-400">Nạp, rút, chuyển khoản nội bộ và theo dõi sao kê.</p>
        </div>
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-500/15 p-3 text-emerald-400">
              <WalletIcon size={22} />
            </div>
            <div>
              <p className="text-sm text-gray-400">Số dư khả dụng</p>
              <p className="text-2xl font-semibold text-white">{formatVND(wallet?.balance)}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => openModal("deposit")}>
              <ArrowDownCircle size={16} /> Nạp tiền
            </Button>
            <Button variant="secondary" onClick={() => openModal("withdraw")}>
              <ArrowUpCircle size={16} /> Rút tiền
            </Button>
            <Button variant="secondary" onClick={() => openModal("transfer")}>
              <Send size={16} /> Chuyển khoản
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <SectionTitle
          title="Lịch sử giao dịch (sao kê)"
          action={
            <div className="flex gap-2">
              <Select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
                <option value="">Tất cả loại</option>
                {Object.entries(TX_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
              <Select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
                <option value="">Tất cả trạng thái</option>
                <option value="COMPLETED">Hoàn tất</option>
                <option value="FAILED">Thất bại</option>
              </Select>
            </div>
          }
        />
        {transactions.length === 0 ? (
          <EmptyState message="Không có giao dịch phù hợp." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-gray-500">
                  <th className="py-2 pr-4 font-normal">Loại giao dịch</th>
                  <th className="py-2 pr-4 font-normal">Số tiền</th>
                  <th className="py-2 pr-4 font-normal">Số dư sau GD</th>
                  <th className="py-2 pr-4 font-normal">Trạng thái</th>
                  <th className="py-2 pr-4 font-normal">Thời gian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {transactions.map((tx) => (
                  <tr
                    key={tx.id}
                    onClick={() => setSelectedTx(tx)}
                    className="cursor-pointer hover:bg-white/5"
                  >
                    <td className="py-3 pr-4 text-white">{TX_LABELS[tx.type] || tx.type}</td>
                    <td
                      className={`py-3 pr-4 font-medium ${
                        CREDIT_TYPES.includes(tx.type)
                          ? "text-emerald-400"
                          : "text-red-400"
                      }`}
                    >
                      {CREDIT_TYPES.includes(tx.type) ? "+" : "-"}
                      {formatVND(tx.amount)}
                    </td>
                    <td className="py-3 pr-4 text-gray-400">{formatVND(tx.balanceAfter)}</td>
                    <td className="py-3 pr-4">
                      <Badge tone={tx.status === "COMPLETED" ? "green" : "red"}>{tx.status}</Badge>
                    </td>
                    <td className="py-3 pr-4 text-gray-400">{formatDateTime(tx.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal === "deposit" ? "Nạp tiền vào ví" : modal === "withdraw" ? "Rút tiền khỏi ví" : "Chuyển khoản nội bộ"}
      >
        <form onSubmit={submit} className="space-y-4">
          {modal === "transfer" && (
            <Input
              label="Email người nhận"
              type="email"
              required
              value={form.toEmail}
              onChange={(e) => setForm({ ...form, toEmail: e.target.value })}
            />
          )}
          <AmountInput
            label="Số tiền (VND)"
            required
            placeholder="0"
            value={form.amount}
            onChange={(digits) => setForm({ ...form, amount: digits })}
          />
          {modal === "deposit" && (
            <>
              <BankTransferCard
                amount={Number(form.amount) || 0}
                note={topupIntent?.code || `NAPTIEN ${user?.fullName || ""}`.trim()}
                hint="Chuyển khoản đúng số tiền và giữ nguyên nội dung ở trên — hệ thống sẽ tự động cộng tiền vào ví khi ngân hàng báo có."
              />
              {topupIntent && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3.5 py-2.5 text-xs text-emerald-400">
                  <Loader2 size={14} className="animate-spin" />
                  Đang chờ tiền về tự động qua chuyển khoản (mã: {topupIntent.code})...
                </div>
              )}
            </>
          )}
          {modal === "withdraw" && (
            <BankTransferCard
              amount={Number(form.amount) || 0}
              note={`RUTTIEN ${user?.fullName || ""}`.trim()}
              hint="Tiền rút sẽ được chuyển về tài khoản ngân hàng liên kết này sau khi yêu cầu được xử lý."
            />
          )}
          {(modal === "withdraw" || modal === "transfer") && (
            <Select label="Danh mục chi tiêu" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          )}
          <Input
            label="Ghi chú"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          {error && <Alert>{error}</Alert>}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Đang xử lý..." : modal === "deposit" ? "Mô phỏng: đã nhận được tiền (dev)" : "Xác nhận"}
          </Button>
          {modal === "deposit" && (
            <p className="text-center text-xs text-gray-500">
              Nút trên chỉ dùng để giả lập khi test — khi có webhook SePay thật, ví sẽ tự cộng tiền không cần bấm gì.
            </p>
          )}
        </form>
      </Modal>

      <Modal open={!!selectedTx} onClose={() => setSelectedTx(null)} title="Chi tiết giao dịch">
        {selectedTx && <TransactionDetail tx={selectedTx} />}
      </Modal>
    </div>
  );
}
