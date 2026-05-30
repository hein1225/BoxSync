import { Activity, TrendingUp, AlertCircle } from 'lucide-react';
import CpuRing from '@/components/CpuRing';
import MemoryChart from '@/components/MemoryChart';

const memoryData = [15, 25, 20, 35, 30, 45, 40, 55, 50, 65, 60, 70];
const memoryLabels = ['00:00', '02:00', '04:00', '06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'];

const networkData = [120, 150, 180, 140, 200, 170, 220, 190, 250, 210, 280, 240];

export default function Monitor() {
  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
        系统监控
      </h1>

      {/* Stats Row */}
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
            <Activity className="w-6 h-6" style={{ color: 'var(--accent-purple-light)' }} />
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

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CPU */}
        <div
          className="rounded-2xl p-6"
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
          }}
        >
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            CPU 使用率
          </h2>
          <div className="flex items-center justify-center py-4">
            <CpuRing percentage={68} size={180} strokeWidth={14} />
          </div>
        </div>

        {/* Memory */}
        <div
          className="rounded-2xl p-6"
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
          }}
        >
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            内存使用趋势
          </h2>
          <MemoryChart data={memoryData} labels={memoryLabels} />
        </div>

        {/* Network */}
        <div
          className="rounded-2xl p-6 lg:col-span-2"
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
          }}
        >
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            网络流量 (MB/s)
          </h2>
          <MemoryChart data={networkData} labels={memoryLabels} />
        </div>
      </div>
    </div>
  );
}
