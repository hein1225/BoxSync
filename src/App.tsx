import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import Sidebar from "@/components/Sidebar";
import PasswordChangeModal from "@/components/PasswordChangeModal";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import NotFound from "@/pages/NotFound";
import Dashboard from "@/pages/Dashboard";
import UserManage from "@/pages/UserManage";
import StorageView from "@/pages/StorageView";
import BackupRestore from "@/pages/BackupRestore";
import LogView from "@/pages/LogView";
import About from "@/pages/About";
import Settings from "@/pages/Settings";

function AdminLayout() {
  return (
    <div className="flex h-screen" style={{ backgroundColor: "var(--bg-primary)" }}>
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <PasswordChangeModal />
        <Routes>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="users" element={<UserManage />} />
          <Route path="storage" element={<StorageView />} />
          <Route path="backup" element={<BackupRestore />} />
          <Route path="logs" element={<LogView />} />
          <Route path="settings" element={<Settings />} />
          <Route path="about" element={<About />} />
          <Route path="" element={<Navigate to="dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/admin/login" replace />;
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/admin/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}
