import React, { useState } from 'react';
import './LegalChatDemo.css';
import { LegalChatInterface } from './LegalChatInterface';
import { PracticeArea, Jurisdiction, LegalCitation } from '../../types/legal';

interface LegalChatDemoProps {
  className?: string;
}

export const LegalChatDemo: React.FC<LegalChatDemoProps> = ({ className = '' }) => {
  const [demoSettings, setDemoSettings] = useState({
    practiceArea: 'litigation' as PracticeArea,
    jurisdiction: 'federal' as Jurisdiction,
    clientMatter: 'Smith v. Johnson Contract Dispute',
    confidentialityLevel: 'attorney-client' as const
  });

  const [activeSession, setActiveSession] = useState<string | null>(null);

  const handleSessionCreated = (sessionId: string) => {
    setActiveSession(sessionId);
    // Logging disabled for production
  };

  const handleMessageSent = (message: any) => {
    // Logging disabled for production
  };

  const handleCitationClick = (citation: LegalCitation) => {
    // Logging disabled for production
    // Could open citation details modal or navigate to source
    window.alert(`Citation clicked: ${citation.title} - ${citation.citation}`);
  };

  const handleSettingsChange = (key: string, value: any) => {
    setDemoSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className={`legal-chat-demo ${className}`}>
      {/* Demo Header */}
      <div className="demo-header">
        <div className="demo-title">
          <h1>BEAR AI Legal Chat Interface</h1>
          <p>Professional ChatGPT-like conversational interface optimized for legal professionals</p>
        </div>

        <div className="demo-settings">
          <div className="setting-group">
            <label>Practice Area:</label>
            <select
              value={demoSettings.practiceArea}
              onChange={(e) => handleSettingsChange('practiceArea', e.target.value)}
            >
              <option value="litigation">Litigation</option>
              <option value="corporate">Corporate</option>
              <option value="criminal">Criminal</option>
              <option value="family">Family</option>
              <option value="real-estate">Real Estate</option>
              <option value="intellectual-property">Intellectual Property</option>
              <option value="employment">Employment</option>
              <option value="general">General Practice</option>
            </select>
          </div>

          <div className="setting-group">
            <label>Jurisdiction:</label>
            <select
              value={demoSettings.jurisdiction}
              onChange={(e) => handleSettingsChange('jurisdiction', e.target.value)}
            >
              <option value="federal">Federal</option>
              <option value="california">California</option>
              <option value="new-york">New York</option>
              <option value="texas">Texas</option>
              <option value="florida">Florida</option>
            </select>
          </div>

          <div className="setting-group">
            <label>Confidentiality:</label>
            <select
              value={demoSettings.confidentialityLevel}
              onChange={(e) => handleSettingsChange('confidentialityLevel', e.target.value)}
            >
              <option value="attorney-client">Attorney-Client Privileged</option>
              <option value="work-product">Work Product</option>
              <option value="confidential">Confidential</option>
              <option value="public">General Information</option>
            </select>
          </div>

          <div className="setting-group">
            <label>Client Matter:</label>
            <input
              type="text"
              value={demoSettings.clientMatter}
              onChange={(e) => handleSettingsChange('clientMatter', e.target.value)}
              placeholder="Enter matter description"
            />
          </div>
        </div>
      </div>

      {/* Features Overview */}
      <div className="features-overview">
        <h2>Key Features</h2>
        <div className="features-grid">
          <div className="feature-item">
            <span className="feature-icon">💬</span>
            <h3>Real-time Streaming</h3>
            <p>Watch responses appear in real-time as the AI analyzes your legal questions</p>
          </div>

          <div className="feature-item">
            <span className="feature-icon">📚</span>
            <h3>Citation Tracking</h3>
            <p>Automatic legal citations with verification and source links</p>
          </div>

          <div className="feature-item">
            <span className="feature-icon">⚖️</span>
            <h3>Case Law Integration</h3>
            <p>Relevant case law and precedents automatically referenced</p>
          </div>

          <div className="feature-item">
            <span className="feature-icon">📜</span>
            <h3>Statute Search</h3>
            <p>Applicable statutes and regulations identified and cited</p>
          </div>

          <div className="feature-item">
            <span className="feature-icon">🔍</span>
            <h3>Legal Analysis</h3>
            <p>Multi-turn reasoning with risk assessment and alternatives</p>
          </div>

          <div className="feature-item">
            <span className="feature-icon">🔒</span>
            <h3>Confidentiality</h3>
            <p>Attorney-client privilege and work product protection</p>
          </div>
        </div>
      </div>

      {/* Sample Queries */}
      <div className="sample-queries">
        <h2>Try These Sample Queries</h2>
        <div className="queries-grid">
          <div className="query-card litigation">
            <h4>Contract Breach Analysis</h4>
            <p>"What are the key elements I need to prove for a breach of contract claim, and what damages might be available?"</p>
          </div>

          <div className="query-card corporate">
            <h4>Corporate Compliance</h4>
            <p>"What are the SEC disclosure requirements for a public company announcing a major acquisition?"</p>
          </div>

          <div className="query-card employment">
            <h4>Employment Law</h4>
            <p>"Can an employer terminate an employee for refusing to work overtime that wasn't in their original job description?"</p>
          </div>

          <div className="query-card ip">
            <h4>Intellectual Property</h4>
            <p>"What's the difference between a trademark and a service mark, and when should each be used?"</p>
          </div>
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="demo-chat-container">
        <LegalChatInterface
          initialPracticeArea={demoSettings.practiceArea}
          initialJurisdiction={demoSettings.jurisdiction}
          clientMatter={demoSettings.clientMatter}
          confidentialityLevel={demoSettings.confidentialityLevel}
          onSessionCreated={handleSessionCreated}
          onMessageSent={handleMessageSent}
          onCitationClick={handleCitationClick}
          className="demo-chat"
        />
      </div>

      {/* Demo Footer */}
      <div className="demo-footer">
        <div className="footer-content">
          <div className="footer-section">
            <h3>Professional Legal AI</h3>
            <p>BEAR AI Legal provides sophisticated legal analysis with proper citations, case law references, and statute integration.</p>
          </div>

          <div className="footer-section">
            <h3>Key Benefits</h3>
            <ul>
              <li>Real-time streaming responses</li>
              <li>Comprehensive citation tracking</li>
              <li>Multi-turn legal reasoning</li>
              <li>Professional tone and formatting</li>
              <li>Apple-grade user experience</li>
            </ul>
          </div>

          <div className="footer-section">
            <h3>Session Info</h3>
            {activeSession ? (
              <div className="session-info">
                <p><strong>Active Session:</strong> {activeSession}</p>
                <p><strong>Practice Area:</strong> {demoSettings.practiceArea}</p>
                <p><strong>Jurisdiction:</strong> {demoSettings.jurisdiction}</p>
                <p><strong>Confidentiality:</strong> {demoSettings.confidentialityLevel}</p>
              </div>
            ) : (
              <p>No active session</p>
            )}
          </div>
        </div>

        <div className="footer-disclaimer">
          <p><strong>Disclaimer:</strong> This is a demonstration interface. For actual legal advice, consult with a qualified attorney. AI responses should be verified with primary legal sources.</p>
        </div>
      </div>
    </div>
  );
};

export default LegalChatDemo;