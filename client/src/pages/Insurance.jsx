import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";
import { formatVND, formatDate } from "../lib/format";
import { Card, SectionTitle, Button, Input, Select, Badge, EmptyState, Alert, Modal } from "../components/ui";
import { ShieldCheck, CheckCircle2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { CATEGORY_FIELDS, emptySubjectInfo } from "../lib/insuranceFields";

const CATEGORY_LABEL = { HEALTH: "Sức khoẻ", VEHICLE: "Phương tiện", HOME: "Nhà ở", TRAVEL: "Du lịch", LIFE: "Nhân thọ" };
const STATUS_TONE = { ACTIVE: "green", CANCELLED: "red", EXPIRED: "gray" };
const STATUS_LABEL = { ACTIVE: "Hiệu lực", CANCELLED: "Đã huỷ", EXPIRED: "Hết hạn" };

function parseHighlights(plan) {
  try {
    const arr = JSON.parse(plan.highlights || "[]");
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export default function Insurance() {
  const { user } = useAuth();
  const [plans, setPlans] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [plan, setPlan] = useState(null);
  const [sumInsured, setSumInsured] = useState("");
  const [subject, setSubject] = useState({});
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

  const openPlan = (p) => {
    setPlan(p);
    setSubject(emptySubjectInfo(p.category));
    setSumInsured("");
    setQuote(null);
    setError("");
  };

  const fields = plan ? CATEGORY_FIELDS[plan.category] || [] : [];

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
        subjectInfo: subject,
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
    setSubject({});
    setError("");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Bảo hiểm (Insurtech)</h1>
        <p className="text-sm text-gray-400">
          Đăng ký gói bảo hiểm từ các hãng bảo hiểm thật, tính phí tự động dựa trên dữ liệu hành vi và quản lý hợp đồng.
        </p>
      </div>

      {user?.kycStatus !== "VERIFIED" && (
        <Alert>Bạn cần hoàn tất xác minh danh tính (KYC) trong mục Hồ sơ trước khi mua bảo hiểm.</Alert>
      )}

      <Card>
        <SectionTitle icon={<ShieldCheck size={18} />} title="Gói bảo hiểm" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((p) => (
            <div key={p.id} className="flex flex-col rounded-xl border border-white/10 p-4">
              <div className="mb-2 flex items-center gap-2">
                {p.insurerLogo && (
                  <img src={p.insurerLogo} alt={p.insurer} className="h-8 w-8 rounded-lg bg-white object-contain p-1" />
                )}
                <div>
                  <p className="text-xs uppercase tracking-wide text-emerald-400">{CATEGORY_LABEL[p.category]}</p>
                  <p className="text-xs text-gray-500">{p.insurer}</p>
                </div>
              </div>
              <p className="font-medium text-white">{p.name}</p>
              <p className="mt-1 text-xs text-gray-500">{p.description}</p>
              {parseHighlights(p).length > 0 && (
                <ul className="mt-2 space-y-1">
                  {parseHighlights(p).map((h, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-gray-400">
                      <CheckCircle2 size={12} className="mt-0.5 shrink-0 text-emerald-400" />
                      {h}
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-2 text-xs text-gray-400">
                Phí cơ bản: {p.baseRate}%/năm · Kỳ hạn {p.termMonths} tháng
              </p>
              <Button
                variant="secondary"
                className="mt-3 w-full"
                disabled={user?.kycStatus !== "VERIFIED"}
                onClick={() => openPlan(p)}
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
                <div className="flex items-center gap-3">
                  {pol.plan.insurerLogo && (
                    <img
                      src={pol.plan.insurerLogo}
                      alt={pol.plan.insurer}
                      className="h-8 w-8 shrink-0 rounded-lg bg-white object-contain p-1"
                    />
                  )}
                  <div>
                    <p className="font-medium text-white">{pol.plan.name}</p>
                    <p className="text-xs text-gray-500">
                      {pol.plan.insurer} · Số tiền BH: {formatVND(pol.sumInsured)} · Phí: {formatVND(pol.premium)}/năm ·
                      Hết hạn {formatDate(pol.endDate)}
                    </p>
                  </div>
                </div>
                <Badge tone={STATUS_TONE[pol.status]}>{STATUS_LABEL[pol.status]}</Badge>
              </Link>
            ))}
          </div>
        )}
      </Card>

      <Modal open={!!plan} onClose={closeModal} title={`Đăng ký: ${plan?.name || ""}`} size="lg">
        {!quote ? (
          <form onSubmit={getQuote} className="space-y-4">
            {plan?.insurer && <p className="text-xs text-gray-500">Bảo lãnh phát hành bởi {plan.insurer}</p>}
            <Input
              label="Số tiền bảo hiểm (VND)"
              type="number"
              min={plan?.minSumInsured || 1000000}
              max={plan?.maxSumInsured || undefined}
              required
              value={sumInsured}
              onChange={(e) => setSumInsured(e.target.value)}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {fields.map((f) =>
                f.type === "select" ? (
                  <Select
                    key={f.key}
                    label={f.label}
                    required={f.required}
                    value={subject[f.key] || ""}
                    onChange={(e) => setSubject({ ...subject, [f.key]: e.target.value })}
                  >
                    <option value="" disabled>
                      Chọn...
                    </option>
                    {f.options.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <Input
                    key={f.key}
                    label={f.label}
                    type={f.type || "text"}
                    required={f.required}
                    placeholder={f.placeholder}
                    value={subject[f.key] || ""}
                    onChange={(e) => setSubject({ ...subject, [f.key]: e.target.value })}
                  />
                )
              )}
            </div>
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
