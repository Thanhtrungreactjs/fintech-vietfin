import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";
import { Card, SectionTitle, Button, Input, Select, Badge, Alert } from "../components/ui";
import { ShieldCheck } from "lucide-react";

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [form, setForm] = useState({ idType: "NATIONAL_ID", idNumber: "", dob: "", address: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const submitKyc = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/kyc", form);
      setSuccess(
        data.status === "VERIFIED"
          ? "Xác minh danh tính thành công!"
          : "Hồ sơ bị từ chối. Vui lòng kiểm tra lại số giấy tờ."
      );
      await refreshUser();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Hồ sơ &amp; Xác minh danh tính</h1>
        <p className="text-sm text-gray-400">Hoàn tất eKYC để mở khoá vay P2P và mua bảo hiểm.</p>
      </div>

      <Card>
        <SectionTitle icon={<ShieldCheck size={18} />} title="Thông tin tài khoản" />
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Họ và tên</p>
            <p className="text-white">{user?.fullName}</p>
          </div>
          <div>
            <p className="text-gray-500">Email</p>
            <p className="text-white">{user?.email}</p>
          </div>
          <div>
            <p className="text-gray-500">Loại tài khoản</p>
            <p className="text-white">{user?.role === "BUSINESS" ? "Doanh nghiệp" : "Cá nhân"}</p>
          </div>
          <div>
            <p className="text-gray-500">Trạng thái KYC</p>
            <Badge tone={user?.kycStatus === "VERIFIED" ? "green" : "yellow"}>{user?.kycStatus}</Badge>
          </div>
        </div>
      </Card>

      {user?.kycStatus !== "VERIFIED" && (
        <Card>
          <SectionTitle title="Xác minh danh tính (eKYC)" />
          <form onSubmit={submitKyc} className="space-y-4">
            <Select label="Loại giấy tờ" value={form.idType} onChange={(e) => setForm({ ...form, idType: e.target.value })}>
              <option value="NATIONAL_ID">CCCD/CMND</option>
              <option value="PASSPORT">Hộ chiếu</option>
            </Select>
            <Input
              label="Số giấy tờ"
              required
              value={form.idNumber}
              onChange={(e) => setForm({ ...form, idNumber: e.target.value })}
            />
            <Input
              label="Ngày sinh"
              type="date"
              required
              value={form.dob}
              onChange={(e) => setForm({ ...form, dob: e.target.value })}
            />
            <Input
              label="Địa chỉ"
              required
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
            {error && <Alert>{error}</Alert>}
            {success && <Alert tone="green">{success}</Alert>}
            <Button type="submit" disabled={loading}>
              {loading ? "Đang xác minh..." : "Gửi xác minh"}
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}
