import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api/client";
import { formatVND, formatDate } from "../lib/format";
import { Card, SectionTitle, Button, Input, Badge, Alert, Modal, EmptyState } from "../components/ui";
import { ArrowLeft } from "lucide-react";
import InsurerLogo from "../components/InsurerLogo";
import { CATEGORY_FIELDS } from "../lib/insuranceFields";

const STATUS_TONE = { ACTIVE: "green", CANCELLED: "red", EXPIRED: "gray" };
const CLAIM_TONE = { SUBMITTED: "yellow", UNDER_REVIEW: "blue", APPROVED: "blue", REJECTED: "red", PAID: "green" };
const CLAIM_LABEL = {
  SUBMITTED: "Đã nộp",
  UNDER_REVIEW: "Đang xét duyệt",
  APPROVED: "Đã duyệt - chờ giải ngân",
  REJECTED: "Từ chối",
  PAID: "Đã bồi thường",
};

export default function PolicyDetail() {
  const { id } = useParams();
  const [policy, setPolicy] = useState(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ description: "", amountRequested: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await api.get(`/insurance/policies/${id}`);
    setPolicy(data.policy);
  };

  useEffect(() => {
    load();
  }, [id]);

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

  const submitClaim = async (e) => {
    e.preventDefault();
    await act(async () => {
      await api.post(`/insurance/policies/${id}/claims`, {
        description: form.description,
        amountRequested: Number(form.amountRequested),
      });
      setOpen(false);
      setForm({ description: "", amountRequested: "" });
    });
  };

  if (!policy) return <p className="text-gray-500">Đang tải...</p>;
  const subject = JSON.parse(policy.subjectInfo || "{}");

  return (
    <div className="max-w-3xl space-y-6">
      <Link to="/insurance" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white">
        <ArrowLeft size={16} /> Quay lại
      </Link>

      <Card>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <InsurerLogo src={policy.plan.insurerLogo} name={policy.plan.insurer} size="h-11 w-11" />
            <div>
              <h1 className="text-xl font-semibold text-white">{policy.plan.name}</h1>
              <p className="text-sm text-gray-400">{policy.plan.insurer}</p>
            </div>
          </div>
          <Badge tone={STATUS_TONE[policy.status]}>{policy.status}</Badge>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-white/10 p-4 sm:grid-cols-2">
          {(CATEGORY_FIELDS[policy.plan.category] || []).map((f) =>
            subject[f.key] ? (
              <div key={f.key}>
                <p className="text-xs text-gray-500">{f.label}</p>
                <p className="text-sm text-white">{f.type === "date" ? formatDate(subject[f.key]) : subject[f.key]}</p>
              </div>
            ) : null
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div>
            <p className="text-gray-500">Số tiền bảo hiểm</p>
            <p className="text-white">{formatVND(policy.sumInsured)}</p>
          </div>
          <div>
            <p className="text-gray-500">Phí bảo hiểm</p>
            <p className="text-white">{formatVND(policy.premium)}/năm</p>
          </div>
          <div>
            <p className="text-gray-500">Bắt đầu</p>
            <p className="text-white">{formatDate(policy.startDate)}</p>
          </div>
          <div>
            <p className="text-gray-500">Hết hạn</p>
            <p className="text-white">{formatDate(policy.endDate)}</p>
          </div>
        </div>
        {error && (
          <div className="mt-4">
            <Alert>{error}</Alert>
          </div>
        )}
        <div className="mt-4 flex gap-2">
          {policy.status === "ACTIVE" && (
            <>
              <Button onClick={() => setOpen(true)}>Nộp yêu cầu bồi thường</Button>
              <Button variant="secondary" disabled={busy} onClick={() => act(() => api.post(`/insurance/policies/${id}/cancel`))}>
                Huỷ hợp đồng
              </Button>
            </>
          )}
          {(policy.status === "ACTIVE" || policy.status === "EXPIRED") && (
            <Button variant="secondary" disabled={busy} onClick={() => act(() => api.post(`/insurance/policies/${id}/renew`))}>
              Gia hạn hợp đồng
            </Button>
          )}
        </div>
      </Card>

      <Card>
        <SectionTitle title="Yêu cầu bồi thường" />
        {policy.claims.length === 0 ? (
          <EmptyState message="Chưa có yêu cầu bồi thường nào." />
        ) : (
          <div className="divide-y divide-white/5">
            {policy.claims.map((c) => (
              <div key={c.id} className="py-4 text-sm">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-white">{c.description}</p>
                  <Badge tone={CLAIM_TONE[c.status]}>{CLAIM_LABEL[c.status]}</Badge>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Yêu cầu: {formatVND(c.amountRequested)}
                  {c.amountApproved != null && ` · Duyệt: ${formatVND(c.amountApproved)}`} · Nộp lúc{" "}
                  {formatDate(c.submittedAt)}
                </p>
                <div className="mt-2 flex gap-2">
                  {c.status === "SUBMITTED" && (
                    <Button
                      variant="secondary"
                      disabled={busy}
                      onClick={() => act(() => api.post(`/insurance/claims/${c.id}/review`))}
                    >
                      Xét duyệt hồ sơ
                    </Button>
                  )}
                  {c.status === "APPROVED" && (
                    <Button disabled={busy} onClick={() => act(() => api.post(`/insurance/claims/${c.id}/payout`))}>
                      Giải ngân bồi thường
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Nộp yêu cầu bồi thường">
        <form onSubmit={submitClaim} className="space-y-4">
          <Input
            label="Mô tả sự cố"
            required
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <Input
            label="Số tiền yêu cầu bồi thường (VND)"
            type="number"
            required
            value={form.amountRequested}
            onChange={(e) => setForm({ ...form, amountRequested: e.target.value })}
          />
          {error && <Alert>{error}</Alert>}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Đang gửi..." : "Gửi hồ sơ"}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
