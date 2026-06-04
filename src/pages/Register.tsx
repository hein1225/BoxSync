import { useState } from 'react';
import { UserPlus, Lock, User, ArrowLeft, CheckCircle, AlertTriangle, Copy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '@/stores/userStore';
import { useUserPartitionsStore } from '@/stores/userPartitionsStore';

export default function Register() {
  const navigate = useNavigate();
  const { users, addUser } = useUserStore();
  const { createPartition } = useUserPartitionsStore();
  const [formData, setFormData] = useState({ username: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.username.trim()) {
      setError('请输入用户名');
      return;
    }
    if (formData.username.length < 3) {
      setError('用户名至少3个字符');
      return;
    }
    if (!formData.password) {
      setError('请输入密码');
      return;
    }
    if (formData.password.length < 6) {
      setError('密码至少6个字符');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    // Check if username already exists
    const exists = users.find((u) => u.username === formData.username);
    if (exists) {
      setError('该用户名已被注册');
      return;
    }

    // Create new user
    const newUserId = `user-${Date.now()}`;
    const newUser = {
      userId: newUserId,
      username: formData.username,
      password: formData.password,
      role: 'user' as const,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: 'active' as const,
    };

    await addUser(newUser);
    await createPartition(newUserId, formData.username);
    setSuccess(true);
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div
          className="w-full max-w-md p-8 rounded-2xl text-center"
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
          }}
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)' }}
          >
            <CheckCircle className="w-8 h-8" style={{ color: 'var(--accent-green)' }} />
          </div>
          <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            注册成功
          </h2>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
            账户 <strong style={{ color: 'var(--text-primary)' }}>{formData.username}</strong> 已创建成功，存储分区已自动初始化。
          </p>

          {/* Account Info */}
          <div
            className="rounded-xl p-4 mb-6 text-left"
            style={{
              backgroundColor: 'rgba(124, 58, 237, 0.08)',
              border: '1px solid rgba(124, 58, 237, 0.2)',
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="w-5 h-5" style={{ color: 'var(--accent-purple-light)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                账户信息
              </span>
            </div>
            <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
              您的账户已成功创建，请牢记以下信息：
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>用户名</span>
                <code className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)' }}>
                  {formData.username}
                </code>
              </div>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(formData.username);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="flex items-center justify-center gap-1.5 w-full mt-3 py-2 rounded-lg text-xs font-medium transition-all duration-200"
              style={{
                backgroundColor: copied ? 'rgba(16, 185, 129, 0.2)' : 'var(--bg-input)',
                color: copied ? 'var(--accent-green)' : 'var(--text-secondary)',
                border: '1px solid var(--border-color)',
              }}
            >
              {copied ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? '已复制用户名' : '复制用户名'}
            </button>
          </div>

          <button
            onClick={() => window.close()}
            className="w-full py-3 rounded-xl text-sm font-medium transition-all duration-200"
            style={{
              backgroundColor: 'var(--bg-input)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-color)',
            }}
          >
            关闭页面
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div
        className="w-full max-w-md p-8 rounded-2xl"
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
        }}
      >
        {/* Back Button */}
        <button
          onClick={() => navigate('/admin/login')}
          className="flex items-center gap-1 text-sm mb-6 transition-all duration-200 hover:opacity-80"
          style={{ color: 'var(--text-secondary)' }}
        >
          <ArrowLeft className="w-4 h-4" />
          返回登录
        </button>

        <div className="text-center mb-8">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: 'rgba(124, 58, 237, 0.2)' }}
          >
            <UserPlus className="w-7 h-7" style={{ color: 'var(--accent-purple-light)' }} />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            用户注册
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            注册 BoxSync 云同步账户
          </p>
        </div>

        {error && (
          <div
            className="rounded-xl p-3 flex items-center gap-2 text-sm mb-4"
            style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-red)' }}
          >
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
              用户名
            </label>
            <div className="relative">
              <User className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-secondary)' }} />
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="请输入用户名"
                className="w-full pl-11 pr-4 py-3 rounded-xl outline-none transition-all duration-200"
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
              密码
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-secondary)' }} />
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="至少6个字符"
                className="w-full pl-11 pr-4 py-3 rounded-xl outline-none transition-all duration-200"
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
              确认密码
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-secondary)' }} />
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                placeholder="再次输入密码"
                className="w-full pl-11 pr-4 py-3 rounded-xl outline-none transition-all duration-200"
                style={{
                  backgroundColor: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl text-white text-sm font-medium transition-all duration-200 hover:opacity-90"
            style={{
              background: 'linear-gradient(135deg, var(--accent-purple) 0%, var(--accent-purple-light) 100%)',
            }}
          >
            注册账户
          </button>
        </form>

        <p className="text-xs text-center mt-6" style={{ color: 'var(--text-secondary)' }}>
          注册即表示同意使用 BoxSync 云同步服务
        </p>
      </div>
    </div>
  );
}
