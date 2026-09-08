import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button, Input, Alert } from "../components/ui";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#080b09] px-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#101613] p-8">
        <div className="mb-6 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 text-black font-bold">₫</div>
          <span className="text-lg font-semibold text-white">Thành Trung Fintech</span>
        </div>
        <h1 className="mb-1 text-xl font-semibold text-white">Đăng nhập</h1>
        <p className="mb-6 text-sm text-gray-400">Truy cập nền tảng tài chính số của bạn.</p>

        <form onSubmit={submit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="ban@email.com"
          />
          <Input
            label="Mật khẩu"
            type="password"
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="••••••••"
          />
          {error && <Alert>{error}</Alert>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-400">
          Chưa có tài khoản?{" "}
          <Link to="/register" className="text-emerald-400 hover:underline">
            Đăng ký ngay
          </Link>
        </p>
      </div>
    </div>
  );
}
