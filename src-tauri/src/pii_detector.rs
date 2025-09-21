use regex::Regex;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use sha2::{Digest, Sha256};
use tauri::command;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PIIMatch {
    pub pii_type: PIIType,
    pub text: String,
    pub start: usize,
    pub end: usize,
    pub confidence: f64,
    pub hash: String,
    pub is_legal_privileged: Option&lt;bool&gt;,
    pub country: Option&lt;String&gt;,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PIIDetectionResult {
    pub has_pii: bool,
    pub matches: Vec&lt;PIIMatch&gt;,
    pub risk_level: RiskLevel,
    pub suggestions: Vec&lt;String&gt;,
    pub audit_hash: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PIIType {
    // Personal Identifiers
    Ssn,
    CreditCard,
    Email,
    Phone,
    Address,

    // Legal Industry Specific
    CaseNumber,
    CourtName,
    AttorneyName,
    AttorneyClientPrivilege,
    DocketNumber,
    BarNumber,

    // Dutch Compliance
    Bsn,
    Rsin,
    DutchPassport,
    DutchId,

    // Financial
    Iban,
    BankAccount,

    // Medical
    PatientId,
    MedicalRecord,

    // Generic
    Custom,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RiskLevel {
    Low,
    Medium,
    High,
    Critical,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PIIDetectorConfig {
    pub enable_real_time: bool,
    pub sensitivity: String,
    pub enable_legal_patterns: bool,
    pub enable_dutch_compliance: bool,
    pub enable_audit_logging: bool,
    pub hash_salt: String,
}

impl Default for PIIDetectorConfig {
    fn default() -> Self {
        PIIDetectorConfig {
            enable_real_time: true,
            sensitivity: "high".to_string(),
            enable_legal_patterns: true,
            enable_dutch_compliance: true,
            enable_audit_logging: true,
            hash_salt: "bear-ai-pii-salt".to_string(),
        }
    }
}

pub struct PIIDetector {
    config: PIIDetectorConfig,
    patterns: HashMap&lt;PIIType, Vec&lt;Regex&gt;&gt;,
    audit_log: Vec&lt;PIIMatch&gt;,
}

impl PIIDetector {
    pub fn new(config: Option&lt;PIIDetectorConfig&gt;) -> Self {
        let config = config.unwrap_or_default();
        let mut detector = PIIDetector {
            config,
            patterns: HashMap::new(),
            audit_log: Vec::new(),
        };

        detector.initialize_patterns();
        detector
    }

    fn initialize_patterns(&mut self) {
        // Core PII patterns
        self.add_pattern(PIIType::Ssn, r"\b\d{3}-\d{2}-\d{4}\b");
        self.add_pattern(PIIType::CreditCard, r"\b(?:\d{4}[-\s]?){3}\d{4}\b");
        self.add_pattern(PIIType::Email, r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b");
        self.add_pattern(PIIType::Phone, r"(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})");
        self.add_pattern(PIIType::Iban, r"\b[A-Z]{2}\d{2}[A-Z0-9]{4}\d{7}([A-Z0-9]?){0,16}\b");

        // Legal patterns
        if self.config.enable_legal_patterns {
            self.add_legal_patterns();
        }

        // Dutch compliance patterns
        if self.config.enable_dutch_compliance {
            self.add_dutch_patterns();
        }
    }

    fn add_pattern(&mut self, pii_type: PIIType, pattern: &str) {
        if let Ok(regex) = Regex::new(pattern) {
            self.patterns.entry(pii_type).or_insert_with(Vec::new).push(regex);
        }
    }

    fn add_legal_patterns(&mut self) {
        // Federal case numbers
        self.add_pattern(PIIType::CaseNumber, r"\b\d{1,2}:\d{2}-[a-z]{2}-\d{4,6}\b");
        self.add_pattern(PIIType::CaseNumber, r"\b\d{2}-\d{4}\b");
        self.add_pattern(PIIType::CaseNumber, r"\b[A-Z]{2}-\d{4}-\d{4,6}\b");

        // Court names
        self.add_pattern(PIIType::CourtName, r"\bSupreme Court\b");
        self.add_pattern(PIIType::CourtName, r"\bCourt of Appeals\b");
        self.add_pattern(PIIType::CourtName, r"\bDistrict Court\b");
        self.add_pattern(PIIType::CourtName, r"\bU\.?S\.?\s+District\s+Court\s+for\s+the\s+[A-Za-z\s]+District\b");

        // Attorney-client privilege markers
        self.add_pattern(PIIType::AttorneyClientPrivilege, r"\battorney-client privilege\b");
        self.add_pattern(PIIType::AttorneyClientPrivilege, r"\bprivileged and confidential\b");
        self.add_pattern(PIIType::AttorneyClientPrivilege, r"\battorney work product\b");

        // Docket numbers
        self.add_pattern(PIIType::DocketNumber, r"\bDocket\s+No\.?\s*\d{4,6}\b");
        self.add_pattern(PIIType::DocketNumber, r"\bDkt\.?\s*\d{4,6}\b");

        // Bar numbers
        self.add_pattern(PIIType::BarNumber, r"\b(?:State\s+)?Bar\s+No\.?\s*\d{4,8}\b");
        self.add_pattern(PIIType::BarNumber, r"\bAttorney\s+ID:?\s*\d{4,8}\b");
    }

    fn add_dutch_patterns(&mut self) {
        // BSN pattern (will be validated separately)
        self.add_pattern(PIIType::Bsn, r"\b\d{9}\b");
        self.add_pattern(PIIType::Bsn, r"\bBSN:?\s*\d{9}\b");

        // RSIN pattern
        self.add_pattern(PIIType::Rsin, r"\bRSIN:?\s*\d{9}\b");
        self.add_pattern(PIIType::Rsin, r"\bKvK:?\s*\d{9}\b");

        // Dutch passport/ID
        self.add_pattern(PIIType::DutchPassport, r"\b[A-Z]{2}\d{7}\b");
        self.add_pattern(PIIType::DutchId, r"\bID(?:\s+card)?:?\s*[A-Z]{2}\d{7}\b");
    }

    pub fn detect_pii(&mut self, text: &str) -> PIIDetectionResult {
        let mut matches = Vec::new();

        for (pii_type, regexes) in &self.patterns {
            for regex in regexes {
                for mat in regex.find_iter(text) {
                    let match_text = mat.as_str().to_string();
                    let confidence = self.calculate_confidence(pii_type, &match_text);

                    // Special validation for Dutch BSN
                    if matches!(pii_type, PIIType::Bsn) {
                        let clean_bsn = match_text.chars().filter(|c| c.is_numeric()).collect::&lt;String&gt;();
                        if clean_bsn.len() == 9 && !self.validate_bsn(&clean_bsn) {
                            continue; // Skip invalid BSN
                        }
                    }

                    // Special validation for Dutch RSIN
                    if matches!(pii_type, PIIType::Rsin) {
                        let clean_rsin = match_text.chars().filter(|c| c.is_numeric()).collect::&lt;String&gt;();
                        if clean_rsin.len() == 9 && !self.validate_rsin(&clean_rsin) {
                            continue; // Skip invalid RSIN
                        }
                    }

                    let hash = self.hash_sensitive_data(&match_text);
                    let is_legal_privileged = matches!(pii_type, PIIType::AttorneyClientPrivilege);
                    let country = if matches!(pii_type, PIIType::Bsn | PIIType::Rsin | PIIType::DutchPassport | PIIType::DutchId) {
                        Some("NL".to_string())
                    } else {
                        None
                    };

                    matches.push(PIIMatch {
                        pii_type: pii_type.clone(),
                        text: match_text,
                        start: mat.start(),
                        end: mat.end(),
                        confidence,
                        hash,
                        is_legal_privileged: if is_legal_privileged { Some(true) } else { None },
                        country,
                    });
                }
            }
        }

        let risk_level = self.calculate_risk_level(&matches);
        let suggestions = self.generate_suggestions(&matches);
        let audit_hash = self.create_audit_hash(text, &matches);

        // Log for audit if enabled
        if self.config.enable_audit_logging {
            self.audit_log.extend(matches.clone());
            // Keep only last 1000 entries
            if self.audit_log.len() > 1000 {
                self.audit_log.drain(0..self.audit_log.len() - 1000);
            }
        }

        PIIDetectionResult {
            has_pii: !matches.is_empty(),
            matches,
            risk_level,
            suggestions,
            audit_hash,
        }
    }

    fn calculate_confidence(&self, pii_type: &PIIType, text: &str) -> f64 {
        match pii_type {
            PIIType::Email => 0.95,
            PIIType::Ssn => 0.9,
            PIIType::CreditCard => 0.85,
            PIIType::AttorneyClientPrivilege => 0.95,
            PIIType::Bsn | PIIType::Rsin => 0.95, // High confidence after validation
            _ => 0.8,
        }
    }

    fn validate_bsn(&self, bsn: &str) -> bool {
        if bsn.len() != 9 {
            return false;
        }

        let digits: Vec&lt;u32&gt; = bsn.chars()
            .filter_map(|c| c.to_digit(10))
            .collect();

        if digits.len() != 9 {
            return false;
        }

        // Apply the 11-test algorithm
        let mut sum = 0;
        for i in 0..8 {
            sum += digits[i] * (9 - i as u32);
        }
        sum += digits[8] * u32::MAX; // This is -1 in modular arithmetic

        sum % 11 == 0
    }

    fn validate_rsin(&self, rsin: &str) -> bool {
        // RSIN uses the same 11-test algorithm as BSN
        self.validate_bsn(rsin)
    }

    fn calculate_risk_level(&self, matches: &[PIIMatch]) -> RiskLevel {
        if matches.is_empty() {
            return RiskLevel::Low;
        }

        let has_legal_privileged = matches.iter().any(|m| m.is_legal_privileged.unwrap_or(false));
        let has_high_confidence = matches.iter().any(|m| m.confidence > 0.9);
        let unique_types = matches.iter().map(|m| &m.pii_type).collect::&lt;std::collections::HashSet&lt;_&gt;&gt;().len();

        if has_legal_privileged {
            RiskLevel::Critical
        } else if has_high_confidence && unique_types > 2 {
            RiskLevel::High
        } else if has_high_confidence || matches.len() > 3 {
            RiskLevel::Medium
        } else {
            RiskLevel::Low
        }
    }

    fn generate_suggestions(&self, matches: &[PIIMatch]) -> Vec&lt;String&gt; {
        let mut suggestions = Vec::new();

        if matches.is_empty() {
            return suggestions;
        }

        let types: std::collections::HashSet&lt;_&gt; = matches.iter().map(|m| &m.pii_type).collect();

        if types.contains(&PIIType::AttorneyClientPrivilege) {
            suggestions.push("⚠️ Attorney-client privileged content detected. Consider removing or marking as confidential.".to_string());
        }

        if types.contains(&PIIType::Ssn) {
            suggestions.push("Social Security Number detected. Consider masking or removing.".to_string());
        }

        if types.contains(&PIIType::CreditCard) {
            suggestions.push("Credit card number detected. This should be removed immediately.".to_string());
        }

        if types.contains(&PIIType::Bsn) {
            suggestions.push("Dutch BSN detected. Ensure GDPR compliance for processing.".to_string());
        }

        if matches.len() > 5 {
            suggestions.push("Multiple PII elements detected. Consider reviewing entire content.".to_string());
        }

        suggestions.push("Consider using anonymization or pseudonymization techniques.".to_string());

        suggestions
    }

    fn hash_sensitive_data(&self, data: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(data.as_bytes());
        hasher.update(self.config.hash_salt.as_bytes());
        format!("{:x}", hasher.finalize())
    }

    fn create_audit_hash(&self, text: &str, matches: &[PIIMatch]) -> String {
        let audit_data = format!(
            "{{\"text_length\":{},\"match_count\":{},\"types\":[{}],\"timestamp\":\"{}\"}}",
            text.len(),
            matches.len(),
            matches.iter()
                .map(|m| format!("\"{:?}\"", m.pii_type))
                .collect::&lt;Vec&lt;_&gt;&gt;()
                .join(","),
            chrono::Utc::now().to_rfc3339()
        );

        self.hash_sensitive_data(&audit_data)
    }

    pub fn mask_text(&self, text: &str, matches: &[PIIMatch]) -> String {
        if matches.is_empty() {
            return text.to_string();
        }

        let mut masked_text = text.to_string();
        let mut sorted_matches = matches.to_vec();
        sorted_matches.sort_by(|a, b| b.start.cmp(&a.start)); // Sort by start position (descending)

        for m in sorted_matches {
            let mask_length = m.text.len();
            let mask = "*".repeat(std::cmp::max(3, std::cmp::min(mask_length, 8)));

            if m.start < masked_text.len() && m.end <= masked_text.len() {
                masked_text.replace_range(m.start..m.end, &mask);
            }
        }

        masked_text
    }

    pub fn get_audit_log(&self) -> Vec&lt;PIIMatch&gt; {
        self.audit_log.clone()
    }

    pub fn clear_audit_log(&mut self) {
        self.audit_log.clear();
    }
}

// Tauri commands
#[command]
pub async fn detect_pii_rust(text: String, config: Option&lt;PIIDetectorConfig&gt;) -> Result&lt;PIIDetectionResult, String&gt; {
    let mut detector = PIIDetector::new(config);
    Ok(detector.detect_pii(&text))
}

#[command]
pub async fn mask_pii_text(text: String, matches: Vec&lt;PIIMatch&gt;) -> Result&lt;String, String&gt; {
    let detector = PIIDetector::new(None);
    Ok(detector.mask_text(&text, &matches))
}

#[command]
pub async fn validate_dutch_bsn(bsn: String) -> Result&lt;bool, String&gt; {
    let detector = PIIDetector::new(None);
    let clean_bsn = bsn.chars().filter(|c| c.is_numeric()).collect::&lt;String&gt;();
    Ok(detector.validate_bsn(&clean_bsn))
}

#[command]
pub async fn validate_dutch_rsin(rsin: String) -> Result&lt;bool, String&gt; {
    let detector = PIIDetector::new(None);
    let clean_rsin = rsin.chars().filter(|c| c.is_numeric()).collect::&lt;String&gt;();
    Ok(detector.validate_rsin(&clean_rsin))
}

#[command]
pub async fn get_pii_audit_log() -> Result&lt;Vec&lt;PIIMatch&gt;, String&gt; {
    // Note: In a real implementation, you'd want to maintain state
    // This is a simplified version for demonstration
    Ok(Vec::new())
}

#[command]
pub async fn export_pii_audit_log() -> Result&lt;String, String&gt; {
    let audit_log = get_pii_audit_log().await?;
    let export_data = serde_json::json!({
        "export_date": chrono::Utc::now().to_rfc3339(),
        "total_entries": audit_log.len(),
        "entries": audit_log.iter().map(|entry| serde_json::json!({
            "type": entry.pii_type,
            "hash": entry.hash,
            "confidence": entry.confidence,
            "is_legal_privileged": entry.is_legal_privileged,
            "country": entry.country
        })).collect::&lt;Vec&lt;_&gt;&gt;()
    });

    Ok(export_data.to_string())
}

// Batch processing for documents
#[command]
pub async fn process_document_pii(content: String, filename: String, config: Option&lt;PIIDetectorConfig&gt;) -> Result&lt;serde_json::Value, String&gt; {
    let mut detector = PIIDetector::new(config);
    let result = detector.detect_pii(&content);

    let should_block = matches!(result.risk_level, RiskLevel::Critical) ||
                      (matches!(result.risk_level, RiskLevel::High) && result.matches.len() > 5);

    let redacted_content = if result.has_pii {
        Some(detector.mask_text(&content, &result.matches))
    } else {
        None
    };

    Ok(serde_json::json!({
        "original_content": content,
        "scan_result": result,
        "should_block": should_block,
        "redacted_content": redacted_content,
        "filename": filename,
        "processed_at": chrono::Utc::now().to_rfc3339()
    }))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_bsn_validation() {
        let detector = PIIDetector::new(None);

        // Valid BSN (test number)
        assert!(detector.validate_bsn("123456782"));

        // Invalid BSN
        assert!(!detector.validate_bsn("123456789"));
        assert!(!detector.validate_bsn("12345678"));
        assert!(!detector.validate_bsn("abcdefghi"));
    }

    #[test]
    fn test_pii_detection() {
        let mut detector = PIIDetector::new(None);

        let text = "My SSN is 123-45-6789 and email is test@example.com";
        let result = detector.detect_pii(text);

        assert!(result.has_pii);
        assert_eq!(result.matches.len(), 2);
        assert!(result.matches.iter().any(|m| matches!(m.pii_type, PIIType::Ssn)));
        assert!(result.matches.iter().any(|m| matches!(m.pii_type, PIIType::Email)));
    }

    #[test]
    fn test_attorney_client_privilege() {
        let mut detector = PIIDetector::new(Some(PIIDetectorConfig {
            enable_legal_patterns: true,
            ..Default::default()
        }));

        let text = "This communication is attorney-client privilege and confidential.";
        let result = detector.detect_pii(text);

        assert!(result.has_pii);
        assert!(matches!(result.risk_level, RiskLevel::Critical));
        assert!(result.matches.iter().any(|m| m.is_legal_privileged.unwrap_or(false)));
    }

    #[test]
    fn test_text_masking() {
        let detector = PIIDetector::new(None);

        let text = "Contact John at john@example.com or 555-123-4567";
        let matches = vec![
            PIIMatch {
                pii_type: PIIType::Email,
                text: "john@example.com".to_string(),
                start: 17,
                end: 33,
                confidence: 0.95,
                hash: "hash1".to_string(),
                is_legal_privileged: None,
                country: None,
            },
            PIIMatch {
                pii_type: PIIType::Phone,
                text: "555-123-4567".to_string(),
                start: 37,
                end: 49,
                confidence: 0.8,
                hash: "hash2".to_string(),
                is_legal_privileged: None,
                country: None,
            },
        ];

        let masked = detector.mask_text(text, &matches);
        assert!(masked.contains("*****"));
        assert!(!masked.contains("john@example.com"));
        assert!(!masked.contains("555-123-4567"));
    }
}