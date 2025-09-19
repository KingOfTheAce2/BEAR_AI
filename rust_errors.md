
Run cargo fmt --all -- --check
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/chat_export.rs:235:
         let line_height = Mm(6.0);
 
         // Add title
-        current_layer.use_text(&format!("Chat Export: {}", session.title), 16.0, margin_left, y_position, &font_bold);
+        current_layer.use_text(
+            &format!("Chat Export: {}", session.title),
+            16.0,
+            margin_left,
+            y_position,
+            &font_bold,
+        );
         y_position -= line_height * 2.0;
 
         // Add session info
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/chat_export.rs:242:
         if options.include_metadata {
-            current_layer.use_text("Session Information:", 12.0, margin_left, y_position, &font_bold);
+            current_layer.use_text(
+                "Session Information:",
+                12.0,
+                margin_left,
+                y_position,
+                &font_bold,
+            );
             y_position -= line_height;
 
             let info_lines = vec![
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/chat_export.rs:247:
                 format!("Session ID: {}", session.id),
-                format!("Created: {}", session.created_at.format("%Y-%m-%d %H:%M:%S UTC")),
-                format!("Last Updated: {}", session.updated_at.format("%Y-%m-%d %H:%M:%S UTC")),
+                format!(
+                    "Created: {}",
+                    session.created_at.format("%Y-%m-%d %H:%M:%S UTC")
+                ),
+                format!(
+                    "Last Updated: {}",
+                    session.updated_at.format("%Y-%m-%d %H:%M:%S UTC")
+                ),
                 format!("Total Messages: {}", session.messages.len()),
             ];
 
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/chat_export.rs:278:
             };
 
             let header_text = if options.include_timestamps {
-                format!("[{}] {} - {}", index + 1, role_text, message.timestamp.format("%H:%M:%S"))
+                format!(
+                    "[{}] {} - {}",
+                    index + 1,
+                    role_text,
+                    message.timestamp.format("%H:%M:%S")
+                )
             } else {
                 format!("[{}] {}", index + 1, role_text)
             };
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/chat_export.rs:294:
             for word in words {
                 if current_line.len() + word.len() + 1 > MAX_CHARS_PER_LINE {
                     if !current_line.is_empty() {
-                        current_layer.use_text(&current_line, 9.0, margin_left + Mm(5.0), y_position, &font);
+                        current_layer.use_text(
+                            &current_line,
+                            9.0,
+                            margin_left + Mm(5.0),
+                            y_position,
+                            &font,
+                        );
                         y_position -= line_height;
                         current_line.clear();
                     }
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/chat_export.rs:306:
             }
 
             if !current_line.is_empty() {
-                current_layer.use_text(&current_line, 9.0, margin_left + Mm(5.0), y_position, &font);
+                current_layer.use_text(
+                    &current_line,
+                    9.0,
+                    margin_left + Mm(5.0),
+                    y_position,
+                    &font,
+                );
                 y_position -= line_height;
             }
 
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/chat_export.rs:316:
         // Add footer
         y_position = Mm(20.0);
         current_layer.use_text(
-            &format!("Exported on {} using BEAR AI Legal Assistant",
-                    Utc::now().format("%Y-%m-%d %H:%M:%S UTC")),
+            &format!(
+                "Exported on {} using BEAR AI Legal Assistant",
+                Utc::now().format("%Y-%m-%d %H:%M:%S UTC")
+            ),
             8.0,
             margin_left,
             y_position,
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/chat_export.rs:324:
-            &font
+            &font,
         );
 
         // Save PDF
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/chat_export.rs:328:
-        doc.save(&mut std::io::BufWriter::new(std::fs::File::create(&file_path)?))?;
+        doc.save(&mut std::io::BufWriter::new(std::fs::File::create(
+            &file_path,
+        )?))?;
         Ok(file_path)
     }
 
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/chat_export.rs:332:
     /// Get available export formats
     pub fn get_supported_formats() -> Vec<String> {
-        vec![
-            "markdown".to_string(),
-            "txt".to_string(),
-            "pdf".to_string(),
-        ]
+        vec!["markdown".to_string(), "txt".to_string(), "pdf".to_string()]
     }
 
     /// Export to specified format
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/chat_export.rs:369:
         .map_err(|e| format!("Failed to parse export options: {}", e))?;
 
     let exporter = exporter.lock().unwrap();
-    let file_path = exporter.export_session(&session, &format, &options)
+    let file_path = exporter
+        .export_session(&session, &format, &options)
         .await
         .map_err(|e| format!("Export failed: {}", e))?;
 
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/chat_export.rs:405:
 
     serde_json::to_string(&options).map_err(|e| e.to_string())
 }
+
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/document_analyzer.rs:1:
 use anyhow::{Context, Result};
+use calamine::{open_workbook, Reader, Xls, Xlsx};
+use csv::ReaderBuilder;
 use serde::{Deserialize, Serialize};
 use std::collections::HashMap;
+use std::io::Cursor;
 use std::path::{Path, PathBuf};
 use std::sync::Arc;
 use tokio::fs;
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/document_analyzer.rs:7:
 use uuid::Uuid;
-use calamine::{Reader, Xlsx, Xls, open_workbook};
-use csv::ReaderBuilder;
-use std::io::Cursor;
 
 /// Document Analysis Engine for BEAR AI
 /// Provides comprehensive legal document processing and analysis
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/document_analyzer.rs:253:
 
 impl DocumentAnalyzer {
     /// Initialize the document analyzer
-    pub fn new(app_data_dir: &Path, llm_manager: Option<Arc<crate::llm_manager::LLMManager>>) -> Result<Self> {
+    pub fn new(
+        app_data_dir: &Path,
+        llm_manager: Option<Arc<crate::llm_manager::LLMManager>>,
+    ) -> Result<Self> {
         let documents_path = app_data_dir.join("documents");
         let cache_path = app_data_dir.join("analysis_cache");
 
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/document_analyzer.rs:279:
 
         // Perform various analyses
         let entities = self.extract_entities(&extracted_text).await?;
-        let clauses = self.analyze_clauses(&extracted_text, &metadata.document_type).await?;
+        let clauses = self
+            .analyze_clauses(&extracted_text, &metadata.document_type)
+            .await?;
         let risks = self.assess_risks(&extracted_text, &clauses).await?;
         let key_terms = self.extract_key_terms(&extracted_text).await?;
         let citations = self.extract_citations(&extracted_text).await?;
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/document_analyzer.rs:286:
         let summary = self.generate_summary(&extracted_text).await?;
         let sentiment_analysis = self.analyze_sentiment(&extracted_text).await?;
-        let compliance_flags = self.check_compliance(&extracted_text, &metadata.document_type).await?;
+        let compliance_flags = self
+            .check_compliance(&extracted_text, &metadata.document_type)
+            .await?;
 
         let analysis = DocumentAnalysis {
             metadata,
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/document_analyzer.rs:310:
     /// Extract metadata from document
     async fn extract_metadata(&self, file_path: &Path) -> Result<DocumentMetadata> {
         let file_metadata = fs::metadata(file_path).await?;
-        let filename = file_path.file_name()
+        let filename = file_path
+            .file_name()
             .and_then(|name| name.to_str())
             .unwrap_or("unknown")
             .to_string();
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/document_analyzer.rs:317:
 
-        let file_type = file_path.extension()
+        let file_type = file_path
+            .extension()
             .and_then(|ext| ext.to_str())
             .unwrap_or("unknown")
             .to_lowercase();
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/document_analyzer.rs:332:
             processed_at: Some(chrono::Utc::now()),
             document_type,
             language: "en".to_string(), // TODO: Auto-detect language
-            page_count: None, // TODO: Extract from PDF
-            word_count: None, // TODO: Calculate from text
+            page_count: None,           // TODO: Extract from PDF
+            word_count: None,           // TODO: Calculate from text
             security_classification: SecurityLevel::Confidential, // Default to high security
         })
     }
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/document_analyzer.rs:340:
 
     /// Extract text from various document formats
     async fn extract_text(&self, file_path: &Path) -> Result<String> {
-        let extension = file_path.extension()
+        let extension = file_path
+            .extension()
             .and_then(|ext| ext.to_str())
             .unwrap_or("")
             .to_lowercase();
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/document_analyzer.rs:387:
 
     /// Extract text from plain text files
     async fn extract_text_from_txt(&self, file_path: &Path) -> Result<String> {
-        fs::read_to_string(file_path).await
+        fs::read_to_string(file_path)
+            .await
             .context("Failed to read text file")
     }
 
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/document_analyzer.rs:567:
     /// Extract legal terms
     fn extract_legal_terms(&self, text: &str) -> Vec<LegalEntity> {
         let legal_terms = vec![
-            "plaintiff", "defendant", "breach", "liability", "indemnity",
-            "warranty", "termination", "force majeure", "jurisdiction",
-            "governing law", "arbitration", "mediation", "injunction",
-            "damages", "remedy", "consideration", "covenant", "estoppel",
+            "plaintiff",
+            "defendant",
+            "breach",
+            "liability",
+            "indemnity",
+            "warranty",
+            "termination",
+            "force majeure",
+            "jurisdiction",
+            "governing law",
+            "arbitration",
+            "mediation",
+            "injunction",
+            "damages",
+            "remedy",
+            "consideration",
+            "covenant",
+            "estoppel",
         ];
 
         let mut entities = Vec::new();
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/document_analyzer.rs:614:
     }
 
     /// Analyze contract clauses
-    async fn analyze_clauses(&self, text: &str, doc_type: &Option<DocumentType>) -> Result<Vec<ContractClause>> {
-        if !matches!(doc_type, Some(DocumentType::Contract) | Some(DocumentType::EmploymentAgreement) | Some(DocumentType::Lease) | Some(DocumentType::NDA)) {
+    async fn analyze_clauses(
+        &self,
+        text: &str,
+        doc_type: &Option<DocumentType>,
+    ) -> Result<Vec<ContractClause>> {
+        if !matches!(
+            doc_type,
+            Some(DocumentType::Contract)
+                | Some(DocumentType::EmploymentAgreement)
+                | Some(DocumentType::Lease)
+                | Some(DocumentType::NDA)
+        ) {
             return Ok(Vec::new());
         }
 
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/document_analyzer.rs:739:
     }
 
     /// Assess document risks
-    async fn assess_risks(&self, _text: &str, clauses: &[ContractClause]) -> Result<Vec<RiskAssessment>> {
+    async fn assess_risks(
+        &self,
+        _text: &str,
+        clauses: &[ContractClause],
+    ) -> Result<Vec<RiskAssessment>> {
         let mut risks = Vec::new();
 
         // Analyze risks based on detected clauses
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/document_analyzer.rs:820:
         }
 
         // Simple extractive summary (take first and last sentences)
-        let summary = format!("{}. {}",
-                            sentences.first().unwrap_or(&""),
-                            sentences.last().unwrap_or(&""));
+        let summary = format!(
+            "{}. {}",
+            sentences.first().unwrap_or(&""),
+            sentences.last().unwrap_or(&"")
+        );
 
         Ok(Some(summary))
     }
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/document_analyzer.rs:835:
     }
 
     /// Check compliance requirements
-    async fn check_compliance(&self, _text: &str, _doc_type: &Option<DocumentType>) -> Result<Vec<ComplianceFlag>> {
+    async fn check_compliance(
+        &self,
+        _text: &str,
+        _doc_type: &Option<DocumentType>,
+    ) -> Result<Vec<ComplianceFlag>> {
         // TODO: Implement compliance checking
         // This would check against various regulatory requirements
         Ok(Vec::new())
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/document_analyzer.rs:843:
 
     /// Cache analysis results
     async fn cache_analysis(&self, analysis: &DocumentAnalysis) -> Result<()> {
-        let cache_file = self.cache_path.join(format!("{}.json", analysis.metadata.id));
+        let cache_file = self
+            .cache_path
+            .join(format!("{}.json", analysis.metadata.id));
         let json = serde_json::to_string_pretty(analysis)?;
         fs::write(cache_file, json).await?;
         Ok(())
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/document_analyzer.rs:860:
                     if let Ok(range) = workbook.worksheet_range(&sheet_name) {
                         result.push_str(&format!("=== Sheet: {} ===\n", sheet_name));
                         for row in range.rows() {
-                            let row_text: Vec<String> = row.iter()
-                                .map(|cell| cell.to_string())
-                                .collect();
+                            let row_text: Vec<String> =
+                                row.iter().map(|cell| cell.to_string()).collect();
                             result.push_str(&row_text.join("\t"));
                             result.push('\n');
                         }
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/document_analyzer.rs:879:
                             if let Ok(range) = workbook.worksheet_range(&sheet_name) {
                                 result.push_str(&format!("=== Sheet: {} ===\n", sheet_name));
                                 for row in range.rows() {
-                                    let row_text: Vec<String> = row.iter()
-                                        .map(|cell| cell.to_string())
-                                        .collect();
+                                    let row_text: Vec<String> =
+                                        row.iter().map(|cell| cell.to_string()).collect();
                                     result.push_str(&row_text.join("\t"));
                                     result.push('\n');
                                 }
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/document_analyzer.rs:938:
                 if let Ok(file) = archive.by_index(i) {
                     let name = file.name();
                     if name.starts_with("ppt/slides/slide") && name.ends_with(".xml") {
-                        result.push_str(&format!("=== Slide {} ===\n",
+                        result.push_str(&format!(
+                            "=== Slide {} ===\n",
                             name.trim_start_matches("ppt/slides/slide")
-                                .trim_end_matches(".xml")));
+                                .trim_end_matches(".xml")
+                        ));
 
                         // Basic XML text extraction (simplified)
                         if let Ok(xml_content) = std::io::read_to_string(file) {
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/document_analyzer.rs:953:
 
             Ok(result)
         } else {
-            Err(anyhow::anyhow!("Failed to read PowerPoint file as ZIP archive"))
+            Err(anyhow::anyhow!(
+                "Failed to read PowerPoint file as ZIP archive"
+            ))
         }
     }
 
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/document_analyzer.rs:984:
     file_path: String,
 ) -> Result<DocumentAnalysis, String> {
     let path = Path::new(&file_path);
-    analyzer.analyze_document(path).await.map_err(|e| e.to_string())
+    analyzer
+        .analyze_document(path)
+        .await
+        .map_err(|e| e.to_string())
 }
 
 #[tauri::command]
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/document_analyzer.rs:1002:
         "Power of Attorney".to_string(),
     ])
 }
+
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/huggingface.rs:52:
     }
 
     /// Search for legal-relevant models on HuggingFace
-    pub async fn search_legal_models(&self, query: &str, limit: usize) -> Result<ModelSearchResult> {
+    pub async fn search_legal_models(
+        &self,
+        query: &str,
+        limit: usize,
+    ) -> Result<ModelSearchResult> {
         // Enhanced search for legal-specific models
-        let legal_keywords = vec!["legal", "law", "contract", "document", "case", "court", "lawyer", "jurisprudence"];
+        let legal_keywords = vec![
+            "legal",
+            "law",
+            "contract",
+            "document",
+            "case",
+            "court",
+            "lawyer",
+            "jurisprudence",
+        ];
         let enhanced_query = if legal_keywords.iter().any(|k| query.contains(k)) {
             query.to_string()
         } else {
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/huggingface.rs:69:
         params.insert("direction", "-1");
         params.insert("limit", &limit.to_string());
 
-        let response = self.client
+        let response = self
+            .client
             .get(&url)
             .query(&params)
             .send()
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/huggingface.rs:77:
             .context("Failed to search HuggingFace models")?;
 
         if !response.status().is_success() {
-            return Err(anyhow::anyhow!("HuggingFace API error: {}", response.status()));
+            return Err(anyhow::anyhow!(
+                "HuggingFace API error: {}",
+                response.status()
+            ));
         }
 
-        let models: Vec<serde_json::Value> = response.json().await
+        let models: Vec<serde_json::Value> = response
+            .json()
+            .await
             .context("Failed to parse HuggingFace response")?;
 
         let mut hf_models = Vec::new();
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/huggingface.rs:92:
         }
 
         // Sort by legal relevance score
-        hf_models.sort_by(|a, b| b.legal_score.partial_cmp(&a.legal_score).unwrap_or(std::cmp::Ordering::Equal));
+        hf_models.sort_by(|a, b| {
+            b.legal_score
+                .partial_cmp(&a.legal_score)
+                .unwrap_or(std::cmp::Ordering::Equal)
+        });
 
         Ok(ModelSearchResult {
             models: hf_models,
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/huggingface.rs:106:
         let mut model_sets = HashMap::new();
 
         // Contract Analysis Set
-        model_sets.insert("contract_analysis".to_string(), vec![
-            self.get_model_info("microsoft/DialoGPT-legal").await?,
-            self.get_model_info("roberta-legal").await?,
-        ].into_iter().flatten().collect());
+        model_sets.insert(
+            "contract_analysis".to_string(),
+            vec![
+                self.get_model_info("microsoft/DialoGPT-legal").await?,
+                self.get_model_info("roberta-legal").await?,
+            ]
+            .into_iter()
+            .flatten()
+            .collect(),
+        );
 
         // Legal Research Set
-        model_sets.insert("legal_research".to_string(), vec![
-            self.get_model_info("law-ai/InLegalBERT").await?,
-            self.get_model_info("nlpaueb/legal-bert-base-uncased").await?,
-        ].into_iter().flatten().collect());
+        model_sets.insert(
+            "legal_research".to_string(),
+            vec![
+                self.get_model_info("law-ai/InLegalBERT").await?,
+                self.get_model_info("nlpaueb/legal-bert-base-uncased")
+                    .await?,
+            ]
+            .into_iter()
+            .flatten()
+            .collect(),
+        );
 
         // Document Processing Set
-        model_sets.insert("document_processing".to_string(), vec![
-            self.get_model_info("allenai/longformer-base-4096").await?,
-            self.get_model_info("microsoft/layoutlm-base-uncased").await?,
-        ].into_iter().flatten().collect());
+        model_sets.insert(
+            "document_processing".to_string(),
+            vec![
+                self.get_model_info("allenai/longformer-base-4096").await?,
+                self.get_model_info("microsoft/layoutlm-base-uncased")
+                    .await?,
+            ]
+            .into_iter()
+            .flatten()
+            .collect(),
+        );
 
         // General Legal Assistant Set
-        model_sets.insert("general_legal".to_string(), vec![
-            self.get_model_info("microsoft/Phi-3-mini-4k-instruct-gguf").await?,
-            self.get_model_info("TheBloke/Llama-2-7B-Chat-GGUF").await?,
-            self.get_model_info("TheBloke/CodeLlama-7B-Instruct-GGUF").await?,
-        ].into_iter().flatten().collect());
+        model_sets.insert(
+            "general_legal".to_string(),
+            vec![
+                self.get_model_info("microsoft/Phi-3-mini-4k-instruct-gguf")
+                    .await?,
+                self.get_model_info("TheBloke/Llama-2-7B-Chat-GGUF").await?,
+                self.get_model_info("TheBloke/CodeLlama-7B-Instruct-GGUF")
+                    .await?,
+            ]
+            .into_iter()
+            .flatten()
+            .collect(),
+        );
 
         Ok(model_sets)
     }
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/huggingface.rs:144:
         F: Fn(u64, u64) + Send + Sync,
     {
         // Verify download URL and start download
-        let response = self.client
+        let response = self
+            .client
             .get(&model.download_url)
             .send()
             .await
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/huggingface.rs:158:
         let mut downloaded = 0u64;
 
         // Create destination file
-        let mut file = fs::File::create(destination).await
+        let mut file = fs::File::create(destination)
+            .await
             .context("Failed to create destination file")?;
 
         // Stream download with progress tracking
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/huggingface.rs:167:
 
         while let Some(chunk) = stream.next().await {
             let chunk = chunk.context("Failed to read download chunk")?;
-            file.write_all(&chunk).await
+            file.write_all(&chunk)
+                .await
                 .context("Failed to write chunk to file")?;
 
             downloaded += chunk.len() as u64;
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/huggingface.rs:183:
             fs::remove_file(destination).await?;
             return Err(anyhow::anyhow!(
                 "Download verification failed: expected {} bytes, got {}",
-                total_size, file_size
+                total_size,
+                file_size
             ));
         }
 
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/huggingface.rs:190:
         // Verify model format (basic GGUF header check)
         self.verify_gguf_format(destination).await?;
 
-        log::info!("Successfully downloaded model: {} ({} bytes)", model.filename, file_size);
+        log::info!(
+            "Successfully downloaded model: {} ({} bytes)",
+            model.filename,
+            file_size
+        );
         Ok(())
     }
 
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/huggingface.rs:198:
     async fn get_model_info(&self, model_id: &str) -> Result<Option<HuggingFaceModel>> {
         let url = format!("{}/models/{}", self.api_base, model_id);
 
-        let response = self.client
+        let response = self
+            .client
             .get(&url)
             .send()
             .await
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/huggingface.rs:205:
             .context("Failed to get model info")?;
 
         if !response.status().is_success() {
-            log::warn!("Failed to get info for model {}: {}", model_id, response.status());
+            log::warn!(
+                "Failed to get info for model {}: {}",
+                model_id,
+                response.status()
+            );
             return Ok(None);
         }
 
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/huggingface.rs:212:
-        let model_data: serde_json::Value = response.json().await
+        let model_data: serde_json::Value = response
+            .json()
+            .await
             .context("Failed to parse model info")?;
 
         self.parse_model_data(&model_data).await
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/huggingface.rs:218:
     /// Parse model data from HuggingFace API response
     async fn parse_model_data(&self, data: &serde_json::Value) -> Result<Option<HuggingFaceModel>> {
         let model_id = data["id"].as_str().unwrap_or("").to_string();
-        let tags = data["tags"].as_array()
-            .map(|arr| arr.iter().filter_map(|v| v.as_str()).map(|s| s.to_string()).collect())
+        let tags = data["tags"]
+            .as_array()
+            .map(|arr| {
+                arr.iter()
+                    .filter_map(|v| v.as_str())
+                    .map(|s| s.to_string())
+                    .collect()
+            })
             .unwrap_or_default();
 
         // Calculate legal relevance score
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/huggingface.rs:226:
-        let legal_score = self.calculate_legal_score(&model_id, &tags,
-            data["description"].as_str().unwrap_or(""));
+        let legal_score = self.calculate_legal_score(
+            &model_id,
+            &tags,
+            data["description"].as_str().unwrap_or(""),
+        );
 
         // Find GGUF files
         if let Some(siblings) = data["siblings"].as_array() {
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/huggingface.rs:237:
                             sha: file["sha"].as_str().unwrap_or("").to_string(),
                             filename: filename.to_string(),
                             size: file["size"].as_u64().unwrap_or(0),
-                            download_url: format!("https://huggingface.co/{}/resolve/main/{}",
-                                                model_id, filename),
+                            download_url: format!(
+                                "https://huggingface.co/{}/resolve/main/{}",
+                                model_id, filename
+                            ),
                             legal_score,
                             tags: tags.clone(),
                             license: data["license"].as_str().unwrap_or("unknown").to_string(),
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/huggingface.rs:269:
             ("nlp", 0.3),
         ];
 
-        let text_to_check = format!("{} {} {}", model_id, tags.join(" "), description).to_lowercase();
+        let text_to_check =
+            format!("{} {} {}", model_id, tags.join(" "), description).to_lowercase();
 
         for (keyword, weight) in legal_keywords {
             if text_to_check.contains(keyword) {
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/huggingface.rs:310:
     }
 
     /// Check for model updates
-    pub async fn check_model_updates(&self, local_models: &[crate::llm_manager::ModelInfo]) -> Result<Vec<String>> {
+    pub async fn check_model_updates(
+        &self,
+        local_models: &[crate::llm_manager::ModelInfo],
+    ) -> Result<Vec<String>> {
         let mut updates_available = Vec::new();
 
         for local_model in local_models {
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/huggingface.rs:337:
     limit: usize,
 ) -> Result<ModelSearchResult, String> {
     let client = HuggingFaceClient::new();
-    client.search_legal_models(&query, limit).await.map_err(|e| e.to_string())
+    client
+        .search_legal_models(&query, limit)
+        .await
+        .map_err(|e| e.to_string())
 }
 
 #[tauri::command]
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/huggingface.rs:344:
 pub async fn get_legal_model_sets() -> Result<HashMap<String, Vec<HuggingFaceModel>>, String> {
     let client = HuggingFaceClient::new();
-    client.get_legal_model_sets().await.map_err(|e| e.to_string())
+    client
+        .get_legal_model_sets()
+        .await
+        .map_err(|e| e.to_string())
 }
 
 #[tauri::command]
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/huggingface.rs:370:
         description: String::new(),
     };
 
-    client.download_model(&model, destination, None::<fn(u64, u64)>).await
+    client
+        .download_model(&model, destination, None::<fn(u64, u64)>)
+        .await
         .map_err(|e| e.to_string())
 }
 
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/huggingface.rs:379:
     local_models: Vec<crate::llm_manager::ModelInfo>,
 ) -> Result<Vec<String>, String> {
     let client = HuggingFaceClient::new();
-    client.check_model_updates(&local_models).await.map_err(|e| e.to_string())
+    client
+        .check_model_updates(&local_models)
+        .await
+        .map_err(|e| e.to_string())
 }
+
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/licensing.rs:101:
             models_downloaded: 0,
             documents_processed_today: 0,
             agent_executions_today: 0,
-            last_reset: chrono::Utc::now().date_naive().and_hms_opt(0, 0, 0).unwrap().and_utc(),
+            last_reset: chrono::Utc::now()
+                .date_naive()
+                .and_hms_opt(0, 0, 0)
+                .unwrap()
+                .and_utc(),
         });
 
         Ok(Self {
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/licensing.rs:149:
         // Check usage limits
         if let Some(model_limit) = license.model_limit {
             if self.current_usage.models_downloaded >= model_limit {
-                warnings.push(format!("Model download limit reached ({}/{})",
-                                     self.current_usage.models_downloaded, model_limit));
+                warnings.push(format!(
+                    "Model download limit reached ({}/{})",
+                    self.current_usage.models_downloaded, model_limit
+                ));
             }
         }
 
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/licensing.rs:157:
         if let Some(document_limit) = license.document_limit {
             if self.current_usage.documents_processed_today >= document_limit {
-                errors.push(format!("Daily document processing limit exceeded ({}/{})",
-                                   self.current_usage.documents_processed_today, document_limit));
+                errors.push(format!(
+                    "Daily document processing limit exceeded ({}/{})",
+                    self.current_usage.documents_processed_today, document_limit
+                ));
             }
         }
 
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/licensing.rs:164:
         if let Some(agent_limit) = license.agent_limit {
             if self.current_usage.agent_executions_today >= agent_limit {
-                errors.push(format!("Daily agent execution limit exceeded ({}/{})",
-                                   self.current_usage.agent_executions_today, agent_limit));
+                errors.push(format!(
+                    "Daily agent execution limit exceeded ({}/{})",
+                    self.current_usage.agent_executions_today, agent_limit
+                ));
             }
         }
 
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/licensing.rs:232:
     /// Get usage statistics
     pub fn get_usage_stats(&self) -> HashMap<String, u32> {
         let mut stats = HashMap::new();
-        stats.insert("models_downloaded".to_string(), self.current_usage.models_downloaded);
-        stats.insert("documents_processed_today".to_string(), self.current_usage.documents_processed_today);
-        stats.insert("agent_executions_today".to_string(), self.current_usage.agent_executions_today);
+        stats.insert(
+            "models_downloaded".to_string(),
+            self.current_usage.models_downloaded,
+        );
+        stats.insert(
+            "documents_processed_today".to_string(),
+            self.current_usage.documents_processed_today,
+        );
+        stats.insert(
+            "agent_executions_today".to_string(),
+            self.current_usage.agent_executions_today,
+        );
         stats.insert("users_active".to_string(), self.current_usage.users_active);
         stats
     }
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/licensing.rs:244:
         self.current_license.as_ref().map(|license| {
             let mut info = HashMap::new();
             info.insert("license_id".to_string(), license.license_id.clone());
-            info.insert("license_type".to_string(), format!("{:?}", license.license_type));
-            info.insert("organization".to_string(), license.organization.clone().unwrap_or("Individual".to_string()));
+            info.insert(
+                "license_type".to_string(),
+                format!("{:?}", license.license_type),
+            );
+            info.insert(
+                "organization".to_string(),
+                license
+                    .organization
+                    .clone()
+                    .unwrap_or("Individual".to_string()),
+            );
 
             if let Some(expires_at) = license.expires_at {
-                info.insert("expires_at".to_string(), expires_at.format("%Y-%m-%d").to_string());
+                info.insert(
+                    "expires_at".to_string(),
+                    expires_at.format("%Y-%m-%d").to_string(),
+                );
                 let days_remaining = (expires_at - chrono::Utc::now()).num_days();
                 info.insert("days_remaining".to_string(), days_remaining.to_string());
             } else {
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/licensing.rs:256:
                 info.insert("days_remaining".to_string(), "Unlimited".to_string());
             }
 
-            info.insert("features_count".to_string(), license.features.len().to_string());
+            info.insert(
+                "features_count".to_string(),
+                license.features.len().to_string(),
+            );
             info
         })
     }
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/licensing.rs:303:
                 ("models".to_string(), "2".to_string()),
                 ("documents".to_string(), "10/day".to_string()),
                 ("agents".to_string(), "5/day".to_string()),
-                ("features".to_string(), "Basic LLM, Document Analysis".to_string()),
+                (
+                    "features".to_string(),
+                    "Basic LLM, Document Analysis".to_string(),
+                ),
             ]),
             HashMap::from([
                 ("name".to_string(), "Personal".to_string()),
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/licensing.rs:312:
                 ("models".to_string(), "10".to_string()),
                 ("documents".to_string(), "100/day".to_string()),
                 ("agents".to_string(), "50/day".to_string()),
-                ("features".to_string(), "Advanced LLM, Full Document Analysis, Basic Agents".to_string()),
+                (
+                    "features".to_string(),
+                    "Advanced LLM, Full Document Analysis, Basic Agents".to_string(),
+                ),
             ]),
             HashMap::from([
                 ("name".to_string(), "Professional".to_string()),
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/licensing.rs:321:
                 ("models".to_string(), "Unlimited".to_string()),
                 ("documents".to_string(), "1000/day".to_string()),
                 ("agents".to_string(), "500/day".to_string()),
-                ("features".to_string(), "All Features, Multi-Agent Workflows, Priority Support".to_string()),
+                (
+                    "features".to_string(),
+                    "All Features, Multi-Agent Workflows, Priority Support".to_string(),
+                ),
             ]),
             HashMap::from([
                 ("name".to_string(), "Enterprise".to_string()),
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/licensing.rs:330:
                 ("models".to_string(), "Unlimited".to_string()),
                 ("documents".to_string(), "Unlimited".to_string()),
                 ("agents".to_string(), "Unlimited".to_string()),
-                ("features".to_string(), "All Features, Multi-User, Custom Models, Compliance Reporting".to_string()),
+                (
+                    "features".to_string(),
+                    "All Features, Multi-User, Custom Models, Compliance Reporting".to_string(),
+                ),
             ]),
         ]
     }
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/licensing.rs:367:
     }
 
     fn reset_daily_usage_if_needed(&mut self) {
-        let today = chrono::Utc::now().date_naive().and_hms_opt(0, 0, 0).unwrap().and_utc();
+        let today = chrono::Utc::now()
+            .date_naive()
+            .and_hms_opt(0, 0, 0)
+            .unwrap()
+            .and_utc();
         if self.current_usage.last_reset < today {
             self.current_usage.documents_processed_today = 0;
             self.current_usage.agent_executions_today = 0;
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/licensing.rs:399:
     license_jwt: String,
 ) -> Result<(), String> {
     let mut manager = license_manager.lock().unwrap();
-    manager.install_license(&license_jwt).map_err(|e| e.to_string())
+    manager
+        .install_license(&license_jwt)
+        .map_err(|e| e.to_string())
 }
 
 #[tauri::command]
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/licensing.rs:447:
 pub async fn get_available_license_tiers() -> Result<Vec<HashMap<String, String>>, String> {
     Ok(LicenseManager::get_license_tiers())
 }
+
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/llm_manager.rs:168:
     }
 
     /// Download a model from HuggingFace
-    pub async fn download_model(&self, model_id: &str, progress_callback: Option<Box<dyn Fn(u64, u64) + Send>>) -> Result<()> {
+    pub async fn download_model(
+        &self,
+        model_id: &str,
+        progress_callback: Option<Box<dyn Fn(u64, u64) + Send>>,
+    ) -> Result<()> {
         let curated_models = Self::get_curated_legal_models();
-        let model = curated_models.iter()
+        let model = curated_models
+            .iter()
             .find(|m| m.id == model_id)
             .context("Model not found in curated list")?;
 
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/llm_manager.rs:177:
-        let download_url = model.download_url.as_ref()
+        let download_url = model
+            .download_url
+            .as_ref()
             .context("No download URL available for this model")?;
 
         let model_file = self.model_path.join(&model.path);
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/llm_manager.rs:184:
 
         // Use reqwest for downloading with progress
         let client = reqwest::Client::new();
-        let response = client.get(download_url)
+        let response = client
+            .get(download_url)
             .send()
             .await
             .context("Failed to start download")?;
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/llm_manager.rs:192:
         let total_size = response.content_length().unwrap_or(0);
         let mut downloaded = 0u64;
 
-        let mut file = async_fs::File::create(&model_file).await
+        let mut file = async_fs::File::create(&model_file)
+            .await
             .context("Failed to create model file")?;
 
         let mut stream = response.bytes_stream();
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/llm_manager.rs:200:
 
         while let Some(chunk) = stream.next().await {
             let chunk = chunk.context("Failed to read chunk")?;
-            tokio::io::AsyncWriteExt::write_all(&mut file, &chunk).await
+            tokio::io::AsyncWriteExt::write_all(&mut file, &chunk)
+                .await
                 .context("Failed to write chunk")?;
 
             downloaded += chunk.len() as u64;
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/llm_manager.rs:213:
         // Verify download
         let file_size = async_fs::metadata(&model_file).await?.len();
         if total_size > 0 && file_size != total_size {
-            return Err(anyhow::anyhow!("Download verification failed: expected {} bytes, got {}", total_size, file_size));
+            return Err(anyhow::anyhow!(
+                "Download verification failed: expected {} bytes, got {}",
+                total_size,
+                file_size
+            ));
         }
 
         // Update registry
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/llm_manager.rs:231:
     /// Load a model for inference
     pub async fn load_model(&self, model_id: &str) -> Result<String> {
         let registry = self.registry.lock().unwrap();
-        let model = registry.models.get(model_id)
-            .context("Model not found")?;
+        let model = registry.models.get(model_id).context("Model not found")?;
 
         if !model.installed {
             return Err(anyhow::anyhow!("Model {} is not installed", model_id));
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/llm_manager.rs:247:
         let server_port = self.get_available_port().await?;
         let mut cmd = AsyncCommand::new("llama-server");
         cmd.arg("--model")
-           .arg(&model_file)
-           .arg("--port")
-           .arg(server_port.to_string())
-           .arg("--host")
-           .arg("127.0.0.1")
-           .arg("--ctx-size")
-           .arg("4096")
-           .arg("--threads")
-           .arg("8")
-           .stdout(Stdio::piped())
-           .stderr(Stdio::piped());
+            .arg(&model_file)
+            .arg("--port")
+            .arg(server_port.to_string())
+            .arg("--host")
+            .arg("127.0.0.1")
+            .arg("--ctx-size")
+            .arg("4096")
+            .arg("--threads")
+            .arg("8")
+            .stdout(Stdio::piped())
+            .stderr(Stdio::piped());
 
-        let mut child = cmd.spawn()
-            .context("Failed to start llama-server")?;
+        let mut child = cmd.spawn().context("Failed to start llama-server")?;
 
         // Wait for server to be ready
         tokio::time::sleep(tokio::time::Duration::from_secs(3)).await;
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/llm_manager.rs:288:
         if let Some(model) = registry.models.get(model_id) {
             let model_file = self.model_path.join(&model.path);
             if model_file.exists() {
-                async_fs::remove_file(&model_file).await
+                async_fs::remove_file(&model_file)
+                    .await
                     .context("Failed to remove model file")?;
             }
             registry.models.remove(model_id);
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/llm_manager.rs:304:
 
         // Get available memory
         if let Ok(mem_info) = sys_info::mem_info() {
-            info.insert("available_memory_gb".to_string(),
-                       (mem_info.avail / 1024 / 1024).to_string());
-            info.insert("total_memory_gb".to_string(),
-                       (mem_info.total / 1024 / 1024).to_string());
+            info.insert(
+                "available_memory_gb".to_string(),
+                (mem_info.avail / 1024 / 1024).to_string(),
+            );
+            info.insert(
+                "total_memory_gb".to_string(),
+                (mem_info.total / 1024 / 1024).to_string(),
+            );
         }
 
         // Get CPU info
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/llm_manager.rs:324:
     /// Get recommended models based on system capabilities
     pub fn get_recommended_models(&self) -> Result<Vec<String>> {
         let system_info = self.get_system_info()?;
-        let available_memory = system_info.get("available_memory_gb")
+        let available_memory = system_info
+            .get("available_memory_gb")
             .and_then(|s| s.parse::<u64>().ok())
             .unwrap_or(8);
 
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/llm_manager.rs:350:
 
     // Helper methods
     async fn get_available_port(&self) -> Result<u16> {
-        use std::net::{TcpListener, SocketAddr};
+        use std::net::{SocketAddr, TcpListener};
         let listener = TcpListener::bind("127.0.0.1:0")?;
         let port = listener.local_addr()?.port();
         Ok(port)
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/llm_manager.rs:357:
     }
 
     fn save_registry(&self, registry: &ModelRegistry) -> Result<()> {
-        let registry_path = self.model_path.parent()
+        let registry_path = self
+            .model_path
+            .parent()
             .context("Invalid model path")?
             .join("model_registry.json");
 
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/llm_manager.rs:369:
 
 // Integration with Tauri commands
 #[tauri::command]
-pub async fn list_models(manager: tauri::State<'_, Arc<LLMManager>>) -> Result<Vec<ModelInfo>, String> {
+pub async fn list_models(
+    manager: tauri::State<'_, Arc<LLMManager>>,
+) -> Result<Vec<ModelInfo>, String> {
     manager.list_models().await.map_err(|e| e.to_string())
 }
 
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/llm_manager.rs:378:
     manager: tauri::State<'_, Arc<LLMManager>>,
     model_id: String,
 ) -> Result<(), String> {
-    manager.download_model(&model_id, None).await.map_err(|e| e.to_string())
+    manager
+        .download_model(&model_id, None)
+        .await
+        .map_err(|e| e.to_string())
 }
 
 #[tauri::command]
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/llm_manager.rs:386:
     manager: tauri::State<'_, Arc<LLMManager>>,
     model_id: String,
 ) -> Result<String, String> {
-    manager.load_model(&model_id).await.map_err(|e| e.to_string())
+    manager
+        .load_model(&model_id)
+        .await
+        .map_err(|e| e.to_string())
 }
 
 #[tauri::command]
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/llm_manager.rs:394:
     manager: tauri::State<'_, Arc<LLMManager>>,
     model_id: String,
 ) -> Result<(), String> {
-    manager.unload_model(&model_id).await.map_err(|e| e.to_string())
+    manager
+        .unload_model(&model_id)
+        .await
+        .map_err(|e| e.to_string())
 }
 
 #[tauri::command]
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/llm_manager.rs:402:
     manager: tauri::State<'_, Arc<LLMManager>>,
     model_id: String,
 ) -> Result<(), String> {
-    manager.remove_model(&model_id).await.map_err(|e| e.to_string())
+    manager
+        .remove_model(&model_id)
+        .await
+        .map_err(|e| e.to_string())
 }
 
 #[tauri::command]
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/llm_manager.rs:411:
 ) -> Result<Vec<String>, String> {
     manager.get_recommended_models().map_err(|e| e.to_string())
 }
+
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/local_api.rs:102:
 fn generate_uuid() -> String {
     use std::collections::hash_map::DefaultHasher;
     use std::hash::{Hash, Hasher};
-    
+
     let mut hasher = DefaultHasher::new();
     SystemTime::now().hash(&mut hasher);
     format!("local_{:x}", hasher.finish())
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/local_api.rs:115:
             if !session.authenticated {
                 return Ok(false);
             }
-            
+
             // Check if session is expired (24 hours)
             let now = get_current_timestamp()?;
             if now - session.created_at > 86400 {
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/local_api.rs:122:
                 return Ok(false);
             }
-            
+
             Ok(true)
         }
         None => Ok(false),
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/local_api.rs:131:
 fn check_rate_limit(session_id: &str, sessions: &SessionStorage) -> Result<bool, String> {
     const MAX_REQUESTS: u32 = 100;
     const WINDOW_SECONDS: u64 = 60;
-    
+
     let mut sessions_guard = sessions.lock().unwrap();
     if let Some(session) = sessions_guard.get_mut(session_id) {
         let now = get_current_timestamp()?;
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/local_api.rs:138:
-        
+
         // Reset rate limit if window has passed
         if now - session.rate_limit_window_start > WINDOW_SECONDS {
             session.rate_limit_count = 0;
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/local_api.rs:142:
             session.rate_limit_window_start = now;
         }
-        
+
         // Check if over limit
         if session.rate_limit_count >= MAX_REQUESTS {
             return Ok(false);
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/local_api.rs:148:
         }
-        
+
         // Increment count
         session.rate_limit_count += 1;
         session.last_activity = now;
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/local_api.rs:153:
     }
-    
+
     Ok(true)
 }
 
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/local_api.rs:168:
         "demo" if credentials.password == "demo123" => true,
         _ => false,
     };
-    
+
     if is_valid {
         let session_id = generate_uuid();
         let now = get_current_timestamp()?;
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/local_api.rs:175:
-        
+
         let session = LocalSession {
             id: session_id.clone(),
             authenticated: true,
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/local_api.rs:181:
             rate_limit_count: 0,
             rate_limit_window_start: now,
         };
-        
+
         sessions.lock().unwrap().insert(session_id.clone(), session);
-        
+
         Ok(AuthResponse {
             success: true,
             token: Some(format!("local_token_{}", session_id)),
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/local_api.rs:226:
 ) -> Result<AuthResponse, String> {
     if validate_session(&session_id, &sessions)? {
         let now = get_current_timestamp()?;
-        
+
         // Update session activity
         {
             let mut sessions_guard = sessions.lock().unwrap();
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/local_api.rs:234:
                 session.last_activity = now;
             }
         }
-        
+
         Ok(AuthResponse {
             success: true,
             token: Some(format!("local_token_{}", session_id)),
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/local_api.rs:263:
     if !validate_session(&session_id, &sessions)? {
         return Err("Unauthorized".to_string());
     }
-    
+
     if !check_rate_limit(&session_id, &sessions)? {
         return Err("Rate limit exceeded".to_string());
     }
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/local_api.rs:270:
-    
+
     let chat_guard = chat_storage.lock().unwrap();
-    Ok(chat_guard
-        .get(&session_id)
-        .cloned()
-        .unwrap_or_default())
+    Ok(chat_guard.get(&session_id).cloned().unwrap_or_default())
 }
 
 #[tauri::command]
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/local_api.rs:286:
     if !validate_session(&session_id, &sessions)? {
         return Err("Unauthorized".to_string());
     }
-    
+
     if !check_rate_limit(&session_id, &sessions)? {
         return Err("Rate limit exceeded".to_string());
     }
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/local_api.rs:293:
-    
+
     let now = chrono::Utc::now().to_rfc3339();
     let chat_session = ChatSession {
         id: generate_uuid(),
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/local_api.rs:300:
         message_count: 0,
         last_activity: now,
     };
-    
+
     let mut chat_guard = chat_storage.lock().unwrap();
     let user_chats = chat_guard.entry(session_id).or_insert_with(Vec::new);
     user_chats.push(chat_session.clone());
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/local_api.rs:307:
-    
+
     Ok(chat_session)
 }
 
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/local_api.rs:321:
     if !validate_session(&session_id, &sessions)? {
         return Err("Unauthorized".to_string());
     }
-    
+
     if !check_rate_limit(&session_id, &sessions)? {
         return Err("Rate limit exceeded".to_string());
     }
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/local_api.rs:328:
-    
+
     let message = ChatMessage {
         id: generate_uuid(),
         session_id: chat_session_id.clone(),
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/local_api.rs:334:
         timestamp: chrono::Utc::now().to_rfc3339(),
         metadata: None,
     };
-    
+
     // Store message
     let mut message_guard = message_storage.lock().unwrap();
-    let chat_messages = message_guard.entry(chat_session_id.clone()).or_insert_with(Vec::new);
+    let chat_messages = message_guard
+        .entry(chat_session_id.clone())
+        .or_insert_with(Vec::new);
     chat_messages.push(message.clone());
-    
+
     // Update chat session
     let mut chat_guard = chat_storage.lock().unwrap();
     if let Some(user_chats) = chat_guard.get_mut(&session_id) {
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/local_api.rs:348:
             chat.last_activity = message.timestamp.clone();
         }
     }
-    
+
     Ok(message)
 }
 
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/local_api.rs:364:
     if !validate_session(&session_id, &sessions)? {
         return Err("Unauthorized".to_string());
     }
-    
+
     if !check_rate_limit(&session_id, &sessions)? {
         return Err("Rate limit exceeded".to_string());
     }
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/local_api.rs:371:
-    
+
     let message_guard = message_storage.lock().unwrap();
     let messages = message_guard
         .get(&chat_session_id)
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/local_api.rs:375:
         .cloned()
         .unwrap_or_default();
-    
+
     // Apply pagination if specified
     let start = offset.unwrap_or(0) as usize;
     let end = limit.map(|l| start + l as usize).unwrap_or(messages.len());
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/local_api.rs:381:
-    
+
     Ok(messages.into_iter().skip(start).take(end - start).collect())
 }
 
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/local_api.rs:393:
     if !validate_session(&session_id, &sessions)? {
         return Err("Unauthorized".to_string());
     }
-    
+
     // Remove chat session
     let mut chat_guard = chat_storage.lock().unwrap();
     if let Some(user_chats) = chat_guard.get_mut(&session_id) {
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/local_api.rs:400:
         if let Some(pos) = user_chats.iter().position(|c| c.id == chat_session_id) {
             user_chats.remove(pos);
-            
+
             // Remove associated messages
             let mut message_guard = message_storage.lock().unwrap();
             message_guard.remove(&chat_session_id);
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/local_api.rs:406:
-            
+
             return Ok(true);
         }
     }
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/local_api.rs:410:
-    
+
     Ok(false)
 }
 
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/local_api.rs:424:
     if !validate_session(&session_id, &sessions)? {
         return Err("Unauthorized".to_string());
     }
-    
+
     if !check_rate_limit(&session_id, &sessions)? {
         return Err("Rate limit exceeded".to_string());
     }
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/local_api.rs:431:
-    
+
     let doc_guard = document_storage.lock().unwrap();
-    let mut documents = doc_guard
-        .get(&session_id)
-        .cloned()
-        .unwrap_or_default();
-    
+    let mut documents = doc_guard.get(&session_id).cloned().unwrap_or_default();
+
     // Filter by category if specified
     if let Some(cat) = category {
-        documents = documents.into_iter().filter(|d| d.category == cat).collect();
+        documents = documents
+            .into_iter()
+            .filter(|d| d.category == cat)
+            .collect();
     }
-    
+
     // Apply pagination
     let start = offset.unwrap_or(0) as usize;
     let end = limit.map(|l| start + l as usize).unwrap_or(documents.len());
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/local_api.rs:446:
-    
-    Ok(documents.into_iter().skip(start).take(end - start).collect())
+
+    Ok(documents
+        .into_iter()
+        .skip(start)
+        .take(end - start)
+        .collect())
 }
 
 #[tauri::command]
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/local_api.rs:461:
     if !validate_session(&session_id, &sessions)? {
         return Err("Unauthorized".to_string());
     }
-    
+
     if !check_rate_limit(&session_id, &sessions)? {
         return Err("Rate limit exceeded".to_string());
     }
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/local_api.rs:468:
-    
+
     let document = Document {
         id: generate_uuid(),
         name,
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/local_api.rs:476:
         status: "uploaded".to_string(),
         content_type,
     };
-    
+
     let mut doc_guard = document_storage.lock().unwrap();
     let user_docs = doc_guard.entry(session_id).or_insert_with(Vec::new);
     user_docs.push(document.clone());
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/local_api.rs:483:
-    
+
     Ok(document)
 }
 
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/local_api.rs:494:
     if !validate_session(&session_id, &sessions)? {
         return Err("Unauthorized".to_string());
     }
-    
+
     if !check_rate_limit(&session_id, &sessions)? {
         return Err("Rate limit exceeded".to_string());
     }
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/local_api.rs:501:
-    
+
     let doc_guard = document_storage.lock().unwrap();
     if let Some(user_docs) = doc_guard.get(&session_id) {
         let document = user_docs.iter().find(|d| d.id == document_id).cloned();
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/local_api.rs:518:
     if !validate_session(&session_id, &sessions)? {
         return Err("Unauthorized".to_string());
     }
-    
+
     if !check_rate_limit(&session_id, &sessions)? {
         return Err("Rate limit exceeded".to_string());
     }
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/local_api.rs:525:
-    
+
     let mut doc_guard = document_storage.lock().unwrap();
     if let Some(user_docs) = doc_guard.get_mut(&session_id) {
         if let Some(pos) = user_docs.iter().position(|d| d.id == document_id) {
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/local_api.rs:530:
             return Ok(true);
         }
     }
-    
+
     Ok(false)
 }
 
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/local_api.rs:547:
     if !validate_session(&session_id, &sessions)? {
         return Err("Unauthorized".to_string());
     }
-    
+
     if !check_rate_limit(&session_id, &sessions)? {
         return Err("Rate limit exceeded".to_string());
     }
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/local_api.rs:554:
-    
+
     let mut doc_guard = document_storage.lock().unwrap();
     if let Some(user_docs) = doc_guard.get_mut(&session_id) {
         if let Some(document) = user_docs.iter_mut().find(|d| d.id == document_id) {
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/local_api.rs:567:
             return Ok(Some(document.clone()));
         }
     }
-    
+
     Ok(None)
 }
 
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/local_api.rs:581:
     if !validate_session(&session_id, &sessions)? {
         return Err("Unauthorized".to_string());
     }
-    
+
     if !check_rate_limit(&session_id, &sessions)? {
         return Err("Rate limit exceeded".to_string());
     }
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/local_api.rs:588:
-    
+
     // Mock search results - in production, integrate with local search engine
     let mut results = HashMap::new();
     results.insert("query".to_string(), serde_json::json!(query.query));
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/local_api.rs:593:
     results.insert("total".to_string(), serde_json::json!(0));
     results.insert("processing_time_ms".to_string(), serde_json::json!(50));
     results.insert("local_search".to_string(), serde_json::json!(true));
-    
+
     Ok(results)
 }
 
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/local_api.rs:607:
     if !validate_session(&session_id, &sessions)? {
         return Err("Unauthorized".to_string());
     }
-    
+
     if !check_rate_limit(&session_id, &sessions)? {
         return Err("Rate limit exceeded".to_string());
     }
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/local_api.rs:614:
-    
+
     // Mock analysis results - in production, integrate with local AI models
     let mut results = HashMap::new();
     results.insert("id".to_string(), serde_json::json!(generate_uuid()));
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/local_api.rs:618:
-    results.insert("document_id".to_string(), serde_json::json!(request.document_id));
+    results.insert(
+        "document_id".to_string(),
+        serde_json::json!(request.document_id),
+    );
     results.insert("type".to_string(), serde_json::json!(request.analysis_type));
-    results.insert("result".to_string(), serde_json::json!({
-        "summary": "Analysis completed using local processing",
-        "confidence": 0.95,
-        "local_processing": true
-    }));
-    results.insert("created_at".to_string(), serde_json::json!(chrono::Utc::now().to_rfc3339()));
+    results.insert(
+        "result".to_string(),
+        serde_json::json!({
+            "summary": "Analysis completed using local processing",
+            "confidence": 0.95,
+            "local_processing": true
+        }),
+    );
+    results.insert(
+        "created_at".to_string(),
+        serde_json::json!(chrono::Utc::now().to_rfc3339()),
+    );
     results.insert("processing_time_ms".to_string(), serde_json::json!(1200));
-    
+
     Ok(results)
 }
 
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/local_api.rs:638:
 ) -> Result<HashMap<String, serde_json::Value>, String> {
     let sessions_count = sessions.lock().unwrap().len();
     let chat_count: usize = chat_storage.lock().unwrap().values().map(|v| v.len()).sum();
-    let document_count: usize = document_storage.lock().unwrap().values().map(|v| v.len()).sum();
-    let message_count: usize = message_storage.lock().unwrap().values().map(|v| v.len()).sum();
-    
+    let document_count: usize = document_storage
+        .lock()
+        .unwrap()
+        .values()
+        .map(|v| v.len())
+        .sum();
+    let message_count: usize = message_storage
+        .lock()
+        .unwrap()
+        .values()
+        .map(|v| v.len())
+        .sum();
+
     let mut health = HashMap::new();
     health.insert("status".to_string(), serde_json::json!("healthy"));
-    health.insert("timestamp".to_string(), serde_json::json!(chrono::Utc::now().to_rfc3339()));
+    health.insert(
+        "timestamp".to_string(),
+        serde_json::json!(chrono::Utc::now().to_rfc3339()),
+    );
     health.insert("version".to_string(), serde_json::json!("1.0.0-local"));
     health.insert("local_only".to_string(), serde_json::json!(true));
     health.insert("sessions".to_string(), serde_json::json!(sessions_count));
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/local_api.rs:650:
     health.insert("chats".to_string(), serde_json::json!(chat_count));
     health.insert("documents".to_string(), serde_json::json!(document_count));
     health.insert("messages".to_string(), serde_json::json!(message_count));
-    
+
     Ok(health)
 }
 
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/local_api.rs:666:
     if !validate_session(&session_id, &sessions)? {
         return Err("Unauthorized".to_string());
     }
-    
-    let user_chats = chat_storage.lock().unwrap()
+
+    let user_chats = chat_storage
+        .lock()
+        .unwrap()
         .get(&session_id)
         .map(|v| v.len())
         .unwrap_or(0);
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/local_api.rs:674:
-    
-    let user_documents = document_storage.lock().unwrap()
+
+    let user_documents = document_storage
+        .lock()
+        .unwrap()
         .get(&session_id)
         .map(|v| v.len())
         .unwrap_or(0);
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/local_api.rs:679:
-    
-    let user_messages: usize = message_storage.lock().unwrap()
+
+    let user_messages: usize = message_storage
+        .lock()
+        .unwrap()
         .iter()
         .filter_map(|(_, messages)| {
             // Find messages that belong to user's chat sessions
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/local_api.rs:684:
-            let user_chat_ids: Vec<String> = chat_storage.lock().unwrap()
+            let user_chat_ids: Vec<String> = chat_storage
+                .lock()
+                .unwrap()
                 .get(&session_id)
                 .map(|chats| chats.iter().map(|c| c.id.clone()).collect())
                 .unwrap_or_default();
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/local_api.rs:688:
-            
-            if messages.iter().any(|m| user_chat_ids.contains(&m.session_id)) {
+
+            if messages
+                .iter()
+                .any(|m| user_chat_ids.contains(&m.session_id))
+            {
                 Some(messages.len())
             } else {
                 None
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/local_api.rs:693:
             }
         })
         .sum();
-    
+
     let mut stats = HashMap::new();
     stats.insert("user_chats".to_string(), serde_json::json!(user_chats));
-    stats.insert("user_documents".to_string(), serde_json::json!(user_documents));
-    stats.insert("user_messages".to_string(), serde_json::json!(user_messages));
+    stats.insert(
+        "user_documents".to_string(),
+        serde_json::json!(user_documents),
+    );
+    stats.insert(
+        "user_messages".to_string(),
+        serde_json::json!(user_messages),
+    );
     stats.insert("local_only".to_string(), serde_json::json!(true));
-    
+
     Ok(stats)
 }
+
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/main.rs:1:
 // Prevents additional console window on Windows in release
 #![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
 
+use std::collections::HashMap;
 use tauri::{
     CustomMenuItem, Manager, SystemTray, SystemTrayEvent, SystemTrayMenu, SystemTrayMenuItem,
     Window, WindowBuilder, WindowUrl,
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/main.rs:7:
 };
-use std::collections::HashMap;
 
-mod local_api;
-mod llm_manager;
-mod huggingface;
+mod chat_export;
 mod document_analyzer;
+mod huggingface;
+mod licensing;
+mod llm_manager;
+mod local_api;
 mod mcp_server;
 mod security;
-mod licensing;
-mod chat_export;
 
 use local_api::*;
 use std::sync::{Arc, Mutex};
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/main.rs:28:
 #[tauri::command]
 async fn get_system_info() -> Result<HashMap<String, String>, String> {
     let mut info = HashMap::new();
-    
+
     info.insert("platform".to_string(), std::env::consts::OS.to_string());
     info.insert("arch".to_string(), std::env::consts::ARCH.to_string());
     info.insert("version".to_string(), env!("CARGO_PKG_VERSION").to_string());
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/main.rs:35:
-    
+
     Ok(info)
 }
 
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/main.rs:61:
     let quit = CustomMenuItem::new("quit".to_string(), "Quit BEAR AI");
     let show = CustomMenuItem::new("show".to_string(), "Show Window");
     let hide = CustomMenuItem::new("hide".to_string(), "Hide Window");
-    
+
     let tray_menu = SystemTrayMenu::new()
         .add_item(show)
         .add_item(hide)
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/main.rs:108:
 
 fn main() {
     init_logging();
-    
+
     tauri::Builder::default()
         .system_tray(create_tray())
         .on_system_tray_event(handle_tray_event)
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/main.rs:202:
                 // Additional Windows-specific setup
                 log::info!("Setting up Windows-specific configurations");
             }
-            
+
             // Handle window close to minimize to tray instead of exit
             let app_handle = app.handle();
             window.on_window_event(move |event| {
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/main.rs:218:
                     _ => {}
                 }
             });
-            
+
             log::info!("BEAR AI Legal Assistant started successfully");
             Ok(())
         })
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/main.rs:225:
         .run(tauri::generate_context!())
         .expect("error while running tauri application");
 }
+
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/mcp_server.rs:204:
 
     /// Start the MCP server
     pub async fn start(&self) -> Result<()> {
-        let listener = TcpListener::bind(format!("127.0.0.1:{}", self.port)).await
+        let listener = TcpListener::bind(format!("127.0.0.1:{}", self.port))
+            .await
             .context("Failed to bind MCP server")?;
 
         log::info!("MCP Server started on port {}", self.port);
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/mcp_server.rs:240:
     /// Execute an agent task
     pub async fn execute_task(&self, task: AgentTask) -> Result<AgentResponse> {
         let agents = self.agents.lock().unwrap();
-        let agent = agents.get(&task.agent_id)
+        let agent = agents
+            .get(&task.agent_id)
             .context("Agent not found")?
             .clone();
         drop(agents);
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/mcp_server.rs:257:
         let prompt = agent.prompt_template.replace("{input}", &task.input);
 
         // Execute with the assigned model
-        let model_id = agent.model_id.as_ref()
+        let model_id = agent
+            .model_id
+            .as_ref()
             .unwrap_or(&"phi3-mini-legal".to_string());
 
         let response_text = self.execute_with_model(model_id, &prompt).await?;
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/mcp_server.rs:290:
     }
 
     /// Execute a workflow
-    pub async fn execute_workflow(&self, workflow_id: &str, input: HashMap<String, String>) -> Result<HashMap<String, AgentResponse>> {
+    pub async fn execute_workflow(
+        &self,
+        workflow_id: &str,
+        input: HashMap<String, String>,
+    ) -> Result<HashMap<String, AgentResponse>> {
         let workflows = self.workflows.lock().unwrap();
-        let workflow = workflows.get(workflow_id)
+        let workflow = workflows
+            .get(workflow_id)
             .context("Workflow not found")?
             .clone();
         drop(workflows);
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/mcp_server.rs:307:
             // Check dependencies
             for dep in &step.dependencies {
                 if !step_outputs.contains_key(dep) {
-                    return Err(anyhow::anyhow!("Dependency {} not satisfied for step {}", dep, step.step_id));
+                    return Err(anyhow::anyhow!(
+                        "Dependency {} not satisfied for step {}",
+                        dep,
+                        step.step_id
+                    ));
                 }
             }
 
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/mcp_server.rs:323:
 
             // Find agent for this step
             let agents = self.agents.lock().unwrap();
-            let agent = agents.values()
+            let agent = agents
+                .values()
                 .find(|a| matches!(a.agent_type, step.agent_type))
                 .context("No agent found for step")?
                 .clone();
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/mcp_server.rs:337:
                 context: input.clone(),
                 priority: TaskPriority::Normal,
                 created_at: chrono::Utc::now(),
-                deadline: Some(chrono::Utc::now() + chrono::Duration::seconds(step.timeout_seconds as i64)),
+                deadline: Some(
+                    chrono::Utc::now() + chrono::Duration::seconds(step.timeout_seconds as i64),
+                ),
             };
 
             let response = self.execute_task(task).await?;
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/mcp_server.rs:370:
             .await
             .context("Failed to call local model API")?;
 
-        let response_json: serde_json::Value = response.json().await
+        let response_json: serde_json::Value = response
+            .json()
+            .await
             .context("Failed to parse model response")?;
 
         let text = response_json["choices"][0]["text"]
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/mcp_server.rs:386:
         let mut workflows = self.workflows.lock().unwrap();
 
         // Contract Review Workflow
-        workflows.insert("contract_review".to_string(), WorkflowDefinition {
-            id: "contract_review".to_string(),
-            name: "Comprehensive Contract Review".to_string(),
-            description: "Multi-agent workflow for thorough contract analysis".to_string(),
-            legal_domain: LegalDomain::ContractLaw,
-            steps: vec![
-                WorkflowStep {
-                    step_id: "initial_analysis".to_string(),
-                    agent_type: AgentType::ContractAnalyzer,
-                    input_mapping: HashMap::from([("contract".to_string(), "contract_text".to_string())]),
-                    dependencies: Vec::new(),
-                    timeout_seconds: 300,
-                },
-                WorkflowStep {
-                    step_id: "risk_assessment".to_string(),
-                    agent_type: AgentType::RiskAssessor,
-                    input_mapping: HashMap::from([("analysis".to_string(), "initial_analysis".to_string())]),
-                    dependencies: vec!["initial_analysis".to_string()],
-                    timeout_seconds: 240,
-                },
-                WorkflowStep {
-                    step_id: "compliance_check".to_string(),
-                    agent_type: AgentType::ComplianceChecker,
-                    input_mapping: HashMap::from([("contract".to_string(), "contract_text".to_string())]),
-                    dependencies: vec!["initial_analysis".to_string()],
-                    timeout_seconds: 180,
-                },
-            ],
-        });
+        workflows.insert(
+            "contract_review".to_string(),
+            WorkflowDefinition {
+                id: "contract_review".to_string(),
+                name: "Comprehensive Contract Review".to_string(),
+                description: "Multi-agent workflow for thorough contract analysis".to_string(),
+                legal_domain: LegalDomain::ContractLaw,
+                steps: vec![
+                    WorkflowStep {
+                        step_id: "initial_analysis".to_string(),
+                        agent_type: AgentType::ContractAnalyzer,
+                        input_mapping: HashMap::from([(
+                            "contract".to_string(),
+                            "contract_text".to_string(),
+                        )]),
+                        dependencies: Vec::new(),
+                        timeout_seconds: 300,
+                    },
+                    WorkflowStep {
+                        step_id: "risk_assessment".to_string(),
+                        agent_type: AgentType::RiskAssessor,
+                        input_mapping: HashMap::from([(
+                            "analysis".to_string(),
+                            "initial_analysis".to_string(),
+                        )]),
+                        dependencies: vec!["initial_analysis".to_string()],
+                        timeout_seconds: 240,
+                    },
+                    WorkflowStep {
+                        step_id: "compliance_check".to_string(),
+                        agent_type: AgentType::ComplianceChecker,
+                        input_mapping: HashMap::from([(
+                            "contract".to_string(),
+                            "contract_text".to_string(),
+                        )]),
+                        dependencies: vec!["initial_analysis".to_string()],
+                        timeout_seconds: 180,
+                    },
+                ],
+            },
+        );
 
         // Legal Research Workflow
-        workflows.insert("legal_research".to_string(), WorkflowDefinition {
-            id: "legal_research".to_string(),
-            name: "Comprehensive Legal Research".to_string(),
-            description: "Multi-agent workflow for in-depth legal research".to_string(),
-            legal_domain: LegalDomain::General,
-            steps: vec![
-                WorkflowStep {
-                    step_id: "case_research".to_string(),
-                    agent_type: AgentType::LegalResearcher,
-                    input_mapping: HashMap::from([("question".to_string(), "research_question".to_string())]),
-                    dependencies: Vec::new(),
-                    timeout_seconds: 600,
-                },
-                WorkflowStep {
-                    step_id: "risk_analysis".to_string(),
-                    agent_type: AgentType::RiskAssessor,
-                    input_mapping: HashMap::from([("research".to_string(), "case_research".to_string())]),
-                    dependencies: vec!["case_research".to_string()],
-                    timeout_seconds: 300,
-                },
-            ],
-        });
+        workflows.insert(
+            "legal_research".to_string(),
+            WorkflowDefinition {
+                id: "legal_research".to_string(),
+                name: "Comprehensive Legal Research".to_string(),
+                description: "Multi-agent workflow for in-depth legal research".to_string(),
+                legal_domain: LegalDomain::General,
+                steps: vec![
+                    WorkflowStep {
+                        step_id: "case_research".to_string(),
+                        agent_type: AgentType::LegalResearcher,
+                        input_mapping: HashMap::from([(
+                            "question".to_string(),
+                            "research_question".to_string(),
+                        )]),
+                        dependencies: Vec::new(),
+                        timeout_seconds: 600,
+                    },
+                    WorkflowStep {
+                        step_id: "risk_analysis".to_string(),
+                        agent_type: AgentType::RiskAssessor,
+                        input_mapping: HashMap::from([(
+                            "research".to_string(),
+                            "case_research".to_string(),
+                        )]),
+                        dependencies: vec!["case_research".to_string()],
+                        timeout_seconds: 300,
+                    },
+                ],
+            },
+        );
 
         log::info!("Initialized {} default workflows", workflows.len());
         Ok(())
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/mcp_server.rs:511:
     workflow_id: String,
     input: HashMap<String, String>,
 ) -> Result<HashMap<String, AgentResponse>, String> {
-    server.execute_workflow(&workflow_id, input).await.map_err(|e| e.to_string())
+    server
+        .execute_workflow(&workflow_id, input)
+        .await
+        .map_err(|e| e.to_string())
 }
 
 #[tauri::command]
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/mcp_server.rs:543:
 ) -> Result<Option<AgentResponse>, String> {
     Ok(server.get_task_result(&task_id))
 }
+
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/security.rs:1:
-use anyhow::{Context, Result};
 use aes_gcm::{
     aead::{Aead, AeadCore, KeyInit, OsRng},
     Aes256Gcm, Key, Nonce,
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/security.rs:5:
 };
+use anyhow::{Context, Result};
 use ring::digest;
 use serde::{Deserialize, Serialize};
 use std::collections::HashMap;
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/security.rs:141:
             return Ok(data.to_vec());
         }
 
-        let key = self.encryption_key.as_ref()
+        let key = self
+            .encryption_key
+            .as_ref()
             .context("Encryption key not available")?;
 
         let cipher = Aes256Gcm::new(key);
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/security.rs:148:
         let nonce = Aes256Gcm::generate_nonce(&mut OsRng);
 
-        let ciphertext = cipher.encrypt(&nonce, data)
+        let ciphertext = cipher
+            .encrypt(&nonce, data)
             .map_err(|e| anyhow::anyhow!("Encryption failed: {}", e))?;
 
         // Prepend nonce to ciphertext
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/security.rs:167:
             return Err(anyhow::anyhow!("Invalid encrypted data format"));
         }
 
-        let key = self.encryption_key.as_ref()
+        let key = self
+            .encryption_key
+            .as_ref()
             .context("Encryption key not available")?;
 
         let cipher = Aes256Gcm::new(key);
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/security.rs:174:
         let (nonce_bytes, ciphertext) = encrypted_data.split_at(12);
         let nonce = Nonce::from_slice(nonce_bytes);
 
-        cipher.decrypt(nonce, ciphertext)
+        cipher
+            .decrypt(nonce, ciphertext)
             .map_err(|e| anyhow::anyhow!("Decryption failed: {}", e))
     }
 
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/security.rs:204:
         }
 
         // Log the operation
-        self.log_security_action(SecurityAction::DocumentUpload,
-                                document_path.to_string_lossy().as_ref(),
-                                ActionOutcome::Success,
-                                None).await?;
+        self.log_security_action(
+            SecurityAction::DocumentUpload,
+            document_path.to_string_lossy().as_ref(),
+            ActionOutcome::Success,
+            None,
+        )
+        .await?;
 
         Ok(())
     }
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/security.rs:215:
     /// Secure document retrieval
     pub async fn secure_document_retrieve(&self, document_path: &Path) -> Result<Vec<u8>> {
         let file_hash = self.hash_file_path(document_path);
-        let secure_path = self.app_data_dir.join("secure_documents").join(format!("{}.enc", file_hash));
+        let secure_path = self
+            .app_data_dir
+            .join("secure_documents")
+            .join(format!("{}.enc", file_hash));
 
         if !secure_path.exists() {
             return Err(anyhow::anyhow!("Secure document not found"));
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/security.rs:228:
         let content = self.decrypt_data(&encrypted_content)?;
 
         // Log the operation
-        self.log_security_action(SecurityAction::DocumentAccess,
-                                document_path.to_string_lossy().as_ref(),
-                                ActionOutcome::Success,
-                                None).await?;
+        self.log_security_action(
+            SecurityAction::DocumentAccess,
+            document_path.to_string_lossy().as_ref(),
+            ActionOutcome::Success,
+            None,
+        )
+        .await?;
 
         Ok(content)
     }
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/security.rs:268:
     }
 
     /// Grant permissions to user
-    pub fn grant_permission(&mut self, user_id: String, permissions: Vec<Permission>, granted_by: String, expires_at: Option<chrono::DateTime<chrono::Utc>>) {
+    pub fn grant_permission(
+        &mut self,
+        user_id: String,
+        permissions: Vec<Permission>,
+        granted_by: String,
+        expires_at: Option<chrono::DateTime<chrono::Utc>>,
+    ) {
         let access_permissions = AccessPermissions {
             user_id: user_id.clone(),
             permissions,
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/security.rs:351:
 
     /// Generate secure session token
     pub fn generate_session_token(&self) -> String {
-        use ring::rand::{SystemRandom, SecureRandom};
+        use ring::rand::{SecureRandom, SystemRandom};
 
         let rng = SystemRandom::new();
         let mut token = [0u8; 32];
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/security.rs:376:
     /// Record failed attempt
     pub fn record_failed_attempt(&mut self, identifier: &str) {
         let attempts = self.failed_attempts.get(identifier).unwrap_or(&0) + 1;
-        self.failed_attempts.insert(identifier.to_string(), attempts);
+        self.failed_attempts
+            .insert(identifier.to_string(), attempts);
     }
 
     /// Clear failed attempts
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/security.rs:432:
     content: Vec<u8>,
 ) -> Result<(), String> {
     let security_manager = security.lock().unwrap();
-    security_manager.secure_document_store(Path::new(&document_path), &content)
+    security_manager
+        .secure_document_store(Path::new(&document_path), &content)
         .await
         .map_err(|e| e.to_string())
 }
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/security.rs:443:
     document_path: String,
 ) -> Result<Vec<u8>, String> {
     let security_manager = security.lock().unwrap();
-    security_manager.secure_document_retrieve(Path::new(&document_path))
+    security_manager
+        .secure_document_retrieve(Path::new(&document_path))
         .await
         .map_err(|e| e.to_string())
 }
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/security.rs:454:
     content: Vec<u8>,
 ) -> Result<bool, String> {
     let security_manager = security.lock().unwrap();
-    security_manager.scan_document_content(&content)
+    security_manager
+        .scan_document_content(&content)
         .await
         .map_err(|e| e.to_string())
 }
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/security.rs:476:
     security_manager.update_config(config);
     Ok(())
 }
+
Error: Process completed with exit code 1.