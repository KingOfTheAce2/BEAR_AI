use anyhow::{Context, Result};
use calamine::{open_workbook, Reader, Xls, Xlsx};
use csv::ReaderBuilder;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::{Cursor, Read};
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tokio::fs;
use uuid::Uuid;
use zip::ZipArchive;

/// Document Analysis Engine for BEAR AI
/// Provides comprehensive legal document processing and analysis
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentMetadata {
    pub id: String,
    pub filename: String,
    pub file_type: String,
    pub size: u64,
    pub uploaded_at: chrono::DateTime<chrono::Utc>,
    pub processed_at: Option<chrono::DateTime<chrono::Utc>>,
    pub document_type: Option<DocumentType>,
    pub language: String,
    pub page_count: Option<u32>,
    pub word_count: Option<u32>,
    pub security_classification: SecurityLevel,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum DocumentType {
    Contract,
    LegalBrief,
    CaseLaw,
    Statute,
    Regulation,
    LegalMemo,
    CourtFiling,
    Evidence,
    Correspondence,
    PowerOfAttorney,
    Will,
    Lease,
    EmploymentAgreement,
    NDA,
    Patent,
    Trademark,
    Copyright,
    // New document types for enhanced support
    Spreadsheet,
    Presentation,
    Database,
    Financial,
    CorporateGovernance,
    Compliance,
    RegulatoryFiling,
    Other(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SecurityLevel {
    Public,
    Internal,
    Confidential,
    Attorney_Client_Privileged,
    Work_Product,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentAnalysis {
    pub metadata: DocumentMetadata,
    pub extracted_text: String,
    pub entities: Vec<LegalEntity>,
    pub clauses: Vec<ContractClause>,
    pub risks: Vec<RiskAssessment>,
    pub key_terms: Vec<KeyTerm>,
    pub citations: Vec<LegalCitation>,
    pub summary: Option<String>,
    pub sentiment_analysis: Option<SentimentScore>,
    pub compliance_flags: Vec<ComplianceFlag>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LegalEntity {
    pub entity_type: EntityType,
    pub text: String,
    pub confidence: f32,
    pub start_pos: usize,
    pub end_pos: usize,
    pub context: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum EntityType {
    Person,
    Organization,
    Location,
    Date,
    MonetaryAmount,
    Percentage,
    LegalTerm,
    CaseNumber,
    StatuteReference,
    ContractParty,
    CourtName,
    JudgeName,
    LawyerName,
    LawFirm,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContractClause {
    pub clause_type: ClauseType,
    pub text: String,
    pub risk_level: RiskLevel,
    pub suggestions: Vec<String>,
    pub standard_language: Option<String>,
    pub page_number: Option<u32>,
    pub section: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ClauseType {
    TerminationClause,
    LiabilityClause,
    IndemnityClause,
    ConfidentialityClause,
    PaymentTerms,
    IntellectualProperty,
    Forcemajeure,
    DisputeResolution,
    GoverningLaw,
    Warranty,
    NonCompete,
    NonSolicitation,
    Assignment,
    Amendment,
    Severability,
    EntireAgreement,
    Other(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum RiskLevel {
    Low,
    Medium,
    High,
    Critical,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RiskAssessment {
    pub risk_type: RiskType,
    pub description: String,
    pub severity: RiskLevel,
    pub likelihood: f32,
    pub impact: String,
    pub mitigation_strategies: Vec<String>,
    pub related_clauses: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum RiskType {
    Financial,
    Legal,
    Operational,
    Compliance,
    Reputation,
    Intellectual_Property,
    Data_Privacy,
    Regulatory,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeyTerm {
    pub term: String,
    pub definition: Option<String>,
    pub importance: f32,
    pub frequency: u32,
    pub category: TermCategory,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TermCategory {
    Legal,
    Financial,
    Technical,
    Temporal,
    Geographic,
    Parties,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LegalCitation {
    pub citation_text: String,
    pub case_name: Option<String>,
    pub court: Option<String>,
    pub year: Option<u32>,
    pub volume: Option<String>,
    pub page: Option<String>,
    pub citation_type: CitationType,
    pub verification_status: CitationStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum CitationType {
    CaseLaw,
    Statute,
    Regulation,
    Constitutional,
    Secondary,
    Foreign,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum CitationStatus {
    Valid,
    Invalid,
    Unverified,
    Superseded,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SentimentScore {
    pub overall_sentiment: f32, // -1.0 to 1.0
    pub confidence: f32,
    pub emotional_indicators: HashMap<String, f32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComplianceFlag {
    pub regulation: String,
    pub requirement: String,
    pub compliance_status: ComplianceStatus,
    pub recommendation: String,
    pub priority: RiskLevel,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ComplianceStatus {
    Compliant,
    NonCompliant,
    PartiallyCompliant,
    RequiresReview,
    NotApplicable,
}

#[derive(Debug)]
pub struct DocumentAnalyzer {
    documents_path: PathBuf,
    cache_path: PathBuf,
    llm_manager: Option<Arc<crate::llm_manager::LLMManager>>,
}

impl DocumentAnalyzer {
    /// Initialize the document analyzer
    pub fn new(
        app_data_dir: &Path,
        llm_manager: Option<Arc<crate::llm_manager::LLMManager>>,
    ) -> Result<Self> {
        let documents_path = app_data_dir.join("documents");
        let cache_path = app_data_dir.join("analysis_cache");

        std::fs::create_dir_all(&documents_path)?;
        std::fs::create_dir_all(&cache_path)?;

        Ok(Self {
            documents_path,
            cache_path,
            llm_manager,
        })
    }

    /// Process and analyze a document
    pub async fn analyze_document(&self, file_path: &Path) -> Result<DocumentAnalysis> {
        log::info!("Starting analysis of document: {:?}", file_path);

        // Extract metadata
        let metadata = self.extract_metadata(file_path).await?;

        // Extract text content
        let extracted_text = self.extract_text(file_path).await?;

        // Perform various analyses
        let entities = self.extract_entities(&extracted_text).await?;
        let clauses = self
            .analyze_clauses(&extracted_text, &metadata.document_type)
            .await?;
        let risks = self.assess_risks(&extracted_text, &clauses).await?;
        let key_terms = self.extract_key_terms(&extracted_text).await?;
        let citations = self.extract_citations(&extracted_text).await?;
        let summary = self.generate_summary(&extracted_text).await?;
        let sentiment_analysis = self.analyze_sentiment(&extracted_text).await?;
        let compliance_flags = self
            .check_compliance(&extracted_text, &metadata.document_type)
            .await?;

        let analysis = DocumentAnalysis {
            metadata,
            extracted_text,
            entities,
            clauses,
            risks,
            key_terms,
            citations,
            summary,
            sentiment_analysis,
            compliance_flags,
        };

        // Cache the analysis
        self.cache_analysis(&analysis).await?;

        log::info!("Document analysis completed successfully");
        Ok(analysis)
    }

    /// Extract metadata from document
    async fn extract_metadata(&self, file_path: &Path) -> Result<DocumentMetadata> {
        let file_metadata = fs::metadata(file_path).await?;
        let filename = file_path
            .file_name()
            .and_then(|name| name.to_str())
            .unwrap_or("unknown")
            .to_string();

        let file_type = file_path
            .extension()
            .and_then(|ext| ext.to_str())
            .unwrap_or("unknown")
            .to_lowercase();

        // Classify document type based on filename and content
        let document_type = self.classify_document_type(&filename).await;

        Ok(DocumentMetadata {
            id: Uuid::new_v4().to_string(),
            filename,
            file_type,
            size: file_metadata.len(),
            uploaded_at: chrono::Utc::now(),
            processed_at: Some(chrono::Utc::now()),
            document_type,
            language: "en".to_string(), // TODO: Auto-detect language
            page_count: None,           // TODO: Extract from PDF
            word_count: None,           // TODO: Calculate from text
            security_classification: SecurityLevel::Confidential, // Default to high security
        })
    }

    /// Extract text from various document formats
    async fn extract_text(&self, file_path: &Path) -> Result<String> {
        let extension = file_path
            .extension()
            .and_then(|ext| ext.to_str())
            .unwrap_or("")
            .to_lowercase();

        match extension.as_str() {
            "pdf" => self.extract_text_from_pdf(file_path).await,
            "docx" => self.extract_text_from_docx(file_path).await,
            "txt" => self.extract_text_from_txt(file_path).await,
            "rtf" => self.extract_text_from_rtf(file_path).await,
            // New format support
            "xlsx" | "xls" => self.extract_text_from_excel(file_path).await,
            "csv" => self.extract_text_from_csv(file_path).await,
            "pptx" | "ppt" => self.extract_text_from_powerpoint(file_path).await,
            _ => Err(anyhow::anyhow!("Unsupported file format: {}", extension)),
        }
    }

    /// Extract text from PDF files
    async fn extract_text_from_pdf(&self, file_path: &Path) -> Result<String> {
        // Use poppler-utils or similar for PDF text extraction
        let output = tokio::process::Command::new("pdftotext")
            .arg(file_path)
            .arg("-")
            .output()
            .await
            .context("Failed to execute pdftotext")?;

        if output.status.success() {
            Ok(String::from_utf8_lossy(&output.stdout).to_string())
        } else {
            // Fallback: Read as binary and attempt basic text extraction
            let content = fs::read(file_path).await?;
            Ok(self.extract_text_from_binary(&content))
        }
    }

    /// Extract text from DOCX files
    async fn extract_text_from_docx(&self, file_path: &Path) -> Result<String> {
        // Use docx crate or external tool
        let content = fs::read(file_path).await?;
        // TODO: Implement proper DOCX parsing
        Ok(self.extract_text_from_binary(&content))
    }

    /// Extract text from plain text files
    async fn extract_text_from_txt(&self, file_path: &Path) -> Result<String> {
        fs::read_to_string(file_path)
            .await
            .context("Failed to read text file")
    }

    /// Extract text from RTF files
    async fn extract_text_from_rtf(&self, file_path: &Path) -> Result<String> {
        let content = fs::read_to_string(file_path).await?;
        // Basic RTF text extraction (remove RTF formatting)
        Ok(self.strip_rtf_formatting(&content))
    }

    /// Basic text extraction from binary content
    fn extract_text_from_binary(&self, content: &[u8]) -> String {
        String::from_utf8_lossy(content)
            .chars()
            .filter(|c| c.is_ascii_graphic() || c.is_ascii_whitespace())
            .collect()
    }

    /// Strip RTF formatting
    fn strip_rtf_formatting(&self, content: &str) -> String {
        // Basic RTF tag removal
        let mut result = String::new();
        let mut in_control = false;

        for ch in content.chars() {
            match ch {
                '\\' => in_control = true,
                ' ' | '\n' | '\r' if in_control => {
                    in_control = false;
                    result.push(' ');
                }
                '{' | '}' => {
                    in_control = false;
                }
                _ if !in_control => result.push(ch),
                _ => {}
            }
        }

        result
    }

    /// Classify document type based on content and filename
    async fn classify_document_type(&self, filename: &str) -> Option<DocumentType> {
        let filename_lower = filename.to_lowercase();

        if filename_lower.contains("contract") || filename_lower.contains("agreement") {
            Some(DocumentType::Contract)
        } else if filename_lower.contains("brief") {
            Some(DocumentType::LegalBrief)
        } else if filename_lower.contains("memo") {
            Some(DocumentType::LegalMemo)
        } else if filename_lower.contains("lease") {
            Some(DocumentType::Lease)
        } else if filename_lower.contains("nda") || filename_lower.contains("confidentiality") {
            Some(DocumentType::NDA)
        } else if filename_lower.contains("employment") {
            Some(DocumentType::EmploymentAgreement)
        } else if filename_lower.contains("will") || filename_lower.contains("testament") {
            Some(DocumentType::Will)
        } else if filename_lower.contains("power") && filename_lower.contains("attorney") {
            Some(DocumentType::PowerOfAttorney)
        } else {
            None
        }
    }

    /// Extract legal entities using NLP
    async fn extract_entities(&self, text: &str) -> Result<Vec<LegalEntity>> {
        let mut entities = Vec::new();

        // Use regex patterns for basic entity extraction
        entities.extend(self.extract_monetary_amounts(text));
        entities.extend(self.extract_dates(text));
        entities.extend(self.extract_percentages(text));
        entities.extend(self.extract_case_numbers(text));
        entities.extend(self.extract_legal_terms(text));

        // TODO: Integrate with local NLP model for better entity recognition
        if let Some(llm_manager) = &self.llm_manager {
            entities.extend(self.extract_entities_with_llm(text, llm_manager).await?);
        }

        Ok(entities)
    }

    /// Extract monetary amounts
    fn extract_monetary_amounts(&self, text: &str) -> Vec<LegalEntity> {
        let mut entities = Vec::new();
        let re = regex::Regex::new(r"\$[\d,]+(?:\.\d{2})?").unwrap();

        for mat in re.find_iter(text) {
            entities.push(LegalEntity {
                entity_type: EntityType::MonetaryAmount,
                text: mat.as_str().to_string(),
                confidence: 0.9,
                start_pos: mat.start(),
                end_pos: mat.end(),
                context: self.get_context(text, mat.start(), mat.end()),
            });
        }

        entities
    }

    /// Extract dates
    fn extract_dates(&self, text: &str) -> Vec<LegalEntity> {
        let mut entities = Vec::new();
        let patterns = vec![
            r"\d{1,2}/\d{1,2}/\d{4}",
            r"\d{1,2}-\d{1,2}-\d{4}",
            r"[A-Za-z]+ \d{1,2}, \d{4}",
        ];

        for pattern in patterns {
            let re = regex::Regex::new(pattern).unwrap();
            for mat in re.find_iter(text) {
                entities.push(LegalEntity {
                    entity_type: EntityType::Date,
                    text: mat.as_str().to_string(),
                    confidence: 0.8,
                    start_pos: mat.start(),
                    end_pos: mat.end(),
                    context: self.get_context(text, mat.start(), mat.end()),
                });
            }
        }

        entities
    }

    /// Extract percentages
    fn extract_percentages(&self, text: &str) -> Vec<LegalEntity> {
        let mut entities = Vec::new();
        let re = regex::Regex::new(r"\d+(?:\.\d+)?%").unwrap();

        for mat in re.find_iter(text) {
            entities.push(LegalEntity {
                entity_type: EntityType::Percentage,
                text: mat.as_str().to_string(),
                confidence: 0.9,
                start_pos: mat.start(),
                end_pos: mat.end(),
                context: self.get_context(text, mat.start(), mat.end()),
            });
        }

        entities
    }

    /// Extract case numbers
    fn extract_case_numbers(&self, text: &str) -> Vec<LegalEntity> {
        let mut entities = Vec::new();
        let patterns = vec![
            r"\d{4}-\d+-\d+", // Common case number format
            r"No\. \d+-\d+",
            r"Case No\. \d+-\w+-\d+",
        ];

        for pattern in patterns {
            let re = regex::Regex::new(pattern).unwrap();
            for mat in re.find_iter(text) {
                entities.push(LegalEntity {
                    entity_type: EntityType::CaseNumber,
                    text: mat.as_str().to_string(),
                    confidence: 0.85,
                    start_pos: mat.start(),
                    end_pos: mat.end(),
                    context: self.get_context(text, mat.start(), mat.end()),
                });
            }
        }

        entities
    }

    /// Extract legal terms
    fn extract_legal_terms(&self, text: &str) -> Vec<LegalEntity> {
        let legal_terms = vec![
            "plaintiff",
            "defendant",
            "breach",
            "liability",
            "indemnity",
            "warranty",
            "termination",
            "force majeure",
            "jurisdiction",
            "governing law",
            "arbitration",
            "mediation",
            "injunction",
            "damages",
            "remedy",
            "consideration",
            "covenant",
            "estoppel",
        ];

        let mut entities = Vec::new();
        let text_lower = text.to_lowercase();

        for term in legal_terms {
            if let Some(pos) = text_lower.find(term) {
                entities.push(LegalEntity {
                    entity_type: EntityType::LegalTerm,
                    text: term.to_string(),
                    confidence: 0.7,
                    start_pos: pos,
                    end_pos: pos + term.len(),
                    context: self.get_context(text, pos, pos + term.len()),
                });
            }
        }

        entities
    }

    /// Extract entities using LLM
    async fn extract_entities_with_llm(
        &self,
        text: &str,
        _llm_manager: &Arc<crate::llm_manager::LLMManager>,
    ) -> Result<Vec<LegalEntity>> {
        // TODO: Implement LLM-based entity extraction
        // This would involve sending the text to the local LLM with a prompt
        // for entity recognition and parsing the response
        Ok(Vec::new())
    }

    /// Get context around an entity
    fn get_context(&self, text: &str, start: usize, end: usize) -> String {
        let context_size = 50;
        let context_start = start.saturating_sub(context_size);
        let context_end = (end + context_size).min(text.len());

        text[context_start..context_end].to_string()
    }

    /// Analyze contract clauses
    async fn analyze_clauses(
        &self,
        text: &str,
        doc_type: &Option<DocumentType>,
    ) -> Result<Vec<ContractClause>> {
        if !matches!(
            doc_type,
            Some(DocumentType::Contract)
                | Some(DocumentType::EmploymentAgreement)
                | Some(DocumentType::Lease)
                | Some(DocumentType::NDA)
        ) {
            return Ok(Vec::new());
        }

        let mut clauses = Vec::new();

        // Pattern-based clause detection
        clauses.extend(self.detect_termination_clauses(text));
        clauses.extend(self.detect_liability_clauses(text));
        clauses.extend(self.detect_confidentiality_clauses(text));
        clauses.extend(self.detect_payment_clauses(text));

        Ok(clauses)
    }

    /// Detect termination clauses
    fn detect_termination_clauses(&self, text: &str) -> Vec<ContractClause> {
        let mut clauses = Vec::new();
        let patterns = vec![
            r"(?i)termination.*notice",
            r"(?i)terminate.*agreement",
            r"(?i)end.*contract",
        ];

        for pattern in patterns {
            let re = regex::Regex::new(pattern).unwrap();
            for mat in re.find_iter(text) {
                clauses.push(ContractClause {
                    clause_type: ClauseType::TerminationClause,
                    text: self.get_context(text, mat.start(), mat.end()),
                    risk_level: RiskLevel::Medium,
                    suggestions: vec!["Review termination notice period".to_string()],
                    standard_language: None,
                    page_number: None,
                    section: None,
                });
            }
        }

        clauses
    }

    /// Detect liability clauses
    fn detect_liability_clauses(&self, text: &str) -> Vec<ContractClause> {
        let mut clauses = Vec::new();
        let patterns = vec![
            r"(?i)limitation.*liability",
            r"(?i)liable.*damages",
            r"(?i)responsibility.*loss",
        ];

        for pattern in patterns {
            let re = regex::Regex::new(pattern).unwrap();
            for mat in re.find_iter(text) {
                clauses.push(ContractClause {
                    clause_type: ClauseType::LiabilityClause,
                    text: self.get_context(text, mat.start(), mat.end()),
                    risk_level: RiskLevel::High,
                    suggestions: vec!["Review liability limitations carefully".to_string()],
                    standard_language: None,
                    page_number: None,
                    section: None,
                });
            }
        }

        clauses
    }

    /// Detect confidentiality clauses
    fn detect_confidentiality_clauses(&self, text: &str) -> Vec<ContractClause> {
        let mut clauses = Vec::new();
        let patterns = vec![
            r"(?i)confidential.*information",
            r"(?i)non-disclosure",
            r"(?i)proprietary.*data",
        ];

        for pattern in patterns {
            let re = regex::Regex::new(pattern).unwrap();
            for mat in re.find_iter(text) {
                clauses.push(ContractClause {
                    clause_type: ClauseType::ConfidentialityClause,
                    text: self.get_context(text, mat.start(), mat.end()),
                    risk_level: RiskLevel::Medium,
                    suggestions: vec!["Ensure confidentiality scope is appropriate".to_string()],
                    standard_language: None,
                    page_number: None,
                    section: None,
                });
            }
        }

        clauses
    }

    /// Detect payment clauses
    fn detect_payment_clauses(&self, text: &str) -> Vec<ContractClause> {
        let mut clauses = Vec::new();
        let patterns = vec![
            r"(?i)payment.*due",
            r"(?i)invoice.*days",
            r"(?i)fee.*schedule",
        ];

        for pattern in patterns {
            let re = regex::Regex::new(pattern).unwrap();
            for mat in re.find_iter(text) {
                clauses.push(ContractClause {
                    clause_type: ClauseType::PaymentTerms,
                    text: self.get_context(text, mat.start(), mat.end()),
                    risk_level: RiskLevel::Low,
                    suggestions: vec!["Verify payment terms are acceptable".to_string()],
                    standard_language: None,
                    page_number: None,
                    section: None,
                });
            }
        }

        clauses
    }

    /// Assess document risks
    async fn assess_risks(
        &self,
        _text: &str,
        clauses: &[ContractClause],
    ) -> Result<Vec<RiskAssessment>> {
        let mut risks = Vec::new();

        // Analyze risks based on detected clauses
        for clause in clauses {
            match clause.clause_type {
                ClauseType::LiabilityClause => {
                    risks.push(RiskAssessment {
                        risk_type: RiskType::Financial,
                        description: "Potential unlimited liability exposure".to_string(),
                        severity: RiskLevel::High,
                        likelihood: 0.3,
                        impact: "Could result in significant financial loss".to_string(),
                        mitigation_strategies: vec![
                            "Negotiate liability cap".to_string(),
                            "Obtain insurance coverage".to_string(),
                        ],
                        related_clauses: vec![clause.text.clone()],
                    });
                }
                ClauseType::TerminationClause => {
                    risks.push(RiskAssessment {
                        risk_type: RiskType::Operational,
                        description: "Short termination notice period".to_string(),
                        severity: RiskLevel::Medium,
                        likelihood: 0.5,
                        impact: "Could disrupt business operations".to_string(),
                        mitigation_strategies: vec![
                            "Negotiate longer notice period".to_string(),
                            "Develop contingency plans".to_string(),
                        ],
                        related_clauses: vec![clause.text.clone()],
                    });
                }
                _ => {}
            }
        }

        Ok(risks)
    }

    /// Extract key terms
    async fn extract_key_terms(&self, text: &str) -> Result<Vec<KeyTerm>> {
        // TODO: Implement sophisticated key term extraction
        // This would use TF-IDF or similar algorithms
        Ok(Vec::new())
    }

    /// Extract legal citations
    async fn extract_citations(&self, text: &str) -> Result<Vec<LegalCitation>> {
        let mut citations = Vec::new();

        // Pattern for case citations (simplified)
        let case_pattern = r"(\w+\s+v\.?\s+\w+),?\s*(\d+)\s+(\w+\.?\s*\d*)\s+(\d+)\s*\((\d{4})\)";
        let re = regex::Regex::new(case_pattern).unwrap();

        for cap in re.captures_iter(text) {
            citations.push(LegalCitation {
                citation_text: cap.get(0).unwrap().as_str().to_string(),
                case_name: cap.get(1).map(|m| m.as_str().to_string()),
                court: None,
                year: cap.get(5).and_then(|m| m.as_str().parse().ok()),
                volume: cap.get(2).map(|m| m.as_str().to_string()),
                page: cap.get(4).map(|m| m.as_str().to_string()),
                citation_type: CitationType::CaseLaw,
                verification_status: CitationStatus::Unverified,
            });
        }

        Ok(citations)
    }

    /// Generate document summary
    async fn generate_summary(&self, text: &str) -> Result<Option<String>> {
        // Generate a basic extractive summary
        let sentences: Vec<&str> = text.split('.').collect();
        if sentences.len() < 3 {
            return Ok(None);
        }

        // Simple extractive summary (take first and last sentences)
        let summary = format!(
            "{}. {}",
            sentences.first().unwrap_or(&""),
            sentences.last().unwrap_or(&"")
        );

        Ok(Some(summary))
    }

    /// Analyze sentiment
    async fn analyze_sentiment(&self, _text: &str) -> Result<Option<SentimentScore>> {
        // TODO: Implement sentiment analysis
        // This would be useful for contracts to detect adversarial language
        Ok(None)
    }

    /// Check compliance requirements
    async fn check_compliance(
        &self,
        _text: &str,
        _doc_type: &Option<DocumentType>,
    ) -> Result<Vec<ComplianceFlag>> {
        // TODO: Implement compliance checking
        // This would check against various regulatory requirements
        Ok(Vec::new())
    }

    /// Cache analysis results
    async fn cache_analysis(&self, analysis: &DocumentAnalysis) -> Result<()> {
        let cache_file = self
            .cache_path
            .join(format!("{}.json", analysis.metadata.id));
        let json = serde_json::to_string_pretty(analysis)?;
        fs::write(cache_file, json).await?;
        Ok(())
    }

    /// Extract text from Excel files (.xlsx, .xls)
    async fn extract_text_from_excel(&self, file_path: &Path) -> Result<String> {
        let mut result = String::new();

        match open_workbook::<Xlsx<_>, _>(file_path) {
            Ok(mut workbook) => {
                let sheet_names = workbook.sheet_names();
                for sheet_name in sheet_names {
                    if let Ok(range) = workbook.worksheet_range(&sheet_name) {
                        result.push_str(&format!("=== Sheet: {} ===\n", sheet_name));
                        for row in range.rows() {
                            let row_text: Vec<String> =
                                row.iter().map(|cell| cell.to_string()).collect();
                            result.push_str(&row_text.join("\t"));
                            result.push('\n');
                        }
                        result.push('\n');
                    }
                }
            }
            Err(_) => {
                // Try as .xls format
                match open_workbook::<Xls<_>, _>(file_path) {
                    Ok(mut workbook) => {
                        let sheet_names = workbook.sheet_names();
                        for sheet_name in sheet_names {
                            if let Ok(range) = workbook.worksheet_range(&sheet_name) {
                                result.push_str(&format!("=== Sheet: {} ===\n", sheet_name));
                                for row in range.rows() {
                                    let row_text: Vec<String> =
                                        row.iter().map(|cell| cell.to_string()).collect();
                                    result.push_str(&row_text.join("\t"));
                                    result.push('\n');
                                }
                                result.push('\n');
                            }
                        }
                    }
                    Err(e) => return Err(anyhow::anyhow!("Failed to read Excel file: {}", e)),
                }
            }
        }

        Ok(result)
    }

    /// Extract text from CSV files
    async fn extract_text_from_csv(&self, file_path: &Path) -> Result<String> {
        let content = fs::read_to_string(file_path).await?;
        let mut reader = ReaderBuilder::new()
            .has_headers(true)
            .from_reader(content.as_bytes());

        let mut result = String::new();

        // Add headers
        if let Ok(headers) = reader.headers() {
            result.push_str("Headers: ");
            result.push_str(&headers.iter().collect::<Vec<_>>().join("\t"));
            result.push('\n');
        }

        // Add rows
        for record in reader.records() {
            if let Ok(record) = record {
                result.push_str(&record.iter().collect::<Vec<_>>().join("\t"));
                result.push('\n');
            }
        }

        Ok(result)
    }

    /// Extract text from PowerPoint files (.pptx, .ppt)
    async fn extract_text_from_powerpoint(&self, file_path: &Path) -> Result<String> {
        let content = fs::read(file_path).await?;
        let cursor = Cursor::new(content);

        // PowerPoint files are ZIP archives, extract text from XML files
        if let Ok(mut archive) = zip::ZipArchive::new(cursor) {
            let mut result = String::new();

            // Look for slide content in ppt/slides/ directory
            for i in 0..archive.len() {
                if let Ok(mut file) = archive.by_index(i) {
                    let name = file.name().to_string();
                    if name.starts_with("ppt/slides/slide") && name.ends_with(".xml") {
                        result.push_str(&format!(
                            "=== Slide {} ===\n",
                            name.trim_start_matches("ppt/slides/slide")
                                .trim_end_matches(".xml")
                        ));

                        // Basic XML text extraction (simplified)
                        let mut xml_content = String::new();
                        if file.read_to_string(&mut xml_content).is_ok() {
                            result.push_str(&self.extract_text_from_xml(&xml_content));
                        }
                        result.push('\n');
                    }
                }
            }

            Ok(result)
        } else {
            Err(anyhow::anyhow!(
                "Failed to read PowerPoint file as ZIP archive"
            ))
        }
    }

    /// Basic XML text extraction helper
    fn extract_text_from_xml(&self, xml_content: &str) -> String {
        // Simple text extraction by removing XML tags
        let mut result = String::new();
        let mut in_tag = false;

        for char in xml_content.chars() {
            match char {
                '<' => in_tag = true,
                '>' => in_tag = false,
                _ if !in_tag => result.push(char),
                _ => {}
            }
        }

        // Clean up extra whitespace
        result.split_whitespace().collect::<Vec<_>>().join(" ")
    }
}

// Tauri commands for document analysis
#[tauri::command]
pub async fn analyze_document_file(
    analyzer: tauri::State<'_, Arc<DocumentAnalyzer>>,
    file_path: String,
) -> Result<DocumentAnalysis, String> {
    let path = Path::new(&file_path);
    analyzer
        .analyze_document(path)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_document_types() -> Result<Vec<String>, String> {
    Ok(vec![
        "Contract".to_string(),
        "Legal Brief".to_string(),
        "Case Law".to_string(),
        "Legal Memo".to_string(),
        "Court Filing".to_string(),
        "Employment Agreement".to_string(),
        "NDA".to_string(),
        "Lease".to_string(),
        "Will".to_string(),
        "Power of Attorney".to_string(),
    ])
}
