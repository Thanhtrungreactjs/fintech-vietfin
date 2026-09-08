import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Wallet,
  HandCoins,
  ShieldCheck,
  Building2,
  PiggyBank,
  LineChart,
  ShieldAlert,
  LogOut,
  UserCircle,
  CheckCircle2,
  ChevronDown,
  Wallet2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";
import { getSocket } from "../lib/socket";
import { formatVND } from "../lib/format";

const navGroups = [
  { items: [{ to: "/", label: "Tổng quan", icon: LayoutDashboard, end: true }] },
  {
    label: "Sản phẩm tài chính",
    items: [
      { to: "/wallet", label: "Ví điện tử", icon: Wallet },
      { to: "/deposits", label: "Tiết kiệm", icon: PiggyBank },
      { to: "/lending", label: "Cho vay P2P", icon: HandCoins },
      { to: "/insurance", label: "Bảo hiểm", icon: ShieldCheck },
      { to: "/trading", label: "Trading", icon: LineChart },
    ],
  },
  { label: "Doanh nghiệp", items: [{ to: "/corporate", label: "Tài chính DN", icon: Building2 }] },
];

const PAGE_TITLES = [
  { match: /^\/$/, title: "Tổng quan tài khoản" },
  { match: /^\/wallet/, title: "Ví điện tử" },
  { match: /^\/deposits/, title: "Tiết kiệm & Đầu tư" },
  { match: /^\/lending\/.+/, title: "Chi tiết khoản vay" },
  { match: /^\/lending/, title: "Cho vay ngang hàng" },
  { match: /^\/insurance\/.+/, title: "Chi tiết hợp đồng" },
  { match: /^\/insurance/, title: "Bảo hiểm" },
  { match: /^\/corporate/, title: "Tài chính doanh nghiệp" },
  { match: /^\/trading/, title: "Trading Playground" },
  { match: /^\/admin\/lending/, title: "Duyệt hồ sơ vay" },
  { match: /^\/profile/, title: "Hồ sơ & Cài đặt" },
];

function pageTitleFor(pathname) {
  return PAGE_TITLES.find((p) => p.match.test(pathname))?.title || "";
}

function initialsFor(name) {
  return (name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function Avatar({ name, size = "h-9 w-9" }) {
  return (
    <div className={`flex ${size} shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-sm font-semibold text-black`}>
      {initialsFor(name)}
    </div>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [toast, setToast] = useState(null);
  const [balance, setBalance] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const items = user?.isAdmin
    ? [...navGroups, { label: "Quản trị", items: [{ to: "/admin/lending", label: "Duyệt vay", icon: ShieldAlert }] }]
    : navGroups;

  const loadBalance = () => {
    api
      .get("/wallet")
      .then(({ data }) => setBalance(data.wallet.balance))
      .catch(() => {});
  };

  useEffect(() => {
    loadBalance();
  }, []);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let socket = null;

    const onCredited = (payload) => {
      setToast(`Đã nhận ${formatVND(payload.transaction.amount)} vào ví qua chuyển khoản ngân hàng!`);
      setTimeout(() => setToast(null), 6000);
      loadBalance();
    };

    // AuthProvider (an ancestor) connects the socket in its own effect, which
    // may run after this one — poll briefly until it's available.
    const attach = () => {
      socket = getSocket();
      if (socket) {
        socket.on("wallet:credited", onCredited);
      } else if (!cancelled) {
        setTimeout(attach, 300);
      }
    };
    attach();

    return () => {
      cancelled = true;
      if (socket) socket.off("wallet:credited", onCredited);
    };
  }, []);

  return (
    <div className="flex min-h-screen bg-[#080b09] text-gray-200">
      <aside className="flex w-64 flex-col border-r border-white/10 bg-[#0b0f0d] px-4 py-6">
        <div className="mb-8 flex items-center gap-2 px-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 font-bold text-black shadow-[0_0_20px_-4px_rgba(16,185,129,0.6)]">
            ₫
          </div>
          <span className="text-lg font-semibold tracking-tight text-white">Thành Trung Fintech</span>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto">
          {items.map((group, gi) => (
            <div key={gi}>
              {group.label && (
                <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-600">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-lg border-l-2 px-3 py-2.5 text-sm font-medium transition ${
                        isActive
                          ? "border-emerald-400 bg-emerald-500/10 text-emerald-400"
                          : "border-transparent text-gray-400 hover:bg-white/5 hover:text-white"
                      }`
                    }
                  >
                    <item.icon size={18} />
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
          <div className="flex items-center gap-2.5 rounded-xl bg-white/5 px-3 py-2.5">
            <Avatar name={user?.fullName} size="h-8 w-8" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{user?.fullName}</p>
              <p className="truncate text-xs text-gray-500">{user?.email}</p>
            </div>
          </div>
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                isActive ? "bg-emerald-500/15 text-emerald-400" : "text-gray-400 hover:bg-white/5 hover:text-white"
              }`
            }
          >
            <UserCircle size={18} />
            Hồ sơ &amp; Cài đặt
          </NavLink>
          <button
            onClick={() => {
              logout();
              navigate("/login");
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-400 transition hover:bg-white/5 hover:text-white"
          >
            <LogOut size={18} />
            Đăng xuất
          </button>
        </div>
      </aside>

      <div className="flex-1">
        <header className="flex items-center justify-between border-b border-white/10 bg-[#0b0f0d]/70 px-8 py-4 backdrop-blur">
          <div>
            <h2 className="text-base font-semibold text-white">{pageTitleFor(location.pathname)}</h2>
            <p className="text-xs text-gray-500">Xin chào, {user?.fullName}</p>
          </div>

          <div className="flex items-center gap-3">
            {balance != null && (
              <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs text-gray-300 sm:flex">
                <Wallet2 size={14} className="text-emerald-400" />
                {formatVND(balance)}
              </div>
            )}
            <div className="hidden items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs text-gray-400 sm:flex">
              {user?.kycStatus === "VERIFIED" ? (
                <span className="text-emerald-400">● Đã xác minh KYC</span>
              ) : (
                <span className="text-amber-400">● Chưa xác minh KYC</span>
              )}
            </div>

            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-full border border-white/10 py-1 pl-1 pr-2.5 transition hover:bg-white/5"
              >
                <Avatar name={user?.fullName} size="h-7 w-7" />
                <ChevronDown size={14} className={`text-gray-400 transition-transform ${menuOpen ? "rotate-180" : ""}`} />
              </button>
              {menuOpen && (
                <div className="absolute right-0 z-20 mt-2 w-56 rounded-xl border border-white/10 bg-[#0e1310] p-1.5 shadow-xl">
                  <div className="border-b border-white/10 px-3 py-2">
                    <p className="truncate text-sm font-medium text-white">{user?.fullName}</p>
                    <p className="truncate text-xs text-gray-500">{user?.email}</p>
                  </div>
                  <NavLink
                    to="/profile"
                    onClick={() => setMenuOpen(false)}
                    className="mt-1 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white"
                  >
                    <UserCircle size={16} />
                    Hồ sơ &amp; Cài đặt
                  </NavLink>
                  <button
                    onClick={() => {
                      logout();
                      navigate("/login");
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white"
                  >
                    <LogOut size={16} />
                    Đăng xuất
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="p-8">
          <Outlet />
        </main>
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-[#0e1310] px-4 py-3 text-sm text-white shadow-xl">
          <CheckCircle2 size={18} className="shrink-0 text-emerald-400" />
          {toast}
        </div>
      )}
    </div>
  );
}
