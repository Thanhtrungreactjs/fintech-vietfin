import { useEffect, useState } from "react";
import api from "../api/client";
import { formatVND, formatDate } from "../lib/format";
import { Card, SectionTitle, StatCard, Button, Input, Badge, EmptyState, Alert, Modal } from "../components/ui";
import { FileText, TrendingUp, TrendingDown, PlusCircle, Building2 } from "lucide-react";

const INVOICE_TONE = { DRAFT: "gray", SENT: "blue", PAID: "green", OVERDUE: "red" };
const INVOICE_LABEL = { DRAFT: "Nháp", SENT: "Đã gửi", PAID: "Đã thanh toán", OVERDUE: "Quá hạn" };
const SOURCE_LABEL = { WALLET: "Ví điện tử", LOAN: "Cho vay P2P", INSURANCE: "Bảo hiểm", INVOICE: "Hoá đơn", DEPOSIT: "Tiết kiệm", TRADING: "Trading" };

export default function Corporate() {
  const [invoices, setInvoices] = useState([]);
  const [forecast, setForecast] = useState(null);
  const [report, setReport] = useState(null);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ counterparty: "", amount: "", dueDate: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [{ data: inv }, { data: fc }, { data: rep }] = await Promise.all([
      api.get("/corporate/invoices"),
      api.get("/corporate/cashflow-forecast"),
      api.get("/corporate/reports", { params: { month } }),
    ]);
    setInvoices(inv.invoices);
    setForecast(fc);
    setReport(rep);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  const createInvoice = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api.post("/corporate/invoices", { ...form, amount: Number(form.amount) });
      setOpen(false);
      setForm({ counterparty: "", amount: "", dueDate: "" });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const act = async (fn) => {
    setBusy(true);
    setError("");
    try {
      await fn();
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (!forecast || !report) return <p className="text-gray-500">Đang tải...</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Quản lý tài chính doanh nghiệp</h1>
        <p className="text-sm text-gray-400">Kế toán tự động, dòng tiền, hoá đơn điện tử và báo cáo tài chính.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Số dư hiện tại" value={formatVND(forecast.currentBalance)} icon={<Building2 size={20} />} />
        <StatCard
          label={`Dự kiến ${forecast.horizonDays} ngày tới`}
          value={formatVND(forecast.projectedEndingBalance)}
          icon={<TrendingUp size={20} />}
          tone={forecast.projectedEndingBalance >= forecast.currentBalance ? "green" : "red"}
        />
        <StatCard label="Dòng tiền vào dự kiến" value={formatVND(forecast.totalInflow)} icon={<TrendingUp size={20} />} />
        <StatCard label="Dòng tiền ra dự kiến" value={formatVND(forecast.totalOutflow)} icon={<TrendingDown size={20} />} tone="red" />
      </div>

      <Card>
        <SectionTitle title="Dự báo dòng tiền (cash flow)" />
        {forecast.events.length === 0 ? (
          <EmptyState message="Không có nghĩa vụ thu/chi nào sắp tới." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-gray-500">
                  <th className="py-2 pr-4 font-normal">Ngày</th>
                  <th className="py-2 pr-4 font-normal">Nội dung</th>
                  <th className="py-2 pr-4 font-normal">Số tiền</th>
                  <th className="py-2 pr-4 font-normal">Số dư dự kiến</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {forecast.events.map((e, idx) => (
                  <tr key={idx}>
                    <td className="py-3 pr-4 text-gray-400">{formatDate(e.date)}</td>
                    <td className="py-3 pr-4 text-white">{e.label}</td>
                    <td className={`py-3 pr-4 font-medium ${e.type === "INFLOW" ? "text-emerald-400" : "text-red-400"}`}>
                      {e.type === "INFLOW" ? "+" : "-"}
                      {formatVND(e.amount)}
                    </td>
                    <td className="py-3 pr-4 text-gray-400">{formatVND(e.projectedBalance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <SectionTitle
          icon={<FileText size={18} />}
          title="Hoá đơn điện tử"
          action={
            <Button onClick={() => setOpen(true)}>
              <PlusCircle size={16} /> Tạo hoá đơn
            </Button>
          }
        />
        {error && (
          <div className="mb-3">
            <Alert>{error}</Alert>
          </div>
        )}
        {invoices.length === 0 ? (
          <EmptyState message="Chưa có hoá đơn nào." />
        ) : (
          <div className="divide-y divide-white/5">
            {invoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <p className="font-medium text-white">
                    {inv.number} · {inv.counterparty}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatVND(inv.amount)} · Hạn thanh toán {formatDate(inv.dueDate)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={INVOICE_TONE[inv.status]}>{INVOICE_LABEL[inv.status]}</Badge>
                  {inv.status === "DRAFT" && (
                    <Button
                      variant="secondary"
                      disabled={busy}
                      onClick={() => act(() => api.post(`/corporate/invoices/${inv.id}/send`))}
                    >
                      Gửi
                    </Button>
                  )}
                  {(inv.status === "SENT" || inv.status === "OVERDUE") && (
                    <Button disabled={busy} onClick={() => act(() => api.post(`/corporate/invoices/${inv.id}/pay`))}>
                      Đánh dấu đã thu
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <SectionTitle
          title="Báo cáo tài chính"
          action={
            <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-40" />
          }
        />
        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-white/10 p-4">
            <p className="text-sm text-gray-400">Tổng thu</p>
            <p className="mt-1 text-xl font-semibold text-emerald-400">{formatVND(report.totalIncome)}</p>
          </div>
          <div className="rounded-xl border border-white/10 p-4">
            <p className="text-sm text-gray-400">Tổng chi</p>
            <p className="mt-1 text-xl font-semibold text-red-400">{formatVND(report.totalExpense)}</p>
          </div>
          <div className="rounded-xl border border-white/10 p-4">
            <p className="text-sm text-gray-400">Lợi nhuận ròng</p>
            <p className={`mt-1 text-xl font-semibold ${report.netProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {formatVND(report.netProfit)}
            </p>
          </div>
        </div>
        {Object.keys(report.bySource).length === 0 ? (
          <EmptyState message="Chưa có dữ liệu sổ sách trong tháng này." />
        ) : (
          <div className="space-y-2">
            {Object.entries(report.bySource).map(([source, v]) => (
              <div key={source} className="flex items-center justify-between rounded-lg border border-white/10 px-4 py-2.5 text-sm">
                <span className="text-white">{SOURCE_LABEL[source] || source}</span>
                <span className="text-emerald-400">+{formatVND(v.income)}</span>
                <span className="text-red-400">-{formatVND(v.expense)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Tạo hoá đơn mới">
        <form onSubmit={createInvoice} className="space-y-4">
          <Input
            label="Khách hàng / Đối tác"
            required
            value={form.counterparty}
            onChange={(e) => setForm({ ...form, counterparty: e.target.value })}
          />
          <Input
            label="Số tiền (VND)"
            type="number"
            required
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
          />
          <Input
            label="Hạn thanh toán"
            type="date"
            required
            value={form.dueDate}
            onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
          />
          {error && <Alert>{error}</Alert>}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Đang tạo..." : "Tạo hoá đơn"}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
