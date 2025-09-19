import React from 'react';
import { useUserPreferences } from '../../contexts/SettingsContext';
import FormField from './FormField';
import './SettingsPanel.css';

const UserPreferencesPanel: React.FC = () => {
  const { preferences, updatePreferences } = useUserPreferences();

  const languageOptions = [
    { value: 'en-US', label: 'English (US)' },
    { value: 'en-GB', label: 'English (UK)' },
    { value: 'es-ES', label: 'Español' },
    { value: 'fr-FR', label: 'Français' },
    { value: 'de-DE', label: 'Deutsch' },
    { value: 'ja-JP', label: '日本語' },
    { value: 'ko-KR', label: '한국어' },
    { value: 'zh-CN', label: '中文 (简体)' },
    { value: 'zh-TW', label: '中文 (繁體)' },
  ];

  const supportedTimezones = (
    (Intl as typeof Intl & { supportedValuesOf?: (input: string) => string[] })
      .supportedValuesOf?.('timeZone') ?? ['UTC']
  );

  const timezoneOptions = supportedTimezones.map(tz => ({
    value: tz,
    label: tz.replace(/_/g, ' '),
  }));

  const dateFormatOptions = [
    { value: 'MM/dd/yyyy', label: 'MM/DD/YYYY (US)' },
    { value: 'dd/MM/yyyy', label: 'DD/MM/YYYY (EU)' },
    { value: 'yyyy-MM-dd', label: 'YYYY-MM-DD (ISO)' },
    { value: 'dd.MM.yyyy', label: 'DD.MM.YYYY (DE)' },
  ];

  const currencyOptions = [
    { value: 'USD', label: 'US Dollar ($)' },
    { value: 'EUR', label: 'Euro (€)' },
    { value: 'GBP', label: 'British Pound (£)' },
    { value: 'JPY', label: 'Japanese Yen (¥)' },
    { value: 'CAD', label: 'Canadian Dollar (C$)' },
    { value: 'AUD', label: 'Australian Dollar (A$)' },
  ];

  return (
    <div className="settings-section">
      <div className="section-header">
        <h3>User Preferences</h3>
        <p>Customize your personal settings and regional preferences</p>
      </div>

      <div className="settings-form">
        <div className="form-group">
          <h4>Language & Region</h4>
          
          <FormField
            label="Language"
            type="select"
            value={preferences.language}
            onChange={(value) => updatePreferences({ language: value })}
            options={languageOptions}
            description="Select your preferred display language"
          />

          <FormField
            label="Timezone"
            type="select"
            value={preferences.timezone}
            onChange={(value) => updatePreferences({ timezone: value })}
            options={timezoneOptions}
            description="Your local timezone for date and time display"
            searchable
          />

          <FormField
            label="Date Format"
            type="select"
            value={preferences.dateFormat}
            onChange={(value) => updatePreferences({ dateFormat: value })}
            options={dateFormatOptions}
            description="How dates should be displayed"
          />

          <FormField
            label="Time Format"
            type="select"
            value={preferences.timeFormat}
            onChange={(value) => updatePreferences({ timeFormat: value as '12h' | '24h' })}
            options={[
              { value: '12h', label: '12 Hour (AM/PM)' },
              { value: '24h', label: '24 Hour' },
            ]}
            description="Time display format"
          />

          <FormField
            label="Currency"
            type="select"
            value={preferences.currency}
            onChange={(value) => updatePreferences({ currency: value })}
            options={currencyOptions}
            description="Default currency for pricing displays"
          />

          <FormField
            label="Units"
            type="select"
            value={preferences.units}
            onChange={(value) => updatePreferences({ units: value as 'metric' | 'imperial' })}
            options={[
              { value: 'metric', label: 'Metric (km, °C, kg)' },
              { value: 'imperial', label: 'Imperial (miles, °F, lbs)' },
            ]}
            description="Measurement units system"
          />
        </div>

        <div className="form-group">
          <h4>Application Behavior</h4>
          
          <FormField
            label="Auto Save"
            type="switch"
            value={preferences.autoSave}
            onChange={(value) => updatePreferences({ autoSave: value })}
            description="Automatically save your work as you type"
          />

          <FormField
            label="Confirm Before Exit"
            type="switch"
            value={preferences.confirmBeforeExit}
            onChange={(value) => updatePreferences({ confirmBeforeExit: value })}
            description="Ask for confirmation before closing the application"
          />

          <FormField
            label="Show Tooltips"
            type="switch"
            value={preferences.showTooltips}
            onChange={(value) => updatePreferences({ showTooltips: value })}
            description="Display helpful tooltips for UI elements"
          />

          <FormField
            label="Enable Animations"
            type="switch"
            value={preferences.enableAnimations}
            onChange={(value) => updatePreferences({ enableAnimations: value })}
            description="Show UI animations and transitions"
          />
        </div>

        <div className="form-group">
          <h4>Audio & Notifications</h4>
          
          <FormField
            label="Sound Effects"
            type="switch"
            value={preferences.soundEnabled}
            onChange={(value) => updatePreferences({ soundEnabled: value })}
            description="Play sound effects for notifications and interactions"
          />

          <FormField
            label="Notifications"
            type="switch"
            value={preferences.notificationsEnabled}
            onChange={(value) => updatePreferences({ notificationsEnabled: value })}
            description="Show desktop notifications for important events"
          />
        </div>

        <div className="settings-info">
          <h4>Settings Information</h4>
          <div className="info-grid">
            <div className="info-item">
              <label>Last Modified:</label>
              <span>{new Date(preferences.lastModified).toLocaleString()}</span>
            </div>
            <div className="info-item">
              <label>Version:</label>
              <span>{preferences.version}</span>
            </div>
            <div className="info-item">
              <label>Schema Version:</label>
              <span>{preferences.schemaVersion}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserPreferencesPanel;