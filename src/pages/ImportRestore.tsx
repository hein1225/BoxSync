import { useState, useEffect, useRef } from 'react';
import { Upload, AlertTriangle, CheckCircle, FileJson, Loader2, RefreshCw } from 'lucide-react';

interface BackupData {
  exportTime: string;
  version: string;
  data: Record<string, unknown>;
}

export default function ImportRestore() {
  const [step, setStep] = useState<'select' | 'confirm' | 'importing' | 'success' | 'error'>('select');
  const [selectedFile, setSelectedFile] = useState<BackupData | null>(null);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState('');
  const [stats, setStats] = useState<{ users: number; stringKeys: number; hashKeys: number; listKeys: number } | null>(null);
  const [initialPassword, setInitialPassword] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content) as BackupData;

        if (!parsed.data) {
          setError('无效的备份文件格式');
          return;
        }

        setSelectedFile(parsed);
        setError('');
        setStep('confirm');
      } catch {
        setError('文件解析失败，请确保上传的是有效的 JSON 备份文件');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    setStep('importing');
    setProgress('正在清除现有数据并恢复备份...');

    try {
      const { data } = selectedFile;

      // 使用公共导入端点（无需认证）
      const response = await fetch('/api/settings/import-public', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: '导入失败' }));
        throw new Error(errorData.message || '导入失败');
      }

      const result = await response.json();

      // 保存统计信息和初始密码
      if (result.stats) {
        setStats(result.stats);
      }
      if (result.initialPassword) {
        setInitialPassword(result.initialPassword);
      }

      setStep('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : '导入过程中发生错误');
      setStep('error');
    }
  };

  const handleRestart = () => {
    // 清除所有本地存储
    localStorage.clear();
    // 跳转到登录页面
    window.location.href = '/admin';
  };

  const getUserCount = () => {
    if (!selectedFile?.data['boxsync:users']) return 0;
    return Object.keys(selectedFile.data['boxsync:users'] as Record<string, unknown>).length;
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{ backgroundColor: 'rgba(124, 58, 237, 0.2)' }}>
            <FileJson className="w-8 h-8" style={{ color: 'var(--accent-purple)' }} />
          </div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            数据恢复
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            从备份文件恢复所有数据
          </p>
        </div>

        {/* Step 1: Select File */}
        {step === 'select' && (
          <div
            className="rounded-2xl p-8 text-center"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
          >
            <div
              className="rounded-xl p-4 mb-6 flex items-start gap-3 text-left"
              style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }}
            >
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--accent-red)' }} />
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--accent-red)' }}>
                  重要提示
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                  导入操作将清除服务器上的所有现有数据，包括用户账户、设置、同步数据和日志。恢复完成后需要重新登录。
                </p>
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
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-4 rounded-xl font-medium text-white transition-all duration-200 hover:opacity-90 flex items-center justify-center gap-2"
              style={{
                background: 'linear-gradient(135deg, var(--accent-purple) 0%, var(--accent-purple-light) 100%)',
              }}
            >
              <Upload className="w-5 h-5" />
              选择备份文件
            </button>

            {error && (
              <div
                className="mt-4 rounded-xl p-3 flex items-center gap-2 text-sm"
                style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-red)' }}
              >
                <AlertTriangle className="w-4 h-4" />
                {error}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Confirm */}
        {step === 'confirm' && selectedFile && (
          <div
            className="rounded-2xl p-8"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: 'rgba(245, 158, 11, 0.2)' }}
              >
                <FileJson className="w-6 h-6" style={{ color: '#f59e0b' }} />
              </div>
              <div>
                <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                  确认导入
                </h2>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  备份时间: {new Date(selectedFile.exportTime).toLocaleString('zh-CN')}
                </p>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                检测到以下数据：
              </p>
              <div className="space-y-2">
                {selectedFile.data['boxsync:settings'] && (
                  <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
                    <CheckCircle className="w-4 h-4" style={{ color: 'var(--accent-green)' }} />
                    系统配置
                  </div>
                )}
                {selectedFile.data['boxsync:users'] && (
                  <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
                    <CheckCircle className="w-4 h-4" style={{ color: 'var(--accent-green)' }} />
                    用户数据 ({getUserCount()} 个用户)
                  </div>
                )}
                {selectedFile.data['boxsync:partitions'] && (
                  <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
                    <CheckCircle className="w-4 h-4" style={{ color: 'var(--accent-green)' }} />
                    存储分区 ({Object.keys(selectedFile.data['boxsync:partitions'] as Record<string, unknown>).length} 个用户分区)
                  </div>
                )}
                {selectedFile.data['boxsync:logs'] && (
                  <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
                    <CheckCircle className="w-4 h-4" style={{ color: 'var(--accent-green)' }} />
                    操作日志 ({(selectedFile.data['boxsync:logs'] as unknown[]).length} 条记录)
                  </div>
                )}
              </div>
            </div>

            <div
              className="rounded-xl p-4 mb-6 text-sm"
              style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-red)' }}
            >
              <p className="font-medium mb-1">警告</p>
              <p className="text-xs opacity-80">
                此操作将清除服务器上的所有现有数据，恢复完成后您需要重新登录。
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setStep('select');
                  setSelectedFile(null);
                }}
                className="flex-1 py-3 rounded-xl text-sm font-medium transition-all duration-200"
                style={{
                  backgroundColor: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                }}
              >
                取消
              </button>
              <button
                onClick={handleImport}
                className="flex-1 py-3 rounded-xl text-sm font-medium text-white transition-all duration-200 hover:opacity-90"
                style={{ backgroundColor: 'var(--accent-red)' }}
              >
                确认导入
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Importing */}
        {step === 'importing' && (
          <div
            className="rounded-2xl p-8 text-center"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
          >
            <div className="mb-6">
              <Loader2 className="w-16 h-16 mx-auto animate-spin" style={{ color: 'var(--accent-purple)' }} />
            </div>
            <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              正在恢复数据
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
              {progress}
            </p>
            <div
              className="w-full h-2 rounded-full overflow-hidden"
              style={{ backgroundColor: 'var(--bg-input)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-500 animate-pulse"
                style={{
                  backgroundColor: 'var(--accent-purple)',
                  width: '60%',
                }}
              />
            </div>
          </div>
        )}

        {/* Step 4: Success */}
        {step === 'success' && (
          <div
            className="rounded-2xl p-8 text-center"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
          >
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)' }}
            >
              <CheckCircle className="w-10 h-10" style={{ color: 'var(--accent-green)' }} />
            </div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              恢复成功
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
              数据已成功恢复到服务器
            </p>

            {stats && (
              <div
                className="rounded-xl p-4 mb-6 text-left"
                style={{ backgroundColor: 'var(--bg-input)' }}
              >
                <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
                  恢复统计
                </p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div style={{ color: 'var(--text-secondary)' }}>
                    用户数量: <span style={{ color: 'var(--text-primary)' }}>{stats.users}</span>
                  </div>
                  <div style={{ color: 'var(--text-secondary)' }}>
                    字符串键: <span style={{ color: 'var(--text-primary)' }}>{stats.stringKeys}</span>
                  </div>
                  <div style={{ color: 'var(--text-secondary)' }}>
                    哈希表: <span style={{ color: 'var(--text-primary)' }}>{stats.hashKeys}</span>
                  </div>
                  <div style={{ color: 'var(--text-secondary)' }}>
                    列表: <span style={{ color: 'var(--text-primary)' }}>{stats.listKeys}</span>
                  </div>
                </div>
              </div>
            )}

            {initialPassword && (
              <div
                className="rounded-xl p-4 mb-4 text-sm"
                style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)' }}
              >
                <p className="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                  重要提示
                </p>
                <p className="mb-2" style={{ color: 'var(--text-secondary)' }}>
                  由于备份中没有站长账号，系统已自动创建初始站长账号：
                </p>
                <div className="rounded-lg p-3 mb-3" style={{ backgroundColor: 'var(--bg-primary)' }}>
                  <p className="font-mono text-sm" style={{ color: 'var(--text-primary)' }}>
                    用户名: admin<br />
                    密码: {initialPassword}
                  </p>
                </div>
                <p className="text-xs" style={{ color: 'var(--accent-red)' }}>
                  安全建议：登录后请立即进入「用户管理」修改站长账号的密码！
                </p>
              </div>
            )}

            <div
              className="rounded-xl p-4 mb-6 text-sm"
              style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)' }}
            >
              <p style={{ color: 'var(--text-primary)' }}>
                {initialPassword ? '请使用上述账号密码登录。' : '数据恢复完成。请使用站长账号登录。'}
              </p>
            </div>

            <button
              onClick={handleRestart}
              className="w-full py-4 rounded-xl font-medium text-white transition-all duration-200 hover:opacity-90 flex items-center justify-center gap-2"
              style={{
                background: 'linear-gradient(135deg, var(--accent-purple) 0%, var(--accent-purple-light) 100%)',
              }}
            >
              <RefreshCw className="w-5 h-5" />
              重启系统并登录
            </button>
          </div>
        )}

        {/* Step 5: Error */}
        {step === 'error' && (
          <div
            className="rounded-2xl p-8 text-center"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
          >
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)' }}
            >
              <AlertTriangle className="w-10 h-10" style={{ color: 'var(--accent-red)' }} />
            </div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              恢复失败
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
              {error}
            </p>
            <button
              onClick={() => {
                setStep('select');
                setError('');
                setSelectedFile(null);
              }}
              className="w-full py-3 rounded-xl text-sm font-medium transition-all duration-200"
              style={{
                backgroundColor: 'var(--bg-input)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
              }}
            >
              返回重试
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
