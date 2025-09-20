import React, { useState } from 'react';
import './LegalToolbar.css';
import { PracticeArea, Jurisdiction, LegalConversationMetrics } from '../../types/legal';

interface LegalToolbarProps {
  practiceArea: PracticeArea;
  jurisdiction: Jurisdiction;
  confidentialityLevel: 'public' | 'attorney-client' | 'work-product' | 'confidential';
  metrics?: LegalConversationMetrics | null;
  onToggleCitations: () => void;
  onToggleContext: () => void;
  onToggleSettings: () => void;
  onToggleSidebar: () => void;
  showCitations: boolean;
  showContext: boolean;
  showSettings: boolean;
  isMobile: boolean;
  className?: string;
}

export const LegalToolbar: React.FC<LegalToolbarProps> = ({
  practiceArea,
  jurisdiction,
  confidentialityLevel,
  metrics,
  onToggleCitations,
  onToggleContext,
  onToggleSettings,
  onToggleSidebar,
  showCitations,
  showContext,
  showSettings,
  isMobile,
  className = ''
}) => {
  const [showMetricsDetail, setShowMetricsDetail] = useState(false);

  // Format practice area for display
  const formatPracticeArea = (area: PracticeArea): string => {
    return area.split('-').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  // Format jurisdiction for display
  const formatJurisdiction = (jurisdiction: Jurisdiction): string => {
    if (jurisdiction === 'federal') return 'Federal';
    if (jurisdiction === 'state') return 'State';
    if (jurisdiction.includes('-')) {
      return jurisdiction.split('-').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
    }
    return jurisdiction.charAt(0).toUpperCase() + jurisdiction.slice(1);
  };

  // Get confidentiality badge props
  const getConfidentialityBadgeProps = () => {
    switch (confidentialityLevel) {
      case 'attorney-client':
        return {
          className: 'attorney-client',
          icon: '🔒',
          text: 'Privileged',
          fullText: 'Attorney-Client Privileged'
        };
      case 'work-product':
        return {
          className: 'work-product',
          icon: '🛡️',
          text: 'Work Product',
          fullText: 'Attorney Work Product'
        };
      case 'confidential':
        return {
          className: 'confidential',
          icon: '🔐',
          text: 'Confidential',
          fullText: 'Confidential Information'
        };
      case 'public':
        return {
          className: 'public',
          icon: '🌐',
          text: 'Public',
          fullText: 'General Legal Information'
        };
      default:
        return {
          className: 'public',
          icon: '🌐',
          text: 'Public',
          fullText: 'General Legal Information'
        };
    }
  };

  const confidentialityProps = getConfidentialityBadgeProps();

  return (
    <div className={`legal-toolbar ${className}`}>
      {/* Left Section */}
      <div className="toolbar-left">
        {isMobile && (
          <button
            className="sidebar-toggle-btn"
            onClick={onToggleSidebar}
            title="Toggle sidebar"
          >
            ☰
          </button>
        )}

        <div className="branding">
          <span className="brand-icon">⚖️</span>
          <span className="brand-text">BEAR AI Legal</span>
        </div>
      </div>

      {/* Center Section */}
      {!isMobile && (
        <div className="toolbar-center">
          <div className="context-badges">
            <div className="practice-area-badge">
              <span className="badge-icon">📚</span>
              <span className="badge-text">{formatPracticeArea(practiceArea)}</span>
            </div>

            <div className="jurisdiction-badge">
              <span className="badge-icon">🏛️</span>
              <span className="badge-text">{formatJurisdiction(jurisdiction)}</span>
            </div>

            <div
              className={`confidentiality-badge ${confidentialityProps.className}`}
              title={confidentialityProps.fullText}
            >
              <span className="badge-icon">{confidentialityProps.icon}</span>
              <span className="badge-text">{confidentialityProps.text}</span>
            </div>
          </div>
        </div>
      )}

      {/* Right Section */}
      <div className="toolbar-right">
        {/* Metrics Display */}
        {!isMobile && metrics && (
          <div
            className="metrics-display"
            onMouseEnter={() => setShowMetricsDetail(true)}
            onMouseLeave={() => setShowMetricsDetail(false)}
          >
            <div className="metrics-summary">
              <span className="metric-item">
                <span className="metric-icon">💬</span>
                <span className="metric-value">{metrics.questionsAnswered}</span>
              </span>
              <span className="metric-item">
                <span className="metric-icon">📚</span>
                <span className="metric-value">{metrics.citationsProvided}</span>
              </span>
              <span className="metric-item">
                <span className="metric-icon">⚖️</span>
                <span className="metric-value">{metrics.casesReferenced}</span>
              </span>
            </div>

            {showMetricsDetail && (
              <div className="metrics-detail">
                <div className="detail-row">
                  <span className="detail-label">Questions Answered:</span>
                  <span className="detail-value">{metrics.questionsAnswered}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Citations Provided:</span>
                  <span className="detail-value">{metrics.citationsProvided}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Cases Referenced:</span>
                  <span className="detail-value">{metrics.casesReferenced}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Statutes Referenced:</span>
                  <span className="detail-value">{metrics.statutesReferenced}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Avg Response Time:</span>
                  <span className="detail-value">{Math.round(metrics.averageResponseTime)}ms</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Confidence:</span>
                  <span className="detail-value">{Math.round(metrics.confidenceScore * 100)}%</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Complexity:</span>
                  <span className={`detail-value complexity-${metrics.complexityLevel}`}>{metrics.complexityLevel}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Panel Toggle Buttons */}
        <div className="panel-toggles">
          <button
            className={`panel-toggle-btn ${showContext ? 'active' : ''}`}
            onClick={onToggleContext}
            title="Toggle legal context panel"
          >
            <span className="toggle-icon">📋</span>
            {!isMobile && <span className="toggle-text">Context</span>}
          </button>

          <button
            className={`panel-toggle-btn ${showCitations ? 'active' : ''}`}
            onClick={onToggleCitations}
            title="Toggle citations panel"
          >
            <span className="toggle-icon">📚</span>
            {!isMobile && <span className="toggle-text">Citations</span>}
          </button>
        </div>

        {/* Settings Button */}
        <button
          className={`settings-btn ${showSettings ? 'active' : ''}`}
          onClick={onToggleSettings}
          title="Legal AI settings"
        >
          <span className="settings-icon">⚙️</span>
          {!isMobile && <span className="settings-text">Settings</span>}
        </button>

        {/* Status Indicator */}
        <div className="status-indicator">
          <div className="status-dot online" title="BEAR AI Legal is online"></div>
          <span className="status-text">Online</span>
        </div>
      </div>

      {/* Mobile Context Info */}
      {isMobile && (
        <div className="mobile-context-bar">
          <div className="mobile-badges">
            <span className="mobile-badge practice-area">{formatPracticeArea(practiceArea)}</span>
            <span className="mobile-badge jurisdiction">{formatJurisdiction(jurisdiction)}</span>
            <span className={`mobile-badge confidentiality ${confidentialityProps.className}`}>
              {confidentialityProps.icon} {confidentialityProps.text}
            </span>
          </div>

          {metrics && (
            <div className="mobile-metrics">
              <span className="mobile-metric">💬 {metrics.questionsAnswered}</span>
              <span className="mobile-metric">📚 {metrics.citationsProvided}</span>
              <span className="mobile-metric">⚖️ {metrics.casesReferenced}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LegalToolbar;