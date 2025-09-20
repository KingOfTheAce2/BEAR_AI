import React, { useState, useRef } from 'react';
import './SettingsPanel.css';
import { localSettingsService } from '../../services/settings';
import { SettingsBackup } from '../../types/settings';
import { useSettings } from '../../contexts/SettingsContext';

const BackupRestorePanel: React.FC = () => {
  const { exportSettings, importSettings } = useSettings();
  const [backups, setBackups] = useState<Array<{ path: string; timestamp: Date; description?: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadBackups = async () => {
    try {
      setLoading(true);
      const backupList = await localSettingsService.listBackups();
      setBackups(backupList);
    } catch (err) {
      setError('Failed to load backup list');
      console.error('Error loading backups:', err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadBackups();
  }, [] // eslint-disable-line react-hooks/exhaustive-deps);

  const handleExport = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      const backup = await exportSettings();
      const dataStr = JSON.stringify(backup, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bear-ai-settings-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setSuccess('Settings exported successfully');
    } catch (err) {
      setError('Failed to export settings');
      console.error('Export error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      const fileText = await file.text();
      const backup: SettingsBackup = JSON.parse(fileText);
      
      if (!backup.version || !backup.settings || !backup.metadata) {
        throw new Error('Invalid backup file format');
      }
      
      await importSettings(backup);
      setSuccess('Settings imported successfully');
      
      // Refresh the page to apply new settings
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import settings');
      console.error('Import error:', err);
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCreateBackup = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      const description = prompt('Enter a description for this backup (optional):');
      await localSettingsService.createBackup(description || undefined);
      
      setSuccess('Backup created successfully');
      loadBackups(); // Refresh backup list
      
    } catch (err) {
      setError('Failed to create backup');
      console.error('Backup creation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreBackup = async (backupPath: string) => {
    if (!window.window.confirm('Are you sure you want to restore this backup? Current settings will be overwritten.')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      await localSettingsService.restoreBackup(backupPath);
      setSuccess('Backup restored successfully');
      
      // Refresh the page to apply restored settings
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (err) {
      setError('Failed to restore backup');
      console.error('Restore error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (path: string): string => {
    try {
      const fs = require('fs');
      const stats = fs.statSync(path);
      const bytes = stats.size;
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    } catch {
      return 'Unknown';
    }
  };

  return (
    <div className="backup-restore-panel">
      <h4>Backup & Restore</h4>
      
      {error && (
        <div className="message error">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}
      
      {success && (
        <div className="message success">
          {success}
          <button onClick={() => setSuccess(null)}>×</button>
        </div>
      )}

      <div className="backup-actions">
        <button
          onClick={handleExport}
          disabled={loading}
          className="action-button primary"
        >
          {loading ? 'Exporting...' : 'Export Settings'}
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          className="action-button secondary"
        >
          Import Settings
        </button>

        <button
          onClick={handleCreateBackup}
          disabled={loading}
          className="action-button secondary"
        >
          {loading ? 'Creating...' : 'Create Local Backup'}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImportFile}
          style={{ display: 'none' }}
        />
      </div>

      <div className="local-backups">
        <div className="backups-header">
          <h5>Local Backups</h5>
          <button
            onClick={loadBackups}
            disabled={loading}
            className="refresh-button"
            title="Refresh backup list"
          >
            🔄
          </button>
        </div>

        {loading && backups.length === 0 ? (
          <div className="backup-loading">Loading backups...</div>
        ) : backups.length === 0 ? (
          <div className="no-backups">No local backups found</div>
        ) : (
          <div className="backup-list">
            {backups.map((backup, index) => (
              <div key={index} className="backup-item">
                <div className="backup-info">
                  <div className="backup-date">
                    {backup.timestamp.toLocaleDateString()} {backup.timestamp.toLocaleTimeString()}
                  </div>
                  {backup.description && (
                    <div className="backup-description">{backup.description}</div>
                  )}
                  <div className="backup-details">
                    Size: {formatFileSize(backup.path)}
                  </div>
                </div>
                <div className="backup-actions">
                  <button
                    onClick={() => handleRestoreBackup(backup.path)}
                    disabled={loading}
                    className="action-button small"
                  >
                    Restore
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="backup-info">
        <h5>About Backups</h5>
        <ul>
          <li><strong>Export:</strong> Download settings as a JSON file you can save anywhere</li>
          <li><strong>Import:</strong> Load settings from a previously exported JSON file</li>
          <li><strong>Local Backup:</strong> Create a backup stored in your local settings directory</li>
          <li><strong>Auto Backups:</strong> Automatic backups are created before major changes</li>
        </ul>
      </div>
    </div>
  );
};

export default BackupRestorePanel;