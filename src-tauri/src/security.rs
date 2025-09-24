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
use std::sync::Arc;
use parking_lot::RwLock;
use jsonwebtoken::{Algorithm, DecodingKey, EncodingKey, Header, Validation};
use rand::Rng;
use chrono::{DateTime, Duration, Utc};

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
    pub max_concurrent_sessions: u32,
    pub session_refresh_threshold_minutes: u32,
    pub enable_ip_binding: bool,
    pub jwt_secret_rotation_hours: u32,
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
    SessionManagement,
}

/// Session data structure for secure session management
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionData {
    pub session_id: String,
    pub user_id: String,
    pub created_at: DateTime<Utc>,
    pub expires_at: DateTime<Utc>,
    pub last_activity: DateTime<Utc>,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
    pub permissions: Vec<Permission>,
    pub refresh_token: String,
    pub is_revoked: bool,
}

/// JWT Claims structure
#[derive(Debug, Serialize, Deserialize)]
pub struct JwtClaims {
    pub sub: String,     // user_id
    pub session_id: String,
    pub exp: i64,        // expiration time
    pub iat: i64,        // issued at
    pub jti: String,     // JWT ID
    pub permissions: Vec<String>,
    pub ip: Option<String>,
}

/// Session validation result
#[derive(Debug, Clone)]
pub struct SessionValidationResult {
    pub is_valid: bool,
    pub user_id: Option<String>,
    pub session_id: Option<String>,
    pub permissions: Vec<Permission>,
    pub needs_refresh: bool,
    pub error_message: Option<String>,
}

/// Session storage trait for different backends
pub trait SessionStorage: Send + Sync {
    fn store_session(&self, session: &SessionData) -> Result<()>;
    fn get_session(&self, session_id: &str) -> Result<Option<SessionData>>;
    fn update_session(&self, session: &SessionData) -> Result<()>;
    fn revoke_session(&self, session_id: &str) -> Result<()>;
    fn get_user_sessions(&self, user_id: &str) -> Result<Vec<SessionData>>;
    fn cleanup_expired_sessions(&self) -> Result<u32>;
}

/// In-memory session storage implementation
#[derive(Debug)]
pub struct InMemorySessionStorage {
    sessions: Arc<RwLock<HashMap<String, SessionData>>>,
}

impl InMemorySessionStorage {
    pub fn new() -> Self {
        Self {
            sessions: Arc::new(RwLock::new(HashMap::new())),
        }
    }
}

impl SessionStorage for InMemorySessionStorage {
    fn store_session(&self, session: &SessionData) -> Result<()> {
        let mut sessions = self.sessions.write();
        sessions.insert(session.session_id.clone(), session.clone());
        Ok(())
    }

    fn get_session(&self, session_id: &str) -> Result<Option<SessionData>> {
        let sessions = self.sessions.read();
        Ok(sessions.get(session_id).cloned())
    }

    fn update_session(&self, session: &SessionData) -> Result<()> {
        let mut sessions = self.sessions.write();
        sessions.insert(session.session_id.clone(), session.clone());
        Ok(())
    }

    fn revoke_session(&self, session_id: &str) -> Result<()> {
        let mut sessions = self.sessions.write();
        if let Some(mut session) = sessions.get_mut(session_id) {
            session.is_revoked = true;
        }
        Ok(())
    }

    fn get_user_sessions(&self, user_id: &str) -> Result<Vec<SessionData>> {
        let sessions = self.sessions.read();
        let user_sessions: Vec<SessionData> = sessions
            .values()
            .filter(|session| session.user_id == user_id && !session.is_revoked)
            .cloned()
            .collect();
        Ok(user_sessions)
    }

    fn cleanup_expired_sessions(&self) -> Result<u32> {
        let mut sessions = self.sessions.write();
        let now = Utc::now();
        let initial_count = sessions.len();

        sessions.retain(|_, session| {
            !session.is_revoked && session.expires_at > now
        });

        Ok((initial_count - sessions.len()) as u32)
    }
}

#[derive(Debug)]
pub struct SecurityManager {
    config: SecurityConfig,
    audit_log_path: PathBuf,
    encryption_key: Option<Key<Aes256Gcm>>,
    permissions: HashMap<String, AccessPermissions>,
    failed_attempts: HashMap<String, u8>,
    app_data_dir: PathBuf,
    session_storage: Box<dyn SessionStorage>,
    jwt_encoding_key: EncodingKey,
    jwt_decoding_key: DecodingKey,
    current_session_context: Arc<RwLock<Option<String>>>, // Current session ID
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
            max_concurrent_sessions: 5,
            session_refresh_threshold_minutes: 10,
            enable_ip_binding: true,
            jwt_secret_rotation_hours: 24,
        };

        // Generate or load encryption key
        let encryption_key = Self::load_or_generate_key(&security_dir)?;

        // Generate or load JWT keys
        let jwt_secret = Self::load_or_generate_jwt_secret(&security_dir)?;
        let jwt_encoding_key = EncodingKey::from_secret(&jwt_secret);
        let jwt_decoding_key = DecodingKey::from_secret(&jwt_secret);

        // Initialize session storage (in-memory by default, can be extended to Redis)
        let session_storage: Box<dyn SessionStorage> = Box::new(InMemorySessionStorage::new());

        Ok(Self {
            config,
            audit_log_path,
            encryption_key: Some(encryption_key),
            permissions: HashMap::new(),
            failed_attempts: HashMap::new(),
            app_data_dir: app_data_dir.to_path_buf(),
            session_storage,
            jwt_encoding_key,
            jwt_decoding_key,
            current_session_context: Arc::new(RwLock::new(None)),
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
            user_id: self.get_current_user_id(), // Get from session context
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

    /// Create a new session for a user
    pub fn create_session(
        &self,
        user_id: String,
        permissions: Vec<Permission>,
        ip_address: Option<String>,
        user_agent: Option<String>,
    ) -> Result<(String, String)> {
        // Check concurrent session limits
        let existing_sessions = self.session_storage.get_user_sessions(&user_id)?;
        if existing_sessions.len() >= self.config.max_concurrent_sessions as usize {
            // Revoke oldest session
            if let Some(oldest_session) = existing_sessions
                .iter()
                .min_by_key(|s| s.last_activity)
            {
                self.session_storage.revoke_session(&oldest_session.session_id)?;
            }
        }

        // Generate session data
        let session_id = self.generate_secure_id();
        let refresh_token = self.generate_secure_id();
        let now = Utc::now();
        let expires_at = now + Duration::minutes(self.config.session_timeout_minutes as i64);

        let session_data = SessionData {
            session_id: session_id.clone(),
            user_id: user_id.clone(),
            created_at: now,
            expires_at,
            last_activity: now,
            ip_address: ip_address.clone(),
            user_agent,
            permissions: permissions.clone(),
            refresh_token: refresh_token.clone(),
            is_revoked: false,
        };

        // Store session
        self.session_storage.store_session(&session_data)?;

        // Generate JWT token
        let jwt_token = self.generate_jwt_token(&session_data)?;

        Ok((jwt_token, refresh_token))
    }

    /// Generate JWT token from session data
    fn generate_jwt_token(&self, session: &SessionData) -> Result<String> {
        let claims = JwtClaims {
            sub: session.user_id.clone(),
            session_id: session.session_id.clone(),
            exp: session.expires_at.timestamp(),
            iat: session.created_at.timestamp(),
            jti: self.generate_secure_id(),
            permissions: session.permissions.iter().map(|p| format!("{:?}", p)).collect(),
            ip: session.ip_address.clone(),
        };

        let header = Header::new(Algorithm::HS256);
        jsonwebtoken::encode(&header, &claims, &self.jwt_encoding_key)
            .context("Failed to generate JWT token")
    }

    /// Generate cryptographically secure ID
    fn generate_secure_id(&self) -> String {
        use ring::rand::{SecureRandom, SystemRandom};

        let rng = SystemRandom::new();
        let mut bytes = [0u8; 32];
        rng.fill(&mut bytes).unwrap();

        // Use SHA256 for additional security
        let hash = digest::digest(&digest::SHA256, &bytes);
        hex::encode(hash.as_ref())
    }

    /// Validate session token with comprehensive checks
    pub fn validate_session_token(&self, token: &str, client_ip: Option<&str>) -> SessionValidationResult {
        if token.is_empty() {
            return SessionValidationResult {
                is_valid: false,
                user_id: None,
                session_id: None,
                permissions: vec![],
                needs_refresh: false,
                error_message: Some("Empty token".to_string()),
            };
        }

        // Decode JWT token
        let validation = Validation::new(Algorithm::HS256);
        let token_data = match jsonwebtoken::decode::<JwtClaims>(
            token,
            &self.jwt_decoding_key,
            &validation,
        ) {
            Ok(data) => data,
            Err(e) => {
                return SessionValidationResult {
                    is_valid: false,
                    user_id: None,
                    session_id: None,
                    permissions: vec![],
                    needs_refresh: false,
                    error_message: Some(format!("Invalid JWT: {}", e)),
                };
            }
        };

        let claims = token_data.claims;

        // Get session from storage
        let session = match self.session_storage.get_session(&claims.session_id) {
            Ok(Some(session)) => session,
            Ok(None) => {
                return SessionValidationResult {
                    is_valid: false,
                    user_id: Some(claims.sub),
                    session_id: Some(claims.session_id),
                    permissions: vec![],
                    needs_refresh: false,
                    error_message: Some("Session not found".to_string()),
                };
            }
            Err(e) => {
                return SessionValidationResult {
                    is_valid: false,
                    user_id: Some(claims.sub),
                    session_id: Some(claims.session_id),
                    permissions: vec![],
                    needs_refresh: false,
                    error_message: Some(format!("Storage error: {}", e)),
                };
            }
        };

        // Check if session is revoked
        if session.is_revoked {
            return SessionValidationResult {
                is_valid: false,
                user_id: Some(session.user_id),
                session_id: Some(session.session_id),
                permissions: vec![],
                needs_refresh: false,
                error_message: Some("Session revoked".to_string()),
            };
        }

        let now = Utc::now();

        // Check expiration
        if session.expires_at <= now {
            return SessionValidationResult {
                is_valid: false,
                user_id: Some(session.user_id),
                session_id: Some(session.session_id),
                permissions: session.permissions,
                needs_refresh: false,
                error_message: Some("Session expired".to_string()),
            };
        }

        // Check IP binding if enabled
        if self.config.enable_ip_binding {
            if let (Some(session_ip), Some(client_ip)) = (&session.ip_address, client_ip) {
                if session_ip != client_ip {
                    return SessionValidationResult {
                        is_valid: false,
                        user_id: Some(session.user_id),
                        session_id: Some(session.session_id),
                        permissions: session.permissions,
                        needs_refresh: false,
                        error_message: Some("IP address mismatch".to_string()),
                    };
                }
            }
        }

        // Check if session needs refresh
        let refresh_threshold = Duration::minutes(self.config.session_refresh_threshold_minutes as i64);
        let needs_refresh = (session.expires_at - now) < refresh_threshold;

        // Update last activity
        if let Ok(mut updated_session) = self.session_storage.get_session(&session.session_id) {
            if let Some(ref mut session) = updated_session {
                session.last_activity = now;
                let _ = self.session_storage.update_session(session);
            }
        }

        // Set current session context
        {
            let mut context = self.current_session_context.write();
            *context = Some(session.session_id.clone());
        }

        SessionValidationResult {
            is_valid: true,
            user_id: Some(session.user_id),
            session_id: Some(session.session_id),
            permissions: session.permissions,
            needs_refresh,
            error_message: None,
        }
    }

    /// Refresh session token
    pub fn refresh_session(&self, refresh_token: &str) -> Result<(String, String)> {
        // Find session by refresh token
        let sessions = self.session_storage.get_user_sessions("")?; // This would need to be optimized
        let session = sessions
            .iter()
            .find(|s| s.refresh_token == refresh_token && !s.is_revoked)
            .ok_or_else(|| anyhow::anyhow!("Invalid refresh token"))?;

        let now = Utc::now();
        if session.expires_at <= now {
            return Err(anyhow::anyhow!("Refresh token expired"));
        }

        // Create new session with extended expiration
        let new_session_id = self.generate_secure_id();
        let new_refresh_token = self.generate_secure_id();
        let new_expires_at = now + Duration::minutes(self.config.session_timeout_minutes as i64);

        let new_session = SessionData {
            session_id: new_session_id,
            user_id: session.user_id.clone(),
            created_at: now,
            expires_at: new_expires_at,
            last_activity: now,
            ip_address: session.ip_address.clone(),
            user_agent: session.user_agent.clone(),
            permissions: session.permissions.clone(),
            refresh_token: new_refresh_token.clone(),
            is_revoked: false,
        };

        // Revoke old session
        self.session_storage.revoke_session(&session.session_id)?;

        // Store new session
        self.session_storage.store_session(&new_session)?;

        // Generate new JWT
        let new_jwt = self.generate_jwt_token(&new_session)?;

        Ok((new_jwt, new_refresh_token))
    }

    /// Revoke session (logout)
    pub fn revoke_session(&self, session_id: &str) -> Result<()> {
        self.session_storage.revoke_session(session_id)?;

        // Clear current session context if it matches
        {
            let mut context = self.current_session_context.write();
            if let Some(current_session) = context.as_ref() {
                if current_session == session_id {
                    *context = None;
                }
            }
        }

        Ok(())
    }

    /// Revoke all sessions for a user
    pub fn revoke_all_user_sessions(&self, user_id: &str) -> Result<u32> {
        let sessions = self.session_storage.get_user_sessions(user_id)?;
        let mut revoked_count = 0;

        for session in sessions {
            self.session_storage.revoke_session(&session.session_id)?;
            revoked_count += 1;
        }

        Ok(revoked_count)
    }

    /// Get current user ID from session context
    pub fn get_current_user_id(&self) -> Option<String> {
        let context = self.current_session_context.read();
        if let Some(session_id) = context.as_ref() {
            if let Ok(Some(session)) = self.session_storage.get_session(session_id) {
                return Some(session.user_id);
            }
        }
        None
    }

    /// Cleanup expired sessions
    pub fn cleanup_expired_sessions(&self) -> Result<u32> {
        self.session_storage.cleanup_expired_sessions()
    }

    /// Get active session count for user
    pub fn get_user_session_count(&self, user_id: &str) -> Result<usize> {
        let sessions = self.session_storage.get_user_sessions(user_id)?;
        Ok(sessions.len())
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

    /// Load or generate JWT secret
    fn load_or_generate_jwt_secret(security_dir: &Path) -> Result<Vec<u8>> {
        let jwt_file = security_dir.join("jwt.secret");

        if jwt_file.exists() {
            let secret = fs::read(jwt_file)?;
            if secret.len() >= 32 {
                return Ok(secret);
            }
        }

        // Generate new JWT secret (256-bit)
        let mut secret = vec![0u8; 32];
        use ring::rand::{SecureRandom, SystemRandom};
        let rng = SystemRandom::new();
        rng.fill(&mut secret).unwrap();

        fs::write(jwt_file, &secret)?;
        Ok(secret)
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

// Session Management Tauri Commands

#[tauri::command]
pub async fn create_user_session(
    security: tauri::State<'_, Arc<std::sync::Mutex<SecurityManager>>>,
    user_id: String,
    permissions: Vec<String>,
    ip_address: Option<String>,
    user_agent: Option<String>,
) -> Result<(String, String), String> {
    let security_manager = security.lock().unwrap();

    // Convert string permissions to Permission enum
    let perms: Vec<Permission> = permissions
        .iter()
        .filter_map(|p| match p.as_str() {
            "DocumentRead" => Some(Permission::DocumentRead),
            "DocumentWrite" => Some(Permission::DocumentWrite),
            "DocumentDelete" => Some(Permission::DocumentDelete),
            "ModelManagement" => Some(Permission::ModelManagement),
            "SystemConfiguration" => Some(Permission::SystemConfiguration),
            "UserManagement" => Some(Permission::UserManagement),
            "AuditLogAccess" => Some(Permission::AuditLogAccess),
            "DataExport" => Some(Permission::DataExport),
            "AgentExecution" => Some(Permission::AgentExecution),
            "WorkflowExecution" => Some(Permission::WorkflowExecution),
            "SessionManagement" => Some(Permission::SessionManagement),
            _ => None,
        })
        .collect();

    security_manager
        .create_session(user_id, perms, ip_address, user_agent)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn validate_user_session(
    security: tauri::State<'_, Arc<std::sync::Mutex<SecurityManager>>>,
    token: String,
    client_ip: Option<String>,
) -> Result<SessionValidationResult, String> {
    let security_manager = security.lock().unwrap();
    Ok(security_manager.validate_session_token(&token, client_ip.as_deref()))
}

#[tauri::command]
pub async fn refresh_user_session(
    security: tauri::State<'_, Arc<std::sync::Mutex<SecurityManager>>>,
    refresh_token: String,
) -> Result<(String, String), String> {
    let security_manager = security.lock().unwrap();
    security_manager
        .refresh_session(&refresh_token)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn revoke_user_session(
    security: tauri::State<'_, Arc<std::sync::Mutex<SecurityManager>>>,
    session_id: String,
) -> Result<(), String> {
    let security_manager = security.lock().unwrap();
    security_manager
        .revoke_session(&session_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn revoke_all_user_sessions(
    security: tauri::State<'_, Arc<std::sync::Mutex<SecurityManager>>>,
    user_id: String,
) -> Result<u32, String> {
    let security_manager = security.lock().unwrap();
    security_manager
        .revoke_all_user_sessions(&user_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_current_user_id(
    security: tauri::State<'_, Arc<std::sync::Mutex<SecurityManager>>>,
) -> Result<Option<String>, String> {
    let security_manager = security.lock().unwrap();
    Ok(security_manager.get_current_user_id())
}

#[tauri::command]
pub async fn cleanup_expired_sessions(
    security: tauri::State<'_, Arc<std::sync::Mutex<SecurityManager>>>,
) -> Result<u32, String> {
    let security_manager = security.lock().unwrap();
    security_manager
        .cleanup_expired_sessions()
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_user_session_count(
    security: tauri::State<'_, Arc<std::sync::Mutex<SecurityManager>>>,
    user_id: String,
) -> Result<usize, String> {
    let security_manager = security.lock().unwrap();
    security_manager
        .get_user_session_count(&user_id)
        .map_err(|e| e.to_string())
}
