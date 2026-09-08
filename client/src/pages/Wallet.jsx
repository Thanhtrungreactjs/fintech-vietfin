import { useEffect, useState } from "react";
import api from "../api/client";
import { formatVND, formatDateTime } from "../lib/format";
import { Card, SectionTitle, Button, Input, Select, Badge, EmptyState, Alert, Modal } from "../components/ui";
import { ArrowDownCircle, ArrowUpCircle, Send, Wallet as WalletIcon } from "lucide-react";

const TX_LABELS = {
  DEPOSIT: "Nạp tiền",
  WITHDRAW: "Rút tiền",
  TRANSFER_IN: "Nhận chuyển khoản",
  TRANSFER_OUT: "Chuyển khoản",
  LOAN_DISBURSEMENT: "Giải ngân vay",
  LOAN_REPAYMENT: "Trả nợ vay",
  INSURANCE_PREMIUM: "Phí bảo hiểm",
  INSURANCE_PAYOUT: "Bồi thường bảo hiểm",
};

const CATEGORIES = ["Ăn uống", "Di chuyển", "Mua sắm", "Hoá đơn", "Giải trí", "Khác"];

function genKey() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

export default function WalletPage() {
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [filters, setFilters] = useState({ type: "", status: "" });
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ amount: "", toEmail: "", category: "Khác", description: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

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

  const openModal = (type) => {
    setForm({ amount: "", toEmail: "", category: "Khác", description: "" });
    setError("");
    setModal(type);
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
                  <tr key={tx.id}>
                    <td className="py-3 pr-4 text-white">{TX_LABELS[tx.type] || tx.type}</td>
                    <td
                      className={`py-3 pr-4 font-medium ${
                        ["DEPOSIT", "TRANSFER_IN", "LOAN_DISBURSEMENT", "INSURANCE_PAYOUT"].includes(tx.type)
                          ? "text-emerald-400"
                          : "text-red-400"
                      }`}
                    >
                      {["DEPOSIT", "TRANSFER_IN", "LOAN_DISBURSEMENT", "INSURANCE_PAYOUT"].includes(tx.type) ? "+" : "-"}
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
          <Input
            label="Số tiền (VND)"
            type="number"
            min="1000"
            required
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
          />
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
            {busy ? "Đang xử lý..." : "Xác nhận"}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
