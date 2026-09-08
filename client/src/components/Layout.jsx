import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { LayoutDashboard, Wallet, HandCoins, ShieldCheck, Building2, PiggyBank, LogOut, UserCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const navItems = [
  { to: "/", label: "Tổng quan", icon: LayoutDashboard, end: true },
  { to: "/wallet", label: "Ví điện tử", icon: Wallet },
  { to: "/deposits", label: "Tiết kiệm", icon: PiggyBank },
  { to: "/lending", label: "Cho vay P2P", icon: HandCoins },
  { to: "/insurance", label: "Bảo hiểm", icon: ShieldCheck },
  { to: "/corporate", label: "Tài chính DN", icon: Building2 },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen bg-[#080b09] text-gray-200">
      <aside className="flex w-64 flex-col border-r border-white/10 bg-[#0b0f0d] px-4 py-6">
        <div className="mb-8 flex items-center gap-2 px-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 text-black font-bold">₫</div>
          <span className="text-lg font-semibold text-white">VietFin</span>
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive ? "bg-emerald-500/15 text-emerald-400" : "text-gray-400 hover:bg-white/5 hover:text-white"
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="space-y-1 border-t border-white/10 pt-4">
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                isActive ? "bg-emerald-500/15 text-emerald-400" : "text-gray-400 hover:bg-white/5 hover:text-white"
              }`
            }
          >
            <UserCircle size={18} />
            Hồ sơ &amp; KYC
          </NavLink>
          <button
            onClick={() => {
              logout();
              navigate("/login");
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-400 transition hover:bg-white/5 hover:text-white"
          >
            <LogOut size={18} />
            Đăng xuất
          </button>
        </div>
      </aside>

      <div className="flex-1">
        <header className="flex items-center justify-between border-b border-white/10 bg-[#0b0f0d]/60 px-8 py-4 backdrop-blur">
          <div>
            <p className="text-sm text-gray-500">Xin chào,</p>
            <p className="font-medium text-white">{user?.fullName}</p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-xs text-gray-400">
            {user?.kycStatus === "VERIFIED" ? (
              <span className="text-emerald-400">● Đã xác minh KYC</span>
            ) : (
              <span className="text-amber-400">● Chưa xác minh KYC</span>
            )}
          </div>
        </header>
        <main className="p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
