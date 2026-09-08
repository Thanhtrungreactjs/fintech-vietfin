import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";
import { formatVND, formatDate } from "../lib/format";
import { Card, SectionTitle, Button, Input, Select, Badge, EmptyState, Alert, Modal } from "../components/ui";
import { HandCoins, PlusCircle, Check } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { BANKS } from "../lib/banks";

const STATUS_TONE = {
  PENDING: "yellow",
  APPROVED: "blue",
  REJECTED: "red",
  ACTIVE: "green",
  CLOSED: "gray",
  DEFAULTED: "red",
};

const STATUS_LABEL = {
  PENDING: "Chờ admin duyệt",
  APPROVED: "Đã duyệt - chờ giải ngân",
  REJECTED: "Từ chối",
  ACTIVE: "Đang vay",
  CLOSED: "Đã tất toán",
  DEFAULTED: "Vỡ nợ",
};

export default function Lending() {
  const { user } = useAuth();
  const [loans, setLoans] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ amount: "", purpose: "", termMonths: 6, bankCode: "", accountNumber: "" });
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await api.get("/lending/applications");
    setLoans(data.loans);
  };

  useEffect(() => {
    load();
  }, []);

  const selectedBank = BANKS.find((b) => b.code === form.bankCode);

  const apply = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.bankCode) {
      setError("Vui lòng chọn ngân hàng/ví nhận giải ngân");
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const { data } = await api.post("/lending/apply", {
        amount: Number(form.amount),
        purpose: form.purpose,
        termMonths: Number(form.termMonths),
        disbursementBank: form.bankCode,
        disbursementBankName: selectedBank?.name,
        disbursementAccountNumber: form.accountNumber,
      });
      setResult(data);
      load();
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
          <h1 className="text-2xl font-semibold text-white">Cho vay ngang hàng (P2P Lending)</h1>
          <p className="text-sm text-gray-400">Đăng ký vay, chấm điểm tín dụng tự động và theo dõi lịch trả nợ.</p>
        </div>
        <Button
          onClick={() => {
            setForm({ amount: "", purpose: "", termMonths: 6, bankCode: "", accountNumber: "" });
            setOpen(true);
            setResult(null);
            setError("");
          }}
          disabled={user?.kycStatus !== "VERIFIED"}
          title={user?.kycStatus !== "VERIFIED" ? "Cần xác minh KYC trước" : ""}
        >
          <PlusCircle size={16} /> Đăng ký khoản vay
        </Button>
      </div>

      {user?.kycStatus !== "VERIFIED" && (
        <Alert>Bạn cần hoàn tất xác minh danh tính (KYC) trong mục Hồ sơ trước khi đăng ký vay.</Alert>
      )}

      <Card>
        <SectionTitle icon={<HandCoins size={18} />} title="Danh sách khoản vay" />
        {loans.length === 0 ? (
          <EmptyState message="Bạn chưa có khoản vay nào." />
        ) : (
          <div className="divide-y divide-white/5">
            {loans.map((loan) => (
              <Link
                key={loan.id}
                to={`/lending/${loan.id}`}
                className="flex items-center justify-between py-4 text-sm hover:bg-white/5 rounded-lg px-2 -mx-2"
              >
                <div className="flex items-center gap-3">
                  {loan.disbursementBank && (
                    <img
                      src={BANKS.find((b) => b.code === loan.disbursementBank)?.logo}
                      alt={loan.disbursementBankName}
                      className="h-11 w-11 shrink-0 rounded-lg bg-white object-contain p-1.5"
                    />
                  )}
                  <div>
                    <p className="font-medium text-white">{loan.purpose}</p>
                    <p className="text-xs text-gray-500">
                      {formatVND(loan.amount)} · {loan.termMonths} tháng · Điểm TD: {loan.creditScore ?? "-"}
                      {loan.interestRate ? ` · Lãi suất ${loan.interestRate}%/năm` : ""}
                      {loan.disbursementBankName ? ` · Nhận qua ${loan.disbursementBankName}` : ""}
                    </p>
                  </div>
                </div>
                <Badge tone={STATUS_TONE[loan.status]}>{STATUS_LABEL[loan.status]}</Badge>
              </Link>
            ))}
          </div>
        )}
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Đăng ký khoản vay" size="lg">
        {!result ? (
          <form onSubmit={apply} className="space-y-4">
            <Input
              label="Số tiền muốn vay (VND)"
              type="number"
              min="1000000"
              required
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
            <Input
              label="Mục đích vay"
              required
              value={form.purpose}
              onChange={(e) => setForm({ ...form, purpose: e.target.value })}
              placeholder="VD: Kinh doanh, mua sắm, học tập..."
            />
            <Select label="Kỳ hạn" value={form.termMonths} onChange={(e) => setForm({ ...form, termMonths: e.target.value })}>
              <option value={3}>3 tháng</option>
              <option value={6}>6 tháng</option>
              <option value={12}>12 tháng</option>
              <option value={24}>24 tháng</option>
            </Select>

            <div>
              <span className="mb-2 block text-sm text-gray-400">Ngân hàng / ví nhận giải ngân</span>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {BANKS.map((bank) => (
                  <button
                    key={bank.code}
                    type="button"
                    onClick={() => setForm({ ...form, bankCode: bank.code })}
                    className={`relative flex flex-col items-center gap-1.5 rounded-xl border p-2.5 transition ${
                      form.bankCode === bank.code
                        ? "border-emerald-500/60 bg-emerald-500/10"
                        : "border-white/10 hover:border-white/20"
                    }`}
                  >
                    {form.bankCode === bank.code && (
                      <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500">
                        <Check size={10} className="text-black" />
                      </span>
                    )}
                    <img src={bank.logo} alt={bank.name} className="h-14 w-14 rounded-lg bg-white object-contain p-2" />
                    <span className="text-center text-sm leading-tight text-gray-300">{bank.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {form.bankCode && (
              <Input
                label={`Số tài khoản / số điện thoại ${selectedBank?.name || ""}`}
                required
                value={form.accountNumber}
                onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
              />
            )}

            {error && <Alert>{error}</Alert>}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Đang chấm điểm tín dụng..." : "Gửi hồ sơ vay"}
            </Button>
          </form>
        ) : (
          <div className="space-y-3 text-sm">
            <Badge tone={STATUS_TONE[result.loan.status]}>{STATUS_LABEL[result.loan.status]}</Badge>
            <Alert tone="green">
              Hồ sơ đã được gửi và đang chờ <strong>admin xét duyệt</strong>. Bạn sẽ thấy kết quả trong danh sách
              khoản vay bên dưới ngay khi admin ra quyết định.
            </Alert>
            <p className="text-gray-300">
              Điểm tín dụng gợi ý: <span className="font-semibold text-white">{result.creditScore}</span> / 850
            </p>
            <p className="text-gray-400">Nhận định của hệ thống chấm điểm: {result.offer.reason}</p>
            {result.offer.approved && (
              <p className="text-gray-300">
                Gợi ý duyệt: {formatVND(result.offer.approvedAmount)} · Lãi suất gợi ý {result.offer.interestRate}%/năm
                (admin có thể điều chỉnh)
              </p>
            )}
            <Button
              className="w-full"
              onClick={() => {
                setOpen(false);
                load();
              }}
            >
              Đóng
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
