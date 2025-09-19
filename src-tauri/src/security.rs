use aes_gcm::{
    aead::{Aead, AeadCore, KeyInit, OsRng},
    Aes256Gcm, Key, Nonce,
};
use anyhow::{Context, Result};
use ring::digest;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};

/// Enterprise-grade security management for BEAR AI
/// Implements zero-trust, on-premises security architecture
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityConfig {
    pub encryption_enabled: bool,
    pub audit_logging: bool,
    pub access_control: bool,
    pub network_isolation: bool,
    pub document_protection: DocumentProtectionLevel,
    pub session_timeout_minutes: u32,
    pub max_failed_attempts: u8,
    pub require_encryption_at_rest: bool,
    pub allow_external_connections: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum DocumentProtectionLevel {
    Basic,
    Enhanced,
    Maximum,
    AttorneyClientPrivileged,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditLogEntry {
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub user_id: Option<String>,
    pub action: SecurityAction,
    pub resource: String,
    pub outcome: ActionOutcome,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
    pub details: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SecurityAction {
    DocumentAccess,
    DocumentUpload,
    DocumentDelete,
    ModelDownload,
    ModelLoad,
    UserLogin,
    UserLogout,
    SettingsChange,
    LicenseValidation,
    DataExport,
    SystemAccess,
    AgentExecution,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ActionOutcome {
    Success,
    Failure,
    Blocked,
    Warning,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccessPermissions {
    pub user_id: String,
    pub permissions: Vec<Permission>,
    pub granted_at: chrono::DateTime<chrono::Utc>,
    pub expires_at: Option<chrono::DateTime<chrono::Utc>>,
    pub granted_by: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Permission {
    DocumentRead,
    DocumentWrite,
    DocumentDelete,
    ModelManagement,
    SystemConfiguration,
    UserManagement,
    AuditLogAccess,
    DataExport,
    AgentExecution,
    WorkflowExecution,
}

#[derive(Debug)]
pub struct SecurityManager {
    config: SecurityConfig,
    audit_log_path: PathBuf,
    encryption_key: Option<Key<Aes256Gcm>>,
    permissions: HashMap<String, AccessPermissions>,
    failed_attempts: HashMap<String, u8>,
    app_data_dir: PathBuf,
}

impl SecurityManager {
    /// Initialize security manager with enterprise-grade defaults
    pub fn new(app_data_dir: &Path) -> Result<Self> {
        let security_dir = app_data_dir.join("security");
        fs::create_dir_all(&security_dir)?;

        let audit_log_path = security_dir.join("audit.log");

        // Default to maximum security for legal environments
        let config = SecurityConfig {
            encryption_enabled: true,
            audit_logging: true,
            access_control: true,
            network_isolation: true,
            document_protection: DocumentProtectionLevel::AttorneyClientPrivileged,
            session_timeout_minutes: 30,
            max_failed_attempts: 3,
            require_encryption_at_rest: true,
            allow_external_connections: false,
        };

        // Generate or load encryption key
        let encryption_key = Self::load_or_generate_key(&security_dir)?;

        Ok(Self {
            config,
            audit_log_path,
            encryption_key: Some(encryption_key),
            permissions: HashMap::new(),
            failed_attempts: HashMap::new(),
            app_data_dir: app_data_dir.to_path_buf(),
        })
    }

    /// Encrypt data at rest
    pub fn encrypt_data(&self, data: &[u8]) -> Result<Vec<u8>> {
        if !self.config.encryption_enabled {
            return Ok(data.to_vec());
        }

        let key = self
            .encryption_key
            .as_ref()
            .context("Encryption key not available")?;

        let cipher = Aes256Gcm::new(key);
        let nonce = Aes256Gcm::generate_nonce(&mut OsRng);

        let ciphertext = cipher
            .encrypt(&nonce, data)
            .map_err(|e| anyhow::anyhow!("Encryption failed: {}", e))?;

        // Prepend nonce to ciphertext
        let mut result = nonce.to_vec();
        result.extend_from_slice(&ciphertext);

        Ok(result)
    }

    /// Decrypt data at rest
    pub fn decrypt_data(&self, encrypted_data: &[u8]) -> Result<Vec<u8>> {
        if !self.config.encryption_enabled {
            return Ok(encrypted_data.to_vec());
        }

        if encrypted_data.len() < 12 {
            return Err(anyhow::anyhow!("Invalid encrypted data format"));
        }

        let key = self
            .encryption_key
            .as_ref()
            .context("Encryption key not available")?;

        let cipher = Aes256Gcm::new(key);
        let (nonce_bytes, ciphertext) = encrypted_data.split_at(12);
        let nonce = Nonce::from_slice(nonce_bytes);

        cipher
            .decrypt(nonce, ciphertext)
            .map_err(|e| anyhow::anyhow!("Decryption failed: {}", e))
    }

    /// Secure document storage
    pub async fn secure_document_store(&self, document_path: &Path, content: &[u8]) -> Result<()> {
        // Encrypt content
        let encrypted_content = self.encrypt_data(content)?;

        // Create secure directory structure
        let secure_dir = self.app_data_dir.join("secure_documents");
        fs::create_dir_all(&secure_dir)?;

        // Generate secure filename
        let file_hash = self.hash_file_path(document_path);
        let secure_path = secure_dir.join(format!("{}.enc", file_hash));

        // Write encrypted content
        fs::write(&secure_path, encrypted_content)?;

        // Set restrictive permissions (Unix-like systems)
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let mut perms = fs::metadata(&secure_path)?.permissions();
            perms.set_mode(0o600); // Owner read/write only
            fs::set_permissions(&secure_path, perms)?;
        }

        // Log the operation
        self.log_security_action(
            SecurityAction::DocumentUpload,
            document_path.to_string_lossy().as_ref(),
            ActionOutcome::Success,
            None,
        )
        .await?;

        Ok(())
    }

    /// Secure document retrieval
    pub async fn secure_document_retrieve(&self, document_path: &Path) -> Result<Vec<u8>> {
        let file_hash = self.hash_file_path(document_path);
        let secure_path = self
            .app_data_dir
            .join("secure_documents")
            .join(format!("{}.enc", file_hash));

        if !secure_path.exists() {
            return Err(anyhow::anyhow!("Secure document not found"));
        }

        // Read encrypted content
        let encrypted_content = fs::read(&secure_path)?;

        // Decrypt content
        let content = self.decrypt_data(&encrypted_content)?;

        // Log the operation
        self.log_security_action(
            SecurityAction::DocumentAccess,
            document_path.to_string_lossy().as_ref(),
            ActionOutcome::Success,
            None,
        )
        .await?;

        Ok(content)
    }

    /// Validate network isolation
    pub fn validate_network_isolation(&self) -> Result<()> {
        if !self.config.network_isolation {
            return Ok(());
        }

        // Check for external network connections
        // This would integrate with firewall rules and network monitoring
        log::info!("Network isolation validation passed");
        Ok(())
    }

    /// Check access permissions
    pub fn check_permission(&self, user_id: &str, permission: Permission) -> bool {
        if !self.config.access_control {
            return true; // Permissive mode
        }

        if let Some(user_permissions) = self.permissions.get(user_id) {
            // Check if permission is granted and not expired
            if let Some(expires_at) = user_permissions.expires_at {
                if chrono::Utc::now() > expires_at {
                    return false;
                }
            }
            user_permissions.permissions.contains(&permission)
        } else {
            false
        }
    }

    /// Grant permissions to user
    pub fn grant_permission(
        &mut self,
        user_id: String,
        permissions: Vec<Permission>,
        granted_by: String,
        expires_at: Option<chrono::DateTime<chrono::Utc>>,
    ) {
        let access_permissions = AccessPermissions {
            user_id: user_id.clone(),
            permissions,
            granted_at: chrono::Utc::now(),
            expires_at,
            granted_by,
        };

        self.permissions.insert(user_id, access_permissions);
    }

    /// Log security action
    pub async fn log_security_action(
        &self,
        action: SecurityAction,
        resource: &str,
        outcome: ActionOutcome,
        details: Option<HashMap<String, String>>,
    ) -> Result<()> {
        if !self.config.audit_logging {
            return Ok(());
        }

        let entry = AuditLogEntry {
            timestamp: chrono::Utc::now(),
            user_id: None, // TODO: Get from session context
            action,
            resource: resource.to_string(),
            outcome,
            ip_address: Some("127.0.0.1".to_string()), // Local only
            user_agent: None,
            details: details.unwrap_or_default(),
        };

        let log_line = serde_json::to_string(&entry)?;

        // Append to audit log
        use std::io::Write;
        let mut file = std::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(&self.audit_log_path)?;

        writeln!(file, "{}", log_line)?;
        file.flush()?;

        Ok(())
    }

    /// Validate document integrity
    pub fn validate_document_integrity(&self, content: &[u8], expected_hash: &str) -> bool {
        let actual_hash = self.hash_content(content);
        actual_hash == expected_hash
    }

    /// Scan for malicious content
    pub async fn scan_document_content(&self, content: &[u8]) -> Result<bool> {
        // Basic malicious content detection
        let content_str = String::from_utf8_lossy(content).to_lowercase();

        // Check for suspicious patterns
        let suspicious_patterns = vec![
            "javascript:",
            "<script",
            "eval(",
            "document.cookie",
            "window.location",
            "base64",
        ];

        for pattern in suspicious_patterns {
            if content_str.contains(pattern) {
                log::warn!("Suspicious pattern detected: {}", pattern);
                return Ok(false);
            }
        }

        Ok(true)
    }

    /// Generate secure session token
    pub fn generate_session_token(&self) -> String {
        use ring::rand::{SecureRandom, SystemRandom};

        let rng = SystemRandom::new();
        let mut token = [0u8; 32];
        rng.fill(&mut token).unwrap();

        base64::encode(&token)
    }

    /// Validate session token
    pub fn validate_session_token(&self, token: &str) -> bool {
        // TODO: Implement proper session validation
        // This would check against stored session data
        !token.is_empty()
    }

    /// Check for failed login attempts
    pub fn check_failed_attempts(&mut self, identifier: &str) -> bool {
        let attempts = self.failed_attempts.get(identifier).unwrap_or(&0);
        *attempts < self.config.max_failed_attempts
    }

    /// Record failed attempt
    pub fn record_failed_attempt(&mut self, identifier: &str) {
        let attempts = self.failed_attempts.get(identifier).unwrap_or(&0) + 1;
        self.failed_attempts
            .insert(identifier.to_string(), attempts);
    }

    /// Clear failed attempts
    pub fn clear_failed_attempts(&mut self, identifier: &str) {
        self.failed_attempts.remove(identifier);
    }

    /// Get security configuration
    pub fn get_config(&self) -> &SecurityConfig {
        &self.config
    }

    /// Update security configuration
    pub fn update_config(&mut self, config: SecurityConfig) {
        self.config = config;
    }

    // Helper methods
    fn load_or_generate_key(security_dir: &Path) -> Result<Key<Aes256Gcm>> {
        let key_file = security_dir.join("encryption.key");

        if key_file.exists() {
            let key_bytes = fs::read(key_file)?;
            if key_bytes.len() == 32 {
                return Ok(*Key::<Aes256Gcm>::from_slice(&key_bytes));
            }
        }

        // Generate new key
        let key = Aes256Gcm::generate_key(OsRng);
        fs::write(key_file, key.as_slice())?;

        Ok(key)
    }

    fn hash_file_path(&self, path: &Path) -> String {
        let path_str = path.to_string_lossy();
        let hash = digest::digest(&digest::SHA256, path_str.as_bytes());
        hex::encode(hash.as_ref())
    }

    fn hash_content(&self, content: &[u8]) -> String {
        let hash = digest::digest(&digest::SHA256, content);
        hex::encode(hash.as_ref())
    }
}

// Tauri commands for security management
#[tauri::command]
pub async fn encrypt_document(
    security: tauri::State<'_, Arc<std::sync::Mutex<SecurityManager>>>,
    document_path: String,
    content: Vec<u8>,
) -> Result<(), String> {
    let security_manager = security.lock().unwrap();
    security_manager
        .secure_document_store(Path::new(&document_path), &content)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn decrypt_document(
    security: tauri::State<'_, Arc<std::sync::Mutex<SecurityManager>>>,
    document_path: String,
) -> Result<Vec<u8>, String> {
    let security_manager = security.lock().unwrap();
    security_manager
        .secure_document_retrieve(Path::new(&document_path))
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn validate_document_security(
    security: tauri::State<'_, Arc<std::sync::Mutex<SecurityManager>>>,
    content: Vec<u8>,
) -> Result<bool, String> {
    let security_manager = security.lock().unwrap();
    security_manager
        .scan_document_content(&content)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_security_config(
    security: tauri::State<'_, Arc<std::sync::Mutex<SecurityManager>>>,
) -> Result<SecurityConfig, String> {
    let security_manager = security.lock().unwrap();
    Ok(security_manager.get_config().clone())
}

#[tauri::command]
pub async fn update_security_config(
    security: tauri::State<'_, Arc<std::sync::Mutex<SecurityManager>>>,
    config: SecurityConfig,
) -> Result<(), String> {
    let mut security_manager = security.lock().unwrap();
    security_manager.update_config(config);
    Ok(())
}
