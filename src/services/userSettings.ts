// User Settings Service for BEAR AI - Manages user preferences and personalization
import { EventEmitter } from 'events';
import type { UserPreferences } from '@/types/settings';
import { configManager } from './configManager';

export interface UserSession {
  userId: string;
  sessionId: string;
  startTime: Date;
  lastActivity: Date;
  preferences: UserPreferences;
  temporarySettings: Record<string, any>;
  isGuest: boolean;
}

export interface SettingsProfile {
  id: string;
  name: string;
  description: string;
  settings: Partial<UserPreferences>;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SettingsValidationRule {
  key: string;
  required: boolean;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  validation?: {
    min?: number;
    max?: number;
    options?: any[];
    pattern?: RegExp;
    custom?: (value: any) => boolean | string;
  };
}

export interface SettingsExport {
  userId: string;
  timestamp: Date;
  preferences: UserPreferences;
  profiles: SettingsProfile[];
  metadata: {
    version: string;
    source: string;
    includeTemporary: boolean;
  };
}

export interface SettingsSyncStatus {
  lastSync: Date;
  syncInProgress: boolean;
  conflicts: Array<{
    key: string;
    localValue: any;
    remoteValue: any;
    timestamp: Date;
  }>;
  errors: string[];
}

export class UserSettingsService extends EventEmitter {
  private sessions: Map<string, UserSession> = new Map();
  private profiles: Map<string, SettingsProfile[]> = new Map();
  private validationRules: SettingsValidationRule[] = [];
  private syncStatus: Map<string, SettingsSyncStatus> = new Map();
  private autoSaveInterval: number | null = null;
  private conflictResolutionStrategy: 'local' | 'remote' | 'manual' | 'merge' = 'manual';

  constructor() {
    super();
    this.initializeValidationRules();
    this.enableAutoSave();
  }

  /**
   * User session management
   */
  async createUserSession(userId: string, isGuest: boolean = false): Promise<UserSession> {
    const sessionId = this.generateSessionId();
    const preferences = await configManager.getUserPreferences(userId);

    const session: UserSession = {
      userId,
      sessionId,
      startTime: new Date(),
      lastActivity: new Date(),
      preferences: { ...preferences },
      temporarySettings: {},
      isGuest
    };

    this.sessions.set(sessionId, session);
    this.emit('session.created', { userId, sessionId, isGuest });

    return session;
  }

  async getSession(sessionId: string): Promise<UserSession | null> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = new Date();
    }
    return session || null;
  }

  async endSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    // Auto-save preferences if not a guest
    if (!session.isGuest) {
      await this.saveUserPreferences(session.userId, session.preferences);
    }

    this.sessions.delete(sessionId);
    this.emit('session.ended', { userId: session.userId, sessionId });
  }

  /**
   * User preferences management
   */
  async getUserPreferences(userId: string): Promise<UserPreferences> {
    return configManager.getUserPreferences(userId);
  }

  async updateUserPreferences(
    userId: string, 
    updates: Partial<UserPreferences>,
    options: { validate?: boolean; temporary?: boolean; sessionId?: string } = {}
  ): Promise<void> {
    const { validate = true, temporary = false, sessionId } = options;

    // Validate updates if requested
    if (validate) {
      const validation = this.validatePreferences(updates);
      if (!validation.isValid) {
        throw new Error(`Preferences validation failed: ${validation.errors.join(', ')}`);
      }
    }

    if (temporary && sessionId) {
      // Update temporary session settings
      const session = this.sessions.get(sessionId);
      if (session) {
        session.temporarySettings = { ...session.temporarySettings, ...updates };
        session.preferences = { ...session.preferences, ...updates };
        this.emit('preferences.updated.temporary', { userId, sessionId, updates });
        return;
      }
    }

    // Update persistent preferences
    await configManager.setUserPreferences(userId, updates);
    
    // Update all active sessions for this user
    for (const [sid, session] of this.sessions) {
      if (session.userId === userId) {
        session.preferences = { ...session.preferences, ...updates };
      }
    }

    this.emit('preferences.updated', { userId, updates });
  }

  async resetUserPreferences(userId: string, keepPersonalization: boolean = false): Promise<void> {
    const defaults = configManager.getConfig().userDefaults;
    
    if (keepPersonalization) {
      const current = await this.getUserPreferences(userId);
      const preserved = {
        theme: current.theme,
        language: current.language,
        timezone: current.timezone
      };
      
      await configManager.setUserPreferences(userId, { ...defaults, ...preserved });
    } else {
      await configManager.setUserPreferences(userId, defaults);
    }

    // Update active sessions
    for (const [sessionId, session] of this.sessions) {
      if (session.userId === userId) {
        session.preferences = await this.getUserPreferences(userId);
      }
    }

    this.emit('preferences.reset', { userId, keepPersonalization });
  }

  /**
   * Settings profiles management
   */
  async createSettingsProfile(
    userId: string, 
    profile: Omit<SettingsProfile, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<SettingsProfile> {
    const fullProfile: SettingsProfile = {
      ...profile,
      id: this.generateProfileId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    if (!this.profiles.has(userId)) {
      this.profiles.set(userId, []);
    }

    this.profiles.get(userId)!.push(fullProfile);
    this.emit('profile.created', { userId, profile: fullProfile });

    return fullProfile;
  }

  async getUserProfiles(userId: string): Promise<SettingsProfile[]> {
    return this.profiles.get(userId) || [];
  }

  async applyProfile(userId: string, profileId: string, sessionId?: string): Promise<void> {
    const profiles = this.profiles.get(userId) || [];
    const profile = profiles.find(p => p.id === profileId);
    
    if (!profile) {
      throw new Error(`Profile ${profileId} not found for user ${userId}`);
    }

    await this.updateUserPreferences(userId, profile.settings, { sessionId });
    this.emit('profile.applied', { userId, profileId, sessionId });
  }

  async updateProfile(userId: string, profileId: string, updates: Partial<SettingsProfile>): Promise<void> {
    const profiles = this.profiles.get(userId) || [];
    const profileIndex = profiles.findIndex(p => p.id === profileId);
    
    if (profileIndex === -1) {
      throw new Error(`Profile ${profileId} not found for user ${userId}`);
    }

    profiles[profileIndex] = {
      ...profiles[profileIndex],
      ...updates,
      updatedAt: new Date()
    };

    this.emit('profile.updated', { userId, profileId, updates });
  }

  async deleteProfile(userId: string, profileId: string): Promise<void> {
    const profiles = this.profiles.get(userId) || [];
    const profileIndex = profiles.findIndex(p => p.id === profileId);
    
    if (profileIndex === -1) {
      throw new Error(`Profile ${profileId} not found for user ${userId}`);
    }

    profiles.splice(profileIndex, 1);
    this.emit('profile.deleted', { userId, profileId });
  }

  /**
   * Settings synchronization
   */
  async syncUserSettings(userId: string, remoteSettings: UserPreferences): Promise<SettingsSyncStatus> {
    const localSettings = await this.getUserPreferences(userId);
    const conflicts: SettingsSyncStatus['conflicts'] = [];
    const mergedSettings: Partial<UserPreferences> = {};

    // Compare settings and identify conflicts
    this.compareSettings(localSettings, remoteSettings, '', conflicts, mergedSettings);

    const syncStatus: SettingsSyncStatus = {
      lastSync: new Date(),
      syncInProgress: false,
      conflicts,
      errors: []
    };

    this.syncStatus.set(userId, syncStatus);

    if (conflicts.length === 0) {
      // No conflicts, apply remote settings
      await this.updateUserPreferences(userId, mergedSettings);
      this.emit('sync.completed', { userId, conflicts: 0 });
    } else {
      // Handle conflicts based on strategy
      await this.resolveConflicts(userId, conflicts);
      this.emit('sync.conflicts', { userId, conflicts: conflicts.length });
    }

    return syncStatus;
  }

  async getSyncStatus(userId: string): Promise<SettingsSyncStatus | null> {
    return this.syncStatus.get(userId) || null;
  }

  setSyncConflictResolution(strategy: 'local' | 'remote' | 'manual' | 'merge'): void {
    this.conflictResolutionStrategy = strategy;
  }

  /**
   * Settings validation
   */
  validatePreferences(preferences: Partial<UserPreferences>): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const rule of this.validationRules) {
      const value = this.getNestedValue(preferences, rule.key);
      const validation = this.validateSetting(rule, value);
      
      if (!validation.isValid) {
        if (rule.required) {
          errors.push(`${rule.key}: ${validation.error}`);
        } else {
          warnings.push(`${rule.key}: ${validation.error}`);
        }
      }
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  addValidationRule(rule: SettingsValidationRule): void {
    this.validationRules.push(rule);
  }

  /**
   * Import/Export functionality
   */
  async exportUserSettings(userId: string, includeProfiles: boolean = true): Promise<SettingsExport> {
    const preferences = await this.getUserPreferences(userId);
    const profiles = includeProfiles ? await this.getUserProfiles(userId) : [];

    return {
      userId,
      timestamp: new Date(),
      preferences,
      profiles,
      metadata: {
        version: '1.0.0',
        source: 'UserSettingsService',
        includeTemporary: false
      }
    };
  }

  async importUserSettings(
    userId: string, 
    settingsExport: SettingsExport,
    options: { merge?: boolean; validate?: boolean; includeProfiles?: boolean } = {}
  ): Promise<{ success: boolean; errors: string[]; imported: string[] }> {
    const { merge = true, validate = true, includeProfiles = true } = options;
    const result = { success: false, errors: [], imported: [] };

    try {
      // Validate settings if requested
      if (validate) {
        const validation = this.validatePreferences(settingsExport.preferences);
        if (!validation.isValid) {
          result.errors.push(...validation.errors);
          return result;
        }
      }

      // Import preferences
      if (merge) {
        const current = await this.getUserPreferences(userId);
        const merged = { ...current, ...settingsExport.preferences };
        await this.updateUserPreferences(userId, merged, { validate: false });
      } else {
        await configManager.setUserPreferences(userId, settingsExport.preferences);
      }
      result.imported.push('preferences');

      // Import profiles if requested
      if (includeProfiles && settingsExport.profiles.length > 0) {
        for (const profile of settingsExport.profiles) {
          await this.createSettingsProfile(userId, {
            name: profile.name,
            description: profile.description,
            settings: profile.settings,
            isDefault: profile.isDefault
          });
        }
        result.imported.push('profiles');
      }

      result.success = true;
      this.emit('settings.imported', { userId, imported: result.imported });

    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    }

    return result;
  }

  /**
   * Accessibility helpers
   */
  async getAccessibilitySettings(userId: string): Promise<UserPreferences['accessibility']> {
    const preferences = await this.getUserPreferences(userId);
    return preferences.accessibility;
  }

  async updateAccessibilitySettings(
    userId: string,
    settings: Partial<UserPreferences['accessibility']>
  ): Promise<void> {
    const current = await this.getUserPreferences(userId);
    const updatedAccessibility: UserPreferences['accessibility'] = {
      ...current.accessibility,
      ...settings
    };

    await this.updateUserPreferences(userId, { accessibility: updatedAccessibility });
    this.emit('accessibility.updated', { userId, settings });
  }

  /**
   * Theme management
   */
  async setTheme(userId: string, theme: UserPreferences['theme'], sessionId?: string): Promise<void> {
    await this.updateUserPreferences(userId, { theme }, { sessionId });
    this.emit('theme.changed', { userId, theme, sessionId });
  }

  async getEffectiveTheme(userId: string): Promise<'light' | 'dark'> {
    const preferences = await this.getUserPreferences(userId);
    
    if (preferences.theme === 'auto') {
      // In a real implementation, this would check system preference
      const hour = new Date().getHours();
      return hour >= 6 && hour < 18 ? 'light' : 'dark';
    }
    
    return preferences.theme;
  }

  /**
   * Notification settings
   */
  async updateNotificationSettings(
    userId: string,
    settings: Partial<UserPreferences['notifications']>
  ): Promise<void> {
    const current = await this.getUserPreferences(userId);
    const updatedNotifications: UserPreferences['notifications'] = {
      ...current.notifications,
      ...settings
    };

    await this.updateUserPreferences(userId, { notifications: updatedNotifications });
    this.emit('notifications.updated', { userId, settings });
  }

  async canSendNotification(userId: string, type: keyof UserPreferences['notifications']): Promise<boolean> {
    const preferences = await this.getUserPreferences(userId);
    return preferences.notifications[type] || false;
  }

  // Private methods
  private initializeValidationRules(): void {
    this.validationRules = [
      {
        key: 'theme',
        required: true,
        type: 'string',
        validation: { options: ['light', 'dark', 'auto'] }
      },
      {
        key: 'language',
        required: true,
        type: 'string',
        validation: { pattern: /^[a-z]{2}(-[A-Z]{2})?$/ }
      },
      {
        key: 'interface.densityMode',
        required: false,
        type: 'string',
        validation: { options: ['compact', 'normal', 'comfortable'] }
      },
      {
        key: 'notifications.desktop',
        required: false,
        type: 'boolean'
      },
      {
        key: 'accessibility.highContrast',
        required: false,
        type: 'boolean'
      }
    ];
  }

  private enableAutoSave(intervalMs: number = 30000): void {
    if (this.autoSaveInterval) {
      window.clearInterval(this.autoSaveInterval);
    }

    this.autoSaveInterval = window.setInterval(async () => {
      for (const [sessionId, session] of this.sessions) {
        if (!session.isGuest && this.hasUnsavedChanges(session)) {
          try {
            await this.saveUserPreferences(session.userId, session.preferences);
          } catch (error) {
            // Error logging disabled for production
          }
        }
      }
    }, intervalMs);
  }

  private async saveUserPreferences(userId: string, preferences: UserPreferences): Promise<void> {
    await configManager.setUserPreferences(userId, preferences);
  }

  private hasUnsavedChanges(session: UserSession): boolean {
    // In a real implementation, this would compare with last saved state
    return Object.keys(session.temporarySettings).length > 0;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateProfileId(): string {
    return `profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private validateSetting(rule: SettingsValidationRule, value: any): { isValid: boolean; error: string } {
    if (value === undefined || value === null) {
      return { isValid: !rule.required, error: 'Required setting is missing' };
    }

    // Type validation
    const actualType = Array.isArray(value) ? 'array' : typeof value;
    if (actualType !== rule.type) {
      return { isValid: false, error: `Expected ${rule.type}, got ${actualType}` };
    }

    // Additional validation
    if (rule.validation) {
      const { min, max, options, pattern, custom } = rule.validation;

      if (min !== undefined && (typeof value === 'number' ? value < min : value.length < min)) {
        return { isValid: false, error: `Value must be at least ${min}` };
      }

      if (max !== undefined && (typeof value === 'number' ? value > max : value.length > max)) {
        return { isValid: false, error: `Value must be at most ${max}` };
      }

      if (options && !options.includes(value)) {
        return { isValid: false, error: `Value must be one of: ${options.join(', ')}` };
      }

      if (pattern && typeof value === 'string' && !pattern.test(value)) {
        return { isValid: false, error: 'Value does not match required format' };
      }

      if (custom) {
        const customResult = custom(value);
        if (typeof customResult === 'string') {
          return { isValid: false, error: customResult };
        }
        if (!customResult) {
          return { isValid: false, error: 'Custom validation failed' };
        }
      }
    }

    return { isValid: true, error: '' };
  }

  private compareSettings(
    local: any, 
    remote: any, 
    path: string, 
    conflicts: SettingsSyncStatus['conflicts'], 
    merged: any
  ): void {
    for (const key in remote) {
      const currentPath = path ? `${path}.${key}` : key;
      const localValue = local[key];
      const remoteValue = remote[key];

      if (localValue !== remoteValue) {
        if (typeof localValue === 'object' && typeof remoteValue === 'object') {
          merged[key] = merged[key] || {};
          this.compareSettings(localValue, remoteValue, currentPath, conflicts, merged[key]);
        } else {
          conflicts.push({
            key: currentPath,
            localValue,
            remoteValue,
            timestamp: new Date()
          });
        }
      } else {
        merged[key] = remoteValue;
      }
    }
  }

  private async resolveConflicts(userId: string, conflicts: SettingsSyncStatus['conflicts']): Promise<void> {
    const updates: any = {};

    for (const conflict of conflicts) {
      switch (this.conflictResolutionStrategy) {
        case 'local':
          // Keep local value, do nothing
          break;
        case 'remote':
          this.setNestedValue(updates, conflict.key, conflict.remoteValue);
          break;
        case 'merge':
          // Simple merge strategy - could be more sophisticated
          const mergedValue = this.mergeValues(conflict.localValue, conflict.remoteValue);
          this.setNestedValue(updates, conflict.key, mergedValue);
          break;
        case 'manual':
          // Emit event for manual resolution
          this.emit('sync.conflict.manual', { userId, conflict });
          break;
      }
    }

    if (Object.keys(updates).length > 0) {
      await this.updateUserPreferences(userId, updates, { validate: false });
    }
  }

  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    let current = obj;

    for (const key of keys) {
      if (!(key in current)) {
        current[key] = {};
      }
      current = current[key];
    }

    current[lastKey] = value;
  }

  private mergeValues(local: any, remote: any): any {
    // Simple merge logic - prefer newer non-null values
    if (remote !== null && remote !== undefined) {
      return remote;
    }
    return local;
  }

  destroy(): void {
    if (this.autoSaveInterval) {
      window.clearInterval(this.autoSaveInterval);
    }
    this.sessions.clear();
    this.profiles.clear();
    this.syncStatus.clear();
    this.removeAllListeners();
  }
}

// Singleton instance
export const userSettingsService = new UserSettingsService();

// Export utility functions
export async function createUserSession(userId: string, isGuest?: boolean): Promise<UserSession> {
  return userSettingsService.createUserSession(userId, isGuest);
}

export async function getUserPreferences(userId: string): Promise<UserPreferences> {
  return userSettingsService.getUserPreferences(userId);
}

export async function updateUserPreferences(userId: string, updates: Partial<UserPreferences>): Promise<void> {
  return userSettingsService.updateUserPreferences(userId, updates);
}

export async function getUserTheme(userId: string): Promise<'light' | 'dark'> {
  return userSettingsService.getEffectiveTheme(userId);
}

export async function canSendNotification(userId: string, type: keyof UserPreferences['notifications']): Promise<boolean> {
  return userSettingsService.canSendNotification(userId, type);
}