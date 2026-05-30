import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color?: string;
}

export default function StatCard({ title, value, icon: Icon, color = 'var(--accent-purple)' }: StatCardProps) {
  return (
    <div
      className="rounded-2xl p-5 flex items-center gap-4 transition-all duration-200 hover:shadow-lg"
      style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
      }}
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${color}20` }}
      >
        <Icon className="w-6 h-6" style={{ color }} />
      </div>
      <div>
        <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
          {title}
        </p>
        <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          {value}
        </p>
      </div>
    </div>
  );
}
