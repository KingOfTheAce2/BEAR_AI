// Model Metrics Chart Component
import React, { useMemo, useEffect, useRef } from 'react';
import { ModelPerformanceMetrics } from '../../types/monitoring';

interface ModelMetricsChartProps {
  metrics: ModelPerformanceMetrics[];
  height?: number;
  showDetails?: boolean;
  className?: string;
}

export const ModelMetricsChart: React.FC<ModelMetricsChartProps> = ({
  metrics,
  height = 300,
  showDetails = false,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const chartData = useMemo(() => {
    if (metrics.length === 0) return null;

    const latencyData = metrics.map(m => ({ x: m.timestamp, y: m.metrics.latency }));
    const memoryData = metrics.map(m => ({ x: m.timestamp, y: m.metrics.memoryUsage / (1024 * 1024) })); // Convert to MB
    const throughputData = metrics.filter(m => m.metrics.throughput).map(m => ({ x: m.timestamp, y: m.metrics.throughput! }));

    const timeRange = {
      min: Math.min(...metrics.map(m => m.timestamp)),
      max: Math.max(...metrics.map(m => m.timestamp))
    };

    const latencyRange = {
      min: Math.min(...latencyData.map(d => d.y)),
      max: Math.max(...latencyData.map(d => d.y))
    };

    const memoryRange = {
      min: Math.min(...memoryData.map(d => d.y)),
      max: Math.max(...memoryData.map(d => d.y))
    };

    return {
      latency: latencyData,
      memory: memoryData,
      throughput: throughputData,
      timeRange,
      latencyRange,
      memoryRange
    };
  }, [metrics]);

  const modelStats = useMemo(() => {
    if (metrics.length === 0) return null;

    const recentMetrics = metrics.slice(-20); // Last 20 operations
    const inferenceMetrics = metrics.filter(m => m.operation === 'inference');
    const trainingMetrics = metrics.filter(m => m.operation === 'training');
    const loadingMetrics = metrics.filter(m => m.operation === 'loading');

    const avgLatency = recentMetrics.reduce((sum, m) => sum + m.metrics.latency, 0) / recentMetrics.length;
    const avgMemory = recentMetrics.reduce((sum, m) => sum + m.metrics.memoryUsage, 0) / recentMetrics.length;
    const errorRate = recentMetrics.filter(m => m.metrics.errorRate && m.metrics.errorRate > 0).length / recentMetrics.length * 100;

    const uniqueModels = new Set(metrics.map(m => m.modelId)).size;

    return {
      avgLatency,
      avgMemory,
      errorRate,
      totalOperations: metrics.length,
      inferenceCount: inferenceMetrics.length,
      trainingCount: trainingMetrics.length,
      loadingCount: loadingMetrics.length,
      uniqueModels
    };
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
    const padding = { top: 40, right: 60, bottom: 40, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const innerHeight = chartHeight - padding.top - padding.bottom;

    // Clear canvas
    ctx.clearRect(0, 0, width, chartHeight);

    // Background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, width, chartHeight);

    // Title
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Model Performance Metrics', width / 2, 20);

    // Grid
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;

    // Time span for x-axis
    const timeSpan = chartData.timeRange.max - chartData.timeRange.min;

    // Horizontal grid lines (latency)
    const latencySpan = chartData.latencyRange.max - chartData.latencyRange.min;
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (i / 5) * innerHeight;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartWidth, y);
      ctx.stroke();

      // Y-axis labels (latency)
      const latencyValue = chartData.latencyRange.max - (i / 5) * latencySpan;
      ctx.fillStyle = '#888';
      ctx.font = '10px Arial';
      ctx.textAlign = 'right';
      ctx.fillText(`${latencyValue.toFixed(0)}ms`, padding.left - 5, y + 3);
    }

    // Vertical grid lines (time)
    for (let i = 0; i <= 6; i++) {
      const x = padding.left + (i / 6) * chartWidth;
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, padding.top + innerHeight);
      ctx.stroke();

      // X-axis labels
      if (i > 0 && i < 6) {
        const time = new Date(chartData.timeRange.min + (i / 6) * timeSpan);
        ctx.fillStyle = '#888';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(time.toLocaleTimeString(), x, chartHeight - 10);
      }
    }

    // Draw latency line
    const drawLatencyLine = () => {
      if (chartData.latency.length === 0) return;

      ctx.strokeStyle = '#ff6b6b';
      ctx.lineWidth = 2;
      ctx.beginPath();

      chartData.latency.forEach((point, index) => {
        const x = padding.left + ((point.x - chartData.timeRange.min) / timeSpan) * chartWidth;
        const y = padding.top + ((chartData.latencyRange.max - point.y) / latencySpan) * innerHeight;

        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.stroke();

      // Draw points
      ctx.fillStyle = '#ff6b6b';
      chartData.latency.forEach(point => {
        const x = padding.left + ((point.x - chartData.timeRange.min) / timeSpan) * chartWidth;
        const y = padding.top + ((chartData.latencyRange.max - point.y) / latencySpan) * innerHeight;
        
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, 2 * Math.PI);
        ctx.fill();
      });
    };

    // Draw memory usage as area chart
    const drawMemoryArea = () => {
      if (chartData.memory.length === 0) return;

      const memorySpan = chartData.memoryRange.max - chartData.memoryRange.min;
      
      ctx.fillStyle = 'rgba(78, 205, 196, 0.3)';
      ctx.strokeStyle = '#4ecdc4';
      ctx.lineWidth = 1;
      
      ctx.beginPath();
      
      // Start from bottom
      const firstX = padding.left + ((chartData.memory[0].x - chartData.timeRange.min) / timeSpan) * chartWidth;
      ctx.moveTo(firstX, padding.top + innerHeight);

      chartData.memory.forEach(point => {
        const x = padding.left + ((point.x - chartData.timeRange.min) / timeSpan) * chartWidth;
        const y = padding.top + innerHeight - ((point.y - chartData.memoryRange.min) / Math.max(memorySpan, 1)) * (innerHeight * 0.3);
        ctx.lineTo(x, y);
      });

      // Close to bottom
      const lastX = padding.left + ((chartData.memory[chartData.memory.length - 1].x - chartData.timeRange.min) / timeSpan) * chartWidth;
      ctx.lineTo(lastX, padding.top + innerHeight);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    };

    drawLatencyLine();
    drawMemoryArea();

    // Legend
    const legendItems = [
      { label: 'Latency (ms)', color: '#ff6b6b' },
      { label: 'Memory Usage', color: '#4ecdc4' }
    ];

    if (chartData.throughput.length > 0) {
      legendItems.push({ label: 'Throughput', color: '#45b7d1' });
    }

    legendItems.forEach((item, index) => {
      const x = padding.left + index * 120;
      const y = 35;

      ctx.fillStyle = item.color;
      ctx.fillRect(x, y - 6, 12, 12);

      ctx.fillStyle = '#fff';
      ctx.font = '11px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(item.label, x + 18, y + 4);
    });

    // Right axis labels for memory
    ctx.fillStyle = '#4ecdc4';
    ctx.font = '10px Arial';
    ctx.textAlign = 'left';
    const memorySpan = chartData.memoryRange.max - chartData.memoryRange.min;
    for (let i = 0; i <= 3; i++) {
      const y = padding.top + innerHeight - (i / 3) * (innerHeight * 0.3);
      const memoryValue = chartData.memoryRange.min + (i / 3) * memorySpan;
      ctx.fillText(`${memoryValue.toFixed(1)}MB`, width - 50, y + 3);
    }
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
    <div className={`model-metrics-chart ${className}`}>
      <div className="chart-container" style={{ height }}>
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: '100%' }}
        />
      </div>
      
      {showDetails && modelStats && (
        <div className="model-details">
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-label">Total Operations</span>
              <span className="stat-value">{modelStats.totalOperations}</span>
            </div>
            
            <div className="stat-item">
              <span className="stat-label">Unique Models</span>
              <span className="stat-value">{modelStats.uniqueModels}</span>
            </div>
            
            <div className="stat-item">
              <span className="stat-label">Avg Latency</span>
              <span className="stat-value">{modelStats.avgLatency.toFixed(1)}ms</span>
            </div>
            
            <div className="stat-item">
              <span className="stat-label">Avg Memory</span>
              <span className="stat-value">{formatBytes(modelStats.avgMemory)}</span>
            </div>
            
            <div className="stat-item">
              <span className="stat-label">Error Rate</span>
              <span className="stat-value">{modelStats.errorRate.toFixed(1)}%</span>
            </div>
          </div>

          <div className="operation-breakdown">
            <h4>Operations Breakdown</h4>
            <div className="breakdown-grid">
              <div className="breakdown-item">
                <span className="breakdown-label">Inference</span>
                <span className="breakdown-value">{modelStats.inferenceCount}</span>
                <div className="breakdown-bar">
                  <div 
                    className="breakdown-fill inference" 
                    style={{ width: `${(modelStats.inferenceCount / modelStats.totalOperations) * 100}%` }}
                  />
                </div>
              </div>
              
              <div className="breakdown-item">
                <span className="breakdown-label">Training</span>
                <span className="breakdown-value">{modelStats.trainingCount}</span>
                <div className="breakdown-bar">
                  <div 
                    className="breakdown-fill training" 
                    style={{ width: `${(modelStats.trainingCount / modelStats.totalOperations) * 100}%` }}
                  />
                </div>
              </div>
              
              <div className="breakdown-item">
                <span className="breakdown-label">Loading</span>
                <span className="breakdown-value">{modelStats.loadingCount}</span>
                <div className="breakdown-bar">
                  <div 
                    className="breakdown-fill loading" 
                    style={{ width: `${(modelStats.loadingCount / modelStats.totalOperations) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {metrics.length > 0 && (
            <div className="recent-operations">
              <h4>Recent Operations</h4>
              <div className="operations-list">
                {metrics.slice(-5).reverse().map((metric, index) => (
                  <div key={index} className="operation-item">
                    <span className="operation-model">{metric.modelName}</span>
                    <span className="operation-type">{metric.operation}</span>
                    <span className="operation-latency">{metric.metrics.latency.toFixed(0)}ms</span>
                    <span className="operation-time">
                      {new Date(metric.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {metrics.length === 0 && (
        <div className="no-data">
          <p>No model metrics available</p>
          <small>Perform model operations to see performance data</small>
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