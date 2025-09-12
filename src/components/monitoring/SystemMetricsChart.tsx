// System Metrics Chart Component
import React, { useMemo, useEffect, useRef } from 'react';
import { SystemMetrics } from '../../types/monitoring';

interface SystemMetricsChartProps {
  metrics: SystemMetrics[];
  height?: number;
  showDetails?: boolean;
  className?: string;
}

export const SystemMetricsChart: React.FC<SystemMetricsChartProps> = ({
  metrics,
  height = 300,
  showDetails = false,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartData = useMemo(() => {
    if (metrics.length === 0) return null;

    const cpuData = metrics.map(m => ({ x: m.timestamp, y: m.cpu.usage }));
    const memoryData = metrics.map(m => ({ x: m.timestamp, y: m.memory.percentage }));
    const diskData = metrics.map(m => ({ x: m.timestamp, y: m.disk.percentage }));

    const timeRange = {
      min: Math.min(...metrics.map(m => m.timestamp)),
      max: Math.max(...metrics.map(m => m.timestamp))
    };

    return {
      cpu: cpuData,
      memory: memoryData,
      disk: diskData,
      timeRange
    };
  }, [metrics]);

  const currentMetrics = useMemo(() => {
    if (metrics.length === 0) return null;
    return metrics[metrics.length - 1];
  }, [metrics]);

  const drawChart = () => {
    const canvas = canvasRef.current;
    if (!canvas || !chartData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const chartHeight = rect.height;
    const padding = { top: 20, right: 50, bottom: 40, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const innerHeight = chartHeight - padding.top - padding.bottom;

    // Clear canvas
    ctx.clearRect(0, 0, width, chartHeight);

    // Background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, width, chartHeight);

    // Grid
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;

    // Horizontal grid lines (percentage)
    for (let i = 0; i <= 10; i++) {
      const y = padding.top + (i / 10) * innerHeight;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartWidth, y);
      ctx.stroke();

      // Y-axis labels
      ctx.fillStyle = '#888';
      ctx.font = '12px Arial';
      ctx.textAlign = 'right';
      ctx.fillText(`${100 - i * 10}%`, padding.left - 10, y + 4);
    }

    // Vertical grid lines (time)
    const timeSpan = chartData.timeRange.max - chartData.timeRange.min;
    const timeStep = timeSpan / 6;
    for (let i = 0; i <= 6; i++) {
      const x = padding.left + (i / 6) * chartWidth;
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, padding.top + innerHeight);
      ctx.stroke();

      // X-axis labels
      if (i > 0 && i < 6) {
        const time = new Date(chartData.timeRange.min + i * timeStep);
        ctx.fillStyle = '#888';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(time.toLocaleTimeString(), x, chartHeight - 10);
      }
    }

    // Draw chart lines
    const drawLine = (data: any[], color: string, lineWidth = 2) => {
      if (data.length === 0) return;

      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();

      data.forEach((point, index) => {
        const x = padding.left + ((point.x - chartData.timeRange.min) / timeSpan) * chartWidth;
        const y = padding.top + ((100 - point.y) / 100) * innerHeight;

        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.stroke();
    };

    // Draw CPU line
    drawLine(chartData.cpu, '#ff6b6b');
    
    // Draw Memory line
    drawLine(chartData.memory, '#4ecdc4');
    
    // Draw Disk line
    drawLine(chartData.disk, '#45b7d1');

    // Legend
    const legendItems = [
      { label: 'CPU', color: '#ff6b6b' },
      { label: 'Memory', color: '#4ecdc4' },
      { label: 'Disk', color: '#45b7d1' }
    ];

    legendItems.forEach((item, index) => {
      const x = padding.left + index * 80;
      const y = 15;

      ctx.fillStyle = item.color;
      ctx.fillRect(x, y - 6, 12, 12);

      ctx.fillStyle = '#fff';
      ctx.font = '12px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(item.label, x + 18, y + 4);
    });
  };

  useEffect(() => {
    drawChart();
  }, [chartData]);

  useEffect(() => {
    const handleResize = () => {
      drawChart();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [chartData]);

  return (
    <div className={`system-metrics-chart ${className}`}>
      <div className="chart-container" style={{ height }}>
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: '100%' }}
        />
      </div>
      
      {showDetails && currentMetrics && (
        <div className="metrics-details">
          <div className="metrics-grid">
            <div className="metric-item cpu">
              <span className="metric-label">CPU Usage</span>
              <span className="metric-value">{currentMetrics.cpu.usage.toFixed(1)}%</span>
              <div className="metric-bar">
                <div 
                  className="metric-fill cpu" 
                  style={{ width: `${currentMetrics.cpu.usage}%` }}
                />
              </div>
            </div>
            
            <div className="metric-item memory">
              <span className="metric-label">Memory Usage</span>
              <span className="metric-value">{currentMetrics.memory.percentage.toFixed(1)}%</span>
              <div className="metric-bar">
                <div 
                  className="metric-fill memory" 
                  style={{ width: `${currentMetrics.memory.percentage}%` }}
                />
              </div>
              <span className="metric-subtext">
                {formatBytes(currentMetrics.memory.used)} / {formatBytes(currentMetrics.memory.total)}
              </span>
            </div>
            
            <div className="metric-item disk">
              <span className="metric-label">Disk Usage</span>
              <span className="metric-value">{currentMetrics.disk.percentage.toFixed(1)}%</span>
              <div className="metric-bar">
                <div 
                  className="metric-fill disk" 
                  style={{ width: `${currentMetrics.disk.percentage}%` }}
                />
              </div>
              <span className="metric-subtext">
                {formatBytes(currentMetrics.disk.used)} / {formatBytes(currentMetrics.disk.total)}
              </span>
            </div>

            <div className="metric-item cores">
              <span className="metric-label">CPU Cores</span>
              <span className="metric-value">{currentMetrics.cpu.cores}</span>
            </div>

            {currentMetrics.network && (
              <div className="metric-item network">
                <span className="metric-label">Network</span>
                <span className="metric-value">
                  {(currentMetrics.network as any).effectiveType || 'Unknown'}
                </span>
                {(currentMetrics.network as any).downlink && (
                  <span className="metric-subtext">
                    {(currentMetrics.network as any).downlink} Mbps
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="system-info">
            <div className="info-item">
              <span className="info-label">Last Updated:</span>
              <span className="info-value">
                {new Date(currentMetrics.timestamp).toLocaleString()}
              </span>
            </div>
            {currentMetrics.cpu.temperature && (
              <div className="info-item">
                <span className="info-label">CPU Temperature:</span>
                <span className="info-value">{currentMetrics.cpu.temperature}°C</span>
              </div>
            )}
          </div>
        </div>
      )}

      {metrics.length === 0 && (
        <div className="no-data">
          <p>No system metrics available</p>
          <small>Start monitoring to see real-time system performance</small>
        </div>
      )}
    </div>
  );
};

// Utility function to format bytes
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};