import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";
import { formatVND, formatDate } from "../lib/format";
import { Card, SectionTitle, Button, Input, Badge, EmptyState, Alert, Modal } from "../components/ui";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const CATEGORY_LABEL = { HEALTH: "Sức khoẻ", VEHICLE: "Phương tiện", HOME: "Nhà ở", TRAVEL: "Du lịch" };
const STATUS_TONE = { ACTIVE: "green", CANCELLED: "red", EXPIRED: "gray" };
const STATUS_LABEL = { ACTIVE: "Hiệu lực", CANCELLED: "Đã huỷ", EXPIRED: "Hết hạn" };

export default function Insurance() {
  const { user } = useAuth();
  const [plans, setPlans] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [plan, setPlan] = useState(null);
  const [sumInsured, setSumInsured] = useState("");
  const [subject, setSubject] = useState("");
  const [quote, setQuote] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [{ data: p }, { data: pol }] = await Promise.all([
      api.get("/insurance/plans"),
      api.get("/insurance/policies"),
    ]);
    setPlans(p.plans);
    setPolicies(pol.policies);
  };

  useEffect(() => {
    load();
  }, []);

  const getQuote = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const { data } = await api.post("/insurance/quote", { planId: plan.id, sumInsured: Number(sumInsured) });
      setQuote(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const confirmBuy = async () => {
    setBusy(true);
    setError("");
    try {
      await api.post("/insurance/policies", {
        planId: plan.id,
        sumInsured: Number(sumInsured),
        subjectInfo: { description: subject },
      });
      closeModal();
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const closeModal = () => {
    setPlan(null);
    setQuote(null);
    setSumInsured("");
    setSubject("");
    setError("");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Bảo hiểm (Insurtech)</h1>
        <p className="text-sm text-gray-400">Đăng ký, tính phí tự động dựa trên dữ liệu hành vi và quản lý hợp đồng.</p>
      </div>

      {user?.kycStatus !== "VERIFIED" && (
        <Alert>Bạn cần hoàn tất xác minh danh tính (KYC) trong mục Hồ sơ trước khi mua bảo hiểm.</Alert>
      )}

      <Card>
        <SectionTitle icon={<ShieldCheck size={18} />} title="Gói bảo hiểm" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((p) => (
            <div key={p.id} className="rounded-xl border border-white/10 p-4">
              <p className="text-xs uppercase tracking-wide text-emerald-400">{CATEGORY_LABEL[p.category]}</p>
              <p className="mt-1 font-medium text-white">{p.name}</p>
              <p className="mt-1 text-xs text-gray-500">{p.description}</p>
              <p className="mt-2 text-xs text-gray-400">Phí cơ bản: {p.baseRate}%/năm trên số tiền bảo hiểm</p>
              <Button
                variant="secondary"
                className="mt-3 w-full"
                disabled={user?.kycStatus !== "VERIFIED"}
                onClick={() => setPlan(p)}
              >
                Đăng ký
              </Button>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle title="Hợp đồng của tôi" />
        {policies.length === 0 ? (
          <EmptyState message="Bạn chưa có hợp đồng bảo hiểm nào." />
        ) : (
          <div className="divide-y divide-white/5">
            {policies.map((pol) => (
              <Link
                key={pol.id}
                to={`/insurance/${pol.id}`}
                className="flex items-center justify-between py-4 text-sm hover:bg-white/5 rounded-lg px-2 -mx-2"
              >
                <div>
                  <p className="font-medium text-white">{pol.plan.name}</p>
                  <p className="text-xs text-gray-500">
                    Số tiền BH: {formatVND(pol.sumInsured)} · Phí: {formatVND(pol.premium)}/năm · Hết hạn{" "}
                    {formatDate(pol.endDate)}
                  </p>
                </div>
                <Badge tone={STATUS_TONE[pol.status]}>{STATUS_LABEL[pol.status]}</Badge>
              </Link>
            ))}
          </div>
        )}
      </Card>

      <Modal open={!!plan} onClose={closeModal} title={`Đăng ký: ${plan?.name || ""}`}>
        {!quote ? (
          <form onSubmit={getQuote} className="space-y-4">
            <Input
              label="Số tiền bảo hiểm (VND)"
              type="number"
              min="1000000"
              required
              value={sumInsured}
              onChange={(e) => setSumInsured(e.target.value)}
            />
            <Input
              label="Thông tin đối tượng được bảo hiểm"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="VD: Xe Honda Vision 2022, biển số 59A-123.45"
            />
            {error && <Alert>{error}</Alert>}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Đang tính phí..." : "Xem báo phí"}
            </Button>
          </form>
        ) : (
          <div className="space-y-3 text-sm">
            <p className="text-gray-400">Điểm rủi ro (dựa trên dữ liệu hành vi): <span className="text-white">{quote.riskScore}</span></p>
            <p className="text-gray-400">Hệ số rủi ro: <span className="text-white">x{quote.riskMultiplier}</span></p>
            <p className="text-lg font-semibold text-white">Phí bảo hiểm: {formatVND(quote.premium)}/năm</p>
            {error && <Alert>{error}</Alert>}
            <div className="flex gap-2">
              <Button variant="secondary" className="w-full" onClick={() => setQuote(null)}>
                Quay lại
              </Button>
              <Button className="w-full" onClick={confirmBuy} disabled={busy}>
                {busy ? "Đang xử lý..." : "Xác nhận mua"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
