import React, { useState } from 'react';
import './SettingsPanel.css';
import { SettingsCategory } from '../../types/settings';
import { useSettings } from '../../contexts/SettingsContext';
import BackupRestorePanel from './BackupRestorePanel';
import ModelSettingsPanel from './ModelSettingsPanel';
import PrivacySettingsPanel from './PrivacySettingsPanel';
import SystemSettingsPanel from './SystemSettingsPanel';
import ThemeSettingsPanel from './ThemeSettingsPanel';
import UserPreferencesPanel from './UserPreferencesPanel';

interface SettingsPanelProps {
  onClose?: () => void;
  initialCategory?: SettingsCategory;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ 
  onClose, 
  initialCategory = 'userPreferences' 
}) => {
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>(initialCategory);
  const { settings, loading, error, resetSettings } = useSettings();

  const categories = [
    { key: 'userPreferences' as const, label: 'User Preferences', icon: '👤' },
    { key: 'themeSettings' as const, label: 'Theme & UI', icon: '🎨' },
    { key: 'modelSettings' as const, label: 'AI Models', icon: '🤖' },
    { key: 'privacySettings' as const, label: 'Privacy & Security', icon: '🔒' },
    { key: 'systemSettings' as const, label: 'System & Performance', icon: '⚙️' },
  ];

  const handleResetCategory = async () => {
    if (window.window.confirm(`Are you sure you want to reset ${categories.find(c => c.key === activeCategory)?.label} to default values?`)) {
      try {
        await resetSettings(activeCategory);
      } catch (err) {
        // Error logging disabled for production
      }
    }
  };

  const handleResetAll = async () => {
    if (window.window.confirm('Are you sure you want to reset ALL settings to default values? This cannot be undone.')) {
      try {
        await resetSettings();
      } catch (err) {
        // Error logging disabled for production
      }
    }
  };

  const renderSettingsContent = () => {
    if (loading) {
      return (
        <div className="settings-loading">
          <div className="loading-spinner" />
          <p>Loading settings...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="settings-error">
          <h3>Error Loading Settings</h3>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Reload</button>
        </div>
      );
    }

    switch (activeCategory) {
      case 'userPreferences':
        return <UserPreferencesPanel />;
      case 'themeSettings':
        return <ThemeSettingsPanel />;
      case 'modelSettings':
        return <ModelSettingsPanel />;
      case 'privacySettings':
        return <PrivacySettingsPanel />;
      case 'systemSettings':
        return <SystemSettingsPanel />;
      default:
        return <div>Unknown settings category</div>;
    }
  };

  return (
    <div className="settings-panel">
      <div className="settings-header">
        <h2>Settings</h2>
        {onClose && (
          <button className="close-button" onClick={onClose} aria-label="Close settings">
            ×
          </button>
        )}
      </div>

      <div className="settings-content">
        <div className="settings-sidebar">
          <nav className="settings-nav">
            {categories.map((category) => (
              <button
                key={category.key}
                className={`nav-item ${activeCategory === category.key ? 'active' : ''}`}
                onClick={() => setActiveCategory(category.key)}
              >
                <span className="nav-icon">{category.icon}</span>
                <span className="nav-label">{category.label}</span>
              </button>
            ))}
          </nav>

          <div className="settings-actions">
            <BackupRestorePanel />
            <div className="reset-actions">
              <button 
                className="reset-button secondary"
                onClick={handleResetCategory}
                disabled={loading}
              >
                Reset Category
              </button>
              <button 
                className="reset-button danger"
                onClick={handleResetAll}
                disabled={loading}
              >
                Reset All
              </button>
            </div>
          </div>
        </div>

        <div className="settings-main">
          {renderSettingsContent()}
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;