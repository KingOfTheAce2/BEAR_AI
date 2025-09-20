import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { LocalSettingsConfig, SettingsContext as ISettingsContext, SettingsBackup, SettingsValidationError, SettingsCategory } from '../types/settings';
import { localSettingsService } from '../services/settings';

const SettingsContext = createContext<ISettingsContext | undefined>(undefined);

interface SettingsProviderProps {
  children: React.ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<LocalSettingsConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize settings on mount
  useEffect(() => {
    const initializeSettings = async () => {
      try {
        setLoading(true);
        setError(null);
        const loadedSettings = await localSettingsService.loadSettings();
        setSettings(loadedSettings);
      } catch (err) {
        console.error('Failed to initialize settings:', err);
        setError(err instanceof Error ? err.message : 'Failed to load settings');
      } finally {
        setLoading(false);
      }
    };

    initializeSettings();
  }, []);

  // Watch for settings changes
  useEffect(() => {
    if (!settings) return;

    const unwatch = localSettingsService.watchSettings((updatedSettings) => {
      setSettings(updatedSettings);
    });

    return unwatch;
  }, [settings]);

  const updateSettings = useCallback(async <K extends SettingsCategory>(
    category: K,
    updates: Partial<LocalSettingsConfig[K]>
  ): Promise<void> => {
    try {
      setError(null);
      await localSettingsService.updateSettings(category, updates);
      // Settings will be updated via the watcher
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update settings';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const resetSettings = useCallback(async (category?: SettingsCategory): Promise<void> => {
    try {
      setError(null);
      await localSettingsService.resetSettings(category);
      // Settings will be updated via the watcher
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reset settings';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const exportSettings = useCallback(async (): Promise<SettingsBackup> => {
    try {
      return await localSettingsService.exportSettings();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export settings';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const importSettings = useCallback(async (backup: SettingsBackup): Promise<void> => {
    try {
      setError(null);
      await localSettingsService.importSettings(backup);
      // Settings will be updated via the watcher
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to import settings';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const validateSettings = useCallback((settingsToValidate: Partial<LocalSettingsConfig>): SettingsValidationError[] => {
    return localSettingsService.validateSettings(settingsToValidate);
  }, []);

  const contextValue: ISettingsContext = {
    settings: settings || {} as LocalSettingsConfig,
    loading,
    error,
    updateSettings,
    resetSettings,
    exportSettings,
    importSettings,
    validateSettings,
  };

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): ISettingsContext => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

export const useUserPreferences = () => {
  const { settings, updateSettings } = useSettings();
  return {
    preferences: settings.userPreferences,
    updatePreferences: (updates: Partial<LocalSettingsConfig['userPreferences']>) =>
      updateSettings('userPreferences', updates),
  };
};

export const useThemeSettings = () => {
  const { settings, updateSettings } = useSettings();
  return {
    theme: settings.themeSettings,
    updateTheme: (updates: Partial<LocalSettingsConfig['themeSettings']>) =>
      updateSettings('themeSettings', updates),
  };
};

export const useModelSettings = () => {
  const { settings, updateSettings } = useSettings();
  return {
    models: settings.modelSettings,
    updateModels: (updates: Partial<LocalSettingsConfig['modelSettings']>) =>
      updateSettings('modelSettings', updates),
  };
};

export const usePrivacySettings = () => {
  const { settings, updateSettings } = useSettings();
  return {
    privacy: settings.privacySettings,
    updatePrivacy: (updates: Partial<LocalSettingsConfig['privacySettings']>) =>
      updateSettings('privacySettings', updates),
  };
};

export const useSystemSettings = () => {
  const { settings, updateSettings } = useSettings();
  return {
    system: settings.systemSettings,
    updateSystem: (updates: Partial<LocalSettingsConfig['systemSettings']>) =>
      updateSettings('systemSettings', updates),
  };
};
