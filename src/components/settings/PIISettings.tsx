import React, { useState, useEffect } from 'react';
import { PIIDetectorConfig, PIIType } from '../../services/pii/PIIDetector';
import { HybridPIIDetector } from '../../services/pii/HybridPIIDetector';
import './PIISettings.css';

interface PIISettingsProps {
  onConfigChange?: (config: PIIDetectorConfig) => void;
  initialConfig?: Partial&lt;PIIDetectorConfig&gt;;
}

interface BackendStatus {
  rustAvailable: boolean;
  preferRust: boolean;
  currentBackend: 'rust' | 'typescript';
}

const PIISettings: React.FC&lt;PIISettingsProps&gt; = ({
  onConfigChange,
  initialConfig = {}
}) => {
  const [config, setConfig] = useState&lt;PIIDetectorConfig&gt;({
    enableRealTime: true,
    sensitivity: 'high',
    enableLegalPatterns: true,
    enableDutchCompliance: true,
    customPatterns: [],
    whitelistedTerms: [],
    enableAuditLogging: true,
    hashSalt: 'bear-ai-pii-salt',
    ...initialConfig
  });

  const [backendStatus, setBackendStatus] = useState&lt;BackendStatus | null&gt;(null);
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState&lt;any&gt;(null);
  const [newWhitelistTerm, setNewWhitelistTerm] = useState('');
  const [newCustomPattern, setNewCustomPattern] = useState({
    name: '',
    pattern: '',
    type: PIIType.CUSTOM
  });

  const detector = new HybridPIIDetector(config);

  useEffect(() => {
    loadBackendStatus();
  }, []);

  useEffect(() => {
    if (onConfigChange) {
      onConfigChange(config);
    }
  }, [config, onConfigChange]);

  const loadBackendStatus = async () => {
    try {
      const status = await detector.getBackendStatus();
      setBackendStatus(status);
    } catch (error) {
      console.error('Failed to load backend status:', error);
    }
  };

  const handleConfigChange = &lt;K extends keyof PIIDetectorConfig&gt;(
    key: K,
    value: PIIDetectorConfig[K]
  ) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    detector.updateConfig({ [key]: value });
  };

  const handleBackendPreferenceChange = async (preferRust: boolean) => {
    detector.setRustPreference(preferRust);
    await loadBackendStatus();
  };

  const handleTestDetection = async () => {
    setIsLoading(true);
    setTestResults(null);

    const testTexts = [
      'My SSN is 123-45-6789 and email is john@example.com',
      'Call me at 555-123-4567 or attorney-client privilege applies',
      'BSN: 123456782, Case No: 21-cv-12345',
      'This is a test with no PII information'
    ];

    try {
      const results = [];

      for (const text of testTexts) {
        const result = await detector.detectPII(text);
        const benchmark = await detector.benchmarkPerformance(text);

        results.push({
          text: text.substring(0, 50) + '...',
          hasPII: result.hasPII,
          matchCount: result.matches.length,
          riskLevel: result.riskLevel,
          benchmark
        });
      }

      setTestResults(results);
    } catch (error) {
      console.error('Test detection failed:', error);
      setTestResults([{ error: error.message }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddWhitelistTerm = () => {
    if (newWhitelistTerm.trim()) {
      const updatedTerms = [...config.whitelistedTerms, newWhitelistTerm.trim()];
      handleConfigChange('whitelistedTerms', updatedTerms);
      setNewWhitelistTerm('');
    }
  };

  const handleRemoveWhitelistTerm = (index: number) => {
    const updatedTerms = config.whitelistedTerms.filter((_, i) => i !== index);
    handleConfigChange('whitelistedTerms', updatedTerms);
  };

  const handleAddCustomPattern = () => {
    if (newCustomPattern.name && newCustomPattern.pattern) {
      try {
        // Validate regex
        new RegExp(newCustomPattern.pattern);

        const updatedPatterns = [...config.customPatterns, {
          ...newCustomPattern,
          pattern: new RegExp(newCustomPattern.pattern)
        }];
        handleConfigChange('customPatterns', updatedPatterns);
        setNewCustomPattern({ name: '', pattern: '', type: PIIType.CUSTOM });
      } catch (error) {
        alert('Invalid regular expression pattern');
      }
    }
  };

  const handleRemoveCustomPattern = (index: number) => {
    const updatedPatterns = config.customPatterns.filter((_, i) => i !== index);
    handleConfigChange('customPatterns', updatedPatterns);
  };

  const handleRefreshBackend = async () => {
    setIsLoading(true);
    try {
      await detector.refreshRustAvailability();
      await loadBackendStatus();
    } catch (error) {
      console.error('Failed to refresh backend:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportConfig = () => {
    const exportData = {
      ...config,
      customPatterns: config.customPatterns.map(p => ({
        ...p,
        pattern: p.pattern.source
      }))
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pii-config.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportConfig = (event: React.ChangeEvent&lt;HTMLInputElement&gt;) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedConfig = JSON.parse(e.target?.result as string);

        // Convert pattern strings back to RegExp objects
        if (importedConfig.customPatterns) {
          importedConfig.customPatterns = importedConfig.customPatterns.map((p: any) => ({
            ...p,
            pattern: new RegExp(p.pattern)
          }));
        }

        setConfig({ ...config, ...importedConfig });
      } catch (error) {
        alert('Invalid configuration file');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="pii-settings">
      <div className="settings-header">
        <h2>PII Detection Settings</h2>
        <p>Configure personally identifiable information detection and protection</p>
      </div>

      {/* Backend Status */}
      <div className="settings-section">
        <h3>Backend Status</h3>
        <div className="backend-status">
          {backendStatus ? (
            <>
              <div className="status-item">
                <label>Rust Backend:</label>
                <span className={`status ${backendStatus.rustAvailable ? 'available' : 'unavailable'}`}>
                  {backendStatus.rustAvailable ? '✅ Available' : '❌ Unavailable'}
                </span>
              </div>

              <div className="status-item">
                <label>Current Backend:</label>
                <span className={`status ${backendStatus.currentBackend}`}>
                  {backendStatus.currentBackend === 'rust' ? '🦀 Rust' : '📜 TypeScript'}
                </span>
              </div>

              {backendStatus.rustAvailable && (
                <div className="backend-preference">
                  <label>
                    <input
                      type="checkbox"
                      checked={backendStatus.preferRust}
                      onChange={(e) => handleBackendPreferenceChange(e.target.checked)}
                    />
                    Prefer Rust backend for better performance
                  </label>
                </div>
              )}

              <button
                className="refresh-backend-btn"
                onClick={handleRefreshBackend}
                disabled={isLoading}
              >
                🔄 Refresh Backend Status
              </button>
            </>
          ) : (
            <div className="loading">Loading backend status...</div>
          )}
        </div>
      </div>

      {/* Core Settings */}
      <div className="settings-section">
        <h3>Core Settings</h3>

        <div className="setting-item">
          <label>
            <input
              type="checkbox"
              checked={config.enableRealTime}
              onChange={(e) => handleConfigChange('enableRealTime', e.target.checked)}
            />
            Enable real-time PII detection while typing
          </label>
        </div>

        <div className="setting-item">
          <label>Detection Sensitivity:</label>
          <select
            value={config.sensitivity}
            onChange={(e) => handleConfigChange('sensitivity', e.target.value as 'low' | 'medium' | 'high')}
          >
            <option value="low">Low - Fewer false positives</option>
            <option value="medium">Medium - Balanced detection</option>
            <option value="high">High - Maximum detection</option>
          </select>
        </div>

        <div className="setting-item">
          <label>
            <input
              type="checkbox"
              checked={config.enableAuditLogging}
              onChange={(e) => handleConfigChange('enableAuditLogging', e.target.checked)}
            />
            Enable GDPR-compliant audit logging
          </label>
        </div>
      </div>

      {/* Legal & Compliance */}
      <div className="settings-section">
        <h3>Legal & Compliance</h3>

        <div className="setting-item">
          <label>
            <input
              type="checkbox"
              checked={config.enableLegalPatterns}
              onChange={(e) => handleConfigChange('enableLegalPatterns', e.target.checked)}
            />
            Enable legal industry specific patterns (case numbers, attorney-client privilege)
          </label>
        </div>

        <div className="setting-item">
          <label>
            <input
              type="checkbox"
              checked={config.enableDutchCompliance}
              onChange={(e) => handleConfigChange('enableDutchCompliance', e.target.checked)}
            />
            Enable Dutch GDPR compliance (BSN/RSIN validation)
          </label>
        </div>
      </div>

      {/* Whitelist Management */}
      <div className="settings-section">
        <h3>Whitelisted Terms</h3>
        <p>Terms that should be ignored during PII detection</p>

        <div className="whitelist-input">
          <input
            type="text"
            value={newWhitelistTerm}
            onChange={(e) => setNewWhitelistTerm(e.target.value)}
            placeholder="Enter term to whitelist"
            onKeyPress={(e) => e.key === 'Enter' && handleAddWhitelistTerm()}
          />
          <button onClick={handleAddWhitelistTerm}>Add</button>
        </div>

        <div className="whitelist-items">
          {config.whitelistedTerms.map((term, index) => (
            <div key={index} className="whitelist-item">
              <span>{term}</span>
              <button onClick={() => handleRemoveWhitelistTerm(index)}>✕</button>
            </div>
          ))}
        </div>
      </div>

      {/* Custom Patterns */}
      <div className="settings-section">
        <h3>Custom PII Patterns</h3>
        <p>Add custom regular expression patterns for organization-specific PII</p>

        <div className="custom-pattern-input">
          <input
            type="text"
            value={newCustomPattern.name}
            onChange={(e) => setNewCustomPattern(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Pattern name"
          />
          <input
            type="text"
            value={newCustomPattern.pattern}
            onChange={(e) => setNewCustomPattern(prev => ({ ...prev, pattern: e.target.value }))}
            placeholder="Regular expression"
          />
          <select
            value={newCustomPattern.type}
            onChange={(e) => setNewCustomPattern(prev => ({ ...prev, type: e.target.value as PIIType }))}
          >
            {Object.values(PIIType).map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          <button onClick={handleAddCustomPattern}>Add Pattern</button>
        </div>

        <div className="custom-patterns">
          {config.customPatterns.map((pattern, index) => (
            <div key={index} className="custom-pattern-item">
              <div className="pattern-info">
                <strong>{pattern.name}</strong>
                <code>{pattern.pattern.source}</code>
                <span className="pattern-type">{pattern.type}</span>
              </div>
              <button onClick={() => handleRemoveCustomPattern(index)}>✕</button>
            </div>
          ))}
        </div>
      </div>

      {/* Test & Validation */}
      <div className="settings-section">
        <h3>Test Detection</h3>
        <p>Test your PII detection configuration with sample texts</p>

        <button
          className="test-detection-btn"
          onClick={handleTestDetection}
          disabled={isLoading}
        >
          {isLoading ? '🔄 Testing...' : '🧪 Run Detection Test'}
        </button>

        {testResults && (
          <div className="test-results">
            {testResults.map((result: any, index: number) => (
              <div key={index} className="test-result">
                {result.error ? (
                  <div className="error">Error: {result.error}</div>
                ) : (
                  <div className="result-details">
                    <div className="test-text">{result.text}</div>
                    <div className="detection-info">
                      <span className={`pii-status ${result.hasPII ? 'detected' : 'clean'}`}>
                        {result.hasPII ? `${result.matchCount} PII found` : 'No PII detected'}
                      </span>
                      <span className={`risk-level ${result.riskLevel}`}>
                        {result.riskLevel.toUpperCase()} RISK
                      </span>
                    </div>
                    {result.benchmark && (
                      <div className="benchmark-info">
                        <small>
                          {result.benchmark.rustAvailable
                            ? `${result.benchmark.currentBackend} (${result.benchmark.recommendation})`
                            : 'TypeScript only'
                          }
                        </small>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Configuration Management */}
      <div className="settings-section">
        <h3>Configuration Management</h3>

        <div className="config-actions">
          <button onClick={handleExportConfig}>
            📥 Export Configuration
          </button>

          <label className="import-config">
            📤 Import Configuration
            <input
              type="file"
              accept=".json"
              onChange={handleImportConfig}
              style={{ display: 'none' }}
            />
          </label>

          <button
            onClick={() => {
              if (confirm('Reset to default configuration?')) {
                setConfig({
                  enableRealTime: true,
                  sensitivity: 'high',
                  enableLegalPatterns: true,
                  enableDutchCompliance: true,
                  customPatterns: [],
                  whitelistedTerms: [],
                  enableAuditLogging: true,
                  hashSalt: 'bear-ai-pii-salt'
                });
              }
            }}
          >
            🔄 Reset to Defaults
          </button>
        </div>
      </div>

      {/* Security Info */}
      <div className="settings-section security-info">
        <h3>🔒 Security Information</h3>
        <div className="security-notices">
          <div className="notice">
            <strong>GDPR Compliance:</strong> All PII detection results are hashed using SHA256 for audit trails.
            Original sensitive data is never stored permanently.
          </div>
          <div className="notice">
            <strong>Attorney-Client Privilege:</strong> Legal communications are flagged with highest priority
            and blocked from processing to maintain privilege.
          </div>
          <div className="notice">
            <strong>Dutch Compliance:</strong> BSN and RSIN numbers are validated using official algorithms
            and flagged for special GDPR handling.
          </div>
        </div>
      </div>
    </div>
  );
};

export default PIISettings;