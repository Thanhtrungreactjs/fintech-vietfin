import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button, Input, Select, Alert } from "../components/ui";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", password: "", role: "PERSONAL" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(form);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#080b09] px-4 py-10">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#101613] p-8">
        <div className="mb-6 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 text-black font-bold">₫</div>
          <span className="text-lg font-semibold text-white">Thành Trung Fintech</span>
        </div>
        <h1 className="mb-1 text-xl font-semibold text-white">Tạo tài khoản</h1>
        <p className="mb-6 text-sm text-gray-400">Mở tài khoản ngân hàng số miễn phí.</p>

        <form onSubmit={submit} className="space-y-4">
          <Input
            label="Họ và tên"
            required
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
          />
          <Input
            label="Email"
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <Input
            label="Số điện thoại"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <Select label="Loại tài khoản" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="PERSONAL">Cá nhân</option>
            <option value="BUSINESS">Doanh nghiệp</option>
          </Select>
          <Input
            label="Mật khẩu"
            type="password"
            required
            minLength={6}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          {error && <Alert>{error}</Alert>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Đang tạo tài khoản..." : "Đăng ký"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-400">
          Đã có tài khoản?{" "}
          <Link to="/login" className="text-emerald-400 hover:underline">
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
}
