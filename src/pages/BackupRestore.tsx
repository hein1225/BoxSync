import { useState, useEffect } from 'react';
import { Download, Upload, AlertTriangle, CheckCircle } from 'lucide-react';
import { useSettingsStore } from '@/stores/settingsStore';
import { useUserStore } from '@/stores/userStore';
import { useUserPartitionsStore } from '@/stores/userPartitionsStore';
import { useLogStore } from '@/stores/logStore';

export default function BackupRestore() {
  const [exportSuccess, setExportSuccess] = useState(false);
  const [exportError, setExportError] = useState('');

  const fetchUsers = useUserStore((state) => state.fetchUsers);
  const fetchPartitions = useUserPartitionsStore((state) => state.fetchPartitions);
  const fetchLogs = useLogStore((state) => state.fetchLogs);
  const fetchSettings = useSettingsStore((state) => state.fetchSettings);

  // Load all data on mount
  useEffect(() => {
    fetchUsers();
    fetchPartitions();
    fetchLogs();
    fetchSettings();
  }, [fetchUsers, fetchPartitions, fetchLogs, fetchSettings]);

  const handleExport = async () => {
    try {
      setExportError('');
      const token = localStorage.getItem('boxsync_token');

      if (!token) {
        throw new Error('未登录或登录已过期，请重新登录');
      }

      // 从后端 API 获取完整的备份数据（包含密码等敏感信息）
      const response = await fetch('/api/settings/export', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: '导出失败' }));
        throw new Error(errorData.message || `导出失败 (${response.status})`);
      }

      const result = await response.json();

      if (!result.success || !result.data) {
        throw new Error('导出数据格式错误');
      }

      const backupData = {
        exportTime: new Date().toISOString(),
        version: '2.0',
        data: result.data,
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `boxsync_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (error) {
      console.error('Export error:', error);
      setExportError(error instanceof Error ? error.message : '导出失败');
    }
  };

  const handleImportClick = () => {
    // 先退出登录，清除本地 token
    localStorage.removeItem('boxsync_token');
    localStorage.removeItem('boxsync_session_time');
    // 跳转到导入页面
    window.location.href = '/import-restore';
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
        数据备份与还原
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Export Card */}
        <div
          className="rounded-2xl p-6 space-y-4"
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
          }}
        >
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)' }}
            >
              <Download className="w-7 h-7" style={{ color: 'var(--accent-green)' }} />
            </div>
            <div>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                导出备份
              </h2>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                将所有数据导出为 JSON 文件
              </p>
            </div>
          </div>

          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            导出文件包含所有用户数据、配置信息、存储分区和操作日志。建议定期备份以确保数据安全。
          </p>

          <button
            onClick={handleExport}
            className="w-full py-3 rounded-xl font-medium text-white transition-all duration-200 hover:opacity-90 flex items-center justify-center gap-2"
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
            }}
          >
            <Download className="w-5 h-5" />
            导出备份文件
          </button>

          {exportSuccess && (
            <div
              className="flex items-center gap-2 text-sm py-2 px-3 rounded-lg"
              style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', color: 'var(--accent-green)' }}
            >
              <CheckCircle className="w-4 h-4" />
              导出成功！文件已下载
            </div>
          )}

          {exportError && (
            <div
              className="flex items-center gap-2 text-sm py-2 px-3 rounded-lg"
              style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', color: 'var(--accent-red)' }}
            >
              <AlertTriangle className="w-4 h-4" />
              {exportError}
            </div>
          )}
        </div>

        {/* Import Card */}
        <div
          className="rounded-2xl p-6 space-y-4"
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
          }}
        >
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: 'rgba(245, 158, 11, 0.2)' }}
            >
              <Upload className="w-7 h-7" style={{ color: '#f59e0b' }} />
            </div>
            <div>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                导入还原
              </h2>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                从 JSON 备份文件还原数据
              </p>
            </div>
          </div>

          <div
            className="rounded-xl p-4 text-sm flex items-start gap-3"
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              color: 'var(--accent-red)',
            }}
          >
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">警告</p>
              <p className="opacity-80">导入操作将覆盖当前所有数据，建议先导出备份。</p>
            </div>
          </div>

          <button
            onClick={handleImportClick}
            className="w-full py-3 rounded-xl font-medium text-white transition-all duration-200 hover:opacity-90 flex items-center justify-center gap-2"
            style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
            }}
          >
            <Upload className="w-5 h-5" />
            导入还原
          </button>

          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            点击后将退出当前登录并进入导入流程。导入完成后需要重新登录。
          </p>
        </div>
      </div>
    </div>
  );
}
