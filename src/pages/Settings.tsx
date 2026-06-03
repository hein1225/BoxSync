import { useState, useRef, useEffect } from 'react';
import {
  Save,
  RotateCcw,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle,
  Server,
  Users,
  Database,
  FileText,
  Trash2,
  UserPlus,
  Link,
  Copy,
} from 'lucide-react';
import { useSettingsStore, type ServerSettings } from '@/stores/settingsStore';

const retentionOptions = [
  { value: 7, label: '7 天' },
  { value: 14, label: '14 天' },
  { value: 30, label: '30 天（推荐）' },
  { value: 60, label: '60 天' },
  { value: 90, label: '90 天' },
  { value: -1, label: '永久保留' },
];

export default function Settings() {
  const { settings, updateSettings, resetSettings, exportSettings, importSettings, fetchSettings } = useSettingsStore();
  const [localSettings, setLocalSettings] = useState<ServerSettings>(settings);
  const [saved, setSaved] = useState(false);
  const [importError, setImportError] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const registrationUrl = `${window.location.origin}/register`;

  // Load settings from server on mount
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Sync localSettings when store settings change (e.g. after import or reset)
  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleChange = <K extends keyof ServerSettings>(key: K, value: ServerSettings[K]) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    const success = await updateSettings(localSettings);
    if (success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const handleReset = async () => {
    const success = await resetSettings();
    if (success) {
      setLocalSettings(useSettingsStore.getState().settings);
      setShowResetConfirm(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const handleClearAllData = async () => {
    try {
      const token = localStorage.getItem('boxsync_token');
      const response = await fetch('/api/settings/clear-all', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (response.ok) {
        // Clear local storage
        localStorage.removeItem('boxsync_token');
        localStorage.removeItem('boxsync_session_time');
        setShowClearAllConfirm(false);
        alert('所有数据已清空！服务器已恢复默认状态，请重新登录。');
        window.location.href = '/admin';
      } else {
        const data = await response.json();
        alert(data.message || '清空数据失败');
      }
    } catch (error) {
      console.error('Failed to clear all data:', error);
      alert('清空数据失败，请检查网络连接');
    }
  };

  const handleExport = () => {
    const json = exportSettings();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `boxsync_settings_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      const success = await importSettings(content);
      if (success) {
        setLocalSettings(useSettingsStore.getState().settings);
        setImportError('');
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        setImportError('配置文件格式错误，导入失败');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const inputClass =
    'w-full px-4 py-2.5 rounded-xl outline-none text-sm transition-all duration-200';
  const inputStyle = {
    backgroundColor: 'var(--bg-input)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-color)',
  };

  const SectionTitle = ({ icon: Icon, title }: { icon: React.ElementType; title: string }) => (
    <div className="flex items-center gap-2 mb-4">
      <Icon className="w-5 h-5" style={{ color: 'var(--accent-purple-light)' }} />
      <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
        {title}
      </h2>
    </div>
  );

  return (
    <div className="p-6 space-y-6 animate-fade-in max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            服务器设置
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            配置持久化存储在服务端，支持导出备份与导入还原
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saved && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
              <CheckCircle className="w-4 h-4" />
              已保存
            </div>
          )}
        </div>
      </div>

      {/* Storage Info Banner */}
      <div
        className="rounded-xl p-4 flex items-start gap-3"
        style={{
          backgroundColor: 'rgba(124, 58, 237, 0.08)',
          border: '1px solid rgba(124, 58, 237, 0.2)',
        }}
      >
        <Database className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: 'var(--accent-purple-light)' }} />
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            持久化存储说明
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            以下设置保存在服务端 Redis / MemoryDB 中，所有浏览器共享同一配置。
            重启服务后设置依然保留（内存模式除外）。
          </p>
        </div>
      </div>

      {/* Settings Form */}
      <div className="space-y-6">
        {/* Basic Settings */}
        <div
          className="rounded-2xl p-6"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
        >
          <SectionTitle icon={Server} title="基础配置" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                服务器名称
              </label>
              <input
                type="text"
                value={localSettings.serverName}
                onChange={(e) => handleChange('serverName', e.target.value)}
                className={inputClass}
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                服务端口
              </label>
              <input
                type="number"
                value={localSettings.serverPort}
                onChange={(e) => handleChange('serverPort', parseInt(e.target.value) || 9390)}
                className={inputClass}
                style={inputStyle}
              />
            </div>
          </div>
        </div>

        {/* Log Settings */}
        <div
          className="rounded-2xl p-6"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
        >
          <SectionTitle icon={FileText} title="日志配置" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                日志保留时间
              </label>
              <select
                value={localSettings.logRetentionDays}
                onChange={(e) => handleChange('logRetentionDays', parseInt(e.target.value))}
                className={inputClass}
                style={inputStyle}
              >
                {retentionOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                最大日志条数
              </label>
              <input
                type="number"
                value={localSettings.logMaxCount}
                onChange={(e) => handleChange('logMaxCount', parseInt(e.target.value) || 50000)}
                className={inputClass}
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                自动清理时间
              </label>
              <input
                type="time"
                value={localSettings.cleanupTime}
                onChange={(e) => handleChange('cleanupTime', e.target.value)}
                className={inputClass}
                style={inputStyle}
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  className="w-11 h-6 rounded-full relative transition-colors duration-200"
                  style={{
                    backgroundColor: localSettings.autoCleanupEnabled ? 'var(--accent-purple)' : 'var(--bg-input)',
                  }}
                  onClick={() => handleChange('autoCleanupEnabled', !localSettings.autoCleanupEnabled)}
                >
                  <div
                    className="w-4 h-4 rounded-full absolute top-1 transition-all duration-200"
                    style={{
                      backgroundColor: '#fff',
                      left: localSettings.autoCleanupEnabled ? '22px' : '4px',
                    }}
                  />
                </div>
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  启用自动清理
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* User & Security */}
        <div
          className="rounded-2xl p-6"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
        >
          <SectionTitle icon={Users} title="用户与安全" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                最大用户数
              </label>
              <input
                type="number"
                value={localSettings.maxUsers}
                onChange={(e) => handleChange('maxUsers', parseInt(e.target.value) || 100)}
                className={inputClass}
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                单用户数据上限 (MB)
              </label>
              <input
                type="number"
                value={localSettings.maxDataPerUser}
                onChange={(e) => handleChange('maxDataPerUser', parseInt(e.target.value) || 100)}
                className={inputClass}
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                登录超时时间 (分钟)
              </label>
              <input
                type="number"
                min={5}
                max={1440}
                value={localSettings.sessionTimeout}
                onChange={(e) => handleChange('sessionTimeout', Math.max(5, parseInt(e.target.value) || 30))}
                className={inputClass}
                style={inputStyle}
              />
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                无操作超过此时长将自动登出，范围 5-1440 分钟
              </p>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  className="w-11 h-6 rounded-full relative transition-colors duration-200"
                  style={{
                    backgroundColor: localSettings.requireAuth ? 'var(--accent-purple)' : 'var(--bg-input)',
                  }}
                  onClick={() => handleChange('requireAuth', !localSettings.requireAuth)}
                >
                  <div
                    className="w-4 h-4 rounded-full absolute top-1 transition-all duration-200"
                    style={{
                      backgroundColor: '#fff',
                      left: localSettings.requireAuth ? '22px' : '4px',
                    }}
                  />
                </div>
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  强制认证
                </span>
              </label>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  className="w-11 h-6 rounded-full relative transition-colors duration-200"
                  style={{
                    backgroundColor: localSettings.allowRegistration ? 'var(--accent-purple)' : 'var(--bg-input)',
                  }}
                  onClick={() => handleChange('allowRegistration', !localSettings.allowRegistration)}
                >
                  <div
                    className="w-4 h-4 rounded-full absolute top-1 transition-all duration-200"
                    style={{
                      backgroundColor: '#fff',
                      left: localSettings.allowRegistration ? '22px' : '4px',
                    }}
                  />
                </div>
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  允许用户注册
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Registration URL */}
      {localSettings.allowRegistration && (
        <div
          className="rounded-2xl p-6"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
        >
          <div className="flex items-center gap-2 mb-4">
            <UserPlus className="w-5 h-5" style={{ color: 'var(--accent-purple-light)' }} />
            <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
              用户注册链接
            </h2>
          </div>
          <div
            className="rounded-xl p-4 flex items-center gap-3"
            style={{
              backgroundColor: 'rgba(124, 58, 237, 0.08)',
              border: '1px solid rgba(124, 58, 237, 0.2)',
            }}
          >
            <Link className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--accent-purple-light)' }} />
            <code className="text-sm flex-1 break-all" style={{ color: 'var(--text-primary)' }}>
              {registrationUrl}
            </code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(registrationUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200"
              style={{
                backgroundColor: copied ? 'rgba(16, 185, 129, 0.2)' : 'var(--bg-input)',
                color: copied ? 'var(--accent-green)' : 'var(--text-secondary)',
                border: '1px solid var(--border-color)',
              }}
            >
              {copied ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? '已复制' : '复制'}
            </button>
          </div>
          <p className="text-xs mt-3" style={{ color: 'var(--text-secondary)' }}>
            开启用户注册后，普通用户可通过此链接自行注册账户。注册成功后自动创建存储分区。
          </p>
        </div>
      )}

      {/* Import Error */}
      {importError && (
        <div
          className="rounded-xl p-3 flex items-center gap-2 text-sm"
          style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-red)' }}
        >
          <AlertTriangle className="w-4 h-4" />
          {importError}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-all duration-200 hover:opacity-90"
          style={{
            background: 'linear-gradient(135deg, var(--accent-purple) 0%, var(--accent-purple-light) 100%)',
          }}
        >
          <Save className="w-4 h-4" />
          保存设置
        </button>

        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
          style={{
            backgroundColor: 'var(--bg-input)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-color)',
          }}
        >
          <Download className="w-4 h-4" />
          导出配置
        </button>

        <button
          onClick={handleImportClick}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
          style={{
            backgroundColor: 'var(--bg-input)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-color)',
          }}
        >
          <Upload className="w-4 h-4" />
          导入配置
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileChange}
          className="hidden"
        />

        <button
          onClick={() => setShowResetConfirm(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
          style={{
            backgroundColor: 'var(--bg-input)',
            color: 'var(--accent-red)',
            border: '1px solid var(--border-color)',
          }}
        >
          <RotateCcw className="w-4 h-4" />
          恢复默认
        </button>

        <button
          onClick={() => setShowClearAllConfirm(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            color: 'var(--accent-red)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
          }}
        >
          <Trash2 className="w-4 h-4" />
          清空所有数据
        </button>
      </div>

      {/* Reset Confirm Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div
            className="w-full max-w-sm p-6 rounded-2xl"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)' }}
              >
                <AlertTriangle className="w-5 h-5" style={{ color: 'var(--accent-red)' }} />
              </div>
              <div>
                <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                  确认恢复默认
                </h3>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  此操作将清除所有自定义设置
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                style={{
                  backgroundColor: 'var(--bg-input)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-color)',
                }}
              >
                取消
              </button>
              <button
                onClick={handleReset}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white"
                style={{ backgroundColor: 'var(--accent-red)' }}
              >
                确认恢复
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Data Confirm Modal */}
      {showClearAllConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div
            className="w-full max-w-sm p-6 rounded-2xl"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)' }}
              >
                <Trash2 className="w-5 h-5" style={{ color: 'var(--accent-red)' }} />
              </div>
              <div>
                <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                  确认清空所有数据
                </h3>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  此操作将删除所有本地数据并恢复初始状态
                </p>
              </div>
            </div>
            <div
              className="rounded-xl p-3 mb-4 text-xs space-y-1"
              style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-red)' }}
            >
              <p>• 管理员账户恢复为默认 (admin / admin123)</p>
              <p>• 用户列表恢复为默认</p>
              <p>• 日志记录恢复为默认</p>
              <p>• 服务器设置恢复为默认</p>
              <p>• 当前登录状态将被清除</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowClearAllConfirm(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                style={{
                  backgroundColor: 'var(--bg-input)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-color)',
                }}
              >
                取消
              </button>
              <button
                onClick={handleClearAllData}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white"
                style={{ backgroundColor: 'var(--accent-red)' }}
              >
                确认清空
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
