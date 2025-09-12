import React, { useState } from 'react';
import { usePrivacySettings } from '../../contexts/SettingsContext';
import FormField from './FormField';
import './SettingsPanel.css';

const PrivacySettingsPanel: React.FC = () => {
  const { privacy, updatePrivacy } = usePrivacySettings();
  const [showEncryptionKey, setShowEncryptionKey] = useState(false);

  const encryptionAlgorithms = [
    { value: 'aes-256-gcm', label: 'AES-256-GCM (Recommended)' },
    { value: 'aes-256-cbc', label: 'AES-256-CBC' },
  ];

  const generateEncryptionKey = () => {
    // Generate a random 32-byte key for AES-256
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const key = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    updatePrivacy({
      encryption: { ...privacy.encryption, encryptionKey: key }
    });
  };

  const clearAllData = async () => {
    if (window.confirm(
      'This will permanently delete all local data including conversations, settings, and cached files. This action cannot be undone. Are you sure?'
    )) {
      if (window.confirm('Are you absolutely certain? All your data will be lost forever.')) {
        try {
          // Clear various storage types
          localStorage.clear();
          sessionStorage.clear();
          
          // Clear IndexedDB
          if ('indexedDB' in window) {
            const databases = await indexedDB.databases();
            await Promise.all(
              databases.map(db => {
                if (db.name) {
                  return new Promise((resolve, reject) => {
                    const deleteReq = indexedDB.deleteDatabase(db.name!);
                    deleteReq.onsuccess = () => resolve(undefined);
                    deleteReq.onerror = () => reject(deleteReq.error);
                  });
                }
              })
            );
          }
          
          alert('All local data has been cleared. The application will now reload.');
          window.location.reload();
        } catch (error) {
          console.error('Failed to clear all data:', error);
          alert('Failed to clear some data. Please try again or clear manually.');
        }
      }
    }
  };

  const estimateStorageUsage = () => {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      navigator.storage.estimate().then(estimate => {
        const used = estimate.usage || 0;
        const quota = estimate.quota || 0;
        const usedMB = (used / 1024 / 1024).toFixed(2);
        const quotaMB = (quota / 1024 / 1024).toFixed(2);
        console.log(`Storage used: ${usedMB} MB of ${quotaMB} MB`);
      });
    }
  };

  React.useEffect(() => {
    estimateStorageUsage();
  }, []);

  return (
    <div className="settings-section">
      <div className="section-header">
        <h3>Privacy & Security Settings</h3>
        <p>Control data collection, storage, and privacy preferences</p>
      </div>

      <div className="settings-form">
        <div className="form-group">
          <h4>Data Collection</h4>
          <p>Control what data is collected and how it's used</p>
          
          <FormField
            label="Analytics"
            type="switch"
            value={privacy.dataCollection.analytics}
            onChange={(value) => updatePrivacy({
              dataCollection: { ...privacy.dataCollection, analytics: value }
            })}
            description="Allow collection of anonymous usage analytics to improve the application"
          />

          <FormField
            label="Crash Reporting"
            type="switch"
            value={privacy.dataCollection.crashReporting}
            onChange={(value) => updatePrivacy({
              dataCollection: { ...privacy.dataCollection, crashReporting: value }
            })}
            description="Send crash reports to help diagnose and fix issues"
          />

          <FormField
            label="Usage Statistics"
            type="switch"
            value={privacy.dataCollection.usageStatistics}
            onChange={(value) => updatePrivacy({
              dataCollection: { ...privacy.dataCollection, usageStatistics: value }
            })}
            description="Collect statistics about feature usage and performance"
          />

          <FormField
            label="Performance Metrics"
            type="switch"
            value={privacy.dataCollection.performanceMetrics}
            onChange={(value) => updatePrivacy({
              dataCollection: { ...privacy.dataCollection, performanceMetrics: value }
            })}
            description="Monitor and report application performance metrics"
          />
        </div>

        <div className="form-group">
          <h4>Local Storage Management</h4>
          <p>Configure how data is stored locally on your device</p>
          
          <FormField
            label="Local Storage"
            type="switch"
            value={privacy.storage.localStorageEnabled}
            onChange={(value) => updatePrivacy({
              storage: { ...privacy.storage, localStorageEnabled: value }
            })}
            description="Allow storing preferences and settings in browser local storage"
          />

          <FormField
            label="Session Storage"
            type="switch"
            value={privacy.storage.sessionStorageEnabled}
            onChange={(value) => updatePrivacy({
              storage: { ...privacy.storage, sessionStorageEnabled: value }
            })}
            description="Allow temporary session data storage"
          />

          <FormField
            label="IndexedDB"
            type="switch"
            value={privacy.storage.indexedDBEnabled}
            onChange={(value) => updatePrivacy({
              storage: { ...privacy.storage, indexedDBEnabled: value }
            })}
            description="Allow storing large amounts of structured data locally"
          />

          <FormField
            label="Cookies"
            type="switch"
            value={privacy.storage.cookiesEnabled}
            onChange={(value) => updatePrivacy({
              storage: { ...privacy.storage, cookiesEnabled: value }
            })}
            description="Allow storing cookies for authentication and preferences"
          />

          <FormField
            label="Maximum Storage Size (MB)"
            type="slider"
            value={privacy.storage.maxStorageSize}
            onChange={(value) => updatePrivacy({
              storage: { ...privacy.storage, maxStorageSize: Number(value) }
            })}
            min={10}
            max={2000}
            step={10}
            description="Maximum amount of local storage to use"
          />

          <FormField
            label="Auto Cleanup"
            type="switch"
            value={privacy.storage.autoCleanup}
            onChange={(value) => updatePrivacy({
              storage: { ...privacy.storage, autoCleanup: value }
            })}
            description="Automatically clean up old data to free space"
          />

          <FormField
            label="Data Retention Period (Days)"
            type="number"
            value={privacy.storage.retentionPeriod}
            onChange={(value) => updatePrivacy({
              storage: { ...privacy.storage, retentionPeriod: Number(value) }
            })}
            min={1}
            max={365}
            description="How long to keep data before automatic cleanup"
          />

          <div className="storage-actions">
            <button className="action-button danger" onClick={clearAllData}>
              Clear All Local Data
            </button>
          </div>
        </div>

        <div className="form-group">
          <h4>Network & External Requests</h4>
          <p>Control network access and external communications</p>
          
          <FormField
            label="Allow External Requests"
            type="switch"
            value={privacy.network.allowExternalRequests}
            onChange={(value) => updatePrivacy({
              network: { ...privacy.network, allowExternalRequests: value }
            })}
            description="Allow the application to make requests to external services"
          />

          <FormField
            label="Allowed Domains"
            type="textarea"
            value={privacy.network.allowedDomains.join('\n')}
            onChange={(value) => updatePrivacy({
              network: { 
                ...privacy.network, 
                allowedDomains: value.split('\n').filter(d => d.trim())
              }
            })}
            placeholder="api.openai.com&#10;api.anthropic.com&#10;example.com"
            description="Domains that are explicitly allowed for network requests (one per line)"
          />

          <FormField
            label="Blocked Domains"
            type="textarea"
            value={privacy.network.blockedDomains.join('\n')}
            onChange={(value) => updatePrivacy({
              network: { 
                ...privacy.network, 
                blockedDomains: value.split('\n').filter(d => d.trim())
              }
            })}
            placeholder="tracker.com&#10;ads.example.com"
            description="Domains that should be blocked from network requests (one per line)"
          />

          <FormField
            label="Use Proxy"
            type="switch"
            value={privacy.network.proxySettings.enabled}
            onChange={(value) => updatePrivacy({
              network: { 
                ...privacy.network, 
                proxySettings: { ...privacy.network.proxySettings, enabled: value }
              }
            })}
            description="Route network requests through a proxy server"
          />

          {privacy.network.proxySettings.enabled && (
            <>
              <FormField
                label="Proxy Host"
                type="text"
                value={privacy.network.proxySettings.host}
                onChange={(value) => updatePrivacy({
                  network: { 
                    ...privacy.network, 
                    proxySettings: { ...privacy.network.proxySettings, host: value }
                  }
                })}
                placeholder="proxy.example.com"
                description="Proxy server hostname or IP address"
              />

              <FormField
                label="Proxy Port"
                type="number"
                value={privacy.network.proxySettings.port}
                onChange={(value) => updatePrivacy({
                  network: { 
                    ...privacy.network, 
                    proxySettings: { ...privacy.network.proxySettings, port: Number(value) }
                  }
                })}
                min={1}
                max={65535}
                placeholder="8080"
                description="Proxy server port number"
              />
            </>
          )}
        </div>

        <div className="form-group">
          <h4>Content Security</h4>
          <p>Control content filtering and security measures</p>
          
          <FormField
            label="Block Trackers"
            type="switch"
            value={privacy.content.blockTrackers}
            onChange={(value) => updatePrivacy({
              content: { ...privacy.content, blockTrackers: value }
            })}
            description="Block known tracking scripts and pixels"
          />

          <FormField
            label="Block Advertisements"
            type="switch"
            value={privacy.content.blockAds}
            onChange={(value) => updatePrivacy({
              content: { ...privacy.content, blockAds: value }
            })}
            description="Block advertisement content and scripts"
          />

          <FormField
            label="Block Scripts"
            type="switch"
            value={privacy.content.blockScripts}
            onChange={(value) => updatePrivacy({
              content: { ...privacy.content, blockScripts: value }
            })}
            description="Block execution of JavaScript from external sources"
          />

          <FormField
            label="Allowed Script Domains"
            type="textarea"
            value={privacy.content.allowedScriptDomains.join('\n')}
            onChange={(value) => updatePrivacy({
              content: { 
                ...privacy.content, 
                allowedScriptDomains: value.split('\n').filter(d => d.trim())
              }
            })}
            placeholder="cdn.jsdelivr.net&#10;cdnjs.cloudflare.com"
            description="Domains allowed to run scripts even when script blocking is enabled"
          />

          <FormField
            label="Sanitize Input"
            type="switch"
            value={privacy.content.sanitizeInput}
            onChange={(value) => updatePrivacy({
              content: { ...privacy.content, sanitizeInput: value }
            })}
            description="Sanitize user input to prevent XSS attacks"
          />

          <FormField
            label="Log Sensitive Data"
            type="switch"
            value={privacy.content.logSensitiveData}
            onChange={(value) => updatePrivacy({
              content: { ...privacy.content, logSensitiveData: value }
            })}
            description="Allow logging of potentially sensitive information for debugging"
          />
        </div>

        <div className="form-group">
          <h4>Encryption Settings</h4>
          <p>Configure local data encryption for maximum security</p>
          
          <FormField
            label="Encrypt Settings"
            type="switch"
            value={privacy.encryption.encryptSettings}
            onChange={(value) => updatePrivacy({
              encryption: { ...privacy.encryption, encryptSettings: value }
            })}
            description="Encrypt settings and preferences files"
          />

          <FormField
            label="Encrypt Conversations"
            type="switch"
            value={privacy.encryption.encryptConversations}
            onChange={(value) => updatePrivacy({
              encryption: { ...privacy.encryption, encryptConversations: value }
            })}
            description="Encrypt conversation history and chat data"
          />

          <FormField
            label="Encrypt Files"
            type="switch"
            value={privacy.encryption.encryptFiles}
            onChange={(value) => updatePrivacy({
              encryption: { ...privacy.encryption, encryptFiles: value }
            })}
            description="Encrypt uploaded and downloaded files"
          />

          <FormField
            label="Encryption Algorithm"
            type="select"
            value={privacy.encryption.algorithm}
            onChange={(value) => updatePrivacy({
              encryption: { ...privacy.encryption, algorithm: value as any }
            })}
            options={encryptionAlgorithms}
            description="Encryption algorithm to use for data protection"
          />

          <div className="encryption-key-section">
            <div className="field-header">
              <label className="field-label">Encryption Key</label>
              <button
                type="button"
                className="toggle-visibility-button"
                onClick={() => setShowEncryptionKey(!showEncryptionKey)}
              >
                {showEncryptionKey ? '🙈 Hide' : '👁️ Show'}
              </button>
            </div>
            <div className="encryption-key-input">
              <input
                type={showEncryptionKey ? 'text' : 'password'}
                value={privacy.encryption.encryptionKey || ''}
                onChange={(e) => updatePrivacy({
                  encryption: { ...privacy.encryption, encryptionKey: e.target.value }
                })}
                placeholder="Enter encryption key or generate one"
                className="form-input"
              />
              <button
                type="button"
                className="generate-key-button"
                onClick={generateEncryptionKey}
              >
                Generate Key
              </button>
            </div>
            <div className="field-description">
              Encryption key for protecting local data. Keep this safe - losing it means losing access to encrypted data.
            </div>
          </div>

          <div className="encryption-warning">
            <h5>⚠️ Important Encryption Notes</h5>
            <ul>
              <li>Encryption keys are stored locally and never transmitted</li>
              <li>If you lose your encryption key, encrypted data cannot be recovered</li>
              <li>Backup your encryption key securely if you enable encryption</li>
              <li>Changing encryption settings requires application restart</li>
            </ul>
          </div>
        </div>

        <div className="settings-info">
          <h4>Privacy Status</h4>
          <div className="privacy-status-grid">
            <div className="status-item">
              <label>Data Collection:</label>
              <span className={privacy.dataCollection.analytics ? 'enabled' : 'disabled'}>
                {privacy.dataCollection.analytics ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <div className="status-item">
              <label>Encryption:</label>
              <span className={privacy.encryption.encryptSettings ? 'enabled' : 'disabled'}>
                {privacy.encryption.encryptSettings ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <div className="status-item">
              <label>External Requests:</label>
              <span className={privacy.network.allowExternalRequests ? 'allowed' : 'blocked'}>
                {privacy.network.allowExternalRequests ? 'Allowed' : 'Blocked'}
              </span>
            </div>
            <div className="status-item">
              <label>Content Blocking:</label>
              <span className={privacy.content.blockTrackers ? 'active' : 'inactive'}>
                {privacy.content.blockTrackers ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacySettingsPanel;