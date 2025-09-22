import { useCallback, useEffect, useMemo, useState } from 'react';

import { LocalSettingsConfig, SettingsCategory, SettingsValidationError } from '../types/settings';
import { localSettingsService } from '../services/settings';

interface UseLocalSettingsReturn {
  settings: LocalSettingsConfig | null;
  loading: boolean;
  error: string | null;
  updateSettings: <K extends SettingsCategory>(
    category: K,
    updates: Partial<LocalSettingsConfig[K]>
  ) => Promise<void>;
  resetSettings: (category?: SettingsCategory) => Promise<void>;
  validateSettings: (settings: Partial<LocalSettingsConfig>) => SettingsValidationError[];
  isModified: boolean;
  lastSaved: Date | null;
}

export const useLocalSettings = (): UseLocalSettingsReturn => {
  const [settings, setSettings] = useState<LocalSettingsConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [originalSettings, setOriginalSettings] = useState<LocalSettingsConfig | null>(null);

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        setError(null);
        const loadedSettings = await localSettingsService.loadSettings();
        setSettings(loadedSettings);
        setOriginalSettings(JSON.parse(JSON.stringify(loadedSettings))); // Deep clone
        setLastSaved(new Date());
      } catch (err) {
        console.error('Failed to load settings:', err);
        setError(err instanceof Error ? err.message : 'Failed to load settings');
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Watch for settings changes from file system
  useEffect(() => {
    if (!settings) return;

    const unwatch = localSettingsService.watchSettings((updatedSettings) => {
      setSettings(updatedSettings);
      setLastSaved(new Date());
      // Update original settings to reflect external changes
      setOriginalSettings(JSON.parse(JSON.stringify(updatedSettings)));
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
      setLastSaved(new Date());
      // Settings will be updated via the file watcher
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
      setLastSaved(new Date());
      // Settings will be updated via the file watcher
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reset settings';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const validateSettings = useCallback((settingsToValidate: Partial<LocalSettingsConfig>): SettingsValidationError[] => {
    return localSettingsService.validateSettings(settingsToValidate);
  }, []);

  // Check if settings have been modified from original
  const isModified = useMemo(() => {
    if (!settings || !originalSettings) return false;
    return JSON.stringify(settings) !== JSON.stringify(originalSettings);
  }, [settings, originalSettings]);

  return {
    settings,
    loading,
    error,
    updateSettings,
    resetSettings,
    validateSettings,
    isModified,
    lastSaved,
  };
};

// Hook for specific setting categories
export const useUserPreferences = () => {
  const { settings, updateSettings } = useLocalSettings();
  return {
    preferences: settings?.userPreferences,
    updatePreferences: useCallback((updates: Partial<LocalSettingsConfig['userPreferences']>) =>
      updateSettings('userPreferences', updates), [updateSettings]),
  };
};

export const useThemeSettings = () => {
  const { settings, updateSettings } = useLocalSettings();
  return {
    theme: settings?.themeSettings,
    updateTheme: useCallback((updates: Partial<LocalSettingsConfig['themeSettings']>) =>
      updateSettings('themeSettings', updates), [updateSettings]),
  };
};

export const useModelSettings = () => {
  const { settings, updateSettings } = useLocalSettings();
  return {
    models: settings?.modelSettings,
    updateModels: useCallback((updates: Partial<LocalSettingsConfig['modelSettings']>) =>
      updateSettings('modelSettings', updates), [updateSettings]),
  };
};

export const usePrivacySettings = () => {
  const { settings, updateSettings } = useLocalSettings();
  return {
    privacy: settings?.privacySettings,
    updatePrivacy: useCallback((updates: Partial<LocalSettingsConfig['privacySettings']>) =>
      updateSettings('privacySettings', updates), [updateSettings]),
  };
};

export const useSystemSettings = () => {
  const { settings, updateSettings } = useLocalSettings();
  return {
    system: settings?.systemSettings,
    updateSystem: useCallback((updates: Partial<LocalSettingsConfig['systemSettings']>) =>
      updateSettings('systemSettings', updates), [updateSettings]),
  };
};