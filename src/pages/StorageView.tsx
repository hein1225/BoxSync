import { useState, useEffect } from 'react';
import { Database, HardDrive, Clock, Server, Shield, Layers } from 'lucide-react';
import { useUserPartitionsStore } from '@/stores/userPartitionsStore';
import { useUserStore } from '@/stores/userStore';

interface StorageStats {
  username: string;
  keyCount: number;
  memoryUsage: number;
  lastSyncTime: number;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function StorageView() {
  const { partitions, fetchPartitions } = useUserPartitionsStore();
  const { users, fetchUsers } = useUserStore();
  const [storageStats, setStorageStats] = useState<StorageStats[]>([]);
  const [loading, setLoading] = useState(true);

  // Load users and partitions on mount
  useEffect(() => {
    fetchUsers();
    fetchPartitions();
  }, [fetchUsers, fetchPartitions]);

  // Fetch real storage data from API (admin only)
  useEffect(() => {
    const fetchStorageData = async () => {
      try {
        const token = localStorage.getItem('boxsync_token');
        const response = await fetch('/api/sync/admin/stats', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.stats) {
            // Transform stats to storage stats
            const stats = data.stats.map((userStat: any) => ({
              username: userStat.username,
              keyCount: userStat.keyCount || 0,
              memoryUsage: userStat.memoryUsage || 0,
              lastSyncTime: userStat.lastSyncTime || 0,
            }));
            setStorageStats(stats);
          }
        }
      } catch (e) {
        console.error('Failed to fetch storage data:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchStorageData();
  }, []);

  // Get all users including admin
  const allUsers = users;
  const regularUsers = users.filter((u) => u.role === 'user');
  const adminUser = users.find((u) => u.role === 'admin');

  const totalKeys = storageStats.reduce((sum, s) => sum + s.keyCount, 0);
  const totalMemory = storageStats.reduce((sum, s) => sum + s.memoryUsage, 0);
  const totalAppPartitions = partitions.reduce((sum, p) => sum + p.appPartitions.length, 0);

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Redis 用户同步数据
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            展示所有用户在 Redis 数据库中的同步数据占用情况
          </p>
        </div>
      </div>

      {/* Redis Info Banner */}
      <div
        className="rounded-xl p-4 flex items-start gap-3"
        style={{
          backgroundColor: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.2)',
        }}
      >
        <Server className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: 'var(--accent-green)' }} />
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            Redis 数据存储
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            所有用户同步的数据存储在 Redis 数据库中（前缀：boxsync:data:&#123;userId&#125;:*）。
            支持多应用分区隔离，每个用户可为不同软件创建独立的同步数据分区。
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div
          className="rounded-2xl p-5 flex items-center gap-4"
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
          }}
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: 'rgba(124, 58, 237, 0.2)' }}
          >
            <Database className="w-6 h-6" style={{ color: 'var(--accent-purple-light)' }} />
          </div>
          <div>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>总数据条数</p>
            <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{totalKeys}</p>
          </div>
        </div>

        <div
          className="rounded-2xl p-5 flex items-center gap-4"
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
          }}
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)' }}
          >
            <HardDrive className="w-6 h-6" style={{ color: 'var(--accent-green)' }} />
          </div>
          <div>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>总内存占用</p>
            <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{formatBytes(totalMemory)}</p>
          </div>
        </div>

        <div
          className="rounded-2xl p-5 flex items-center gap-4"
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
          }}
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: 'rgba(167, 139, 250, 0.2)' }}
          >
            <Clock className="w-6 h-6" style={{ color: 'var(--accent-purple-light)' }} />
          </div>
          <div>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>用户数量</p>
            <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{allUsers.length}</p>
          </div>
        </div>

        <div
          className="rounded-2xl p-5 flex items-center gap-4"
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
          }}
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: 'rgba(245, 158, 11, 0.2)' }}
          >
            <Layers className="w-6 h-6" style={{ color: '#f59e0b' }} />
          </div>
          <div>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>应用分区总数</p>
            <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{totalAppPartitions}</p>
          </div>
        </div>
      </div>

      {/* Admin Storage Section */}
      {adminUser && (
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
          }}
        >
          <div className="px-6 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border-color)' }}>
            <Shield className="w-4 h-4" style={{ color: '#f59e0b' }} />
            <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
              管理员存储详情
            </h2>
          </div>
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <th className="text-left px-6 py-3 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  用户名
                </th>
                <th className="text-left px-6 py-3 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  应用分区数
                </th>
                <th className="text-left px-6 py-3 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  分区列表
                </th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td className="px-6 py-4 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {adminUser.username}
                  <span className="ml-2 text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b' }}>
                    管理员
                  </span>
                </td>
                <td className="px-6 py-4 text-sm" style={{ color: 'var(--text-primary)' }}>
                  {partitions.find((p) => p.userId === adminUser.userId)?.appPartitions.length || 0}
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-2">
                    {partitions.find((p) => p.userId === adminUser.userId)?.appPartitions.map((app) => (
                      <span
                        key={app.appId}
                        className="text-xs px-2 py-1 rounded-full"
                        style={{
                          backgroundColor: 'rgba(245, 158, 11, 0.15)',
                          color: '#f59e0b',
                        }}
                      >
                        {app.appName}
                      </span>
                    )) || (
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        暂无应用分区
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* User Partitions Detail */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
        }}
      >
        <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            普通用户应用分区详情
          </h2>
        </div>
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
              <th className="text-left px-6 py-3 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                用户名
              </th>
              <th className="text-left px-6 py-3 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                应用分区数
              </th>
              <th className="text-left px-6 py-3 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                分区列表
              </th>
            </tr>
          </thead>
          <tbody>
            {regularUsers.length > 0 ? (
              regularUsers.map((user) => {
                const partition = partitions.find((p) => p.userId === user.userId);
                return (
                  <tr
                    key={user.userId}
                    className="transition-colors duration-150 hover:bg-white/5"
                    style={{ borderBottom: '1px solid var(--border-color)' }}
                  >
                    <td className="px-6 py-4 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {user.username}
                    </td>
                    <td className="px-6 py-4 text-sm" style={{ color: 'var(--text-primary)' }}>
                      {partition?.appPartitions.length || 0}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        {partition && partition.appPartitions.length > 0 ? (
                          partition.appPartitions.map((app) => (
                            <span
                              key={app.appId}
                              className="text-xs px-2 py-1 rounded-full"
                              style={{
                                backgroundColor: 'rgba(124, 58, 237, 0.15)',
                                color: 'var(--accent-purple-light)',
                              }}
                            >
                              {app.appName}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                            暂无应用分区
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
                  暂无普通用户
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* User Data Overview */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
        }}
      >
        <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            用户数据概览
          </h2>
        </div>
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
              <th className="text-left px-6 py-3 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                用户名
              </th>
              <th className="text-left px-6 py-3 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                数据条数
              </th>
              <th className="text-left px-6 py-3 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                内存占用
              </th>
              <th className="text-left px-6 py-3 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                最后同步时间
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
                  加载中...
                </td>
              </tr>
            ) : storageStats.length > 0 ? (
              storageStats.map((stat) => (
                <tr
                  key={stat.username}
                  className="transition-colors duration-150 hover:bg-white/5"
                  style={{ borderBottom: '1px solid var(--border-color)' }}
                >
                  <td className="px-6 py-4 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {stat.username}
                  </td>
                  <td className="px-6 py-4 text-sm" style={{ color: 'var(--text-primary)' }}>
                    {stat.keyCount}
                  </td>
                  <td className="px-6 py-4 text-sm" style={{ color: 'var(--text-primary)' }}>
                    {formatBytes(stat.memoryUsage)}
                  </td>
                  <td className="px-6 py-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {stat.lastSyncTime > 0 ? new Date(stat.lastSyncTime).toLocaleString('zh-CN') : '从未同步'}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
                  暂无用户数据
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
