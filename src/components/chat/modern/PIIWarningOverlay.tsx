import React from 'react';
import { PIIDetectionResult, PIIMatch, PIIType } from '../../../services/pii/PIIDetector';
import './PIIWarningOverlay.css';

interface PIIWarningOverlayProps {
  isVisible: boolean;
  result: PIIDetectionResult | null;
  onContinue: () => void;
  onCancel: () => void;
  onRedact: () => void;
  onViewDetails: () => void;
}

const PIIWarningOverlay: React.FC<PIIWarningOverlayProps> = ({
  isVisible,
  result,
  onContinue,
  onCancel,
  onRedact,
  onViewDetails
}) => {
  if (!isVisible || !result || !result.hasPII) {
    return null;
  }

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical': return '#dc2626'; // red-600
      case 'high': return '#ea580c'; // orange-600
      case 'medium': return '#d97706'; // amber-600
      case 'low': return '#65a30d'; // lime-600
      default: return '#6b7280'; // gray-500
    }
  };

  const getRiskIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical': return '🚨';
      case 'high': return '⚠️';
      case 'medium': return '⚡';
      case 'low': return 'ℹ️';
      default: return '📋';
    }
  };

  const getTypeIcon = (type: PIIType) => {
    switch (type) {
      case PIIType.SSN: return '🆔';
      case PIIType.CREDIT_CARD: return '💳';
      case PIIType.EMAIL: return '📧';
      case PIIType.PHONE: return '📞';
      case PIIType.ADDRESS: return '🏠';
      case PIIType.CASE_NUMBER: return '⚖️';
      case PIIType.COURT_NAME: return '🏛️';
      case PIIType.ATTORNEY_NAME: return '👔';
      case PIIType.ATTORNEY_CLIENT_PRIVILEGE: return '🔒';
      case PIIType.BSN: return '🇳🇱';
      case PIIType.RSIN: return '🏢';
      case PIIType.DUTCH_PASSPORT: return '📖';
      case PIIType.IBAN: return '🏦';
      default: return '📄';
    }
  };

  const getTypeName = (type: PIIType) => {
    switch (type) {
      case PIIType.SSN: return 'Social Security Number';
      case PIIType.CREDIT_CARD: return 'Credit Card Number';
      case PIIType.EMAIL: return 'Email Address';
      case PIIType.PHONE: return 'Phone Number';
      case PIIType.ADDRESS: return 'Physical Address';
      case PIIType.CASE_NUMBER: return 'Legal Case Number';
      case PIIType.COURT_NAME: return 'Court Name';
      case PIIType.ATTORNEY_NAME: return 'Attorney Name';
      case PIIType.ATTORNEY_CLIENT_PRIVILEGE: return 'Attorney-Client Privilege';
      case PIIType.DOCKET_NUMBER: return 'Docket Number';
      case PIIType.BAR_NUMBER: return 'Bar Number';
      case PIIType.BSN: return 'Dutch BSN';
      case PIIType.RSIN: return 'Dutch RSIN';
      case PIIType.DUTCH_PASSPORT: return 'Dutch Passport';
      case PIIType.DUTCH_ID: return 'Dutch ID Card';
      case PIIType.IBAN: return 'IBAN Number';
      case PIIType.BANK_ACCOUNT: return 'Bank Account';
      case PIIType.PATIENT_ID: return 'Patient ID';
      case PIIType.MEDICAL_RECORD: return 'Medical Record';
      default: return 'Sensitive Information';
    }
  };

  const groupedMatches = result.matches.reduce((groups, match) => {
    const type = match.type;
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(match);
    return groups;
  }, {} as Record<PIIType, PIIMatch[]>);

  const isLegalPrivileged = result.matches.some(m => m.isLegalPrivileged);

  return (
    <div className="pii-warning-overlay">
      <div className="pii-warning-backdrop" onClick={onCancel} />

      <div className="pii-warning-modal">
        <div className="pii-warning-header">
          <div className="risk-indicator" style={{ color: getRiskColor(result.riskLevel) }}>
            <span className="risk-icon">{getRiskIcon(result.riskLevel)}</span>
            <span className="risk-level">{result.riskLevel.toUpperCase()} RISK</span>
          </div>

          <h2 className="warning-title">
            Personally Identifiable Information Detected
          </h2>

          <button className="close-button" onClick={onCancel}>
            ✕
          </button>
        </div>

        <div className="pii-warning-content">
          {isLegalPrivileged && (
            <div className="privilege-warning">
              <div className="privilege-icon">🔒</div>
              <div className="privilege-text">
                <strong>ATTORNEY-CLIENT PRIVILEGED CONTENT DETECTED</strong>
                <p>This message contains legally privileged information. Sharing may waive privilege.</p>
              </div>
            </div>
          )}

          <div className="detected-items">
            <h3>Detected PII Elements ({result.matches.length} total):</h3>

            <div className="pii-groups">
              {Object.entries(groupedMatches).map(([type, matches]) => (
                <div key={type} className="pii-group">
                  <div className="pii-type-header">
                    <span className="type-icon">{getTypeIcon(type as PIIType)}</span>
                    <span className="type-name">{getTypeName(type as PIIType)}</span>
                    <span className="type-count">({matches.length})</span>
                  </div>

                  <div className="pii-matches">
                    {matches.map((match, index) => (
                      <div key={index} className="pii-match">
                        <span className="match-text">{"*".repeat(Math.min(match.text.length, 8))}</span>
                        <span className="match-confidence">
                          {Math.round(match.confidence * 100)}% confidence
                        </span>
                        {match.country && (
                          <span className="match-country">{match.country}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {result.suggestions.length > 0 && (
            <div className="suggestions">
              <h3>Recommendations:</h3>
              <ul>
                {result.suggestions.map((suggestion, index) => (
                  <li key={index}>{suggestion}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="gdpr-notice">
            <h4>GDPR Compliance Notice</h4>
            <p>
              Processing of this data may require explicit consent or legal basis under GDPR.
              A cryptographic hash has been generated for audit purposes:
              <code className="audit-hash">{result.auditHash.substring(0, 16)}...</code>
            </p>
          </div>
        </div>

        <div className="pii-warning-actions">
          <button
            className="action-button action-cancel"
            onClick={onCancel}
          >
            Cancel
          </button>

          <button
            className="action-button action-redact"
            onClick={onRedact}
          >
            Redact & Send
          </button>

          <button
            className="action-button action-details"
            onClick={onViewDetails}
          >
            View Details
          </button>

          {result.riskLevel !== 'critical' && (
            <button
              className="action-button action-continue"
              onClick={onContinue}
            >
              Send Anyway
            </button>
          )}
        </div>

        {result.riskLevel === 'critical' && (
          <div className="critical-notice">
            <strong>⚠️ Sending blocked:</strong> Critical PII detected. Please redact sensitive information before proceeding.
          </div>
        )}
      </div>
    </div>
  );
};

export default PIIWarningOverlay;