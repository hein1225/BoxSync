import { useState } from 'react';
import { Server, Shield, Clock, Code, Terminal, Copy, CheckCircle, Link } from 'lucide-react';
import { useSettingsStore } from '@/stores/settingsStore';

export default function About() {
  const settings = useSettingsStore((state) => state.settings);
  const [copied, setCopied] = useState<string | null>(null);

  // 获取后端 API 地址
  const serverUrl = window.location.hostname === 'localhost'
    ? 'http://localhost:9390'
    : `${window.location.protocol}//${window.location.host}`;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const serverInfo = [
    { label: '服务器名称', value: settings.serverName, icon: Server },
    { label: '当前版本', value: 'v1.0.0', icon: Code },
    { label: 'API 版本', value: 'v1', icon: Code },
    { label: '构建日期', value: '2026-05-29', icon: Clock },
    {
      label: '安全策略',
      value: settings.requireAuth ? '已启用' : '已禁用',
      icon: Shield,
      status: settings.requireAuth ? 'success' as const : 'warning' as const,
    },
  ];

  const getStatusColor = (status?: 'success' | 'warning') => {
    if (status === 'success') return 'var(--accent-green)';
    if (status === 'warning') return '#f59e0b';
    return 'var(--accent-purple-light)';
  };

  const getStatusBg = (status?: 'success' | 'warning') => {
    if (status === 'success') return 'rgba(16, 185, 129, 0.2)';
    if (status === 'warning') return 'rgba(245, 158, 11, 0.2)';
    return 'rgba(124, 58, 237, 0.2)';
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
        关于 BoxSync
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {serverInfo.map((item) => (
          <div
            key={item.label}
            className="rounded-2xl p-5 flex items-center gap-4"
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
            }}
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: getStatusBg(item.status) }}
            >
              <item.icon
                className="w-6 h-6"
                style={{ color: getStatusColor(item.status) }}
              />
            </div>
            <div>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {item.label}
              </p>
              <p className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                {item.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Software Development Guide */}
      <div
        className="rounded-2xl p-6"
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Terminal className="w-5 h-5" style={{ color: 'var(--accent-purple-light)' }} />
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            使用云同步软件开发指引
          </h2>
        </div>

        <div className="space-y-4">
          {/* Server URL */}
          <div>
            <label className="block text-sm mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              服务器地址
            </label>
            <div className="flex items-center gap-2">
              <div
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-mono"
                style={{
                  backgroundColor: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                }}
              >
                {serverUrl}
              </div>
              <button
                onClick={() => handleCopy(serverUrl, 'url')}
                className="px-3 py-2.5 rounded-xl text-sm transition-all duration-200"
                style={{
                  backgroundColor: 'var(--bg-input)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-color)',
                }}
              >
                {copied === 'url' ? (
                  <CheckCircle className="w-4 h-4" style={{ color: 'var(--accent-green)' }} />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* API Endpoints */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                登录接口
              </label>
              <div className="flex items-center gap-2">
                <div
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-mono truncate"
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  {serverUrl}/api/auth/login
                </div>
                <button
                  onClick={() => handleCopy(`${serverUrl}/api/auth/login`, 'login')}
                  className="px-3 py-2.5 rounded-xl text-sm transition-all duration-200"
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  {copied === 'login' ? (
                    <CheckCircle className="w-4 h-4" style={{ color: 'var(--accent-green)' }} />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                数据同步接口
              </label>
              <div className="flex items-center gap-2">
                <div
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-mono truncate"
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  {serverUrl}/api/sync/write
                </div>
                <button
                  onClick={() => handleCopy(`${serverUrl}/api/sync/write`, 'sync')}
                  className="px-3 py-2.5 rounded-xl text-sm transition-all duration-200"
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  {copied === 'sync' ? (
                    <CheckCircle className="w-4 h-4" style={{ color: 'var(--accent-green)' }} />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Quick Start Code */}
          <div>
            <label className="block text-sm mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              快速接入示例
            </label>
            <div className="relative">
              <pre
                className="px-4 py-3 rounded-xl text-xs font-mono overflow-x-auto"
                style={{
                  backgroundColor: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                }}
              >
{`// 1. 登录获取 Token
const res = await fetch('${serverUrl}/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'admin', password: 'admin123' })
});
const { token } = await res.json();

// 2. 写入同步数据
await fetch('${serverUrl}/api/sync/write', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify({
    appId: 'myapp',
    key: 'settings.theme',
    value: 'dark'
  })
});`}
              </pre>
              <button
                onClick={() => handleCopy(`// 1. 登录获取 Token\nconst res = await fetch('${serverUrl}/api/auth/login', {\n  method: 'POST',\n  headers: { 'Content-Type': 'application/json' },\n  body: JSON.stringify({ username: 'admin', password: 'admin123' })\n});\nconst { token } = await res.json();\n\n// 2. 写入同步数据\nawait fetch('${serverUrl}/api/sync/write', {\n  method: 'POST',\n  headers: {\n    'Content-Type': 'application/json',\n    'Authorization': 'Bearer ' + token\n  },\n  body: JSON.stringify({\n    appId: 'myapp',\n    key: 'settings.theme',\n    value: 'dark'\n  })\n});`, 'code')}
                className="absolute top-2 right-2 px-2 py-1 rounded-lg text-xs transition-all duration-200"
                style={{
                  backgroundColor: 'rgba(124, 58, 237, 0.2)',
                  color: 'var(--accent-purple-light)',
                }}
              >
                {copied === 'code' ? '已复制' : '复制'}
              </button>
            </div>
          </div>

          {/* API Doc Link */}
          <div
            className="flex items-center gap-2 text-sm"
            style={{ color: 'var(--text-secondary)' }}
          >
            <Link className="w-4 h-4" />
            <span>完整 API 文档请参考项目 README.md</span>
          </div>
        </div>
      </div>

      <div
        className="rounded-2xl p-6 space-y-4"
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
        }}
      >
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          项目简介
        </h2>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          BoxSync 是一个基于 Docker 部署的轻量级云同步服务器，使用 Redis 作为数据存储引擎，
          为安卓客户端应用提供独立的数据同步空间。服务器提供管理员后台和 RESTful API 两套接口，
          分别面向管理员运维和安卓客户端数据同步。
        </p>

        <h3 className="text-base font-semibold mt-4" style={{ color: 'var(--text-primary)' }}>
          核心特性
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            '高性能 Redis 数据存储',
            'Docker 一键部署',
            'JWT 安全认证',
            '用户数据完全隔离',
            '数据备份与还原',
            '完整的操作日志',
          ].map((feature) => (
            <div key={feature} className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: 'var(--accent-purple)' }}
              />
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {feature}
              </span>
            </div>
          ))}
        </div>

        <div
          className="rounded-xl p-4 mt-4 flex items-center gap-4"
          style={{
            backgroundColor: 'rgba(124, 58, 237, 0.08)',
            border: '1px solid rgba(124, 58, 237, 0.2)',
          }}
        >
          <div className="flex-1">
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              开源仓库
            </p>
            <a
              href="https://github.com/hein1225/BoxSync"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm hover:underline"
              style={{ color: 'var(--accent-purple-light)' }}
            >
              https://github.com/hein1225/BoxSync
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
