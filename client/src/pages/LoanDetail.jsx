import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api/client";
import { formatVND, formatDate } from "../lib/format";
import { Card, SectionTitle, Button, Badge, Alert } from "../components/ui";
import { ArrowLeft } from "lucide-react";

const SCHEDULE_TONE = { UPCOMING: "blue", PAID: "green", OVERDUE: "red" };
const SCHEDULE_LABEL = { UPCOMING: "Sắp đến hạn", PAID: "Đã thanh toán", OVERDUE: "Quá hạn" };

export default function LoanDetail() {
  const { id } = useParams();
  const [loan, setLoan] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await api.get(`/lending/applications/${id}`);
    setLoan(data.loan);
    setSchedule(data.schedule);
  };

  useEffect(() => {
    load();
  }, [id]);

  const disburse = async () => {
    setBusy(true);
    setError("");
    try {
      await api.post(`/lending/applications/${id}/disburse`);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const repay = async () => {
    setBusy(true);
    setError("");
    try {
      await api.post(`/lending/applications/${id}/repay`);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (!loan) return <p className="text-gray-500">Đang tải...</p>;

  const nextInstallment = schedule.find((s) => s.status !== "PAID");

  return (
    <div className="max-w-3xl space-y-6">
      <Link to="/lending" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white">
        <ArrowLeft size={16} /> Quay lại
      </Link>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-white">{loan.purpose}</h1>
            <p className="text-sm text-gray-400">
              {formatVND(loan.amount)} · {loan.termMonths} tháng · Lãi suất {loan.interestRate}%/năm
            </p>
          </div>
          <Badge tone={loan.status === "ACTIVE" ? "green" : loan.status === "APPROVED" ? "blue" : "gray"}>
            {loan.status}
          </Badge>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div>
            <p className="text-gray-500">Điểm tín dụng</p>
            <p className="text-white">{loan.creditScore}</p>
          </div>
          <div>
            <p className="text-gray-500">Ngày đăng ký</p>
            <p className="text-white">{formatDate(loan.createdAt)}</p>
          </div>
          {loan.disbursedAt && (
            <div>
              <p className="text-gray-500">Ngày giải ngân</p>
              <p className="text-white">{formatDate(loan.disbursedAt)}</p>
            </div>
          )}
        </div>
        {error && (
          <div className="mt-4">
            <Alert>{error}</Alert>
          </div>
        )}
        <div className="mt-4 flex gap-2">
          {loan.status === "APPROVED" && (
            <Button onClick={disburse} disabled={busy}>
              Giải ngân khoản vay
            </Button>
          )}
          {loan.status === "ACTIVE" && nextInstallment && (
            <Button onClick={repay} disabled={busy}>
              Trả nợ kỳ {nextInstallment.periodNumber} (
              {formatVND(nextInstallment.principalDue + nextInstallment.interestDue + nextInstallment.lateFee)})
            </Button>
          )}
        </div>
      </Card>

      {schedule.length > 0 && (
        <Card>
          <SectionTitle title="Lịch trả nợ" />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-gray-500">
                  <th className="py-2 pr-4 font-normal">Kỳ</th>
                  <th className="py-2 pr-4 font-normal">Ngày đến hạn</th>
                  <th className="py-2 pr-4 font-normal">Gốc</th>
                  <th className="py-2 pr-4 font-normal">Lãi</th>
                  <th className="py-2 pr-4 font-normal">Phạt trễ hạn</th>
                  <th className="py-2 pr-4 font-normal">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {schedule.map((s) => (
                  <tr key={s.id}>
                    <td className="py-3 pr-4 text-white">{s.periodNumber}</td>
                    <td className="py-3 pr-4 text-gray-400">{formatDate(s.dueDate)}</td>
                    <td className="py-3 pr-4 text-gray-400">{formatVND(s.principalDue)}</td>
                    <td className="py-3 pr-4 text-gray-400">{formatVND(s.interestDue)}</td>
                    <td className="py-3 pr-4 text-gray-400">{s.lateFee ? formatVND(s.lateFee) : "-"}</td>
                    <td className="py-3 pr-4">
                      <Badge tone={SCHEDULE_TONE[s.status]}>{SCHEDULE_LABEL[s.status]}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
