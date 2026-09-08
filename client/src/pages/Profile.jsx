import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";
import { Card, SectionTitle, Button, Input, Select, Badge, Alert } from "../components/ui";
import { ShieldCheck, UserCog, Landmark } from "lucide-react";

function ProfileForm() {
  const { user, updateProfile } = useAuth();
  const [form, setForm] = useState({ fullName: user?.fullName || "", phone: user?.phone || "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      await updateProfile(form);
      setSuccess("Đã cập nhật thông tin cá nhân.");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <SectionTitle icon={<UserCog size={18} />} title="Chỉnh sửa thông tin cá nhân" />
      <form onSubmit={submit} className="space-y-4">
        <Input
          label="Họ và tên"
          required
          value={form.fullName}
          onChange={(e) => setForm({ ...form, fullName: e.target.value })}
        />
        <Input
          label="Số điện thoại"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          placeholder="VD: 0912345678"
        />
        <Input label="Email" value={user?.email || ""} disabled className="opacity-60" />
        {error && <Alert>{error}</Alert>}
        {success && <Alert tone="green">{success}</Alert>}
        <Button type="submit" disabled={loading}>
          {loading ? "Đang lưu..." : "Lưu thay đổi"}
        </Button>
      </form>
    </Card>
  );
}

function BankAccountSettings() {
  const [form, setForm] = useState({ bin: "", name: "", accountNumber: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api.get("/config/bank-account").then(({ data }) => {
      setForm(data);
      setLoaded(true);
    });
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const { data } = await api.put("/config/bank-account", form);
      setForm(data);
      setSuccess("Đã cập nhật tài khoản nhận tiền. Áp dụng ngay cho toàn bộ QR nạp/rút tiền.");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!loaded) return null;

  return (
    <Card>
      <SectionTitle icon={<Landmark size={18} />} title="Cấu hình tài khoản nhận tiền (Admin)" />
      <p className="mb-4 text-sm text-gray-400">
        Tài khoản ngân hàng hiển thị trên mã VietQR khi người dùng nạp/rút tiền. Thay đổi ở đây áp dụng ngay, không cần
        sửa file cấu hình hay khởi động lại server.
      </p>
      <form onSubmit={submit} className="space-y-4">
        <Input
          label="Mã BIN ngân hàng (NAPAS)"
          required
          value={form.bin}
          onChange={(e) => setForm({ ...form, bin: e.target.value })}
          placeholder="VD: 970423 (TPBank)"
        />
        <Input
          label="Tên ngân hàng"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="VD: TPBank (Ngân hàng TMCP Tiên Phong)"
        />
        <Input
          label="Số tài khoản"
          required
          value={form.accountNumber}
          onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
        />
        {error && <Alert>{error}</Alert>}
        {success && <Alert tone="green">{success}</Alert>}
        <Button type="submit" disabled={loading}>
          {loading ? "Đang lưu..." : "Lưu cấu hình"}
        </Button>
      </form>
    </Card>
  );
}

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
        <h1 className="text-2xl font-semibold text-white">Hồ sơ &amp; Cài đặt</h1>
        <p className="text-sm text-gray-400">Quản lý thông tin cá nhân, xác minh danh tính và cấu hình hệ thống.</p>
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

      <ProfileForm />

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

      {user?.isAdmin && <BankAccountSettings />}
    </div>
  );
}
