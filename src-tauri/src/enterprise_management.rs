use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Manager, State};
use chrono::{DateTime, Utc};
use log::{error, info, warn, debug};
use uuid::Uuid;

// Enterprise account management structures
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnterpriseAccount {
    pub id: String,
    pub name: String,
    pub domain: String,
    pub subscription_id: String,
    pub admin_user_id: String,
    pub max_users: i32,
    pub current_users: i32,
    pub billing_email: String,
    pub features: EnterpriseFeatures,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnterpriseFeatures {
    pub single_sign_on: bool,
    pub custom_branding: bool,
    pub dedicated_support: bool,
    pub audit_logs: bool,
    pub data_retention_days: i32,
    pub api_rate_limit: i32,
    pub advanced_analytics: bool,
    pub custom_integrations: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnterpriseUser {
    pub id: String,
    pub account_id: String,
    pub email: String,
    pub name: Option<String>,
    pub role: UserRole,
    pub permissions: Vec<String>,
    pub is_active: bool,
    pub last_login: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub invited_at: Option<DateTime<Utc>>,
    pub invitation_status: InvitationStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum UserRole {
    #[serde(rename = "admin")]
    Admin,
    #[serde(rename = "manager")]
    Manager,
    #[serde(rename = "user")]
    User,
    #[serde(rename = "viewer")]
    Viewer,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum InvitationStatus {
    #[serde(rename = "pending")]
    Pending,
    #[serde(rename = "accepted")]
    Accepted,
    #[serde(rename = "declined")]
    Declined,
    #[serde(rename = "expired")]
    Expired,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnterpriseInvitation {
    pub id: String,
    pub account_id: String,
    pub email: String,
    pub role: UserRole,
    pub invited_by: String,
    pub invitation_token: String,
    pub expires_at: DateTime<Utc>,
    pub status: InvitationStatus,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditLogEntry {
    pub id: String,
    pub account_id: String,
    pub user_id: String,
    pub action: String,
    pub resource_type: String,
    pub resource_id: Option<String>,
    pub details: HashMap<String, String>,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
    pub timestamp: DateTime<Utc>,
}

// Request/Response types
#[derive(Debug, Serialize, Deserialize)]
pub struct CreateEnterpriseAccountRequest {
    pub name: String,
    pub domain: String,
    pub admin_email: String,
    pub admin_name: Option<String>,
    pub billing_email: String,
    pub subscription_id: String,
    pub max_users: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AddEnterpriseUserRequest {
    pub account_id: String,
    pub email: String,
    pub name: Option<String>,
    pub role: UserRole,
    pub send_invitation: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateUserRoleRequest {
    pub account_id: String,
    pub user_id: String,
    pub role: UserRole,
    pub permissions: Option<Vec<String>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct EnterpriseUsageStats {
    pub account_id: String,
    pub total_users: i32,
    pub active_users: i32,
    pub documents_processed: i64,
    pub analysis_jobs_run: i64,
    pub storage_used_bytes: i64,
    pub api_calls_made: i64,
    pub last_updated: DateTime<Utc>,
}

// Enterprise manager state
#[derive(Default)]
pub struct EnterpriseManager {
    accounts: HashMap<String, EnterpriseAccount>,
    users: HashMap<String, Vec<EnterpriseUser>>, // account_id -> users
    invitations: HashMap<String, Vec<EnterpriseInvitation>>, // account_id -> invitations
    audit_logs: HashMap<String, Vec<AuditLogEntry>>, // account_id -> logs
    usage_stats: HashMap<String, EnterpriseUsageStats>, // account_id -> stats
}

impl EnterpriseManager {
    pub fn new() -> Self {
        Self::default()
    }

    // Account management
    pub fn create_account(&mut self, request: CreateEnterpriseAccountRequest) -> Result<EnterpriseAccount> {
        let account_id = Uuid::new_v4().to_string();
        let admin_user_id = Uuid::new_v4().to_string();
        let now = Utc::now();

        let account = EnterpriseAccount {
            id: account_id.clone(),
            name: request.name,
            domain: request.domain,
            subscription_id: request.subscription_id,
            admin_user_id: admin_user_id.clone(),
            max_users: request.max_users,
            current_users: 1, // Admin user
            billing_email: request.billing_email,
            features: EnterpriseFeatures {
                single_sign_on: true,
                custom_branding: true,
                dedicated_support: true,
                audit_logs: true,
                data_retention_days: 365,
                api_rate_limit: 10000,
                advanced_analytics: true,
                custom_integrations: true,
            },
            created_at: now,
            updated_at: now,
        };

        // Create admin user
        let admin_user = EnterpriseUser {
            id: admin_user_id,
            account_id: account_id.clone(),
            email: request.admin_email,
            name: request.admin_name,
            role: UserRole::Admin,
            permissions: vec![
                "account.manage".to_string(),
                "users.manage".to_string(),
                "billing.manage".to_string(),
                "settings.manage".to_string(),
                "audit.view".to_string(),
            ],
            is_active: true,
            last_login: None,
            created_at: now,
            invited_at: None,
            invitation_status: InvitationStatus::Accepted,
        };

        self.accounts.insert(account_id.clone(), account.clone());
        self.users.insert(account_id.clone(), vec![admin_user]);
        self.invitations.insert(account_id.clone(), vec![]);
        self.audit_logs.insert(account_id.clone(), vec![]);

        // Create initial usage stats
        let stats = EnterpriseUsageStats {
            account_id: account_id.clone(),
            total_users: 1,
            active_users: 1,
            documents_processed: 0,
            analysis_jobs_run: 0,
            storage_used_bytes: 0,
            api_calls_made: 0,
            last_updated: now,
        };
        self.usage_stats.insert(account_id.clone(), stats);

        info!("Created enterprise account: {} ({})", account.name, account.id);
        Ok(account)
    }

    pub fn get_account(&self, account_id: &str) -> Result<EnterpriseAccount> {
        self.accounts
            .get(account_id)
            .cloned()
            .ok_or_else(|| anyhow!("Account not found"))
    }

    // User management
    pub fn add_user(&mut self, request: AddEnterpriseUserRequest) -> Result<EnterpriseUser> {
        let account = self.accounts.get(&request.account_id)
            .ok_or_else(|| anyhow!("Account not found"))?;

        if account.current_users >= account.max_users {
            return Err(anyhow!("Maximum number of users reached"));
        }

        let user_id = Uuid::new_v4().to_string();
        let now = Utc::now();

        let permissions = match request.role {
            UserRole::Admin => vec![
                "account.manage".to_string(),
                "users.manage".to_string(),
                "billing.view".to_string(),
                "settings.manage".to_string(),
                "audit.view".to_string(),
            ],
            UserRole::Manager => vec![
                "users.view".to_string(),
                "documents.manage".to_string(),
                "analysis.manage".to_string(),
                "reports.view".to_string(),
            ],
            UserRole::User => vec![
                "documents.create".to_string(),
                "documents.view".to_string(),
                "analysis.run".to_string(),
                "chat.use".to_string(),
            ],
            UserRole::Viewer => vec![
                "documents.view".to_string(),
                "reports.view".to_string(),
            ],
        };

        let user = EnterpriseUser {
            id: user_id,
            account_id: request.account_id.clone(),
            email: request.email.clone(),
            name: request.name,
            role: request.role,
            permissions,
            is_active: !request.send_invitation, // If sending invitation, user is inactive until accepted
            last_login: None,
            created_at: now,
            invited_at: if request.send_invitation { Some(now) } else { None },
            invitation_status: if request.send_invitation {
                InvitationStatus::Pending
            } else {
                InvitationStatus::Accepted
            },
        };

        // Add user to account
        if let Some(users) = self.users.get_mut(&request.account_id) {
            users.push(user.clone());
        }

        // Update account user count
        if let Some(account) = self.accounts.get_mut(&request.account_id) {
            account.current_users += 1;
            account.updated_at = now;
        }

        // Create invitation if requested
        if request.send_invitation {
            let invitation = EnterpriseInvitation {
                id: Uuid::new_v4().to_string(),
                account_id: request.account_id.clone(),
                email: request.email,
                role: user.role.clone(),
                invited_by: "system".to_string(), // In real implementation, use actual user ID
                invitation_token: Uuid::new_v4().to_string(),
                expires_at: now + chrono::Duration::days(7),
                status: InvitationStatus::Pending,
                created_at: now,
            };

            if let Some(invitations) = self.invitations.get_mut(&request.account_id) {
                invitations.push(invitation);
            }
        }

        // Log the action
        self.add_audit_log(&request.account_id, &user.id, "user.created", "user", Some(&user.id), HashMap::new());

        info!("Added user {} to enterprise account {}", user.email, request.account_id);
        Ok(user)
    }

    pub fn remove_user(&mut self, account_id: &str, user_id: &str) -> Result<()> {
        // Find and remove user
        if let Some(users) = self.users.get_mut(account_id) {
            if let Some(pos) = users.iter().position(|u| u.id == user_id) {
                let user = users.remove(pos);

                // Update account user count
                if let Some(account) = self.accounts.get_mut(account_id) {
                    account.current_users -= 1;
                    account.updated_at = Utc::now();
                }

                // Log the action
                self.add_audit_log(account_id, "system", "user.removed", "user", Some(user_id), HashMap::new());

                info!("Removed user {} from enterprise account {}", user.email, account_id);
                return Ok(());
            }
        }

        Err(anyhow!("User not found"))
    }

    pub fn list_users(&self, account_id: &str) -> Result<Vec<EnterpriseUser>> {
        self.users
            .get(account_id)
            .cloned()
            .unwrap_or_default()
            .into_iter()
            .collect::<Vec<_>>()
            .into()
    }

    pub fn update_user_role(&mut self, request: UpdateUserRoleRequest) -> Result<EnterpriseUser> {
        if let Some(users) = self.users.get_mut(&request.account_id) {
            if let Some(user) = users.iter_mut().find(|u| u.id == request.user_id) {
                let old_role = user.role.clone();
                user.role = request.role;

                if let Some(permissions) = request.permissions {
                    user.permissions = permissions;
                }

                // Log the action
                let mut details = HashMap::new();
                details.insert("old_role".to_string(), format!("{:?}", old_role));
                details.insert("new_role".to_string(), format!("{:?}", user.role));
                self.add_audit_log(&request.account_id, "system", "user.role_updated", "user", Some(&request.user_id), details);

                info!("Updated user role for {} in account {}", user.email, request.account_id);
                return Ok(user.clone());
            }
        }

        Err(anyhow!("User not found"))
    }

    // Audit logging
    pub fn add_audit_log(&mut self, account_id: &str, user_id: &str, action: &str, resource_type: &str, resource_id: Option<&str>, details: HashMap<String, String>) {
        let log_entry = AuditLogEntry {
            id: Uuid::new_v4().to_string(),
            account_id: account_id.to_string(),
            user_id: user_id.to_string(),
            action: action.to_string(),
            resource_type: resource_type.to_string(),
            resource_id: resource_id.map(|s| s.to_string()),
            details,
            ip_address: None, // Would be populated from request context
            user_agent: None, // Would be populated from request context
            timestamp: Utc::now(),
        };

        if let Some(logs) = self.audit_logs.get_mut(account_id) {
            logs.push(log_entry);

            // Keep only last 10000 entries per account
            if logs.len() > 10000 {
                logs.drain(0..logs.len() - 10000);
            }
        }
    }

    pub fn get_audit_logs(&self, account_id: &str, limit: Option<usize>) -> Result<Vec<AuditLogEntry>> {
        let logs = self.audit_logs
            .get(account_id)
            .ok_or_else(|| anyhow!("Account not found"))?;

        let limit = limit.unwrap_or(100);
        Ok(logs.iter().rev().take(limit).cloned().collect())
    }

    // Usage statistics
    pub fn get_usage_stats(&self, account_id: &str) -> Result<EnterpriseUsageStats> {
        self.usage_stats
            .get(account_id)
            .cloned()
            .ok_or_else(|| anyhow!("Usage stats not found"))
    }

    pub fn update_usage_stats(&mut self, account_id: &str, update_fn: impl FnOnce(&mut EnterpriseUsageStats)) -> Result<()> {
        if let Some(stats) = self.usage_stats.get_mut(account_id) {
            update_fn(stats);
            stats.last_updated = Utc::now();
            Ok(())
        } else {
            Err(anyhow!("Account not found"))
        }
    }
}

// Tauri command implementations
#[tauri::command]
pub async fn enterprise_create_account(
    request: CreateEnterpriseAccountRequest,
    manager: State<'_, Arc<Mutex<EnterpriseManager>>>
) -> Result<EnterpriseAccount, String> {
    let mut manager_guard = manager.lock().map_err(|e| format!("Failed to acquire lock: {}", e))?;

    manager_guard.create_account(request)
        .map_err(|e| format!("Failed to create enterprise account: {}", e))
}

#[tauri::command]
pub async fn enterprise_get_account(
    account_id: String,
    manager: State<'_, Arc<Mutex<EnterpriseManager>>>
) -> Result<EnterpriseAccount, String> {
    let manager_guard = manager.lock().map_err(|e| format!("Failed to acquire lock: {}", e))?;

    manager_guard.get_account(&account_id)
        .map_err(|e| format!("Failed to get enterprise account: {}", e))
}

#[tauri::command]
pub async fn enterprise_add_user(
    request: AddEnterpriseUserRequest,
    manager: State<'_, Arc<Mutex<EnterpriseManager>>>
) -> Result<EnterpriseUser, String> {
    let mut manager_guard = manager.lock().map_err(|e| format!("Failed to acquire lock: {}", e))?;

    manager_guard.add_user(request)
        .map_err(|e| format!("Failed to add enterprise user: {}", e))
}

#[tauri::command]
pub async fn enterprise_remove_user(
    account_id: String,
    user_id: String,
    manager: State<'_, Arc<Mutex<EnterpriseManager>>>
) -> Result<(), String> {
    let mut manager_guard = manager.lock().map_err(|e| format!("Failed to acquire lock: {}", e))?;

    manager_guard.remove_user(&account_id, &user_id)
        .map_err(|e| format!("Failed to remove enterprise user: {}", e))
}

#[tauri::command]
pub async fn enterprise_list_users(
    account_id: String,
    manager: State<'_, Arc<Mutex<EnterpriseManager>>>
) -> Result<Vec<EnterpriseUser>, String> {
    let manager_guard = manager.lock().map_err(|e| format!("Failed to acquire lock: {}", e))?;

    manager_guard.list_users(&account_id)
        .map_err(|e| format!("Failed to list enterprise users: {}", e))
}

#[tauri::command]
pub async fn enterprise_update_user_role(
    request: UpdateUserRoleRequest,
    manager: State<'_, Arc<Mutex<EnterpriseManager>>>
) -> Result<EnterpriseUser, String> {
    let mut manager_guard = manager.lock().map_err(|e| format!("Failed to acquire lock: {}", e))?;

    manager_guard.update_user_role(request)
        .map_err(|e| format!("Failed to update user role: {}", e))
}

#[tauri::command]
pub async fn enterprise_get_audit_logs(
    account_id: String,
    limit: Option<usize>,
    manager: State<'_, Arc<Mutex<EnterpriseManager>>>
) -> Result<Vec<AuditLogEntry>, String> {
    let manager_guard = manager.lock().map_err(|e| format!("Failed to acquire lock: {}", e))?;

    manager_guard.get_audit_logs(&account_id, limit)
        .map_err(|e| format!("Failed to get audit logs: {}", e))
}

#[tauri::command]
pub async fn enterprise_get_usage_stats(
    account_id: String,
    manager: State<'_, Arc<Mutex<EnterpriseManager>>>
) -> Result<EnterpriseUsageStats, String> {
    let manager_guard = manager.lock().map_err(|e| format!("Failed to acquire lock: {}", e))?;

    manager_guard.get_usage_stats(&account_id)
        .map_err(|e| format!("Failed to get usage stats: {}", e))
}

// Initialize enterprise manager
pub fn create_enterprise_manager() -> Arc<Mutex<EnterpriseManager>> {
    Arc::new(Mutex::new(EnterpriseManager::new()))
}