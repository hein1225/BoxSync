import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const success = await login(username, password);
    setLoading(false);

    if (success) {
      navigate('/admin/dashboard');
    } else {
      setError('用户名或密码错误');
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      <div
        className="w-full max-w-md p-8 rounded-2xl animate-fade-in"
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
        }}
      >
        <h1
          className="text-2xl font-bold text-center mb-2"
          style={{ color: 'var(--text-primary)' }}
        >
          管理员登录
        </h1>
        <p
          className="text-sm text-center mb-8"
          style={{ color: 'var(--text-secondary)' }}
        >
          BoxSync 管理后台
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="relative">
            <User
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5"
              style={{ color: 'var(--text-secondary)' }}
            />
            <input
              type="text"
              placeholder="用户名"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl outline-none transition-all duration-200 focus:ring-2"
              style={{
                backgroundColor: 'var(--bg-input)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent-purple)';
                e.currentTarget.style.boxShadow = '0 0 0 2px rgba(124, 58, 237, 0.2)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-color)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          <div className="relative">
            <Lock
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5"
              style={{ color: 'var(--text-secondary)' }}
            />
            <input
              type="password"
              placeholder="密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl outline-none transition-all duration-200"
              style={{
                backgroundColor: 'var(--bg-input)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent-purple)';
                e.currentTarget.style.boxShadow = '0 0 0 2px rgba(124, 58, 237, 0.2)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-color)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          {error && (
            <p className="text-sm text-center" style={{ color: 'var(--accent-red)' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-medium text-white transition-all duration-200 hover:opacity-90 disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, var(--accent-purple) 0%, var(--accent-purple-light) 100%)',
            }}
          >
            {loading ? '登录中...' : '登录'}
          </button>
        </form>
      </div>
    </div>
  );
}
