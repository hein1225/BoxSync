import { AlertTriangle } from 'lucide-react';

export default function NotFound() {
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
          className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)' }}
        >
          <AlertTriangle className="w-10 h-10" style={{ color: '#f59e0b' }} />
        </div>

        <h1 className="text-6xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          404
        </h1>
        <h2 className="text-xl font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
          页面未找到
        </h2>
        <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>
          您访问的页面不存在或已被移除。
        </p>
      </div>
    </div>
  );
}
