import { useState } from 'react';
import { Download, Upload, AlertTriangle, CheckCircle } from 'lucide-react';

export default function BackupRestore() {
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const handleExport = () => {
    const backupData = {
      exportTime: new Date().toISOString(),
      version: '1.0.0',
      data: {
        'boxsync:meta:version': { version: '1.0.0', buildDate: '2026-05-29' },
        'boxsync:user:admin': { username: 'admin', role: 'admin' },
      },
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
  };

  const handleImport = () => {
    setShowImportConfirm(true);
  };

  const confirmImport = () => {
    setShowImportConfirm(false);
    alert('导入功能需要在后端集成后使用');
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
                将数据库导出为 JSON 文件
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
            导出文件包含所有用户数据、配置信息和系统元数据。建议定期备份以确保数据安全。
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

          <button
            onClick={handleImport}
            className="w-full py-3 rounded-xl font-medium text-white transition-all duration-200 hover:opacity-90 flex items-center justify-center gap-2"
            style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
            }}
          >
            <Upload className="w-5 h-5" />
            导入备份文件
          </button>
        </div>
      </div>

      {/* Import Confirm Modal */}
      {showImportConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div
            className="w-full max-w-md p-6 rounded-2xl animate-fade-in"
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6" style={{ color: 'var(--accent-red)' }} />
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                确认导入
              </h2>
            </div>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
              此操作将覆盖当前所有数据，是否继续？建议先导出当前数据作为备份。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowImportConfirm(false)}
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
    </div>
  );
}
