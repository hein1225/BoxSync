import { useState, useRef, useEffect } from 'react';
import { Download, Upload, AlertTriangle, CheckCircle, FileJson, Loader2 } from 'lucide-react';
import { useSettingsStore } from '@/stores/settingsStore';
import { useUserStore } from '@/stores/userStore';
import { useUserPartitionsStore } from '@/stores/userPartitionsStore';
import { useLogStore } from '@/stores/logStore';

interface BackupData {
  exportTime: string;
  version: string;
  data: {
    settings?: Record<string, unknown>;
    users?: unknown[];
    partitions?: Record<string, unknown[]>;
    syncData?: Record<string, unknown>;
  };
}

export default function BackupRestore() {
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const [importError, setImportError] = useState('');
  const [pendingFile, setPendingFile] = useState<BackupData | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const settings = useSettingsStore((state) => state.settings);
  const users = useUserStore((state) => state.users);
  const partitions = useUserPartitionsStore((state) => state.partitions);
  const logs = useLogStore((state) => state.logs);
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
      const token = localStorage.getItem('boxsync_token');

      // 从后端 API 获取完整的备份数据（包含密码等敏感信息）
      const response = await fetch('/api/settings/export', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('导出失败');
      }

      const result = await response.json();

      if (!result.success || !result.data) {
        throw new Error('导出数据格式错误');
      }

      const backupData = {
        exportTime: new Date().toISOString(),
        version: '1.1.0',
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
      setImportError(error instanceof Error ? error.message : '导出失败');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content) as BackupData;

        if (!parsed.data) {
          setImportError('无效的备份文件格式');
          return;
        }

        setPendingFile(parsed);
        setImportError('');
        setShowImportConfirm(true);
      } catch {
        setImportError('文件解析失败，请确保上传的是有效的 JSON 备份文件');
      }
    };
    reader.readAsText(file);

    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const confirmImport = async () => {
    if (!pendingFile) return;

    setIsImporting(true);
    setImportProgress('正在准备数据...');

    try {
      const { data } = pendingFile;
      const token = localStorage.getItem('boxsync_token');

      // 构建后端期望的备份数据结构
      // 后端期望: { settings, users, partitions, syncData }
      const importPayload: Record<string, unknown> = {};

      if (data.settings) {
        importPayload.settings = data.settings;
      }

      if (data.users && Array.isArray(data.users)) {
        importPayload.users = data.users;
      }

      // 分区数据已经是对象格式 { userId: partition[] }
      if (data.partitions && typeof data.partitions === 'object') {
        importPayload.partitions = data.partitions;
      }

      // 转换同步数据格式
      if (data.syncData && typeof data.syncData === 'object') {
        importPayload.syncData = data.syncData;
      }

      setImportProgress('正在清除现有数据并恢复备份...');

      // 调用后端统一的导入接口
      const response = await fetch('/api/settings/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(importPayload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: '导入失败' }));
        throw new Error(errorData.message || '导入失败');
      }

      const result = await response.json();

      setImportProgress('恢复完成，正在清理本地会话...');

      // 清除本地 token（因为服务器端会话已被清除）
      localStorage.removeItem('boxsync_token');
      localStorage.removeItem('boxsync_session_time');

      setShowImportConfirm(false);
      setPendingFile(null);
      setImportSuccess(true);

      // 显示恢复统计
      const stats = result.stats;
      if (stats) {
        setImportProgress(`恢复完成：${stats.users} 个用户, ${stats.partitions} 个分区, ${stats.syncData} 条同步数据`);
      }

      // 延迟后跳转到登录页
      setTimeout(() => {
        window.location.href = '/login';
      }, 3000);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : '导入过程中发生错误');
      setIsImporting(false);
      setImportProgress('');
    }
  };

  const cancelImport = () => {
    setShowImportConfirm(false);
    setPendingFile(null);
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

          <div
            className="rounded-xl p-4 text-sm"
            style={{
              backgroundColor: 'var(--bg-input)',
              color: 'var(--text-secondary)',
            }}
          >
            导出文件包含所有用户数据、配置信息、存储分区和操作日志。建议定期备份以确保数据安全。
          </div>

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

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileSelect}
            className="hidden"
          />

          <button
            onClick={handleImportClick}
            className="w-full py-3 rounded-xl font-medium text-white transition-all duration-200 hover:opacity-90 flex items-center justify-center gap-2"
            style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
            }}
          >
            <Upload className="w-5 h-5" />
            选择备份文件
          </button>

          {importError && (
            <div
              className="flex items-center gap-2 text-sm py-2 px-3 rounded-lg"
              style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', color: 'var(--accent-red)' }}
            >
              <AlertTriangle className="w-4 h-4" />
              {importError}
            </div>
          )}

          {importSuccess && (
            <div
              className="flex items-center gap-2 text-sm py-2 px-3 rounded-lg"
              style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', color: 'var(--accent-green)' }}
            >
              <CheckCircle className="w-4 h-4" />
              导入成功！页面即将刷新
            </div>
          )}
        </div>
      </div>

      {/* Import Confirm Modal */}
      {showImportConfirm && pendingFile && !isImporting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
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
                <FileJson className="w-5 h-5" style={{ color: '#f59e0b' }} />
              </div>
              <div>
                <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                  确认导入
                </h2>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  备份时间: {new Date(pendingFile.exportTime).toLocaleString('zh-CN')}
                </p>
              </div>
            </div>

            <div className="space-y-2 mb-6">
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                检测到以下数据：
              </p>
              <div className="space-y-1">
                {pendingFile.data.settings && (
                  <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
                    <CheckCircle className="w-4 h-4" style={{ color: 'var(--accent-green)' }} />
                    系统配置
                  </div>
                )}
                {pendingFile.data.users && (
                  <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
                    <CheckCircle className="w-4 h-4" style={{ color: 'var(--accent-green)' }} />
                    用户数据 ({(pendingFile.data.users as unknown[]).length} 个用户)
                  </div>
                )}
                {pendingFile.data.partitions && (
                  <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
                    <CheckCircle className="w-4 h-4" style={{ color: 'var(--accent-green)' }} />
                    存储分区 ({Object.keys(pendingFile.data.partitions).length} 个用户分区)
                  </div>
                )}
                {pendingFile.data.syncData && (
                  <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
                    <CheckCircle className="w-4 h-4" style={{ color: 'var(--accent-green)' }} />
                    同步数据 ({Object.keys(pendingFile.data.syncData).length} 条记录)
                  </div>
                )}
              </div>
            </div>

            <p className="text-sm mb-6" style={{ color: 'var(--accent-red)' }}>
              此操作将清除所有现有数据（包括当前管理员账户）并恢复备份数据，恢复完成后需要重新登录。
            </p>

            <div className="flex gap-3">
              <button
                onClick={cancelImport}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
                style={{
                  backgroundColor: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                }}
              >
                取消
              </button>
              <button
                onClick={confirmImport}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white transition-all duration-200 hover:opacity-90"
                style={{ backgroundColor: 'var(--accent-red)' }}
              >
                确认导入
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Progress Modal */}
      {isImporting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div
            className="w-full max-w-md p-6 rounded-2xl animate-fade-in text-center"
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
            }}
          >
            <div className="mb-4">
              <Loader2 className="w-12 h-12 mx-auto animate-spin" style={{ color: 'var(--accent-purple)' }} />
            </div>
            <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              正在恢复数据
            </h2>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              {importProgress}
            </p>
            <div
              className="w-full h-2 rounded-full overflow-hidden"
              style={{ backgroundColor: 'var(--bg-input)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  backgroundColor: 'var(--accent-purple)',
                  width: importProgress.includes('完成') ? '100%' : importProgress.includes('清理') ? '80%' : '50%',
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Import Success Modal */}
      {importSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div
            className="w-full max-w-md p-6 rounded-2xl animate-fade-in text-center"
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
            <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              恢复成功
            </h2>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              {importProgress}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              正在跳转到登录页面...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
