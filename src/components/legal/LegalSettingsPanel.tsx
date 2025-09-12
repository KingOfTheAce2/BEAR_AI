import React, { useState } from 'react';
import { LegalStreamingOptions, PracticeArea, Jurisdiction, StyleGuide } from '../../types/legal';
import './LegalSettingsPanel.css';

interface LegalSettingsPanelProps {
  options: LegalStreamingOptions;
  onOptionsChange: (options: LegalStreamingOptions) => void;
  onClose: () => void;
  practiceArea: PracticeArea;
  jurisdiction: Jurisdiction;
  className?: string;
}

export const LegalSettingsPanel: React.FC<LegalSettingsPanelProps> = ({
  options,
  onOptionsChange,
  onClose,
  practiceArea,
  jurisdiction,
  className = ''
}) => {
  const [localOptions, setLocalOptions] = useState<LegalStreamingOptions>(options);
  const [activeTab, setActiveTab] = useState<'general' | 'analysis' | 'citations' | 'advanced'>('general');

  // Handle option change
  const handleOptionChange = <K extends keyof LegalStreamingOptions>(
    key: K,
    value: LegalStreamingOptions[K]
  ) => {
    const updatedOptions = { ...localOptions, [key]: value };
    setLocalOptions(updatedOptions);
    onOptionsChange(updatedOptions);
  };

  // Handle save and close
  const handleSaveAndClose = () => {
    onOptionsChange(localOptions);
    onClose();
  };

  // Reset to defaults
  const handleResetDefaults = () => {
    const defaultOptions: LegalStreamingOptions = {
      enableCitations: true,
      enableCaseSearch: true,
      enableStatuteSearch: true,
      autoLegalAnalysis: true,
      confidentialityMode: true,
      practiceAreaFilter: practiceArea,
      jurisdictionFilter: jurisdiction,
      citationStyle: 'bluebook',
      responseDepth: 'detailed',
      includeAlternativeArguments: false,
      riskAssessment: true
    };
    setLocalOptions(defaultOptions);
    onOptionsChange(defaultOptions);
  };

  return (
    <div className={`legal-settings-panel ${className}`}>
      <div className=\"settings-overlay\" onClick={onClose} />
      
      <div className=\"settings-modal\">
        {/* Header */}
        <div className=\"settings-header\">
          <div className=\"header-title\">
            <h2>Legal AI Settings</h2>
            <p>Configure BEAR AI's legal analysis and response behavior</p>
          </div>
          <button className=\"close-btn\" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className=\"settings-tabs\">
          <button
            className={`tab-btn ${activeTab === 'general' ? 'active' : ''}`}
            onClick={() => setActiveTab('general')}
          >
            🔧 General
          </button>
          <button
            className={`tab-btn ${activeTab === 'analysis' ? 'active' : ''}`}
            onClick={() => setActiveTab('analysis')}
          >
            🔍 Analysis
          </button>
          <button
            className={`tab-btn ${activeTab === 'citations' ? 'active' : ''}`}
            onClick={() => setActiveTab('citations')}
          >
            📚 Citations
          </button>
          <button
            className={`tab-btn ${activeTab === 'advanced' ? 'active' : ''}`}
            onClick={() => setActiveTab('advanced')}
          >
            ⚙️ Advanced
          </button>
        </div>

        {/* Tab Content */}
        <div className=\"settings-content\">
          {/* General Settings */}
          {activeTab === 'general' && (
            <div className=\"settings-group\">
              <h3>General Settings</h3>
              
              <div className=\"setting-item\">
                <div className=\"setting-label\">
                  <span className=\"label-text\">Response Depth</span>
                  <span className=\"label-desc\">How detailed should responses be?</span>
                </div>
                <select
                  className=\"setting-select\"
                  value={localOptions.responseDepth}
                  onChange={(e) => handleOptionChange('responseDepth', e.target.value as any)}
                >
                  <option value=\"brief\">Brief - Quick summaries</option>
                  <option value=\"detailed\">Detailed - Comprehensive analysis</option>
                  <option value=\"comprehensive\">Comprehensive - In-depth research</option>
                </select>
              </div>

              <div className=\"setting-item\">
                <div className=\"setting-label\">
                  <span className=\"label-text\">Practice Area Filter</span>
                  <span className=\"label-desc\">Focus responses on specific practice area</span>
                </div>
                <select
                  className=\"setting-select\"
                  value={localOptions.practiceAreaFilter || ''}
                  onChange={(e) => handleOptionChange('practiceAreaFilter', e.target.value as PracticeArea)}
                >
                  <option value=\"\">All Practice Areas</option>
                  <option value=\"corporate\">Corporate Law</option>
                  <option value=\"litigation\">Litigation</option>
                  <option value=\"criminal\">Criminal Law</option>
                  <option value=\"family\">Family Law</option>
                  <option value=\"real-estate\">Real Estate</option>
                  <option value=\"intellectual-property\">Intellectual Property</option>
                  <option value=\"employment\">Employment Law</option>
                  <option value=\"tax\">Tax Law</option>
                  <option value=\"bankruptcy\">Bankruptcy</option>
                  <option value=\"immigration\">Immigration</option>
                  <option value=\"environmental\">Environmental Law</option>
                  <option value=\"healthcare\">Healthcare Law</option>
                  <option value=\"general\">General Practice</option>
                </select>
              </div>

              <div className=\"setting-item\">
                <div className=\"setting-label\">
                  <span className=\"label-text\">Jurisdiction Filter</span>
                  <span className=\"label-desc\">Prioritize laws from specific jurisdiction</span>
                </div>
                <select
                  className=\"setting-select\"
                  value={localOptions.jurisdictionFilter || ''}
                  onChange={(e) => handleOptionChange('jurisdictionFilter', e.target.value as Jurisdiction)}
                >
                  <option value=\"federal\">Federal</option>
                  <option value=\"state\">State (General)</option>
                  <option value=\"california\">California</option>
                  <option value=\"new-york\">New York</option>
                  <option value=\"texas\">Texas</option>
                  <option value=\"florida\">Florida</option>
                  <option value=\"illinois\">Illinois</option>
                  <option value=\"pennsylvania\">Pennsylvania</option>
                  <option value=\"ohio\">Ohio</option>
                  <option value=\"michigan\">Michigan</option>
                  {/* Add more states as needed */}
                </select>
              </div>

              <div className=\"setting-item\">
                <div className=\"setting-label\">
                  <span className=\"label-text\">Confidentiality Mode</span>
                  <span className=\"label-desc\">Enable enhanced privacy and security measures</span>
                </div>
                <label className=\"setting-toggle\">
                  <input
                    type=\"checkbox\"
                    checked={localOptions.confidentialityMode}
                    onChange={(e) => handleOptionChange('confidentialityMode', e.target.checked)}
                  />
                  <span className=\"toggle-slider\"></span>
                  <span className=\"toggle-text\">
                    {localOptions.confidentialityMode ? 'Enabled' : 'Disabled'}
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Analysis Settings */}
          {activeTab === 'analysis' && (
            <div className=\"settings-group\">
              <h3>Legal Analysis Settings</h3>
              
              <div className=\"setting-item\">
                <div className=\"setting-label\">
                  <span className=\"label-text\">Auto Legal Analysis</span>
                  <span className=\"label-desc\">Automatically analyze legal implications in responses</span>
                </div>
                <label className=\"setting-toggle\">
                  <input
                    type=\"checkbox\"
                    checked={localOptions.autoLegalAnalysis}
                    onChange={(e) => handleOptionChange('autoLegalAnalysis', e.target.checked)}
                  />
                  <span className=\"toggle-slider\"></span>
                  <span className=\"toggle-text\">
                    {localOptions.autoLegalAnalysis ? 'Enabled' : 'Disabled'}
                  </span>
                </label>
              </div>

              <div className=\"setting-item\">
                <div className=\"setting-label\">
                  <span className=\"label-text\">Risk Assessment</span>
                  <span className=\"label-desc\">Include risk analysis in legal responses</span>
                </div>
                <label className=\"setting-toggle\">
                  <input
                    type=\"checkbox\"
                    checked={localOptions.riskAssessment}
                    onChange={(e) => handleOptionChange('riskAssessment', e.target.checked)}
                  />
                  <span className=\"toggle-slider\"></span>
                  <span className=\"toggle-text\">
                    {localOptions.riskAssessment ? 'Enabled' : 'Disabled'}
                  </span>
                </label>
              </div>

              <div className=\"setting-item\">
                <div className=\"setting-label\">
                  <span className=\"label-text\">Alternative Arguments</span>
                  <span className=\"label-desc\">Include counterarguments and alternative perspectives</span>
                </div>
                <label className=\"setting-toggle\">
                  <input
                    type=\"checkbox\"
                    checked={localOptions.includeAlternativeArguments}
                    onChange={(e) => handleOptionChange('includeAlternativeArguments', e.target.checked)}
                  />
                  <span className=\"toggle-slider\"></span>
                  <span className=\"toggle-text\">
                    {localOptions.includeAlternativeArguments ? 'Enabled' : 'Disabled'}
                  </span>
                </label>
              </div>

              <div className=\"setting-item\">
                <div className=\"setting-label\">
                  <span className=\"label-text\">Case Law Search</span>
                  <span className=\"label-desc\">Automatically search for relevant case law</span>
                </div>
                <label className=\"setting-toggle\">
                  <input
                    type=\"checkbox\"
                    checked={localOptions.enableCaseSearch}
                    onChange={(e) => handleOptionChange('enableCaseSearch', e.target.checked)}
                  />
                  <span className=\"toggle-slider\"></span>
                  <span className=\"toggle-text\">
                    {localOptions.enableCaseSearch ? 'Enabled' : 'Disabled'}
                  </span>
                </label>
              </div>

              <div className=\"setting-item\">
                <div className=\"setting-label\">
                  <span className=\"label-text\">Statute Search</span>
                  <span className=\"label-desc\">Automatically search for applicable statutes and regulations</span>
                </div>
                <label className=\"setting-toggle\">
                  <input
                    type=\"checkbox\"
                    checked={localOptions.enableStatuteSearch}
                    onChange={(e) => handleOptionChange('enableStatuteSearch', e.target.checked)}
                  />
                  <span className=\"toggle-slider\"></span>
                  <span className=\"toggle-text\">
                    {localOptions.enableStatuteSearch ? 'Enabled' : 'Disabled'}
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Citation Settings */}
          {activeTab === 'citations' && (
            <div className=\"settings-group\">
              <h3>Citation Settings</h3>
              
              <div className=\"setting-item\">
                <div className=\"setting-label\">
                  <span className=\"label-text\">Enable Citations</span>
                  <span className=\"label-desc\">Include legal citations in responses</span>
                </div>
                <label className=\"setting-toggle\">
                  <input
                    type=\"checkbox\"
                    checked={localOptions.enableCitations}
                    onChange={(e) => handleOptionChange('enableCitations', e.target.checked)}
                  />
                  <span className=\"toggle-slider\"></span>
                  <span className=\"toggle-text\">
                    {localOptions.enableCitations ? 'Enabled' : 'Disabled'}
                  </span>
                </label>
              </div>

              <div className=\"setting-item\">
                <div className=\"setting-label\">
                  <span className=\"label-text\">Citation Style</span>
                  <span className=\"label-desc\">Preferred legal citation format</span>
                </div>
                <select
                  className=\"setting-select\"
                  value={localOptions.citationStyle}
                  onChange={(e) => handleOptionChange('citationStyle', e.target.value as StyleGuide)}
                  disabled={!localOptions.enableCitations}
                >
                  <option value=\"bluebook\">Bluebook (Harvard Law Review)</option>
                  <option value=\"alwd\">ALWD Guide to Legal Citation</option>
                  <option value=\"california\">California Style Manual</option>
                  <option value=\"chicago\">Chicago Manual of Style</option>
                  <option value=\"apa\">APA Style</option>
                  <option value=\"mla\">MLA Style</option>
                </select>
              </div>

              <div className=\"citation-preview\">
                <h4>Citation Preview</h4>
                <div className=\"preview-examples\">
                  {localOptions.citationStyle === 'bluebook' && (
                    <div className=\"preview-item\">
                      <span className=\"preview-label\">Case:</span>
                      <span className=\"preview-text\">Brown v. Board of Educ., 347 U.S. 483 (1954).</span>
                    </div>
                  )}
                  {localOptions.citationStyle === 'alwd' && (
                    <div className=\"preview-item\">
                      <span className=\"preview-label\">Case:</span>
                      <span className=\"preview-text\">Brown v. Bd. of Educ., 347 U.S. 483 (1954).</span>
                    </div>
                  )}
                  <div className=\"preview-item\">
                    <span className=\"preview-label\">Statute:</span>
                    <span className=\"preview-text\">
                      {localOptions.citationStyle === 'bluebook' ? '42 U.S.C. § 1983 (2018).' : '42 U.S.C. § 1983 (2018).'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Advanced Settings */}
          {activeTab === 'advanced' && (
            <div className=\"settings-group\">
              <h3>Advanced Settings</h3>
              
              <div className=\"setting-item\">
                <div className=\"setting-label\">
                  <span className=\"label-text\">Performance Mode</span>
                  <span className=\"label-desc\">Balance between speed and thoroughness</span>
                </div>
                <select className=\"setting-select\">
                  <option value=\"fast\">Fast - Quick responses</option>
                  <option value=\"balanced\">Balanced - Good speed and quality</option>
                  <option value=\"thorough\">Thorough - Maximum quality</option>
                </select>
              </div>

              <div className=\"setting-item\">
                <div className=\"setting-label\">
                  <span className=\"label-text\">Data Retention</span>
                  <span className=\"label-desc\">How long to keep conversation data</span>
                </div>
                <select className=\"setting-select\">
                  <option value=\"session\">Session only</option>
                  <option value=\"24h\">24 hours</option>
                  <option value=\"7d\">7 days</option>
                  <option value=\"30d\">30 days</option>
                  <option value=\"forever\">Permanent</option>
                </select>
              </div>

              <div className=\"setting-item\">
                <div className=\"setting-label\">
                  <span className=\"label-text\">Experimental Features</span>
                  <span className=\"label-desc\">Enable beta features (may be unstable)</span>
                </div>
                <label className=\"setting-toggle\">
                  <input type=\"checkbox\" defaultChecked={false} />
                  <span className=\"toggle-slider\"></span>
                  <span className=\"toggle-text\">Disabled</span>
                </label>
              </div>

              <div className=\"setting-item\">
                <div className=\"setting-label\">
                  <span className=\"label-text\">Debug Mode</span>
                  <span className=\"label-desc\">Show detailed analysis information</span>
                </div>
                <label className=\"setting-toggle\">
                  <input type=\"checkbox\" defaultChecked={false} />
                  <span className=\"toggle-slider\"></span>
                  <span className=\"toggle-text\">Disabled</span>
                </label>
              </div>

              <div className=\"setting-item warning-item\">
                <div className=\"setting-label\">
                  <span className=\"label-text\">⚠️ Reset All Settings</span>
                  <span className=\"label-desc\">Reset all settings to default values</span>
                </div>
                <button className=\"reset-btn\" onClick={handleResetDefaults}>
                  Reset to Defaults
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className=\"settings-footer\">
          <div className=\"footer-info\">
            <span className=\"version-info\">BEAR AI Legal v2.0.0</span>
            <span className=\"build-info\">Build 2024.01.15</span>
          </div>
          
          <div className=\"footer-actions\">
            <button className=\"cancel-btn\" onClick={onClose}>
              Cancel
            </button>
            <button className=\"save-btn\" onClick={handleSaveAndClose}>
              Save & Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LegalSettingsPanel;