import { useEffect, useRef } from 'react';

interface MemoryChartProps {
  data: number[];
  labels: string[];
  width?: number;
  height?: number;
}

export default function MemoryChart({ data, labels, width = 320, height = 160 }: MemoryChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.clearRect(0, 0, width, height);

    const padding = { top: 20, right: 20, bottom: 30, left: 40 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const maxValue = Math.max(...data) * 1.2;
    const minValue = 0;

    // Draw grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartHeight / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      // Y-axis labels
      const value = Math.round(maxValue - (maxValue / 4) * i);
      ctx.fillStyle = 'rgba(160,160,176,0.6)';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(value.toString(), padding.left - 8, y + 3);
    }

    // Draw area
    const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
    gradient.addColorStop(0, 'rgba(124, 58, 237, 0.3)');
    gradient.addColorStop(1, 'rgba(124, 58, 237, 0.02)');

    ctx.beginPath();
    ctx.moveTo(padding.left, height - padding.bottom);

    data.forEach((value, index) => {
      const x = padding.left + (chartWidth / (data.length - 1)) * index;
      const y = padding.top + chartHeight - ((value - minValue) / (maxValue - minValue)) * chartHeight;
      if (index === 0) {
        ctx.lineTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.lineTo(width - padding.right, height - padding.bottom);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw line
    ctx.beginPath();
    ctx.strokeStyle = '#a78bfa';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    data.forEach((value, index) => {
      const x = padding.left + (chartWidth / (data.length - 1)) * index;
      const y = padding.top + chartHeight - ((value - minValue) / (maxValue - minValue)) * chartHeight;
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    // Draw points
    data.forEach((value, index) => {
      const x = padding.left + (chartWidth / (data.length - 1)) * index;
      const y = padding.top + chartHeight - ((value - minValue) / (maxValue - minValue)) * chartHeight;

      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#a78bfa';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(167, 139, 250, 0.2)';
      ctx.fill();
    });

    // X-axis labels
    labels.forEach((label, index) => {
      const x = padding.left + (chartWidth / (labels.length - 1)) * index;
      ctx.fillStyle = 'rgba(160,160,176,0.6)';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, x, height - 8);
    });
  }, [data, labels, width, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height }}
      className="w-full"
    />
  );
}
