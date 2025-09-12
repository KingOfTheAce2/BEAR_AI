/**
 * Type definitions for local chat history system
 */

export interface LocalChatConfig {
  encryptionEnabled: boolean;
  autoCleanup: boolean;
  maxStorageSize: number; // in MB
  retentionDays: number;
  backupEnabled: boolean;
  searchIndexEnabled: boolean;
}

export interface ChatExportOptions {
  format: 'json' | 'markdown' | 'txt';
  includeMetadata: boolean;
  includeSystemMessages: boolean;
  dateRange?: {
    from: Date;
    to: Date;
  };
  sessionIds?: string[];
  compressed: boolean;
}

export interface ChatImportResult {
  success: boolean;
  imported: {
    sessions: number;
    messages: number;
  };
  errors: Array<{
    type: 'session' | 'message' | 'validation';
    error: string;
    data?: any;
  }>;
  warnings: string[];
}

export interface LocalSearchOptions {
  caseSensitive: boolean;
  wholeWords: boolean;
  regex: boolean;
  includeMetadata: boolean;
  maxResults: number;
  sessionFilter?: string[];
  dateRange?: {
    from: Date;
    to: Date;
  };
  roleFilter?: ('user' | 'assistant' | 'system')[];
}

export interface StorageQuota {
  total: number;
  used: number;
  available: number;
  percentage: number;
}

export interface BackupManifest {
  id: string;
  createdAt: Date;
  description: string;
  size: number;
  sessionCount: number;
  messageCount: number;
  encrypted: boolean;
  version: string;
  checksum: string;
}

export interface OfflineStatus {
  isOnline: boolean;
  lastSync: Date | null;
  pendingOperations: number;
  queuedChanges: Array<{
    type: string;
    sessionId: string;
    timestamp: Date;
  }>;
}

export interface ChatAnalytics {
  totalSessions: number;
  totalMessages: number;
  averageMessagesPerSession: number;
  mostActiveDay: string;
  messagesByRole: {
    user: number;
    assistant: number;
    system: number;
  };
  dailyActivity: Array<{
    date: string;
    messages: number;
    sessions: number;
  }>;
  topicsFrequency: Array<{
    term: string;
    count: number;
  }>;
}

export interface DataPrivacySettings {
  encryptSensitiveData: boolean;
  anonymizeExports: boolean;
  clearOnBrowserClose: boolean;
  requirePassphrase: boolean;
  autoLockTimeout: number; // in minutes
  shareAnalytics: boolean;
}