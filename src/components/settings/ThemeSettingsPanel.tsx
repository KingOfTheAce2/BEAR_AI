import React, { useState } from 'react';
import './SettingsPanel.css';
import { CustomTheme } from '../../types/settings';
import { useThemeSettings } from '../../contexts/SettingsContext';
import ColorPicker from './ColorPicker';
import FormField from './FormField';

const ThemeSettingsPanel: React.FC = () => {
  const { theme, updateTheme } = useThemeSettings();
  const [editingTheme, setEditingTheme] = useState<CustomTheme | null>(null);
  const [showColorPicker, setShowColorPicker] = useState<string | null>(null);

  const themeOptions = [
    { value: 'light', label: 'Light Mode' },
    { value: 'dark', label: 'Dark Mode' },
    { value: 'auto', label: 'System Default' },
  ];

  const fontSizeOptions = [
    { value: 'small', label: 'Small (12px)' },
    { value: 'medium', label: 'Medium (14px)' },
    { value: 'large', label: 'Large (16px)' },
    { value: 'extra-large', label: 'Extra Large (18px)' },
  ];

  const fontFamilyOptions = [
    { value: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', label: 'System Default' },
    { value: '"Inter", sans-serif', label: 'Inter' },
    { value: '"Roboto", sans-serif', label: 'Roboto' },
    { value: '"Open Sans", sans-serif', label: 'Open Sans' },
    { value: '"Helvetica Neue", Helvetica, Arial, sans-serif', label: 'Helvetica' },
    { value: 'Georgia, "Times New Roman", serif', label: 'Georgia' },
  ];

  const colorBlindnessOptions = [
    { value: 'none', label: 'None' },
    { value: 'protanopia', label: 'Protanopia (Red-blind)' },
    { value: 'deuteranopia', label: 'Deuteranopia (Green-blind)' },
    { value: 'tritanopia', label: 'Tritanopia (Blue-blind)' },
  ];

  const createCustomTheme = () => {
    const newTheme: CustomTheme = {
      id: `custom-${Date.now()}`,
      name: 'New Custom Theme',
      colors: {
        primary: '#007bff',
        secondary: '#6c757d',
        accent: '#28a745',
        background: '#ffffff',
        surface: '#f8f9fa',
        text: '#212529',
        textSecondary: '#6c757d',
        border: '#dee2e6',
        success: '#28a745',
        warning: '#ffc107',
        error: '#dc3545',
        info: '#17a2b8',
      },
      fonts: {
        primary: theme.fontFamily,
        monospace: '"Fira Code", "Consolas", monospace',
        sizes: {
          xs: '0.75rem',
          sm: '0.875rem',
          md: '1rem',
          lg: '1.125rem',
          xl: '1.25rem',
        },
      },
    };
    setEditingTheme(newTheme);
  };

  const saveCustomTheme = () => {
    if (!editingTheme) return;
    
    const updatedThemes = theme.customThemes.some(t => t.id === editingTheme.id)
      ? theme.customThemes.map(t => t.id === editingTheme.id ? editingTheme : t)
      : [...theme.customThemes, editingTheme];

    updateTheme({ customThemes: updatedThemes });
    setEditingTheme(null);
  };

  const deleteCustomTheme = (themeId: string) => {
    if (window.window.confirm('Are you sure you want to delete this custom theme?')) {
      const updatedThemes = theme.customThemes.filter(t => t.id !== themeId);
      updateTheme({ customThemes: updatedThemes });
    }
  };

  const duplicateTheme = (themeId: string) => {
    const originalTheme = theme.customThemes.find(t => t.id === themeId);
    if (originalTheme) {
      const duplicatedTheme: CustomTheme = {
        ...originalTheme,
        id: `custom-${Date.now()}`,
        name: `${originalTheme.name} (Copy)`,
      };
      setEditingTheme(duplicatedTheme);
    }
  };

  return (
    <div className="settings-section">
      <div className="section-header">
        <h3>Theme & UI Settings</h3>
        <p>Customize the appearance and accessibility of the interface</p>
      </div>

      <div className="settings-form">
        <div className="form-group">
          <h4>Theme Selection</h4>
          
          <FormField
            label="Active Theme"
            type="select"
            value={theme.activeTheme}
            onChange={(value) => updateTheme({ activeTheme: value as 'light' | 'dark' | 'auto' })}
            options={themeOptions}
            description="Choose your preferred theme"
          />
        </div>

        <div className="form-group">
          <h4>Typography</h4>
          
          <FormField
            label="Font Size"
            type="select"
            value={theme.fontSize}
            onChange={(value) => updateTheme({ fontSize: value as any })}
            options={fontSizeOptions}
            description="Base font size for the interface"
          />

          <FormField
            label="Font Family"
            type="select"
            value={theme.fontFamily}
            onChange={(value) => updateTheme({ fontFamily: value })}
            options={fontFamilyOptions}
            description="Primary font family for text"
          />

          <FormField
            label="UI Scale"
            type="slider"
            value={theme.uiScale}
            onChange={(value) => updateTheme({ uiScale: Number(value) })}
            min={0.75}
            max={1.5}
            step={0.05}
            description="Overall UI scale factor"
          />
        </div>

        <div className="form-group">
          <h4>Accessibility</h4>
          
          <FormField
            label="Color Blindness Support"
            type="select"
            value={theme.colorBlindnessMode}
            onChange={(value) => updateTheme({ colorBlindnessMode: value as any })}
            options={colorBlindnessOptions}
            description="Adjust colors for color vision differences"
          />

          <FormField
            label="High Contrast"
            type="switch"
            value={theme.highContrast}
            onChange={(value) => updateTheme({ highContrast: value })}
            description="Enable high contrast mode for better visibility"
          />

          <FormField
            label="Reduce Motion"
            type="switch"
            value={theme.reduceMotion}
            onChange={(value) => updateTheme({ reduceMotion: value })}
            description="Reduce animations and transitions"
          />
        </div>

        <div className="form-group">
          <h4>Layout</h4>
          
          <FormField
            label="Compact Mode"
            type="switch"
            value={theme.compactMode}
            onChange={(value) => updateTheme({ compactMode: value })}
            description="Use a more compact layout with reduced spacing"
          />

          <FormField
            label="Sidebar Width"
            type="slider"
            value={theme.sidebarWidth}
            onChange={(value) => updateTheme({ sidebarWidth: Number(value) })}
            min={200}
            max={500}
            step={10}
            description="Width of the sidebar in pixels"
          />

          <FormField
            label="Show Status Bar"
            type="switch"
            value={theme.showStatusBar}
            onChange={(value) => updateTheme({ showStatusBar: value })}
            description="Display the status bar at the bottom"
          />
        </div>

        <div className="form-group">
          <h4>Editor Settings</h4>
          
          <FormField
            label="Show Line Numbers"
            type="switch"
            value={theme.showLineNumbers}
            onChange={(value) => updateTheme({ showLineNumbers: value })}
            description="Display line numbers in code editors"
          />

          <FormField
            label="Word Wrap"
            type="switch"
            value={theme.wordWrap}
            onChange={(value) => updateTheme({ wordWrap: value })}
            description="Wrap long lines in editors"
          />
        </div>

        <div className="form-group">
          <h4>Custom Themes</h4>
          <p>Create and manage custom color themes</p>
          
          <div className="custom-themes-list">
            {theme.customThemes.map((customTheme) => (
              <div key={customTheme.id} className="custom-theme-item">
                <div className="theme-preview">
                  <div 
                    className="color-swatch" 
                    style={{ backgroundColor: customTheme.colors.primary }}
                  />
                  <div 
                    className="color-swatch" 
                    style={{ backgroundColor: customTheme.colors.secondary }}
                  />
                  <div 
                    className="color-swatch" 
                    style={{ backgroundColor: customTheme.colors.accent }}
                  />
                </div>
                <div className="theme-info">
                  <h5>{customTheme.name}</h5>
                </div>
                <div className="theme-actions">
                  <button
                    className="action-button"
                    onClick={() => setEditingTheme(customTheme)}
                  >
                    Edit
                  </button>
                  <button
                    className="action-button"
                    onClick={() => duplicateTheme(customTheme.id)}
                  >
                    Duplicate
                  </button>
                  <button
                    className="action-button danger"
                    onClick={() => deleteCustomTheme(customTheme.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button className="create-theme-button" onClick={createCustomTheme}>
            Create Custom Theme
          </button>
        </div>

        {editingTheme && (
          <div className="custom-theme-editor">
            <h4>Editing: {editingTheme.name}</h4>
            
            <FormField
              label="Theme Name"
              type="text"
              value={editingTheme.name}
              onChange={(value) => setEditingTheme({ ...editingTheme, name: value })}
              description="Name for your custom theme"
            />

            <div className="color-fields">
              <h5>Colors</h5>
              {Object.entries(editingTheme.colors).map(([key, value]) => (
                <div key={key} className="color-field">
                  <label>{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</label>
                  <div className="color-input-group">
                    <input
                      type="color"
                      value={value}
                      onChange={(e) => setEditingTheme({
                        ...editingTheme,
                        colors: { ...editingTheme.colors, [key]: e.target.value }
                      })}
                    />
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => setEditingTheme({
                        ...editingTheme,
                        colors: { ...editingTheme.colors, [key]: e.target.value }
                      })}
                      placeholder="#000000"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="theme-editor-actions">
              <button className="save-button" onClick={saveCustomTheme}>
                Save Theme
              </button>
              <button className="cancel-button" onClick={() => setEditingTheme(null)}>
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="settings-info">
          <h4>Theme Information</h4>
          <div className="info-grid">
            <div className="info-item">
              <label>Last Modified:</label>
              <span>{new Date(theme.lastModified).toLocaleString()}</span>
            </div>
            <div className="info-item">
              <label>Custom Themes:</label>
              <span>{theme.customThemes.length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThemeSettingsPanel;