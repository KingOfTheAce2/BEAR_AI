use anyhow::{Context, Result};
use hardware_id::get_id;
use jsonwebtoken::{decode, encode, Algorithm, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};

/// BEAR AI Licensing System
/// Implements local license validation with hardware binding
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct License {
    pub license_id: String,
    pub license_type: LicenseType,
    pub features: Vec<LicenseFeature>,
    pub hardware_id: String,
    pub issued_at: chrono::DateTime<chrono::Utc>,
    pub expires_at: Option<chrono::DateTime<chrono::Utc>>,
    pub organization: Option<String>,
    pub user_limit: Option<u32>,
    pub model_limit: Option<u32>,
    pub document_limit: Option<u32>,
    pub agent_limit: Option<u32>,
    pub signature: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum LicenseType {
    Trial,
    Personal,
    Professional,
    Enterprise,
    Academic,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum LicenseFeature {
    BasicLLMAccess,
    AdvancedLLMAccess,
    DocumentAnalysis,
    AgenticWorkflows,
    MultiUserSupport,
    PrioritySupport,
    CustomModels,
    APIAccess,
    CloudSync,
    AdvancedSecurity,
    ComplianceReporting,
    WhiteLabeling,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LicenseUsage {
    pub users_active: u32,
    pub models_downloaded: u32,
    pub documents_processed_today: u32,
    pub agent_executions_today: u32,
    pub last_reset: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LicenseValidationResult {
    pub valid: bool,
    pub license_type: Option<LicenseType>,
    pub features: Vec<LicenseFeature>,
    pub expires_at: Option<chrono::DateTime<chrono::Utc>>,
    pub usage: Option<LicenseUsage>,
    pub warnings: Vec<String>,
    pub errors: Vec<String>,
}

#[derive(Debug)]
pub struct LicenseManager {
    license_path: PathBuf,
    usage_path: PathBuf,
    current_license: Option<License>,
    current_usage: LicenseUsage,
    hardware_id: String,
    validation_key: DecodingKey,
}

impl LicenseManager {
    /// Initialize license manager
    pub fn new(app_data_dir: &Path) -> Result<Self> {
        let license_dir = app_data_dir.join("licensing");
        fs::create_dir_all(&license_dir)?;

        let license_path = license_dir.join("license.jwt");
        let usage_path = license_dir.join("usage.json");

        // Get hardware ID for license binding
        let hardware_id = get_id().unwrap_or_else(|_| "unknown_hardware".to_string());

        // Public key for license validation (in production, this would be embedded)
        let validation_key = DecodingKey::from_secret(b"BEAR_AI_LICENSE_VALIDATION_KEY_2025");

        // Load existing license and usage
        let current_license = Self::load_license(&license_path, &validation_key).ok();
        let current_usage = Self::load_usage(&usage_path).unwrap_or_else(|_| LicenseUsage {
            users_active: 0,
            models_downloaded: 0,
            documents_processed_today: 0,
            agent_executions_today: 0,
            last_reset: chrono::Utc::now().date_naive().and_hms_opt(0, 0, 0).unwrap().and_utc(),
        });

        Ok(Self {
            license_path,
            usage_path,
            current_license,
            current_usage,
            hardware_id,
            validation_key,
        })
    }

    /// Validate current license
    pub fn validate_license(&mut self) -> LicenseValidationResult {
        let mut warnings = Vec::new();
        let mut errors = Vec::new();

        // Check if license exists
        let Some(license) = &self.current_license else {
            return LicenseValidationResult {
                valid: false,
                license_type: None,
                features: vec![LicenseFeature::BasicLLMAccess], // Trial mode
                expires_at: None,
                usage: Some(self.current_usage.clone()),
                warnings,
                errors: vec!["No license found - running in trial mode".to_string()],
            };
        };

        // Check hardware binding
        if license.hardware_id != self.hardware_id {
            errors.push("License hardware mismatch".to_string());
        }

        // Check expiration
        if let Some(expires_at) = license.expires_at {
            if chrono::Utc::now() > expires_at {
                errors.push("License has expired".to_string());
            } else if chrono::Utc::now() + chrono::Duration::days(7) > expires_at {
                warnings.push("License expires within 7 days".to_string());
            }
        }

        // Check usage limits
        if let Some(model_limit) = license.model_limit {
            if self.current_usage.models_downloaded >= model_limit {
                warnings.push(format!("Model download limit reached ({}/{})",
                                     self.current_usage.models_downloaded, model_limit));
            }
        }

        if let Some(document_limit) = license.document_limit {
            if self.current_usage.documents_processed_today >= document_limit {
                errors.push(format!("Daily document processing limit exceeded ({}/{})",
                                   self.current_usage.documents_processed_today, document_limit));
            }
        }

        if let Some(agent_limit) = license.agent_limit {
            if self.current_usage.agent_executions_today >= agent_limit {
                errors.push(format!("Daily agent execution limit exceeded ({}/{})",
                                   self.current_usage.agent_executions_today, agent_limit));
            }
        }

        // Reset daily counters if needed
        self.reset_daily_usage_if_needed();

        LicenseValidationResult {
            valid: errors.is_empty(),
            license_type: Some(license.license_type.clone()),
            features: license.features.clone(),
            expires_at: license.expires_at,
            usage: Some(self.current_usage.clone()),
            warnings,
            errors,
        }
    }

    /// Install a new license
    pub fn install_license(&mut self, license_jwt: &str) -> Result<()> {
        // Decode and validate the license
        let license = self.decode_license(license_jwt)?;

        // Verify hardware binding
        if license.hardware_id != self.hardware_id {
            return Err(anyhow::anyhow!("License is not valid for this hardware"));
        }

        // Save license
        fs::write(&self.license_path, license_jwt)?;
        self.current_license = Some(license);

        log::info!("License installed successfully");
        Ok(())
    }

    /// Check if feature is available
    pub fn has_feature(&self, feature: LicenseFeature) -> bool {
        let validation = self.validate_license();
        validation.valid && validation.features.contains(&feature)
    }

    /// Record usage
    pub fn record_usage(&mut self, usage_type: UsageType) -> Result<()> {
        self.reset_daily_usage_if_needed();

        match usage_type {
            UsageType::ModelDownload => {
                self.current_usage.models_downloaded += 1;
            }
            UsageType::DocumentProcessing => {
                self.current_usage.documents_processed_today += 1;
            }
            UsageType::AgentExecution => {
                self.current_usage.agent_executions_today += 1;
            }
            UsageType::UserLogin => {
                // Handle active user tracking
            }
        }

        self.save_usage()?;
        Ok(())
    }

    /// Get usage statistics
    pub fn get_usage_stats(&self) -> HashMap<String, u32> {
        let mut stats = HashMap::new();
        stats.insert("models_downloaded".to_string(), self.current_usage.models_downloaded);
        stats.insert("documents_processed_today".to_string(), self.current_usage.documents_processed_today);
        stats.insert("agent_executions_today".to_string(), self.current_usage.agent_executions_today);
        stats.insert("users_active".to_string(), self.current_usage.users_active);
        stats
    }

    /// Get license information
    pub fn get_license_info(&self) -> Option<HashMap<String, String>> {
        self.current_license.as_ref().map(|license| {
            let mut info = HashMap::new();
            info.insert("license_id".to_string(), license.license_id.clone());
            info.insert("license_type".to_string(), format!("{:?}", license.license_type));
            info.insert("organization".to_string(), license.organization.clone().unwrap_or("Individual".to_string()));

            if let Some(expires_at) = license.expires_at {
                info.insert("expires_at".to_string(), expires_at.format("%Y-%m-%d").to_string());
                let days_remaining = (expires_at - chrono::Utc::now()).num_days();
                info.insert("days_remaining".to_string(), days_remaining.to_string());
            } else {
                info.insert("expires_at".to_string(), "Never".to_string());
                info.insert("days_remaining".to_string(), "Unlimited".to_string());
            }

            info.insert("features_count".to_string(), license.features.len().to_string());
            info
        })
    }

    /// Generate trial license
    pub fn generate_trial_license(&mut self) -> Result<()> {
        let trial_license = License {
            license_id: uuid::Uuid::new_v4().to_string(),
            license_type: LicenseType::Trial,
            features: vec![
                LicenseFeature::BasicLLMAccess,
                LicenseFeature::DocumentAnalysis,
            ],
            hardware_id: self.hardware_id.clone(),
            issued_at: chrono::Utc::now(),
            expires_at: Some(chrono::Utc::now() + chrono::Duration::days(14)), // 14-day trial
            organization: None,
            user_limit: Some(1),
            model_limit: Some(2),
            document_limit: Some(10),
            agent_limit: Some(5),
            signature: "TRIAL_LICENSE".to_string(),
        };

        // Generate JWT
        let header = Header::new(Algorithm::HS256);
        let encoding_key = EncodingKey::from_secret(b"BEAR_AI_LICENSE_VALIDATION_KEY_2025");
        let token = encode(&header, &trial_license, &encoding_key)?;

        // Install the trial license
        self.install_license(&token)?;

        log::info!("Trial license generated and installed");
        Ok(())
    }

    /// Get available license tiers
    pub fn get_license_tiers() -> Vec<HashMap<String, String>> {
        vec![
            HashMap::from([
                ("name".to_string(), "Trial".to_string()),
                ("price".to_string(), "Free".to_string()),
                ("duration".to_string(), "14 days".to_string()),
                ("models".to_string(), "2".to_string()),
                ("documents".to_string(), "10/day".to_string()),
                ("agents".to_string(), "5/day".to_string()),
                ("features".to_string(), "Basic LLM, Document Analysis".to_string()),
            ]),
            HashMap::from([
                ("name".to_string(), "Personal".to_string()),
                ("price".to_string(), "$29/month".to_string()),
                ("duration".to_string(), "Monthly".to_string()),
                ("models".to_string(), "10".to_string()),
                ("documents".to_string(), "100/day".to_string()),
                ("agents".to_string(), "50/day".to_string()),
                ("features".to_string(), "Advanced LLM, Full Document Analysis, Basic Agents".to_string()),
            ]),
            HashMap::from([
                ("name".to_string(), "Professional".to_string()),
                ("price".to_string(), "$99/month".to_string()),
                ("duration".to_string(), "Monthly".to_string()),
                ("models".to_string(), "Unlimited".to_string()),
                ("documents".to_string(), "1000/day".to_string()),
                ("agents".to_string(), "500/day".to_string()),
                ("features".to_string(), "All Features, Multi-Agent Workflows, Priority Support".to_string()),
            ]),
            HashMap::from([
                ("name".to_string(), "Enterprise".to_string()),
                ("price".to_string(), "$299/month".to_string()),
                ("duration".to_string(), "Monthly".to_string()),
                ("models".to_string(), "Unlimited".to_string()),
                ("documents".to_string(), "Unlimited".to_string()),
                ("agents".to_string(), "Unlimited".to_string()),
                ("features".to_string(), "All Features, Multi-User, Custom Models, Compliance Reporting".to_string()),
            ]),
        ]
    }

    // Helper methods
    fn load_license(license_path: &Path, validation_key: &DecodingKey) -> Result<License> {
        let license_jwt = fs::read_to_string(license_path)?;

        let mut validation = Validation::new(Algorithm::HS256);
        validation.validate_exp = false; // We handle expiration manually

        let token_data = decode::<License>(&license_jwt, validation_key, &validation)?;
        Ok(token_data.claims)
    }

    fn decode_license(&self, license_jwt: &str) -> Result<License> {
        let mut validation = Validation::new(Algorithm::HS256);
        validation.validate_exp = false;

        let token_data = decode::<License>(license_jwt, &self.validation_key, &validation)?;
        Ok(token_data.claims)
    }

    fn load_usage(usage_path: &Path) -> Result<LicenseUsage> {
        let usage_json = fs::read_to_string(usage_path)?;
        let usage: LicenseUsage = serde_json::from_str(&usage_json)?;
        Ok(usage)
    }

    fn save_usage(&self) -> Result<()> {
        let usage_json = serde_json::to_string_pretty(&self.current_usage)?;
        fs::write(&self.usage_path, usage_json)?;
        Ok(())
    }

    fn reset_daily_usage_if_needed(&mut self) {
        let today = chrono::Utc::now().date_naive().and_hms_opt(0, 0, 0).unwrap().and_utc();
        if self.current_usage.last_reset < today {
            self.current_usage.documents_processed_today = 0;
            self.current_usage.agent_executions_today = 0;
            self.current_usage.last_reset = today;
        }
    }
}

#[derive(Debug, Clone)]
pub enum UsageType {
    ModelDownload,
    DocumentProcessing,
    AgentExecution,
    UserLogin,
}

// Tauri commands for licensing
#[tauri::command]
pub async fn validate_license(
    license_manager: tauri::State<'_, Arc<std::sync::Mutex<LicenseManager>>>,
) -> Result<LicenseValidationResult, String> {
    let mut manager = license_manager.lock().unwrap();
    Ok(manager.validate_license())
}

#[tauri::command]
pub async fn install_license(
    license_manager: tauri::State<'_, Arc<std::sync::Mutex<LicenseManager>>>,
    license_jwt: String,
) -> Result<(), String> {
    let mut manager = license_manager.lock().unwrap();
    manager.install_license(&license_jwt).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn check_feature_access(
    license_manager: tauri::State<'_, Arc<std::sync::Mutex<LicenseManager>>>,
    feature: String,
) -> Result<bool, String> {
    let manager = license_manager.lock().unwrap();
    let feature_enum = match feature.as_str() {
        "BasicLLMAccess" => LicenseFeature::BasicLLMAccess,
        "AdvancedLLMAccess" => LicenseFeature::AdvancedLLMAccess,
        "DocumentAnalysis" => LicenseFeature::DocumentAnalysis,
        "AgenticWorkflows" => LicenseFeature::AgenticWorkflows,
        "MultiUserSupport" => LicenseFeature::MultiUserSupport,
        _ => return Ok(false),
    };
    Ok(manager.has_feature(feature_enum))
}

#[tauri::command]
pub async fn get_usage_statistics(
    license_manager: tauri::State<'_, Arc<std::sync::Mutex<LicenseManager>>>,
) -> Result<HashMap<String, u32>, String> {
    let manager = license_manager.lock().unwrap();
    Ok(manager.get_usage_stats())
}

#[tauri::command]
pub async fn get_license_information(
    license_manager: tauri::State<'_, Arc<std::sync::Mutex<LicenseManager>>>,
) -> Result<Option<HashMap<String, String>>, String> {
    let manager = license_manager.lock().unwrap();
    Ok(manager.get_license_info())
}

#[tauri::command]
pub async fn generate_trial_license(
    license_manager: tauri::State<'_, Arc<std::sync::Mutex<LicenseManager>>>,
) -> Result<(), String> {
    let mut manager = license_manager.lock().unwrap();
    manager.generate_trial_license().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_available_license_tiers() -> Result<Vec<HashMap<String, String>>, String> {
    Ok(LicenseManager::get_license_tiers())
}