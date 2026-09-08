import { useEffect, useState } from "react";
import api from "../api/client";
import { formatVND, formatDateTime } from "../lib/format";
import { Card, SectionTitle, Button, Input, Badge, EmptyState, Alert, Select } from "../components/ui";
import { ShieldAlert } from "lucide-react";
import { BANKS } from "../lib/banks";

const STATUS_TONE = { PENDING: "yellow", APPROVED: "blue", REJECTED: "red", ACTIVE: "green", CLOSED: "gray", DEFAULTED: "red" };
const STATUS_LABEL = {
  PENDING: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Đã từ chối",
  ACTIVE: "Đang vay",
  CLOSED: "Đã tất toán",
  DEFAULTED: "Vỡ nợ",
};

export default function AdminLending() {
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [loans, setLoans] = useState([]);
  const [overrides, setOverrides] = useState({});
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    const { data } = await api.get("/lending/admin/applications", { params: { status: statusFilter } });
    setLoans(data.loans);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const approve = async (loan) => {
    setError("");
    setBusyId(loan.id);
    try {
      const rateOverride = overrides[loan.id];
      await api.post(`/lending/admin/applications/${loan.id}/approve`, {
        interestRate: rateOverride ? Number(rateOverride) : undefined,
      });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (loan) => {
    setError("");
    setBusyId(loan.id);
    try {
      await api.post(`/lending/admin/applications/${loan.id}/reject`, {});
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Duyệt hồ sơ vay (Admin)</h1>
        <p className="text-sm text-gray-400">
          Chỉ tài khoản quản trị mới thấy và thao tác được trang này. Điểm tín dụng/lãi suất bên dưới chỉ là gợi ý
          từ hệ thống chấm điểm — quyết định cuối cùng do bạn xem xét và phê duyệt.
        </p>
      </div>

      <Card>
        <SectionTitle
          icon={<ShieldAlert size={18} />}
          title="Danh sách hồ sơ"
          action={
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-44">
              <option value="PENDING">Chờ duyệt</option>
              <option value="APPROVED">Đã duyệt</option>
              <option value="REJECTED">Đã từ chối</option>
              <option value="ALL">Tất cả</option>
            </Select>
          }
        />
        {error && (
          <div className="mb-4">
            <Alert>{error}</Alert>
          </div>
        )}
        {loans.length === 0 ? (
          <EmptyState message="Không có hồ sơ nào." />
        ) : (
          <div className="divide-y divide-white/5">
            {loans.map((loan) => (
              <div key={loan.id} className="py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-white">
                      {loan.user.fullName} <span className="text-gray-500">({loan.user.email})</span>
                    </p>
                    <p className="text-xs text-gray-500">
                      {loan.purpose} · {formatVND(loan.amount)} · {loan.termMonths} tháng · Nộp lúc{" "}
                      {formatDateTime(loan.createdAt)}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      Điểm tín dụng gợi ý: <span className="text-white">{loan.creditScore ?? "-"}</span> · Lãi suất gợi ý:{" "}
                      <span className="text-white">{loan.interestRate ? `${loan.interestRate}%/năm` : "-"}</span> · KYC:{" "}
                      <Badge tone={loan.user.kycStatus === "VERIFIED" ? "green" : "yellow"}>{loan.user.kycStatus}</Badge>
                    </p>
                    {loan.disbursementBankName && (
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-400">
                        <img
                          src={BANKS.find((b) => b.code === loan.disbursementBank)?.logo}
                          alt={loan.disbursementBankName}
                          className="h-4 w-4 rounded bg-white object-contain p-0.5"
                        />
                        Giải ngân về {loan.disbursementBankName} · {loan.disbursementAccountNumber}
                      </p>
                    )}
                    {loan.decisionNote && <p className="mt-1 text-xs text-gray-500">{loan.decisionNote}</p>}
                  </div>
                  <Badge tone={STATUS_TONE[loan.status]}>{STATUS_LABEL[loan.status]}</Badge>
                </div>

                {loan.status === "PENDING" && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Input
                      type="number"
                      placeholder={`Lãi suất %/năm (mặc định ${loan.interestRate ?? "-"})`}
                      className="w-64"
                      value={overrides[loan.id] || ""}
                      onChange={(e) => setOverrides({ ...overrides, [loan.id]: e.target.value })}
                    />
                    <Button disabled={busyId === loan.id} onClick={() => approve(loan)}>
                      Phê duyệt
                    </Button>
                    <Button variant="danger" disabled={busyId === loan.id} onClick={() => reject(loan)}>
                      Từ chối
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
