import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import Overview from "./pages/Overview";
import WalletPage from "./pages/Wallet";
import Deposits from "./pages/Deposits";
import Lending from "./pages/Lending";
import LoanDetail from "./pages/LoanDetail";
import Insurance from "./pages/Insurance";
import PolicyDetail from "./pages/PolicyDetail";
import Corporate from "./pages/Corporate";
import Trading from "./pages/Trading";

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center bg-[#080b09] text-gray-400">Đang tải...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function PublicOnlyRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center bg-[#080b09] text-gray-400">Đang tải...</div>;
  if (user) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
          <Route path="/register" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route index element={<Overview />} />
            <Route path="wallet" element={<WalletPage />} />
            <Route path="deposits" element={<Deposits />} />
            <Route path="lending" element={<Lending />} />
            <Route path="lending/:id" element={<LoanDetail />} />
            <Route path="insurance" element={<Insurance />} />
            <Route path="insurance/:id" element={<PolicyDetail />} />
            <Route path="corporate" element={<Corporate />} />
            <Route path="trading" element={<Trading />} />
            <Route path="profile" element={<Profile />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
