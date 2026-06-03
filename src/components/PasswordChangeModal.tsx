import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Lock, Eye, EyeOff, User } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useUserStore } from '@/stores/userStore';

export default function PasswordChangeModal() {
  const showModal = useAuthStore((state) => state.showPasswordChangeModal);
  const dismiss = useAuthStore((state) => state.dismissPasswordChange);
  const updateCredentials = useAuthStore((state) => state.updateCredentials);
  const logout = useAuthStore((state) => state.logout);
  const updateUser = useUserStore((state) => state.updateUser);
  const users = useUserStore((state) => state.users);
  const navigate = useNavigate();
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  if (!showModal) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newUsername.trim()) {
      setError('请输入新用户名');
      return;
    }

    if (newUsername === 'admin') {
      setError('新用户名不能与默认用户名相同');
      return;
    }

    if (newPassword.length < 6) {
      setError('密码长度至少为 6 位');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    if (newPassword === 'admin123') {
      setError('新密码不能与默认密码相同');
      return;
    }

    // Update auth credentials
    const success = await updateCredentials(newUsername, newPassword);
    if (!success) {
      setError('更新失败，请检查网络连接');
      return;
    }

    // Sync admin username in user management
    const adminUser = users.find((u) => u.role === 'admin' || u.role === 'owner');
    if (adminUser) {
      updateUser(adminUser.userId, { username: newUsername });
    }

    alert('用户名和密码修改成功！请使用新凭据重新登录。');
    logout();
    navigate('/admin/login');
  };

  const handleSkip = () => {
    if (confirm('确定跳过吗？为了账户安全，建议立即修改默认用户名和密码。')) {
      dismiss();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div
        className="w-full max-w-md p-6 rounded-2xl animate-fade-in"
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
        }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: 'rgba(245, 158, 11, 0.2)' }}
          >
            <AlertTriangle className="w-5 h-5" style={{ color: '#f59e0b' }} />
          </div>
          <div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              安全提醒
            </h2>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              检测到您正在使用默认凭据登录
            </p>
          </div>
        </div>

        <div
          className="rounded-xl p-4 mb-5 text-sm"
          style={{
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            color: '#fbbf24',
            border: '1px solid rgba(245, 158, 11, 0.2)',
          }}
        >
          为了保障服务器安全，建议您立即修改默认管理员用户名和密码。默认凭据（admin / admin123）仅用于首次登录，生产环境中请务必更换为自定义凭据。
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
              新用户名
            </label>
            <div className="relative">
              <User
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: 'var(--text-secondary)' }}
              />
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="请输入新用户名"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl outline-none text-sm"
                style={{
                  backgroundColor: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                }}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
              新密码
            </label>
            <div className="relative">
              <Lock
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: 'var(--text-secondary)' }}
              />
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="请输入新密码"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl outline-none text-sm"
                style={{
                  backgroundColor: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--text-secondary)' }}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
              确认新密码
            </label>
            <div className="relative">
              <Lock
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: 'var(--text-secondary)' }}
              />
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="请再次输入新密码"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl outline-none text-sm"
                style={{
                  backgroundColor: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                }}
              />
            </div>
          </div>

          {error && (
            <p className="text-sm" style={{ color: 'var(--accent-red)' }}>
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleSkip}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
              style={{
                backgroundColor: 'var(--bg-input)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-color)',
              }}
            >
              稍后修改
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white transition-all duration-200 hover:opacity-90"
              style={{
                background: 'linear-gradient(135deg, var(--accent-purple) 0%, var(--accent-purple-light) 100%)',
              }}
            >
              确认修改
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
