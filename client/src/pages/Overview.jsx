import { useEffect, useState } from "react";
import api from "../api/client";
import { formatVND, formatDateTime } from "../lib/format";
import { Card, SectionTitle, StatCard, Badge, EmptyState, Button, Input, Alert } from "../components/ui";
import { Wallet, HandCoins, ShieldCheck, ListChecks, PlusCircle } from "lucide-react";

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

export default function Overview() {
  const [overview, setOverview] = useState(null);
  const [budgetData, setBudgetData] = useState(null);
  const [form, setForm] = useState({ category: "", limitAmount: "" });
  const [error, setError] = useState("");

  const load = async () => {
    const [{ data: ov }, { data: bd }] = await Promise.all([
      api.get("/banking/overview"),
      api.get("/banking/budgets"),
    ]);
    setOverview(ov);
    setBudgetData(bd);
  };

  useEffect(() => {
    load();
  }, []);

  const addBudget = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/banking/budgets", { category: form.category, limitAmount: Number(form.limitAmount) });
      setForm({ category: "", limitAmount: "" });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  if (!overview) return <p className="text-gray-500">Đang tải...</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Tổng quan tài khoản</h1>
        <p className="text-sm text-gray-400">Toàn cảnh ví, khoản vay và hợp đồng bảo hiểm của bạn.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Số dư ví" value={formatVND(overview.summary.walletBalance)} icon={<Wallet size={20} />} />
        <StatCard
          label="Khoản vay đang hoạt động"
          value={overview.summary.activeLoansCount}
          sub={formatVND(overview.summary.activeLoansTotal)}
          icon={<HandCoins size={20} />}
        />
        <StatCard label="Hợp đồng bảo hiểm hiệu lực" value={overview.summary.activePoliciesCount} icon={<ShieldCheck size={20} />} />
        <StatCard label="Đơn vay chờ duyệt" value={overview.summary.pendingLoanApplications} icon={<ListChecks size={20} />} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <SectionTitle title="Giao dịch gần đây" />
          {overview.recentTransactions.length === 0 ? (
            <EmptyState message="Chưa có giao dịch nào." />
          ) : (
            <div className="divide-y divide-white/5">
              {overview.recentTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between py-3 text-sm">
                  <div>
                    <p className="text-white">{TX_LABELS[tx.type] || tx.type}</p>
                    <p className="text-xs text-gray-500">{formatDateTime(tx.createdAt)}</p>
                  </div>
                  <p
                    className={
                      CREDIT_TYPES.includes(tx.type)
                        ? "font-medium text-emerald-400"
                        : "font-medium text-red-400"
                    }
                  >
                    {CREDIT_TYPES.includes(tx.type) ? "+" : "-"}
                    {formatVND(tx.amount)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <SectionTitle title="Quản lý ngân sách" />
          <form onSubmit={addBudget} className="mb-4 space-y-2">
            <Input
              placeholder="Danh mục (VD: Ăn uống)"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              required
            />
            <Input
              type="number"
              placeholder="Hạn mức (VND)"
              value={form.limitAmount}
              onChange={(e) => setForm({ ...form, limitAmount: e.target.value })}
              required
            />
            <Button type="submit" variant="secondary" className="w-full">
              <PlusCircle size={16} /> Thêm ngân sách
            </Button>
          </form>
          {error && <Alert>{error}</Alert>}
          {budgetData?.budgets.length === 0 ? (
            <EmptyState message="Chưa thiết lập ngân sách tháng này." />
          ) : (
            <div className="space-y-3">
              {budgetData?.budgets.map((b) => {
                const pct = Math.min(100, Math.round((b.spent / b.limitAmount) * 100));
                return (
                  <div key={b.id}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-gray-300">{b.category}</span>
                      <span className={b.overLimit ? "text-red-400" : "text-gray-500"}>
                        {formatVND(b.spent)} / {formatVND(b.limitAmount)}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className={`h-full ${b.overLimit ? "bg-red-500" : "bg-emerald-500"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    {b.overLimit && <p className="mt-1 text-xs text-red-400">Đã vượt hạn mức ngân sách!</p>}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
