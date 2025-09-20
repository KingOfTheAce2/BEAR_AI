import React, { useState, useEffect } from 'react';

import {
  AnalyticsQuery,
  AnalyticsResult,
  KnowledgeBaseStats
} from '../../../types/knowledge/types';
import KnowledgeBaseService from '../../../services/knowledge/core/KnowledgeBaseService';
import './KnowledgeAnalytics.css';

interface ChartData {
  labels: string[];
  values: number[];
  metadata?: any[];
}

export const KnowledgeAnalyticsComponent: React.FC = () => {
  const [stats, setStats] = useState<KnowledgeBaseStats | null>(null);
  const [selectedQuery, setSelectedQuery] = useState<AnalyticsQuery>({
    type: 'summary',
    field: 'overview'
  });
  const [analyticsResult, setAnalyticsResult] = useState<AnalyticsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const knowledgeBase = KnowledgeBaseService.getInstance();

  const predefinedQueries: AnalyticsQuery[] = [
    { type: 'summary', field: 'overview' },
    { type: 'distribution', field: 'document-categories' },
    { type: 'distribution', field: 'document-languages' },
    { type: 'distribution', field: 'document-sizes' },
    { type: 'trend', field: 'search-volume', timeRange: getLastWeek(), groupBy: 'day' },
    { type: 'trend', field: 'user-engagement', timeRange: getLastMonth(), groupBy: 'week' },
    { type: 'correlation', field: 'search-volume' }
  ];

  function getLastWeek() {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 7);
    return { start, end };
  }

  function getLastMonth() {
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - 1);
    return { start, end };
  }

  useEffect(() => {
    loadStats();
  }, [] // eslint-disable-line react-hooks/exhaustive-deps);

  useEffect(() => {
    if (selectedQuery) {
      runAnalytics(selectedQuery);
    }
  }, [selectedQuery]);

  const loadStats = async () => {
    try {
      const knowledgeStats = await knowledgeBase.getStats();
      setStats(knowledgeStats);
    } catch (err) {
      console.error('Error loading stats:', err);
      setError('Failed to load knowledge base statistics');
    }
  };

  const runAnalytics = async (query: AnalyticsQuery) => {
    setLoading(true);
    setError(null);

    try {
      const result = await knowledgeBase.getAnalytics(query);
      setAnalyticsResult(result);
    } catch (err) {
      console.error('Error running analytics:', err);
      setError('Failed to run analytics query');
    } finally {
      setLoading(false);
    }
  };

  const handleQueryChange = (query: AnalyticsQuery) => {
    setSelectedQuery(query);
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const formatFileSize = (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const renderChart = (data: ChartData, type: 'bar' | 'line' | 'pie' = 'bar') => {
    const maxValue = Math.max(...data.values);
    
    return (
      <div className="simple-chart">
        {type === 'bar' && (
          <div className="bar-chart">
            {data.labels.map((label, index) => (
              <div key={index} className="bar-item">
                <div className="bar-label">{label}</div>
                <div className="bar-container">
                  <div 
                    className="bar"
                    style={{ 
                      height: `${(data.values[index] / maxValue) * 100}%`,
                      background: `hsl(${(index * 360) / data.labels.length}, 70%, 60%)`
                    }}
                  >
                    <span className="bar-value">{formatNumber(data.values[index])}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {type === 'line' && (
          <div className="line-chart">
            <svg width="100%" height="200" viewBox="0 0 400 200">
              <defs>
                <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="rgba(0, 123, 255, 0.3)" />
                  <stop offset="100%" stopColor="rgba(0, 123, 255, 0)" />
                </linearGradient>
              </defs>
              
              {/* Grid lines */}
              {[0, 25, 50, 75, 100].map(y => (
                <line key={y} x1="0" y1={y * 2} x2="400" y2={y * 2} stroke="#e9ecef" strokeWidth="1" />
              ))}
              
              {/* Data line */}
              <polyline
                fill="none"
                stroke="#007bff"
                strokeWidth="2"
                points={data.values.map((value, index) => 
                  `${(index / (data.values.length - 1)) * 400},${200 - (value / maxValue) * 200}`
                ).join(' ')}
              />
              
              {/* Data points */}
              {data.values.map((value, index) => (
                <circle
                  key={index}
                  cx={(index / (data.values.length - 1)) * 400}
                  cy={200 - (value / maxValue) * 200}
                  r="4"
                  fill="#007bff"
                />
              ))}
              
              {/* Area fill */}
              <polygon
                fill="url(#lineGradient)"
                points={`0,200 ${data.values.map((value, index) => 
                  `${(index / (data.values.length - 1)) * 400},${200 - (value / maxValue) * 200}`
                ).join(' ')} 400,200`}
              />
            </svg>
            
            <div className="line-chart-labels">
              {data.labels.map((label, index) => (
                <span key={index} className="line-label">
                  {label}
                </span>
              ))}
            </div>
          </div>
        )}

        {type === 'pie' && (
          <div className="pie-chart">
            <div className="pie-legend">
              {data.labels.map((label, index) => (
                <div key={index} className="pie-legend-item">
                  <div 
                    className="pie-color" 
                    style={{ background: `hsl(${(index * 360) / data.labels.length}, 70%, 60%)` }}
                  />
                  <span>{label}: {formatNumber(data.values[index])}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const getChartType = (queryType: string, field: string): 'bar' | 'line' | 'pie' => {
    if (queryType === 'trend') return 'line';
    if (field.includes('distribution') || queryType === 'distribution') return 'pie';
    return 'bar';
  };

  return (
    <div className="knowledge-analytics">
      <div className="analytics-header">
        <h2>Knowledge Base Analytics</h2>
        <div className="refresh-button">
          <button onClick={loadStats} className="btn btn-outline">
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Overview Stats Cards */}
      {stats && (
        <div className="stats-overview">
          <div className="stat-card">
            <div className="stat-value">{formatNumber(stats.totalDocuments)}</div>
            <div className="stat-label">Documents</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-value">{formatNumber(stats.totalChunks)}</div>
            <div className="stat-label">Chunks</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-value">{formatNumber(stats.totalEmbeddings)}</div>
            <div className="stat-label">Embeddings</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-value">{formatFileSize(stats.storage.totalSize)}</div>
            <div className="stat-label">Storage</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-value">{stats.searchPerformance.avgQueryTime.toFixed(0)}ms</div>
            <div className="stat-label">Avg Query Time</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-value">{Math.round(stats.searchPerformance.successRate * 100)}%</div>
            <div className="stat-label">Search Success</div>
          </div>
        </div>
      )}

      <div className="analytics-content">
        {/* Query Selector */}
        <div className="query-selector">
          <h3>Analytics Queries</h3>
          <div className="query-buttons">
            {predefinedQueries.map((query, index) => (
              <button
                key={index}
                className={`query-button ${JSON.stringify(selectedQuery) === JSON.stringify(query) ? 'active' : ''}`}
                onClick={() => handleQueryChange(query)}
              >
                {query.type} - {query.field}
              </button>
            ))}
          </div>
        </div>

        {/* Analytics Results */}
        <div className="analytics-results">
          {loading && (
            <div className="loading-message">
              <div className="loading-spinner"></div>
              Running analytics...
            </div>
          )}

          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}

          {analyticsResult && !loading && (
            <div className="result-container">
              <div className="result-header">
                <h3>
                  {analyticsResult.query.type} - {analyticsResult.query.field}
                </h3>
                <div className="result-meta">
                  Generated at: {analyticsResult.generatedAt.toLocaleString()}
                </div>
              </div>

              {/* Chart */}
              {analyticsResult.data.length > 0 && (
                <div className="chart-container">
                  {renderChart(
                    {
                      labels: analyticsResult.data.map(d => d.label),
                      values: analyticsResult.data.map(d => d.value),
                      metadata: analyticsResult.data.map(d => d.metadata)
                    },
                    getChartType(analyticsResult.query.type, analyticsResult.query.field)
                  )}
                </div>
              )}

              {/* Summary */}
              <div className="summary-section">
                <h4>Summary</h4>
                <div className="summary-stats">
                  <div className="summary-item">
                    <label>Total:</label>
                    <span>{formatNumber(analyticsResult.summary.total)}</span>
                  </div>
                  <div className="summary-item">
                    <label>Average:</label>
                    <span>{analyticsResult.summary.average.toFixed(2)}</span>
                  </div>
                  <div className="summary-item">
                    <label>Median:</label>
                    <span>{analyticsResult.summary.median.toFixed(2)}</span>
                  </div>
                  <div className="summary-item">
                    <label>Range:</label>
                    <span>{analyticsResult.summary.min.toFixed(2)} - {analyticsResult.summary.max.toFixed(2)}</span>
                  </div>
                  {analyticsResult.summary.trend && (
                    <div className="summary-item">
                      <label>Trend:</label>
                      <span className={`trend trend-${analyticsResult.summary.trend}`}>
                        {analyticsResult.summary.trend}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Insights */}
              {analyticsResult.summary.insights && analyticsResult.summary.insights.length > 0 && (
                <div className="insights-section">
                  <h4>Insights</h4>
                  <ul className="insights-list">
                    {analyticsResult.summary.insights.map((insight, index) => (
                      <li key={index} className="insight-item">
                        <span className="insight-icon">💡</span>
                        {insight}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Data Table */}
              <div className="data-table-section">
                <h4>Detailed Data</h4>
                <div className="data-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Label</th>
                        <th>Value</th>
                        {analyticsResult.data[0]?.metadata && <th>Metadata</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {analyticsResult.data.map((dataPoint, index) => (
                        <tr key={index}>
                          <td>{dataPoint.label}</td>
                          <td>{dataPoint.value.toFixed(2)}</td>
                          {dataPoint.metadata && (
                            <td>
                              <pre className="metadata-json">
                                {JSON.stringify(dataPoint.metadata, null, 2)}
                              </pre>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KnowledgeAnalyticsComponent;