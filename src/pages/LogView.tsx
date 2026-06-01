import { useState, useEffect } from 'react';
import { Filter, Download, Trash2, Search, RefreshCw } from 'lucide-react';
import { useLogStore } from '@/stores/logStore';

const logTypeLabels: Record<string, string> = {
  auth: '认证',
  sync: '同步',
  error: '错误',
  admin: '管理',
};

const logTypeColors: Record<string, string> = {
  auth: '#60a5fa',
  sync: '#34d399',
  error: '#f87171',
  admin: '#a78bfa',
};

export default function LogView() {
  const { logs, clearLogs, fetchLogs, loading } = useLogStore();
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Load logs on mount
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filteredLogs = logs.filter((log) => {
    const matchType = filterType === 'all' || log.type === filterType;
    const matchSearch =
      searchQuery === '' ||
      log.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.detail.toLowerCase().includes(searchQuery.toLowerCase());
    return matchType && matchSearch;
  });

  const handleClearLogs = async () => {
    if (confirm('确定要清空所有日志吗？')) {
      await clearLogs();
    }
  };

  const handleRefresh = () => {
    fetchLogs();
  };

  const handleExport = () => {
    const exportData = {
      exportInfo: {
        server: 'BoxSync v1.0.0',
        exportTime: new Date().toISOString(),
        totalCount: filteredLogs.length,
      },
      logs: filteredLogs,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `boxsync_logs_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
          日志查看
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200"
            style={{
              backgroundColor: 'var(--bg-input)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
            }}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200"
            style={{
              backgroundColor: 'var(--bg-input)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
            }}
          >
            <Download className="w-4 h-4" />
            导出
          </button>
          <button
            onClick={handleClearLogs}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200"
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              color: 'var(--accent-red)',
            }}
          >
            <Trash2 className="w-4 h-4" />
            清空
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 rounded-xl text-sm outline-none"
            style={{
              backgroundColor: 'var(--bg-input)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
            }}
          >
            <option value="all">全部类型</option>
            <option value="auth">认证</option>
            <option value="sync">同步</option>
            <option value="error">错误</option>
            <option value="admin">管理</option>
          </select>
        </div>

        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
          <input
            type="text"
            placeholder="搜索用户或详情..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl text-sm outline-none"
            style={{
              backgroundColor: 'var(--bg-input)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
            }}
          />
        </div>
      </div>

      {/* Log Table */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
        }}
      >
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
              <th className="text-left px-6 py-4 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                时间
              </th>
              <th className="text-left px-6 py-4 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                类型
              </th>
              <th className="text-left px-6 py-4 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                用户
              </th>
              <th className="text-left px-6 py-4 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                操作
              </th>
              <th className="text-left px-6 py-4 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                详情
              </th>
              <th className="text-center px-6 py-4 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                状态
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map((log) => (
              <tr
                key={log.id}
                className="transition-colors duration-150 hover:bg-white/5"
                style={{ borderBottom: '1px solid var(--border-color)' }}
              >
                <td className="px-6 py-4 text-sm whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                  {new Date(log.timestamp).toLocaleString('zh-CN')}
                </td>
                <td className="px-6 py-4">
                  <span
                    className="text-xs px-2 py-1 rounded-full"
                    style={{
                      backgroundColor: `${logTypeColors[log.type]}20`,
                      color: logTypeColors[log.type],
                    }}
                  >
                    {logTypeLabels[log.type]}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm" style={{ color: 'var(--text-primary)' }}>
                  {log.username}
                </td>
                <td className="px-6 py-4 text-sm" style={{ color: 'var(--text-primary)' }}>
                  {log.action}
                </td>
                <td className="px-6 py-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {log.detail}
                  {log.errorMsg && (
                    <span className="block text-xs mt-1" style={{ color: 'var(--accent-red)' }}>
                      {log.errorMsg}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-center">
                  <span
                    className="text-xs px-2 py-1 rounded-full"
                    style={{
                      backgroundColor: log.success ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                      color: log.success ? 'var(--accent-green)' : 'var(--accent-red)',
                    }}
                  >
                    {log.success ? '成功' : '失败'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredLogs.length === 0 && (
          <div className="py-12 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
            暂无日志记录
          </div>
        )}
      </div>
    </div>
  );
}
