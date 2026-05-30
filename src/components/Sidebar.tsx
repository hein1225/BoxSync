import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  HardDrive,
  Database,
  FileText,
  Info,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Server,
  Settings,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useAppStore } from '@/stores/appStore';

const menuItems = [
  { key: 'dashboard', label: '概览', icon: LayoutDashboard, path: '/admin/dashboard' },
  { key: 'files', label: '文件', icon: HardDrive, path: '/admin/files' },
  { key: 'users', label: '用户', icon: Users, path: '/admin/users' },
  { key: 'storage', label: '存储', icon: Database, path: '/admin/storage' },
  { key: 'backup', label: '备份', icon: FileText, path: '/admin/backup' },
  { key: 'logs', label: '日志', icon: FileText, path: '/admin/logs' },
  { key: 'settings', label: '设置', icon: Settings, path: '/admin/settings' },
  { key: 'about', label: '关于', icon: Info, path: '/admin/about' },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const logout = useAuthStore((state) => state.logout);
  const sidebarCollapsed = useAppStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useAppStore((state) => state.toggleSidebar);

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  return (
    <aside
      className="h-screen flex flex-col transition-all duration-300 relative"
      style={{
        width: sidebarCollapsed ? '72px' : '220px',
        backgroundColor: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border-color)',
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-3 px-5 py-5"
        style={{ borderBottom: '1px solid var(--border-color)' }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, var(--accent-purple) 0%, var(--accent-purple-light) 100%)',
          }}
        >
          <Server className="w-5 h-5 text-white" />
        </div>
        {!sidebarCollapsed && (
          <span className="font-bold text-lg whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>
            BoxSync
          </span>
        )}
      </div>

      {/* Menu */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              onClick={() => navigate(item.path)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group"
              style={{
                backgroundColor: isActive ? 'var(--accent-purple)' : 'transparent',
                color: isActive ? '#fff' : 'var(--text-secondary)',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'rgba(124, 58, 237, 0.15)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }
              }}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!sidebarCollapsed && (
                <span className="text-sm font-medium whitespace-nowrap">{item.label}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Logout */}
      <div
        className="px-3 py-4"
        style={{ borderTop: '1px solid var(--border-color)' }}
      >
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.15)';
            e.currentTarget.style.color = 'var(--accent-red)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
          title={sidebarCollapsed ? '退出登录' : undefined}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!sidebarCollapsed && <span className="text-sm font-medium whitespace-nowrap">退出登录</span>}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200"
        style={{
          backgroundColor: 'var(--accent-purple)',
          color: '#fff',
          border: '2px solid var(--bg-primary)',
        }}
      >
        {sidebarCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>
    </aside>
  );
}
