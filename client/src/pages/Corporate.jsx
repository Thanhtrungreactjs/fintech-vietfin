import { useEffect, useState } from "react";
import api from "../api/client";
import { formatVND, formatDate, formatDateTime } from "../lib/format";
import { Card, SectionTitle, StatCard, Button, Input, AmountInput, Select, Badge, EmptyState, Alert, Modal } from "../components/ui";
import { FileText, TrendingUp, TrendingDown, PlusCircle, Building2, Trash2, Eye } from "lucide-react";

const INVOICE_TONE = { DRAFT: "gray", SENT: "blue", PAID: "green", OVERDUE: "red" };
const INVOICE_LABEL = { DRAFT: "Nháp", SENT: "Đã gửi", PAID: "Đã thanh toán", OVERDUE: "Quá hạn" };
const PAYMENT_LABEL = { TRANSFER: "Chuyển khoản", CASH: "Tiền mặt" };
const SOURCE_LABEL = { WALLET: "Ví điện tử", LOAN: "Cho vay P2P", INSURANCE: "Bảo hiểm", INVOICE: "Hoá đơn", DEPOSIT: "Tiết kiệm", TRADING: "Trading" };
const UNITS = ["cái", "bộ", "gói", "giờ", "ngày", "tháng", "kg", "m2", "dịch vụ"];
const VAT_RATES = [0, 5, 8, 10];

const emptyItem = () => ({ name: "", unit: "cái", quantity: 1, unitPrice: "" });
const emptyInvoiceForm = () => ({
  counterparty: "",
  buyerTaxCode: "",
  buyerAddress: "",
  paymentMethod: "TRANSFER",
  vatRate: 10,
  dueDate: "",
  note: "",
  items: [emptyItem()],
});

export default function Corporate() {
  const [invoices, setInvoices] = useState([]);
  const [forecast, setForecast] = useState(null);
  const [report, setReport] = useState(null);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyInvoiceForm());
  const [viewInvoice, setViewInvoice] = useState(null);
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

  const setItem = (index, patch) => {
    setForm((f) => ({
      ...f,
      items: f.items.map((it, i) => (i === index ? { ...it, ...patch } : it)),
    }));
  };
  const addItem = () => setForm((f) => ({ ...f, items: [...f.items, emptyItem()] }));
  const removeItem = (index) => setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== index) }));

  const subtotal = form.items.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0);
  const vatAmount = Math.round(subtotal * (Number(form.vatRate) / 100 || 0));
  const total = subtotal + vatAmount;

  const createInvoice = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api.post("/corporate/invoices", {
        ...form,
        items: form.items.map((it) => ({ ...it, quantity: Number(it.quantity), unitPrice: Number(it.unitPrice) })),
      });
      setOpen(false);
      setForm(emptyInvoiceForm());
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const openInvoiceDetail = async (id) => {
    const { data } = await api.get(`/corporate/invoices/${id}`);
    setViewInvoice(data.invoice);
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
            <Button
              onClick={() => {
                setForm(emptyInvoiceForm());
                setError("");
                setOpen(true);
              }}
            >
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
                    {inv.number} <span className="text-gray-500">(Ký hiệu {inv.symbol})</span> · {inv.counterparty}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatVND(inv.amount)} (đã gồm VAT {inv.vatRate}%) · {inv.items?.length || 0} dòng hàng hoá · Hạn
                    thanh toán {formatDate(inv.dueDate)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={INVOICE_TONE[inv.status]}>{INVOICE_LABEL[inv.status]}</Badge>
                  <Button variant="ghost" onClick={() => openInvoiceDetail(inv.id)}>
                    <Eye size={16} />
                  </Button>
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

      <Modal open={open} onClose={() => setOpen(false)} title="Tạo hoá đơn điện tử" size="xl">
        <form onSubmit={createInvoice} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Tên khách hàng / đơn vị mua"
              required
              value={form.counterparty}
              onChange={(e) => setForm({ ...form, counterparty: e.target.value })}
            />
            <Input
              label="Mã số thuế người mua"
              value={form.buyerTaxCode}
              onChange={(e) => setForm({ ...form, buyerTaxCode: e.target.value })}
              placeholder="VD: 0312345678"
            />
            <Input
              label="Địa chỉ người mua"
              className="sm:col-span-2"
              value={form.buyerAddress}
              onChange={(e) => setForm({ ...form, buyerAddress: e.target.value })}
            />
            <Select
              label="Hình thức thanh toán"
              value={form.paymentMethod}
              onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
            >
              <option value="TRANSFER">Chuyển khoản</option>
              <option value="CASH">Tiền mặt</option>
            </Select>
            <Input
              label="Hạn thanh toán"
              type="date"
              required
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm text-gray-400">Hàng hoá / dịch vụ</span>
              <Button type="button" variant="secondary" onClick={addItem}>
                <PlusCircle size={14} /> Thêm dòng
              </Button>
            </div>
            <div className="space-y-2">
              {form.items.map((item, index) => (
                <div key={index} className="space-y-2 rounded-xl border border-white/10 p-3">
                  <Input
                    placeholder="Tên hàng hoá / dịch vụ"
                    required
                    className="text-base"
                    value={item.name}
                    onChange={(e) => setItem(index, { name: e.target.value })}
                  />
                  <div className="grid grid-cols-12 gap-2">
                    <Select
                      className="col-span-6 sm:col-span-4"
                      value={item.unit}
                      onChange={(e) => setItem(index, { unit: e.target.value })}
                    >
                      {UNITS.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </Select>
                    <Input
                      className="col-span-6 sm:col-span-2"
                      type="number"
                      min="0"
                      step="any"
                      placeholder="SL"
                      required
                      value={item.quantity}
                      onChange={(e) => setItem(index, { quantity: e.target.value })}
                    />
                    <div className="col-span-11 sm:col-span-5">
                      <AmountInput
                        placeholder="Đơn giá"
                        value={item.unitPrice}
                        onChange={(v) => setItem(index, { unitPrice: v })}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      disabled={form.items.length === 1}
                      className="col-span-1 flex items-center justify-center rounded-lg text-gray-500 hover:text-red-400 disabled:opacity-30"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select label="Thuế suất GTGT" value={form.vatRate} onChange={(e) => setForm({ ...form, vatRate: e.target.value })}>
              {VAT_RATES.map((r) => (
                <option key={r} value={r}>
                  {r}%
                </option>
              ))}
            </Select>
            <Input label="Ghi chú" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </div>

          <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm">
            <div className="flex justify-between text-gray-400">
              <span>Tiền hàng (chưa thuế)</span>
              <span className="text-white">{formatVND(subtotal)}</span>
            </div>
            <div className="mt-1 flex justify-between text-gray-400">
              <span>Thuế GTGT ({form.vatRate}%)</span>
              <span className="text-white">{formatVND(vatAmount)}</span>
            </div>
            <div className="mt-2 flex justify-between border-t border-white/10 pt-2 text-base font-semibold">
              <span className="text-white">Tổng cộng thanh toán</span>
              <span className="text-emerald-400">{formatVND(total)}</span>
            </div>
          </div>

          {error && <Alert>{error}</Alert>}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Đang tạo..." : "Tạo hoá đơn"}
          </Button>
        </form>
      </Modal>

      <Modal open={!!viewInvoice} onClose={() => setViewInvoice(null)} title="Chi tiết hoá đơn" size="lg">
        {viewInvoice && (
          <div className="space-y-4 text-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-lg font-semibold text-white">HOÁ ĐƠN GIÁ TRỊ GIA TĂNG</p>
                <p className="text-gray-500">
                  Ký hiệu: {viewInvoice.symbol} · Số: {viewInvoice.number}
                </p>
                <p className="text-gray-500">Ngày lập: {formatDateTime(viewInvoice.issueDate)}</p>
              </div>
              <Badge tone={INVOICE_TONE[viewInvoice.status]}>{INVOICE_LABEL[viewInvoice.status]}</Badge>
            </div>

            <div className="grid grid-cols-1 gap-4 rounded-xl border border-white/10 p-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-gray-500">Đơn vị mua</p>
                <p className="text-white">{viewInvoice.counterparty}</p>
                {viewInvoice.buyerTaxCode && <p className="text-xs text-gray-500">MST: {viewInvoice.buyerTaxCode}</p>}
                {viewInvoice.buyerAddress && <p className="text-xs text-gray-500">{viewInvoice.buyerAddress}</p>}
              </div>
              <div>
                <p className="text-xs text-gray-500">Hình thức thanh toán</p>
                <p className="text-white">{PAYMENT_LABEL[viewInvoice.paymentMethod]}</p>
                <p className="mt-2 text-xs text-gray-500">Hạn thanh toán</p>
                <p className="text-white">{formatDate(viewInvoice.dueDate)}</p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5 text-left text-gray-500">
                    <th className="px-3 py-2 font-normal">Hàng hoá / dịch vụ</th>
                    <th className="px-3 py-2 font-normal">ĐVT</th>
                    <th className="px-3 py-2 font-normal">SL</th>
                    <th className="px-3 py-2 font-normal">Đơn giá</th>
                    <th className="px-3 py-2 text-right font-normal">Thành tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {viewInvoice.items.map((it) => (
                    <tr key={it.id}>
                      <td className="px-3 py-2 text-white">{it.name}</td>
                      <td className="px-3 py-2 text-gray-400">{it.unit}</td>
                      <td className="px-3 py-2 text-gray-400">{it.quantity}</td>
                      <td className="px-3 py-2 text-gray-400">{formatVND(it.unitPrice)}</td>
                      <td className="px-3 py-2 text-right text-white">{formatVND(it.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="ml-auto max-w-xs space-y-1">
              <div className="flex justify-between text-gray-400">
                <span>Cộng tiền hàng</span>
                <span className="text-white">{formatVND(viewInvoice.subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Thuế GTGT ({viewInvoice.vatRate}%)</span>
                <span className="text-white">{formatVND(viewInvoice.vatAmount)}</span>
              </div>
              <div className="flex justify-between border-t border-white/10 pt-1 text-base font-semibold">
                <span className="text-white">Tổng cộng thanh toán</span>
                <span className="text-emerald-400">{formatVND(viewInvoice.amount)}</span>
              </div>
            </div>

            {viewInvoice.note && (
              <p className="text-xs text-gray-500">
                <span className="text-gray-400">Ghi chú:</span> {viewInvoice.note}
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
