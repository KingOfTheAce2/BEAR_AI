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
use whatlang::{detect, Lang};
use lopdf::Document as PdfDocument;
// use serde_xml_rs; // Not needed for current implementation
// use stop_words::{get, LANGUAGE}; // Alternative implementation
// use stemmer::Stemmer; // Using built-in implementation

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

        // Update metadata with word count after text extraction
        let mut updated_metadata = metadata;
        updated_metadata.word_count = Some(self.calculate_word_count(&extracted_text));

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
            metadata: updated_metadata,
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

        // Extract text to detect language and count words
        let extracted_text = self.extract_text(file_path).await.unwrap_or_default();
        let language = self.detect_language_from_text(&extracted_text);
        let word_count = self.calculate_word_count(&extracted_text);

        Ok(DocumentMetadata {
            id: Uuid::new_v4().to_string(),
            filename,
            file_type,
            size: file_metadata.len(),
            uploaded_at: chrono::Utc::now(),
            processed_at: Some(chrono::Utc::now()),
            document_type,
            language,
            page_count: self.extract_page_count(file_path).await,
            word_count: Some(word_count),
            security_classification: SecurityLevel::Confidential, // Default to high security
        })
    }

    /// Detect language from text content using whatlang
    fn detect_language_from_text(&self, text: &str) -> String {
        if text.is_empty() {
            return "en".to_string();
        }

        match detect(text) {
            Some(info) => {
                match info.lang() {
                    Lang::Eng => "en".to_string(),
                    Lang::Spa => "es".to_string(),
                    Lang::Fra => "fr".to_string(),
                    Lang::Deu => "de".to_string(),
                    Lang::Ita => "it".to_string(),
                    Lang::Por => "pt".to_string(),
                    Lang::Rus => "ru".to_string(),
                    Lang::Jpn => "ja".to_string(),
                    Lang::Kor => "ko".to_string(),
                    Lang::Cmn => "zh".to_string(),
                    _ => "en".to_string(), // Default to English for other languages
                }
            }
            None => "en".to_string(),
        }
    }

    /// Calculate word count from text
    fn calculate_word_count(&self, text: &str) -> u32 {
        if text.is_empty() {
            return 0;
        }

        text.split_whitespace()
            .filter(|word| {
                // Filter out very short words and non-alphabetic content
                word.len() > 1 && word.chars().any(|c| c.is_alphabetic())
            })
            .count() as u32
    }

    /// Extract page count from document
    async fn extract_page_count(&self, file_path: &Path) -> Option<u32> {
        let extension = file_path
            .extension()
            .and_then(|ext| ext.to_str())
            .unwrap_or("")
            .to_lowercase();

        match extension.as_str() {
            "pdf" => self.extract_pdf_page_count(file_path).await,
            "docx" => self.extract_docx_page_count(file_path).await,
            "pptx" => self.extract_pptx_slide_count(file_path).await,
            _ => None,
        }
    }

    /// Extract page count from PDF using lopdf
    async fn extract_pdf_page_count(&self, file_path: &Path) -> Option<u32> {
        match PdfDocument::load(file_path) {
            Ok(doc) => {
                Some(doc.get_pages().len() as u32)
            }
            Err(_) => {
                log::warn!("Failed to parse PDF for page count: {:?}", file_path);
                None
            }
        }
    }

    /// Extract page count from DOCX (estimated)
    async fn extract_docx_page_count(&self, _file_path: &Path) -> Option<u32> {
        // DOCX page count is complex to determine without rendering
        // Return None for now, could be estimated based on content length
        None
    }

    /// Extract slide count from PPTX
    async fn extract_pptx_slide_count(&self, file_path: &Path) -> Option<u32> {
        match fs::read(file_path).await {
            Ok(content) => {
                let cursor = Cursor::new(content);
                if let Ok(mut archive) = zip::ZipArchive::new(cursor) {
                    let mut slide_count = 0;
                    for i in 0..archive.len() {
                        if let Ok(file) = archive.by_index(i) {
                            let name = file.name();
                            if name.starts_with("ppt/slides/slide") && name.ends_with(".xml") {
                                slide_count += 1;
                            }
                        }
                    }
                    return Some(slide_count);
                }
                None
            }
            Err(_) => None,
        }
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
        let content = fs::read(file_path).await?;
        let cursor = Cursor::new(content);

        match zip::ZipArchive::new(cursor) {
            Ok(mut archive) => {
                let mut result = String::new();

                // Extract text from document.xml
                for i in 0..archive.len() {
                    if let Ok(mut file) = archive.by_index(i) {
                        let name = file.name().to_string();
                        if name == "word/document.xml" {
                            let mut xml_content = String::new();
                            if file.read_to_string(&mut xml_content).is_ok() {
                                result.push_str(&self.extract_text_from_docx_xml(&xml_content));
                            }
                            break;
                        }
                    }
                }

                if result.is_empty() {
                    // Fallback to binary extraction
                    Ok(self.extract_text_from_binary(&fs::read(file_path).await?))
                } else {
                    Ok(result)
                }
            }
            Err(_) => {
                // Fallback to binary extraction
                Ok(self.extract_text_from_binary(&content))
            }
        }
    }

    /// Extract text from DOCX XML content
    fn extract_text_from_docx_xml(&self, xml_content: &str) -> String {
        let mut result = String::new();
        let mut in_text_tag = false;
        let mut current_text = String::new();

        // Simple XML parser for <w:t> tags which contain text in DOCX
        let mut chars = xml_content.chars().peekable();

        while let Some(ch) = chars.next() {
            if ch == '<' {
                // Check if this is a text tag
                let mut tag = String::new();
                while let Some(&next_ch) = chars.peek() {
                    if next_ch == '>' {
                        chars.next(); // consume '>'
                        break;
                    }
                    tag.push(chars.next().unwrap());
                }

                if tag.starts_with("w:t") || tag == "w:t" {
                    in_text_tag = true;
                } else if tag == "/w:t" {
                    in_text_tag = false;
                    if !current_text.is_empty() {
                        result.push_str(&current_text);
                        result.push(' ');
                        current_text.clear();
                    }
                } else if tag.starts_with("w:p") || tag == "w:p" {
                    result.push('\n'); // New paragraph
                }
            } else if in_text_tag {
                current_text.push(ch);
            }
        }

        // Clean up extra whitespace
        result.split_whitespace().collect::<Vec<_>>().join(" ")
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

        // Enhanced entity recognition using pattern matching and context analysis
        entities.extend(self.extract_entities_with_nlp(text));

        // LLM-based entity extraction if available
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

    /// Extract entities using advanced NLP patterns
    fn extract_entities_with_nlp(&self, text: &str) -> Vec<LegalEntity> {
        let mut entities = Vec::new();

        // Extract organization names (basic pattern matching)
        entities.extend(self.extract_organizations(text));

        // Extract person names (basic pattern matching)
        entities.extend(self.extract_person_names(text));

        // Extract locations
        entities.extend(self.extract_locations(text));

        // Extract contract parties
        entities.extend(self.extract_contract_parties(text));

        entities
    }

    /// Extract organization names
    fn extract_organizations(&self, text: &str) -> Vec<LegalEntity> {
        let mut entities = Vec::new();
        let org_patterns = vec![
            r"\b[A-Z][a-z]+ (?:Inc|LLC|Corp|Corporation|Company|Ltd|Limited|LLP|LP)\b",
            r"\b[A-Z][A-Za-z\s]+ (?:Inc|LLC|Corp|Corporation|Company|Ltd|Limited|LLP|LP)\b",
        ];

        for pattern in org_patterns {
            let re = regex::Regex::new(pattern).unwrap();
            for mat in re.find_iter(text) {
                entities.push(LegalEntity {
                    entity_type: EntityType::Organization,
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

    /// Extract person names (basic patterns)
    fn extract_person_names(&self, text: &str) -> Vec<LegalEntity> {
        let mut entities = Vec::new();
        // Pattern for "First Last" format with proper case
        let name_pattern = r"\b[A-Z][a-z]+\s+[A-Z][a-z]+\b";
        let re = regex::Regex::new(name_pattern).unwrap();

        for mat in re.find_iter(text) {
            let name = mat.as_str();
            // Filter out common false positives
            if !self.is_common_false_positive(name) {
                entities.push(LegalEntity {
                    entity_type: EntityType::Person,
                    text: name.to_string(),
                    confidence: 0.6, // Lower confidence for basic pattern matching
                    start_pos: mat.start(),
                    end_pos: mat.end(),
                    context: self.get_context(text, mat.start(), mat.end()),
                });
            }
        }

        entities
    }

    /// Check if a name is likely a false positive
    fn is_common_false_positive(&self, name: &str) -> bool {
        let false_positives = vec![
            "United States", "New York", "Los Angeles", "San Francisco",
            "Supreme Court", "District Court", "Federal Court", "High Court",
            "Legal Brief", "Case Law", "Court Order", "Motion For",
        ];

        false_positives.iter().any(|&fp| name.eq_ignore_ascii_case(fp))
    }

    /// Extract locations
    fn extract_locations(&self, text: &str) -> Vec<LegalEntity> {
        let mut entities = Vec::new();
        let location_patterns = vec![
            r"\b[A-Z][a-z]+,\s+[A-Z]{2}\b", // City, ST format
            r"\b[A-Z][a-z]+\s+[A-Z][a-z]+,\s+[A-Z]{2}\b", // City Name, ST format
        ];

        for pattern in location_patterns {
            let re = regex::Regex::new(pattern).unwrap();
            for mat in re.find_iter(text) {
                entities.push(LegalEntity {
                    entity_type: EntityType::Location,
                    text: mat.as_str().to_string(),
                    confidence: 0.7,
                    start_pos: mat.start(),
                    end_pos: mat.end(),
                    context: self.get_context(text, mat.start(), mat.end()),
                });
            }
        }

        entities
    }

    /// Extract contract parties
    fn extract_contract_parties(&self, text: &str) -> Vec<LegalEntity> {
        let mut entities = Vec::new();
        let party_patterns = vec![
            r"(?i)\bparty\s+(?:a|b|one|two|1|2)[:;]?\s+([A-Z][A-Za-z\s,]+?)(?:\n|\.|,)",
            r"(?i)\bbetween\s+([A-Z][A-Za-z\s,]+?)\s+and\s+([A-Z][A-Za-z\s,]+?)",
            r"(?i)\bagreement\s+between\s+([A-Z][A-Za-z\s,]+?)\s+and\s+([A-Z][A-Za-z\s,]+?)",
        ];

        for pattern in party_patterns {
            let re = regex::Regex::new(pattern).unwrap();
            for cap in re.captures_iter(text) {
                for i in 1..cap.len() {
                    if let Some(party_match) = cap.get(i) {
                        let party_name = party_match.as_str().trim();
                        if !party_name.is_empty() && party_name.len() > 3 {
                            entities.push(LegalEntity {
                                entity_type: EntityType::ContractParty,
                                text: party_name.to_string(),
                                confidence: 0.75,
                                start_pos: party_match.start(),
                                end_pos: party_match.end(),
                                context: self.get_context(text, party_match.start(), party_match.end()),
                            });
                        }
                    }
                }
            }
        }

        entities
    }

    /// Extract entities using LLM
    async fn extract_entities_with_llm(
        &self,
        text: &str,
        llm_manager: &Arc<crate::llm_manager::LLMManager>,
    ) -> Result<Vec<LegalEntity>> {
        // Prepare a structured prompt for entity extraction
        let prompt = format!(
            "Extract legal entities from the following text. Identify persons, organizations, locations, dates, monetary amounts, and legal terms. Return results in JSON format.\n\nText: {}\n\nPlease identify and categorize all entities found.",
            text.chars().take(2000).collect::<String>() // Limit text length for LLM
        );

        match llm_manager.generate_response(&prompt, None).await {
            Ok(response) => {
                // Parse LLM response and convert to LegalEntity objects
                self.parse_llm_entity_response(&response, text)
            }
            Err(e) => {
                log::warn!("LLM entity extraction failed: {}", e);
                Ok(Vec::new())
            }
        }
    }

    /// Parse LLM response for entity extraction
    fn parse_llm_entity_response(&self, response: &str, original_text: &str) -> Result<Vec<LegalEntity>> {
        // This is a simplified parser - in practice, you'd want more robust JSON parsing
        // and error handling for various LLM response formats
        let mut entities = Vec::new();

        // Try to extract entities mentioned in the response
        let lines = response.lines();
        for line in lines {
            if line.to_lowercase().contains("person:") {
                if let Some(name) = self.extract_entity_from_line(line) {
                    if let Some(pos) = original_text.find(&name) {
                        entities.push(LegalEntity {
                            entity_type: EntityType::Person,
                            text: name.clone(),
                            confidence: 0.9,
                            start_pos: pos,
                            end_pos: pos + name.len(),
                            context: self.get_context(original_text, pos, pos + name.len()),
                        });
                    }
                }
            }
            // Similar logic for other entity types...
        }

        Ok(entities)
    }

    /// Extract entity name from LLM response line
    fn extract_entity_from_line(&self, line: &str) -> Option<String> {
        // Simple extraction - look for text after colon
        if let Some(colon_pos) = line.find(':') {
            let entity_text = line[(colon_pos + 1)..].trim();
            if !entity_text.is_empty() {
                return Some(entity_text.to_string());
            }
        }
        None
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

    /// Extract key terms using TF-IDF algorithm
    async fn extract_key_terms(&self, text: &str) -> Result<Vec<KeyTerm>> {
        if text.is_empty() {
            return Ok(Vec::new());
        }

        // Tokenize and clean the text
        let tokens = self.tokenize_text(text);

        // Calculate term frequencies
        let term_frequencies = self.calculate_term_frequencies(&tokens);

        // For simplicity, we'll use a basic scoring approach
        // In a real implementation, you'd calculate IDF across a corpus
        let mut key_terms = Vec::new();

        for (term, frequency) in term_frequencies {
            // Skip very short terms and common words
            if term.len() > 3 && frequency > 1 && !self.is_stop_word(&term) {
                let importance = self.calculate_term_importance(&term, frequency, &tokens);
                let category = self.categorize_term(&term);

                key_terms.push(KeyTerm {
                    term: term.clone(),
                    definition: None, // Could be populated from a legal dictionary
                    importance,
                    frequency,
                    category,
                });
            }
        }

        // Sort by importance and take top terms
        key_terms.sort_by(|a, b| b.importance.partial_cmp(&a.importance).unwrap_or(std::cmp::Ordering::Equal));
        key_terms.truncate(50); // Limit to top 50 terms

        Ok(key_terms)
    }

    /// Tokenize text into meaningful terms
    fn tokenize_text(&self, text: &str) -> Vec<String> {
        text.to_lowercase()
            .split_whitespace()
            .map(|word| {
                // Remove punctuation
                let cleaned: String = word.chars()
                    .filter(|c| c.is_alphanumeric())
                    .collect();

                // Simple stemming (remove common suffixes)
                if cleaned.len() > 2 {
                    self.simple_stem(&cleaned)
                } else {
                    cleaned
                }
            })
            .filter(|word| word.len() > 2)
            .collect()
    }

    /// Simple stemming algorithm (basic suffix removal)
    fn simple_stem(&self, word: &str) -> String {
        let suffixes = vec![
            "ing", "ed", "er", "est", "ly", "tion", "sion", "ness", "ment", "able", "ible"
        ];

        for suffix in suffixes {
            if word.len() > suffix.len() + 2 && word.ends_with(suffix) {
                return word[..word.len() - suffix.len()].to_string();
            }
        }

        word.to_string()
    }

    /// Calculate term frequencies
    fn calculate_term_frequencies(&self, tokens: &[String]) -> HashMap<String, u32> {
        let mut frequencies = HashMap::new();

        for token in tokens {
            *frequencies.entry(token.clone()).or_insert(0) += 1;
        }

        frequencies
    }

    /// Check if a term is a stop word
    fn is_stop_word(&self, term: &str) -> bool {
        let stop_words = vec![
            "a", "an", "and", "are", "as", "at", "be", "by", "for", "from",
            "has", "he", "in", "is", "it", "its", "of", "on", "that", "the",
            "to", "was", "will", "with", "would", "have", "had", "been", "not",
            "but", "or", "can", "could", "should", "may", "might", "must",
            "shall", "this", "these", "those", "they", "them", "their", "there",
            "where", "when", "what", "who", "whom", "which", "how", "why",
        ];
        stop_words.contains(&term.to_lowercase().as_str())
    }

    /// Calculate term importance (simplified TF-IDF-like score)
    fn calculate_term_importance(&self, term: &str, frequency: u32, tokens: &[String]) -> f32 {
        let tf = frequency as f32 / tokens.len() as f32;

        // Boost score for legal terms
        let legal_boost = if self.is_legal_term(term) { 2.0 } else { 1.0 };

        // Simple importance score
        tf * legal_boost * (1.0 + term.len() as f32 / 10.0)
    }

    /// Check if a term is a legal term
    fn is_legal_term(&self, term: &str) -> bool {
        let legal_terms = vec![
            "contract", "agreement", "clause", "breach", "liability",
            "indemnity", "warranty", "termination", "jurisdiction",
            "arbitration", "damages", "remedy", "consideration",
            "covenant", "estoppel", "plaintiff", "defendant",
            "statute", "regulation", "compliance", "negligence",
        ];

        legal_terms.contains(&term.to_lowercase().as_str())
    }

    /// Categorize a term
    fn categorize_term(&self, term: &str) -> TermCategory {
        let term_lower = term.to_lowercase();

        // Legal terms
        if self.is_legal_term(&term_lower) {
            return TermCategory::Legal;
        }

        // Financial terms
        let financial_terms = vec![
            "payment", "fee", "cost", "price", "amount", "dollar",
            "invoice", "billing", "expense", "revenue",
        ];
        if financial_terms.contains(&term_lower.as_str()) {
            return TermCategory::Financial;
        }

        // Temporal terms
        let temporal_terms = vec![
            "date", "time", "day", "month", "year", "deadline",
            "duration", "period", "term", "expiry",
        ];
        if temporal_terms.contains(&term_lower.as_str()) {
            return TermCategory::Temporal;
        }

        // Geographic terms
        let geographic_terms = vec![
            "state", "country", "city", "address", "location",
            "jurisdiction", "venue", "court",
        ];
        if geographic_terms.contains(&term_lower.as_str()) {
            return TermCategory::Geographic;
        }

        // Parties
        let party_terms = vec![
            "party", "client", "customer", "vendor", "contractor",
            "employee", "employer", "licensee", "licensor",
        ];
        if party_terms.contains(&term_lower.as_str()) {
            return TermCategory::Parties;
        }

        // Default to technical
        TermCategory::Technical
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

    /// Analyze sentiment using basic lexicon-based approach
    async fn analyze_sentiment(&self, text: &str) -> Result<Option<SentimentScore>> {
        if text.is_empty() {
            return Ok(None);
        }

        let sentiment_score = self.calculate_sentiment_score(text);
        let emotional_indicators = self.analyze_emotional_indicators(text);

        Ok(Some(SentimentScore {
            overall_sentiment: sentiment_score.0,
            confidence: sentiment_score.1,
            emotional_indicators,
        }))
    }

    /// Calculate basic sentiment score
    fn calculate_sentiment_score(&self, text: &str) -> (f32, f32) {
        let positive_words = vec![
            "agree", "benefit", "good", "positive", "advantage",
            "favorable", "reasonable", "fair", "mutual", "cooperative",
            "satisfactory", "acceptable", "successful", "valuable",
        ];

        let negative_words = vec![
            "breach", "violation", "penalty", "forfeit", "liable",
            "damages", "terminate", "void", "invalid", "dispute",
            "conflict", "adversarial", "hostile", "unfavorable",
            "unreasonable", "excessive", "burden", "risk",
        ];

        let neutral_words = vec![
            "shall", "will", "may", "must", "should", "pursuant",
            "accordance", "hereby", "whereas", "therefore",
        ];

        let words: Vec<&str> = text.to_lowercase().split_whitespace().collect();
        let total_words = words.len() as f32;

        if total_words == 0.0 {
            return (0.0, 0.0);
        }

        let mut positive_count = 0;
        let mut negative_count = 0;
        let mut neutral_count = 0;

        for word in &words {
            let clean_word = word.trim_matches(|c: char| !c.is_alphabetic());

            if positive_words.contains(&clean_word) {
                positive_count += 1;
            } else if negative_words.contains(&clean_word) {
                negative_count += 1;
            } else if neutral_words.contains(&clean_word) {
                neutral_count += 1;
            }
        }

        let sentiment_bearing_words = positive_count + negative_count;
        let confidence = if sentiment_bearing_words > 0 {
            sentiment_bearing_words as f32 / total_words
        } else {
            0.0
        };

        let sentiment = if sentiment_bearing_words > 0 {
            (positive_count as f32 - negative_count as f32) / sentiment_bearing_words as f32
        } else {
            0.0
        };

        (sentiment.clamp(-1.0, 1.0), confidence.clamp(0.0, 1.0))
    }

    /// Analyze emotional indicators in text
    fn analyze_emotional_indicators(&self, text: &str) -> HashMap<String, f32> {
        let mut indicators = HashMap::new();
        let text_lower = text.to_lowercase();

        // Aggression indicators
        let aggressive_terms = vec!["must", "shall", "require", "mandate", "compel"];
        let aggression_score = self.calculate_term_presence(&text_lower, &aggressive_terms);
        indicators.insert("aggression".to_string(), aggression_score);

        // Cooperation indicators
        let cooperative_terms = vec!["mutual", "agree", "cooperate", "collaborate", "work together"];
        let cooperation_score = self.calculate_term_presence(&text_lower, &cooperative_terms);
        indicators.insert("cooperation".to_string(), cooperation_score);

        // Uncertainty indicators
        let uncertainty_terms = vec!["may", "might", "possible", "potential", "subject to"];
        let uncertainty_score = self.calculate_term_presence(&text_lower, &uncertainty_terms);
        indicators.insert("uncertainty".to_string(), uncertainty_score);

        // Risk indicators
        let risk_terms = vec!["risk", "liability", "penalty", "damages", "breach"];
        let risk_score = self.calculate_term_presence(&text_lower, &risk_terms);
        indicators.insert("risk".to_string(), risk_score);

        indicators
    }

    /// Calculate presence of terms in text
    fn calculate_term_presence(&self, text: &str, terms: &[&str]) -> f32 {
        let total_words = text.split_whitespace().count() as f32;
        if total_words == 0.0 {
            return 0.0;
        }

        let term_count = terms.iter()
            .map(|term| text.matches(term).count())
            .sum::<usize>() as f32;

        (term_count / total_words).clamp(0.0, 1.0)
    }

    /// Check compliance requirements
    async fn check_compliance(
        &self,
        text: &str,
        doc_type: &Option<DocumentType>,
    ) -> Result<Vec<ComplianceFlag>> {
        let mut compliance_flags = Vec::new();

        // GDPR compliance checks
        compliance_flags.extend(self.check_gdpr_compliance(text));

        // Contract-specific compliance
        if matches!(doc_type, Some(DocumentType::Contract) | Some(DocumentType::EmploymentAgreement)) {
            compliance_flags.extend(self.check_contract_compliance(text));
        }

        // Employment law compliance
        if matches!(doc_type, Some(DocumentType::EmploymentAgreement)) {
            compliance_flags.extend(self.check_employment_compliance(text));
        }

        // Financial compliance
        compliance_flags.extend(self.check_financial_compliance(text));

        // Accessibility compliance
        compliance_flags.extend(self.check_accessibility_compliance(text));

        Ok(compliance_flags)
    }

    /// Check GDPR compliance
    fn check_gdpr_compliance(&self, text: &str) -> Vec<ComplianceFlag> {
        let mut flags = Vec::new();
        let text_lower = text.to_lowercase();

        // Check for data processing mentions without consent
        if text_lower.contains("personal data") || text_lower.contains("processing") {
            if !text_lower.contains("consent") && !text_lower.contains("lawful basis") {
                flags.push(ComplianceFlag {
                    regulation: "GDPR".to_string(),
                    requirement: "Lawful basis for processing personal data".to_string(),
                    compliance_status: ComplianceStatus::RequiresReview,
                    recommendation: "Ensure explicit consent or other lawful basis is documented".to_string(),
                    priority: RiskLevel::High,
                });
            }
        }

        // Check for data retention clauses
        if text_lower.contains("data") && !text_lower.contains("retention") {
            flags.push(ComplianceFlag {
                regulation: "GDPR".to_string(),
                requirement: "Data retention period specification".to_string(),
                compliance_status: ComplianceStatus::RequiresReview,
                recommendation: "Specify clear data retention periods and deletion procedures".to_string(),
                priority: RiskLevel::Medium,
            });
        }

        flags
    }

    /// Check contract compliance
    fn check_contract_compliance(&self, text: &str) -> Vec<ComplianceFlag> {
        let mut flags = Vec::new();
        let text_lower = text.to_lowercase();

        // Check for governing law clause
        if !text_lower.contains("governing law") && !text_lower.contains("applicable law") {
            flags.push(ComplianceFlag {
                regulation: "Contract Law".to_string(),
                requirement: "Governing law clause".to_string(),
                compliance_status: ComplianceStatus::NonCompliant,
                recommendation: "Include a governing law clause to specify which jurisdiction's laws apply".to_string(),
                priority: RiskLevel::Medium,
            });
        }

        // Check for dispute resolution
        if !text_lower.contains("dispute") && !text_lower.contains("arbitration") {
            flags.push(ComplianceFlag {
                regulation: "Contract Law".to_string(),
                requirement: "Dispute resolution mechanism".to_string(),
                compliance_status: ComplianceStatus::RequiresReview,
                recommendation: "Consider adding dispute resolution procedures (arbitration, mediation, etc.)".to_string(),
                priority: RiskLevel::Low,
            });
        }

        // Check for force majeure clause
        if !text_lower.contains("force majeure") && !text_lower.contains("act of god") {
            flags.push(ComplianceFlag {
                regulation: "Contract Law".to_string(),
                requirement: "Force majeure clause".to_string(),
                compliance_status: ComplianceStatus::RequiresReview,
                recommendation: "Consider adding force majeure clause for unforeseeable circumstances".to_string(),
                priority: RiskLevel::Low,
            });
        }

        flags
    }

    /// Check employment law compliance
    fn check_employment_compliance(&self, text: &str) -> Vec<ComplianceFlag> {
        let mut flags = Vec::new();
        let text_lower = text.to_lowercase();

        // Check for at-will employment disclosure
        if text_lower.contains("at-will") && text_lower.contains("employment") {
            if !text_lower.contains("acknowledge") {
                flags.push(ComplianceFlag {
                    regulation: "Employment Law".to_string(),
                    requirement: "At-will employment acknowledgment".to_string(),
                    compliance_status: ComplianceStatus::RequiresReview,
                    recommendation: "Ensure employee acknowledges at-will employment status".to_string(),
                    priority: RiskLevel::Medium,
                });
            }
        }

        // Check for equal opportunity language
        if !text_lower.contains("equal opportunity") && !text_lower.contains("discrimination") {
            flags.push(ComplianceFlag {
                regulation: "Employment Law".to_string(),
                requirement: "Equal opportunity statement".to_string(),
                compliance_status: ComplianceStatus::RequiresReview,
                recommendation: "Include equal opportunity and non-discrimination clauses".to_string(),
                priority: RiskLevel::Medium,
            });
        }

        flags
    }

    /// Check financial compliance
    fn check_financial_compliance(&self, text: &str) -> Vec<ComplianceFlag> {
        let mut flags = Vec::new();
        let text_lower = text.to_lowercase();

        // Check for payment terms clarity
        if text_lower.contains("payment") {
            if !text_lower.contains("days") && !text_lower.contains("due date") {
                flags.push(ComplianceFlag {
                    regulation: "Commercial Law".to_string(),
                    requirement: "Clear payment terms".to_string(),
                    compliance_status: ComplianceStatus::RequiresReview,
                    recommendation: "Specify exact payment terms and due dates".to_string(),
                    priority: RiskLevel::Medium,
                });
            }
        }

        // Check for interest rate compliance
        if text_lower.contains("interest") && text_lower.contains("%") {
            flags.push(ComplianceFlag {
                regulation: "Usury Laws".to_string(),
                requirement: "Interest rate compliance".to_string(),
                compliance_status: ComplianceStatus::RequiresReview,
                recommendation: "Verify interest rates comply with applicable usury laws".to_string(),
                priority: RiskLevel::High,
            });
        }

        flags
    }

    /// Check accessibility compliance
    fn check_accessibility_compliance(&self, text: &str) -> Vec<ComplianceFlag> {
        let mut flags = Vec::new();
        let text_lower = text.to_lowercase();

        // Check for ADA compliance mentions
        if text_lower.contains("website") || text_lower.contains("digital") {
            if !text_lower.contains("ada") && !text_lower.contains("accessibility") {
                flags.push(ComplianceFlag {
                    regulation: "ADA".to_string(),
                    requirement: "Digital accessibility compliance".to_string(),
                    compliance_status: ComplianceStatus::RequiresReview,
                    recommendation: "Consider ADA compliance requirements for digital services".to_string(),
                    priority: RiskLevel::Medium,
                });
            }
        }

        flags
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

// Include tests
#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[tokio::test]
    async fn test_language_detection() {
        let analyzer = create_test_analyzer().await;

        // Test English text
        let english_text = "This is a legal contract between parties.";
        let lang = analyzer.detect_language_from_text(english_text);
        assert_eq!(lang, "en");

        // Test empty text
        let empty_lang = analyzer.detect_language_from_text("");
        assert_eq!(empty_lang, "en");
    }

    #[tokio::test]
    async fn test_word_count() {
        let analyzer = create_test_analyzer().await;

        let text = "This is a test document with multiple words.";
        let count = analyzer.calculate_word_count(text);
        assert_eq!(count, 8);

        let empty_count = analyzer.calculate_word_count("");
        assert_eq!(empty_count, 0);
    }

    #[tokio::test]
    async fn test_entity_extraction() {
        let analyzer = create_test_analyzer().await;

        let text = "The contract amount is $10,000 due on 12/25/2023. John Smith and ABC Corp agreed.";
        let entities = analyzer.extract_entities(text).await.unwrap();

        // Should find monetary amount, date, and potentially names/organizations
        assert!(!entities.is_empty());

        let monetary_entities: Vec<_> = entities.iter()
            .filter(|e| matches!(e.entity_type, EntityType::MonetaryAmount))
            .collect();
        assert!(!monetary_entities.is_empty());
    }

    #[tokio::test]
    async fn test_sentiment_analysis() {
        let analyzer = create_test_analyzer().await;

        let positive_text = "This agreement is mutually beneficial and fair to all parties.";
        let sentiment = analyzer.analyze_sentiment(positive_text).await.unwrap();
        assert!(sentiment.is_some());

        let negative_text = "This contract contains excessive penalties and unfavorable terms.";
        let negative_sentiment = analyzer.analyze_sentiment(negative_text).await.unwrap();
        assert!(negative_sentiment.is_some());
    }

    #[tokio::test]
    async fn test_key_terms_extraction() {
        let analyzer = create_test_analyzer().await;

        let text = "This legal contract contains liability clauses, termination provisions, and payment terms.";
        let key_terms = analyzer.extract_key_terms(text).await.unwrap();

        // Should extract legal terms
        assert!(!key_terms.is_empty());

        let legal_terms: Vec<_> = key_terms.iter()
            .filter(|t| matches!(t.category, TermCategory::Legal))
            .collect();
        assert!(!legal_terms.is_empty());
    }

    #[tokio::test]
    async fn test_compliance_checking() {
        let analyzer = create_test_analyzer().await;

        let contract_text = "This contract processes personal data without explicit consent.";
        let compliance_flags = analyzer.check_compliance(contract_text, &Some(DocumentType::Contract)).await.unwrap();

        // Should flag GDPR compliance issues
        assert!(!compliance_flags.is_empty());

        let gdpr_flags: Vec<_> = compliance_flags.iter()
            .filter(|f| f.regulation == "GDPR")
            .collect();
        assert!(!gdpr_flags.is_empty());
    }

    #[tokio::test]
    async fn test_stemming() {
        let analyzer = create_test_analyzer().await;

        assert_eq!(analyzer.simple_stem("running"), "runn");
        assert_eq!(analyzer.simple_stem("beautiful"), "beauti");
        assert_eq!(analyzer.simple_stem("agreement"), "agreement");
        assert_eq!(analyzer.simple_stem("cat"), "cat");
    }

    async fn create_test_analyzer() -> DocumentAnalyzer {
        let temp_dir = tempdir().unwrap();
        DocumentAnalyzer::new(temp_dir.path(), None).unwrap()
    }
}
