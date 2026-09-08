import { useEffect, useState } from "react";
import api from "../api/client";
import { formatVND, formatDate } from "../lib/format";
import { Card, SectionTitle, Button, AmountInput, Badge, EmptyState, Alert, Modal } from "../components/ui";
import { PiggyBank, TrendingUp } from "lucide-react";

const STATUS_TONE = { ACTIVE: "green", MATURED: "blue", WITHDRAWN: "gray", WITHDRAWN_EARLY: "yellow" };
const STATUS_LABEL = {
  ACTIVE: "Đang gửi",
  MATURED: "Đã đến hạn",
  WITHDRAWN: "Đã tất toán",
  WITHDRAWN_EARLY: "Đã tất toán trước hạn",
};

export default function Deposits() {
  const [rates, setRates] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [openTerm, setOpenTerm] = useState(null);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [withdrawTarget, setWithdrawTarget] = useState(null);
  const [preview, setPreview] = useState(null);

  const load = async () => {
    const [{ data: r }, { data: d }] = await Promise.all([api.get("/deposits/rates"), api.get("/deposits")]);
    setRates(r.rates);
    setDeposits(d.deposits);
  };

  useEffect(() => {
    load();
  }, []);

  const closeOpenModal = () => {
    setOpenTerm(null);
    setAmount("");
    setError("");
  };

  const submitOpen = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api.post("/deposits", { amount: Number(amount), termMonths: openTerm.months });
      closeOpenModal();
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const openWithdraw = async (deposit) => {
    setWithdrawTarget(deposit);
    setPreview(null);
    setError("");
    try {
      const { data } = await api.get(`/deposits/${deposit.id}/preview-withdraw`);
      setPreview(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const confirmWithdraw = async () => {
    setBusy(true);
    setError("");
    try {
      await api.post(`/deposits/${withdrawTarget.id}/withdraw`);
      setWithdrawTarget(null);
      setPreview(null);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const projected = openTerm && amount ? Math.round(Number(amount) * (openTerm.rate / 100) * (openTerm.months / 12)) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Tiết kiệm &amp; Đầu tư tiền gửi</h1>
        <p className="text-sm text-gray-400">Gửi tiết kiệm có kỳ hạn với lãi suất cố định, tất toán linh hoạt.</p>
      </div>

      <Card>
        <SectionTitle icon={<PiggyBank size={18} />} title="Lãi suất theo kỳ hạn" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {rates.map((r) => (
            <div key={r.months} className="rounded-xl border border-white/10 p-4 text-center">
              <p className="text-xs text-gray-500">Kỳ hạn</p>
              <p className="text-lg font-semibold text-white">{r.months} tháng</p>
              <p className="mt-1 text-2xl font-semibold text-emerald-400">{r.rate}%</p>
              <p className="text-xs text-gray-500">/năm</p>
              <Button variant="secondary" className="mt-3 w-full" onClick={() => setOpenTerm(r)}>
                Gửi tiết kiệm
              </Button>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle title="Sổ tiết kiệm của tôi" />
        {deposits.length === 0 ? (
          <EmptyState message="Bạn chưa có sổ tiết kiệm nào." />
        ) : (
          <div className="divide-y divide-white/5">
            {deposits.map((d) => (
              <div key={d.id} className="flex items-center justify-between py-4 text-sm">
                <div>
                  <p className="font-medium text-white">
                    {formatVND(d.principal)} · Kỳ hạn {d.termMonths} tháng · {d.interestRate}%/năm
                  </p>
                  <p className="text-xs text-gray-500">
                    Ngày gửi {formatDate(d.startDate)} · Đáo hạn {formatDate(d.maturityDate)}
                    {d.interestPaid != null && ` · Lãi thực nhận: ${formatVND(d.interestPaid)}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={STATUS_TONE[d.status]}>{STATUS_LABEL[d.status]}</Badge>
                  {(d.status === "ACTIVE" || d.status === "MATURED") && (
                    <Button variant="secondary" onClick={() => openWithdraw(d)}>
                      Tất toán
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal open={!!openTerm} onClose={closeOpenModal} title={`Gửi tiết kiệm kỳ hạn ${openTerm?.months || ""} tháng`}>
        <form onSubmit={submitOpen} className="space-y-4">
          <AmountInput label="Số tiền gửi (VND)" required placeholder="0" value={amount} onChange={setAmount} />
          {openTerm && amount > 0 && (
            <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm">
              <div className="flex items-center gap-2 text-emerald-400">
                <TrendingUp size={16} />
                <span>Lãi suất {openTerm.rate}%/năm</span>
              </div>
              <p className="mt-2 text-gray-400">
                Lãi dự kiến khi đáo hạn: <span className="text-white">{formatVND(projected)}</span>
              </p>
              <p className="text-gray-400">
                Tổng nhận khi đáo hạn: <span className="text-white">{formatVND(Number(amount) + projected)}</span>
              </p>
            </div>
          )}
          {error && <Alert>{error}</Alert>}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Đang xử lý..." : "Xác nhận gửi tiết kiệm"}
          </Button>
        </form>
      </Modal>

      <Modal open={!!withdrawTarget} onClose={() => setWithdrawTarget(null)} title="Tất toán sổ tiết kiệm">
        {!preview ? (
          <p className="text-sm text-gray-400">Đang tính toán...</p>
        ) : (
          <div className="space-y-3 text-sm">
            {!preview.isMatured && (
              <Alert tone="red">
                Sổ tiết kiệm chưa đến hạn — tất toán trước hạn chỉ được hưởng lãi suất không kỳ hạn (0.5%/năm) thay vì
                lãi suất đã cam kết.
              </Alert>
            )}
            <p className="text-gray-400">
              Tiền gốc: <span className="text-white">{formatVND(withdrawTarget?.principal)}</span>
            </p>
            <p className="text-gray-400">
              Tiền lãi: <span className="text-white">{formatVND(preview.interest)}</span>
            </p>
            <p className="text-base font-semibold text-white">Tổng nhận về ví: {formatVND(preview.totalPayout)}</p>
            {error && <Alert>{error}</Alert>}
            <Button className="w-full" onClick={confirmWithdraw} disabled={busy}>
              {busy ? "Đang xử lý..." : "Xác nhận tất toán"}
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
