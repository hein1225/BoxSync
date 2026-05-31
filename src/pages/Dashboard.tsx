import { Users, Database, Layers, Clock, TrendingUp, Activity } from 'lucide-react';
import StatCard from '@/components/StatCard';
import { useUserStore } from '@/stores/userStore';
import { useUserPartitionsStore } from '@/stores/userPartitionsStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useLogStore } from '@/stores/logStore';
import { useMemo } from 'react';

export default function Dashboard() {
  const users = useUserStore((state) => state.users);
  const partitions = useUserPartitionsStore((state) => state.partitions);
  const settings = useSettingsStore((state) => state.settings);
  const logs = useLogStore((state) => state.logs);

  const stats = useMemo(() => {
    const totalUsers = users.length;
    const activeUsers = users.filter((u) => u.status === 'active').length;
    const disabledUsers = totalUsers - activeUsers;

    const totalPartitions = partitions.length;
    const totalAppPartitions = partitions.reduce(
      (sum, p) => sum + p.appPartitions.length,
      0
    );

    const totalKeyCount = partitions.reduce(
      (sum, p) =>
        sum + p.appPartitions.reduce((appSum, a) => appSum + (a.keyCount || 0), 0),
      0
    );

    const totalMemoryUsage = partitions.reduce(
      (sum, p) =>
        sum + p.appPartitions.reduce((appSum, a) => appSum + (a.memoryUsage || 0), 0),
      0
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayLogs = logs.filter((l) => l.timestamp >= today.getTime()).length;

    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      date.setHours(0, 0, 0, 0);
      return {
        label: `${date.getMonth() + 1}/${date.getDate()}`,
        count: logs.filter(
          (l) =>
            l.timestamp >= date.getTime() &&
            l.timestamp < date.getTime() + 86400000
        ).length,
      };
    });

    return {
      totalUsers,
      activeUsers,
      disabledUsers,
      totalPartitions,
      totalAppPartitions,
      totalKeyCount,
      totalMemoryUsage,
      todayLogs,
      last7Days,
      maxUsers: settings.maxUsers,
      maxDataPerUser: settings.maxDataPerUser,
    };
  }, [users, partitions, settings, logs]);

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
          BoxSync 管理后台概览
        </h1>
      </div>

      {/* Stat Cards Row 1 - User Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="用户总数"
          value={String(stats.totalUsers)}
          subtitle={`活跃: ${stats.activeUsers} / 禁用: ${stats.disabledUsers}`}
          icon={Users}
          color="#7c3aed"
        />
        <StatCard
          title="存储分区"
          value={String(stats.totalPartitions)}
          subtitle={`应用分区: ${stats.totalAppPartitions}`}
          icon={Database}
          color="#10b981"
        />
        <StatCard
          title="同步数据键"
          value={String(stats.totalKeyCount)}
          subtitle={`总占用: ${(stats.totalMemoryUsage / 1024 / 1024).toFixed(2)} MB`}
          icon={Layers}
          color="#a78bfa"
        />
        <StatCard
          title="今日日志"
          value={String(stats.todayLogs)}
          subtitle="条操作记录"
          icon={Activity}
          color="#f59e0b"
        />
      </div>

      {/* Stat Cards Row 2 - Server Config */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <Users className="w-6 h-6" style={{ color: 'var(--accent-purple-light)' }} />
          </div>
          <div>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>用户上限</p>
            <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {stats.totalUsers} / {stats.maxUsers}
            </p>
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
            <TrendingUp className="w-6 h-6" style={{ color: 'var(--accent-green)' }} />
          </div>
          <div>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>单用户数据上限</p>
            <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {stats.maxDataPerUser} MB
            </p>
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
            <Clock className="w-6 h-6" style={{ color: '#f59e0b' }} />
          </div>
          <div>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>日志保留天数</p>
            <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {settings.logRetentionDays} 天
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Status Distribution */}
        <div
          className="rounded-2xl p-6"
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
          }}
        >
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            用户状态分布
          </h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>活跃用户</span>
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {stats.activeUsers} / {stats.totalUsers}
                </span>
              </div>
              <div className="w-full h-2 rounded-full" style={{ backgroundColor: 'var(--bg-input)' }}>
                <div
                  className="h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${stats.totalUsers > 0 ? (stats.activeUsers / stats.totalUsers) * 100 : 0}%`,
                    backgroundColor: '#10b981',
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>禁用用户</span>
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {stats.disabledUsers} / {stats.totalUsers}
                </span>
              </div>
              <div className="w-full h-2 rounded-full" style={{ backgroundColor: 'var(--bg-input)' }}>
                <div
                  className="h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${stats.totalUsers > 0 ? (stats.disabledUsers / stats.totalUsers) * 100 : 0}%`,
                    backgroundColor: '#ef4444',
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div
          className="rounded-2xl p-6"
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
          }}
        >
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            近7天操作记录
          </h2>
          <div className="space-y-3">
            {stats.last7Days.map((day, index) => (
              <div key={index} className="flex items-center gap-3">
                <span className="text-sm w-16" style={{ color: 'var(--text-secondary)' }}>
                  {day.label}
                </span>
                <div className="flex-1 h-6 rounded-lg relative" style={{ backgroundColor: 'var(--bg-input)' }}>
                  <div
                    className="absolute left-0 top-0 h-full rounded-lg transition-all duration-300"
                    style={{
                      width: `${Math.max(
                        5,
                        (day.count / Math.max(...stats.last7Days.map((d) => d.count), 1)) * 100
                      )}%`,
                      backgroundColor: 'var(--accent-purple)',
                      opacity: 0.7 + index * 0.05,
                    }}
                  />
                  <span
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {day.count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* App Partitions Overview */}
      {partitions.length > 0 && (
        <div
          className="rounded-2xl p-6"
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
          }}
        >
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            应用分区概览
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {partitions.map((partition) => (
              <div
                key={partition.userId}
                className="rounded-xl p-4"
                style={{
                  backgroundColor: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                    {partition.username}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(124, 58, 237, 0.2)', color: 'var(--accent-purple-light)' }}>
                    {partition.appPartitions.length} 个应用
                  </span>
                </div>
                <div className="space-y-1">
                  {partition.appPartitions.map((app) => (
                    <div key={app.appId} className="flex justify-between text-xs">
                      <span style={{ color: 'var(--text-secondary)' }}>{app.appName}</span>
                      <span style={{ color: 'var(--text-primary)' }}>
                        {app.keyCount || 0} 键
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
