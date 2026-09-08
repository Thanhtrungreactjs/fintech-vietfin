import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";
import { formatVND, formatDate } from "../lib/format";
import { Card, SectionTitle, Button, Input, Select, Badge, EmptyState, Alert, Modal } from "../components/ui";
import { HandCoins, PlusCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const STATUS_TONE = {
  PENDING: "yellow",
  APPROVED: "blue",
  REJECTED: "red",
  ACTIVE: "green",
  CLOSED: "gray",
  DEFAULTED: "red",
};

const STATUS_LABEL = {
  PENDING: "Chờ duyệt",
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
  const [form, setForm] = useState({ amount: "", purpose: "", termMonths: 6 });
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

  const apply = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    setResult(null);
    try {
      const { data } = await api.post("/lending/apply", {
        amount: Number(form.amount),
        purpose: form.purpose,
        termMonths: Number(form.termMonths),
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
                <div>
                  <p className="font-medium text-white">{loan.purpose}</p>
                  <p className="text-xs text-gray-500">
                    {formatVND(loan.amount)} · {loan.termMonths} tháng · Điểm TD: {loan.creditScore ?? "-"}
                    {loan.interestRate ? ` · Lãi suất ${loan.interestRate}%/năm` : ""}
                  </p>
                </div>
                <Badge tone={STATUS_TONE[loan.status]}>{STATUS_LABEL[loan.status]}</Badge>
              </Link>
            ))}
          </div>
        )}
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Đăng ký khoản vay">
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
            {error && <Alert>{error}</Alert>}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Đang chấm điểm tín dụng..." : "Gửi hồ sơ vay"}
            </Button>
          </form>
        ) : (
          <div className="space-y-3 text-sm">
            <Badge tone={STATUS_TONE[result.loan.status]}>{STATUS_LABEL[result.loan.status]}</Badge>
            <p className="text-gray-300">
              Điểm tín dụng: <span className="font-semibold text-white">{result.creditScore}</span> / 850
            </p>
            <p className="text-gray-400">{result.offer.reason}</p>
            {result.offer.approved && (
              <p className="text-gray-300">
                Hạn mức duyệt: {formatVND(result.offer.approvedAmount)} · Lãi suất {result.offer.interestRate}%/năm
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
