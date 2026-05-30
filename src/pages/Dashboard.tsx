import { Users, Activity, Cpu, HardDrive, Database, TrendingUp, AlertCircle, Clock } from 'lucide-react';
import StatCard from '@/components/StatCard';
import CpuRing from '@/components/CpuRing';
import MemoryChart from '@/components/MemoryChart';
import FileTree from '@/components/FileTree';
import type { FileTreeNode } from '@/types';

const memoryData = [20, 35, 28, 45, 32, 50, 38, 55, 42, 60, 48];
const memoryLabels = ['0:1', '0:5', '0:10', '0:15', '0:17', '0:20', '0:25', '0:27', '0:30', '0:35', '0:39'];

const networkData = [120, 150, 180, 140, 200, 170, 220, 190, 250, 210, 280, 240];
const networkLabels = ['00:00', '02:00', '04:00', '06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'];

const fileTreeData: FileTreeNode[] = [
  {
    id: '1',
    name: 'var/www',
    type: 'folder',
    color: 'blue',
    children: [
      {
        id: '2',
        name: 'boxsync',
        type: 'folder',
        color: 'green',
        children: [
          { id: '3', name: 'user_data', type: 'folder', color: 'purple' },
          { id: '4', name: 'config.json', type: 'file', color: 'yellow' },
        ],
      },
      {
        id: '5',
        name: 'logs',
        type: 'folder',
        color: 'orange',
        children: [
          { id: '6', name: 'access.log', type: 'file', color: 'cyan' },
          { id: '7', name: 'error.log', type: 'file', color: 'red' },
        ],
      },
      { id: '8', name: 'index.html', type: 'file', color: 'blue' },
      { id: '9', name: 'app.js', type: 'file', color: 'yellow' },
    ],
  },
  {
    id: '10',
    name: 'etc',
    type: 'folder',
    color: 'green',
    children: [
      { id: '11', name: 'nginx.conf', type: 'file', color: 'cyan' },
      { id: '12', name: 'redis.conf', type: 'file', color: 'red' },
    ],
  },
  {
    id: '13',
    name: 'backup',
    type: 'folder',
    color: 'purple',
    children: [
      { id: '14', name: '2026-05-29.json', type: 'file', color: 'green' },
      { id: '15', name: '2026-05-28.json', type: 'file', color: 'green' },
    ],
  },
];

export default function Dashboard() {
  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
          BoxSync 管理后台概览
        </h1>
      </div>

      {/* Stat Cards Row 1 - Core Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="当前在线" value="128" icon={Users} color="#7c3aed" />
        <StatCard title="系统负载" value="2.3" icon={Activity} color="#10b981" />
        <StatCard title="CPU 使用率" value="75%" icon={Cpu} color="#a78bfa" />
        <StatCard title="磁盘使用" value="345GB/500GB" icon={HardDrive} color="#f59e0b" />
      </div>

      {/* Stat Cards Row 2 - Monitor Metrics */}
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
            <Clock className="w-6 h-6" style={{ color: 'var(--accent-purple-light)' }} />
          </div>
          <div>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>系统运行时间</p>
            <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>15天 8小时</p>
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
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>平均响应时间</p>
            <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>24ms</p>
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
            style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)' }}
          >
            <AlertCircle className="w-6 h-6" style={{ color: 'var(--accent-red)' }} />
          </div>
          <div>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>错误率</p>
            <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>0.12%</p>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - CPU & Memory */}
        <div className="space-y-6">
          {/* CPU Card */}
          <div
            className="rounded-2xl p-6"
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                CPU
              </h2>
              <span
                className="text-xs px-2 py-1 rounded-full"
                style={{
                  backgroundColor: 'rgba(124, 58, 237, 0.2)',
                  color: 'var(--accent-purple-light)',
                }}
              >
                实时
              </span>
            </div>

            <div className="flex items-center gap-8">
              <CpuRing percentage={75} size={140} strokeWidth={10} />

              <div className="space-y-3 flex-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--accent-purple)' }} />
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      CPU使用率
                    </span>
                  </div>
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    75%
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--accent-green)' }} />
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      内存占用
                    </span>
                  </div>
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    4.2GB
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#f59e0b' }} />
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      磁盘空间
                    </span>
                  </div>
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    345GB/500GB
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Memory Chart */}
          <div
            className="rounded-2xl p-6"
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                内存占用
              </h2>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--accent-green)' }} />
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>可用</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--accent-purple-light)' }} />
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>已用</span>
                </div>
              </div>
            </div>
            <MemoryChart data={memoryData} labels={memoryLabels} />
          </div>

          {/* Network Chart */}
          <div
            className="rounded-2xl p-6"
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
            }}
          >
            <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              网络流量 (MB/s)
            </h2>
            <MemoryChart data={networkData} labels={networkLabels} />
          </div>
        </div>

        {/* Right Column - File Tree */}
        <div
          className="rounded-2xl p-6"
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              根目录 /var/www
            </h2>
            <Database className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
          </div>
          <FileTree data={fileTreeData} />
        </div>
      </div>
    </div>
  );
}
