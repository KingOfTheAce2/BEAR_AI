// Recommendations Panel Component
import React, { useState, useMemo } from 'react';
import { OptimizationRecommendation } from '../../types/monitoring';

interface RecommendationsPanelProps {
  recommendations: OptimizationRecommendation[];
  onApply: (recommendationId: string) => void;
  compact?: boolean;
  className?: string;
}

export const RecommendationsPanel: React.FC<RecommendationsPanelProps> = ({
  recommendations,
  onApply,
  compact = false,
  className = ''
}) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'applied'>('pending');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const filteredRecommendations = useMemo(() => {
    let filtered = recommendations;

    // Filter by status
    if (filter === 'pending') {
      filtered = filtered.filter(rec => !rec.applied);
    } else if (filter === 'applied') {
      filtered = filtered.filter(rec => rec.applied);
    }

    // Filter by category
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(rec => rec.category === categoryFilter);
    }

    // Filter by priority
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(rec => rec.priority === priorityFilter);
    }

    // Sort by priority and timestamp
    return filtered.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder];
      const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder];
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority; // Higher priority first
      }
      
      return b.timestamp - a.timestamp; // Newer first
    });
  }, [recommendations, filter, categoryFilter, priorityFilter]);

  const recommendationStats = useMemo(() => {
    const pending = recommendations.filter(r => !r.applied).length;
    const applied = recommendations.filter(r => r.applied).length;
    const critical = recommendations.filter(r => r.priority === 'critical' && !r.applied).length;
    const high = recommendations.filter(r => r.priority === 'high' && !r.applied).length;
    
    const byCategory = recommendations.reduce((acc, rec) => {
      acc[rec.category] = (acc[rec.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return { pending, applied, critical, high, byCategory };
  }, [recommendations]);

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical': return '🔴';
      case 'high': return '🟠';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return 'ℹ️';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return '#ff4757';
      case 'high': return '#ff6348';
      case 'medium': return '#ffa726';
      case 'low': return '#26de81';
      default: return '#3742fa';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'system': return '💻';
      case 'model': return '🤖';
      case 'memory': return '🧠';
      case 'disk': return '💾';
      case 'network': return '🌐';
      default: return '⚙️';
    }
  };

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  return (
    <div className={`recommendations-panel ${compact ? 'compact' : ''} ${className}`}>
      {!compact && (
        <div className="recommendations-header">
          <div className="recommendations-stats">
            <div className="stat-item">
              <span className="stat-label">Pending</span>
              <span className="stat-value pending">{recommendationStats.pending}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Critical</span>
              <span className="stat-value critical">{recommendationStats.critical}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">High Priority</span>
              <span className="stat-value high">{recommendationStats.high}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Applied</span>
              <span className="stat-value">{recommendationStats.applied}</span>
            </div>
          </div>

          <div className="recommendations-filters">
            <select 
              value={filter} 
              onChange={(e) => setFilter(e.target.value as any)}
              className="filter-select"
            >
              <option value="all">All Recommendations</option>
              <option value="pending">Pending Only</option>
              <option value="applied">Applied Only</option>
            </select>

            <select 
              value={categoryFilter} 
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Categories</option>
              <option value="system">System</option>
              <option value="model">Model</option>
              <option value="memory">Memory</option>
              <option value="disk">Disk</option>
              <option value="network">Network</option>
            </select>

            <select 
              value={priorityFilter} 
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      )}

      <div className="recommendations-list">
        {filteredRecommendations.length === 0 ? (
          <div className="no-recommendations">
            {filter === 'pending' ? (
              <div className="no-pending-recommendations">
                <span className="icon">🎯</span>
                <p>No pending recommendations</p>
                <small>System is well optimized</small>
              </div>
            ) : (
              <div className="no-recommendations-message">
                <p>No recommendations found</p>
                <small>Adjust filters to see more results</small>
              </div>
            )}
          </div>
        ) : (
          filteredRecommendations.map(recommendation => (
            <div 
              key={recommendation.id} 
              className={`recommendation-item ${recommendation.priority} ${recommendation.applied ? 'applied' : 'pending'}`}
            >
              <div className="recommendation-header">
                <div className="recommendation-info">
                  <span className="priority-icon">{getPriorityIcon(recommendation.priority)}</span>
                  <span className="category-icon">{getCategoryIcon(recommendation.category)}</span>
                  <div className="recommendation-title-section">
                    <h4 className="recommendation-title">{recommendation.title}</h4>
                    <div className="recommendation-meta">
                      <span className="recommendation-category">{recommendation.category}</span>
                      <span 
                        className="recommendation-priority"
                        style={{ color: getPriorityColor(recommendation.priority) }}
                      >
                        {recommendation.priority}
                      </span>
                      <span className="recommendation-time">{formatTimeAgo(recommendation.timestamp)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="recommendation-actions">
                  {!compact && (
                    <button
                      className="expand-btn"
                      onClick={() => toggleExpanded(recommendation.id)}
                      title={expandedItems.has(recommendation.id) ? "Collapse" : "Expand"}
                    >
                      {expandedItems.has(recommendation.id) ? '▼' : '▶'}
                    </button>
                  )}
                  
                  {!recommendation.applied && !compact && (
                    <button
                      className="apply-btn"
                      onClick={() => onApply(recommendation.id)}
                      title="Mark as applied"
                    >
                      Apply
                    </button>
                  )}
                </div>
              </div>

              <div className="recommendation-content">
                <p className="recommendation-description">{recommendation.description}</p>
                
                {!compact && (
                  <div className="recommendation-impact">
                    <div className="impact-section">
                      <strong>Expected Impact:</strong>
                      <span className="impact-text">{recommendation.impact}</span>
                    </div>
                    <div className="improvement-section">
                      <strong>Estimated Improvement:</strong>
                      <span className="improvement-text">{recommendation.estimatedImprovement}</span>
                    </div>
                  </div>
                )}

                {(expandedItems.has(recommendation.id) || compact) && (
                  <div className="recommendation-implementation">
                    <h5>Implementation Steps:</h5>
                    <ol className="implementation-list">
                      {recommendation.implementation.map((step, index) => (
                        <li key={index} className="implementation-step">
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {!compact && (
                  <div className="recommendation-footer">
                    <div className="recommendation-timestamp">
                      <small>
                        <strong>Generated:</strong> {new Date(recommendation.timestamp).toLocaleString()}
                        {recommendation.applied && recommendation.appliedAt && (
                          <>
                            {' • '}
                            <strong>Applied:</strong> {new Date(recommendation.appliedAt).toLocaleString()}
                          </>
                        )}
                      </small>
                    </div>
                  </div>
                )}
              </div>

              {recommendation.applied && (
                <div className="recommendation-applied-indicator">
                  <span className="applied-icon">✅</span>
                  <span className="applied-text">Applied</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {!compact && recommendations.length > 0 && (
        <div className="recommendations-summary">
          <h4>Recommendations by Category</h4>
          <div className="category-breakdown">
            {Object.entries(recommendationStats.byCategory).map(([category, count]) => (
              <div key={category} className="category-item">
                <span className="category-icon">{getCategoryIcon(category)}</span>
                <span className="category-name">{category}</span>
                <span className="category-count">{count}</span>
                <div className="category-bar">
                  <div 
                    className="category-fill" 
                    style={{ 
                      width: `${(count / recommendations.length) * 100}%`,
                      backgroundColor: getCategoryColor(category)
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Utility function to get category colors
const getCategoryColor = (category: string): string => {
  switch (category) {
    case 'system': return '#ff6b6b';
    case 'model': return '#4ecdc4';
    case 'memory': return '#45b7d1';
    case 'disk': return '#96ceb4';
    case 'network': return '#feca57';
    default: return '#888';
  }
};