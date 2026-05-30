interface CpuRingProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
}

export default function CpuRing({ percentage, size = 160, strokeWidth = 12 }: CpuRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  const getColor = (p: number) => {
    if (p < 50) return 'var(--accent-green)';
    if (p < 80) return 'var(--accent-purple-light)';
    return 'var(--accent-red)';
  };

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={strokeWidth}
        />
        {/* Progress ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getColor(percentage)}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.5s ease-out' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
          {percentage}%
        </span>
        <span className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
          CPU
        </span>
      </div>
    </div>
  );
}
