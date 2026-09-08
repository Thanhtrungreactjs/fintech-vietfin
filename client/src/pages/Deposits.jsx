import { useEffect, useState } from "react";
import api from "../api/client";
import { formatVND, formatDate } from "../lib/format";
import { Card, SectionTitle, Button, AmountInput, Badge, EmptyState, Alert, Modal } from "../components/ui";
import { PiggyBank, TrendingUp } from "lucide-react";
import InsurerLogo from "../components/InsurerLogo";
import { BANKS } from "../lib/banks";

const STATUS_TONE = { ACTIVE: "green", MATURED: "blue", WITHDRAWN: "gray", WITHDRAWN_EARLY: "yellow" };
const STATUS_LABEL = {
  ACTIVE: "Đang gửi",
  MATURED: "Đã đến hạn",
  WITHDRAWN: "Đã tất toán",
  WITHDRAWN_EARLY: "Đã tất toán trước hạn",
};

function bankLogo(code) {
  return BANKS.find((b) => b.code === code)?.logo;
}

export default function Deposits() {
  const [banks, setBanks] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [selectedBank, setSelectedBank] = useState(null);
  const [selectedTerm, setSelectedTerm] = useState(null);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [withdrawTarget, setWithdrawTarget] = useState(null);
  const [preview, setPreview] = useState(null);

  const load = async () => {
    const [{ data: b }, { data: d }] = await Promise.all([api.get("/deposits/banks"), api.get("/deposits")]);
    setBanks(b.banks);
    setDeposits(d.deposits);
  };

  useEffect(() => {
    load();
  }, []);

  const openBank = (bank) => {
    setSelectedBank(bank);
    setSelectedTerm(null);
    setAmount("");
    setError("");
  };

  const closeOpenModal = () => {
    setSelectedBank(null);
    setSelectedTerm(null);
    setAmount("");
    setError("");
  };

  const submitOpen = async (e) => {
    e.preventDefault();
    setError("");
    if (!selectedTerm) {
      setError("Vui lòng chọn kỳ hạn");
      return;
    }
    setBusy(true);
    try {
      await api.post("/deposits", { bankCode: selectedBank.code, amount: Number(amount), termMonths: selectedTerm });
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

  const rate = selectedBank && selectedTerm ? selectedBank.rates[selectedTerm] : null;
  const projected = rate && amount ? Math.round(Number(amount) * (rate / 100) * (selectedTerm / 12)) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Tiết kiệm &amp; Đầu tư tiền gửi</h1>
        <p className="text-sm text-gray-400">
          Lãi suất tiết kiệm thực tế của các ngân hàng Việt Nam — chọn ngân hàng và kỳ hạn phù hợp.
        </p>
      </div>

      <Card>
        <SectionTitle icon={<PiggyBank size={18} />} title="Chọn ngân hàng gửi tiết kiệm" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {banks.map((bank) => {
            const bestRate = Math.max(...Object.values(bank.rates));
            return (
              <button
                key={bank.code}
                type="button"
                onClick={() => openBank(bank)}
                className="flex flex-col items-center gap-2 rounded-xl border border-white/10 p-4 text-center hover:border-emerald-500/40 hover:bg-white/5"
              >
                <InsurerLogo src={bankLogo(bank.code)} name={bank.name} size="h-11 w-11" />
                <span className="text-sm font-medium text-gray-200">{bank.name}</span>
                <span className="text-xs text-gray-500">
                  Lãi suất cao nhất <span className="text-emerald-400">{bestRate}%/năm</span>
                </span>
              </button>
            );
          })}
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
                <div className="flex items-center gap-3">
                  <InsurerLogo src={bankLogo(d.bankCode)} name={d.bankName} size="h-9 w-9" />
                  <div>
                    <p className="font-medium text-white">
                      {d.bankName} · {formatVND(d.principal)} · Kỳ hạn {d.termMonths} tháng · {d.interestRate}%/năm
                    </p>
                    <p className="text-xs text-gray-500">
                      Ngày gửi {formatDate(d.startDate)} · Đáo hạn {formatDate(d.maturityDate)}
                      {d.interestPaid != null && ` · Lãi thực nhận: ${formatVND(d.interestPaid)}`}
                    </p>
                  </div>
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

      <Modal open={!!selectedBank} onClose={closeOpenModal} title={`Gửi tiết kiệm tại ${selectedBank?.name || ""}`}>
        <form onSubmit={submitOpen} className="space-y-4">
          <div className="flex items-center gap-3">
            <InsurerLogo src={bankLogo(selectedBank?.code)} name={selectedBank?.name} size="h-10 w-10" />
            <p className="text-sm text-gray-400">Lãi suất niêm yết thực tế của {selectedBank?.name}</p>
          </div>

          <div>
            <span className="mb-2 block text-sm text-gray-400">Chọn kỳ hạn</span>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {selectedBank &&
                Object.entries(selectedBank.rates).map(([months, r]) => (
                  <button
                    key={months}
                    type="button"
                    onClick={() => setSelectedTerm(Number(months))}
                    className={`rounded-xl border p-2 text-center ${
                      selectedTerm === Number(months)
                        ? "border-emerald-500/60 bg-emerald-500/10"
                        : "border-white/10 hover:border-white/20"
                    }`}
                  >
                    <p className="text-xs text-gray-500">{months} tháng</p>
                    <p className="font-semibold text-white">{r}%</p>
                  </button>
                ))}
            </div>
          </div>

          <AmountInput label="Số tiền gửi (VND)" required placeholder="0" value={amount} onChange={setAmount} />

          {rate && amount > 0 && (
            <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm">
              <div className="flex items-center gap-2 text-emerald-400">
                <TrendingUp size={16} />
                <span>Lãi suất {rate}%/năm</span>
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
