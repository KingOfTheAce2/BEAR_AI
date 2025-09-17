use anyhow::{Context, Result};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::Path;
use tokio::fs;
use tokio::io::AsyncWriteExt;

/// HuggingFace Hub integration for BEAR AI
/// Handles secure model discovery and downloading
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HuggingFaceModel {
    pub id: String,
    pub model_id: String,
    pub sha: String,
    pub filename: String,
    pub size: u64,
    pub download_url: String,
    pub legal_score: f32, // AI-generated score for legal relevance
    pub tags: Vec<String>,
    pub license: String,
    pub paper: Option<String>,
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelSearchResult {
    pub models: Vec<HuggingFaceModel>,
    pub total_count: usize,
    pub search_query: String,
}

#[derive(Debug)]
pub struct HuggingFaceClient {
    client: Client,
    api_base: String,
}

impl HuggingFaceClient {
    /// Create a new HuggingFace client
    pub fn new() -> Self {
        let client = Client::builder()
            .user_agent("BEAR-AI-Legal-Assistant/1.0")
            .timeout(std::time::Duration::from_secs(30))
            .build()
            .expect("Failed to create HTTP client");

        Self {
            client,
            api_base: "https://huggingface.co/api".to_string(),
        }
    }

    /// Search for legal-relevant models on HuggingFace
    pub async fn search_legal_models(&self, query: &str, limit: usize) -> Result<ModelSearchResult> {
        // Enhanced search for legal-specific models
        let legal_keywords = vec!["legal", "law", "contract", "document", "case", "court", "lawyer", "jurisprudence"];
        let enhanced_query = if legal_keywords.iter().any(|k| query.contains(k)) {
            query.to_string()
        } else {
            format!("{} legal", query)
        };

        let url = format!("{}/models", self.api_base);
        let mut params = HashMap::new();
        params.insert("search", enhanced_query.as_str());
        params.insert("filter", "gguf"); // Focus on GGUF models for local inference
        params.insert("sort", "downloads");
        params.insert("direction", "-1");
        params.insert("limit", &limit.to_string());

        let response = self.client
            .get(&url)
            .query(&params)
            .send()
            .await
            .context("Failed to search HuggingFace models")?;

        if !response.status().is_success() {
            return Err(anyhow::anyhow!("HuggingFace API error: {}", response.status()));
        }

        let models: Vec<serde_json::Value> = response.json().await
            .context("Failed to parse HuggingFace response")?;

        let mut hf_models = Vec::new();

        for model_data in models {
            if let Some(model) = self.parse_model_data(&model_data).await? {
                hf_models.push(model);
            }
        }

        // Sort by legal relevance score
        hf_models.sort_by(|a, b| b.legal_score.partial_cmp(&a.legal_score).unwrap_or(std::cmp::Ordering::Equal));

        Ok(ModelSearchResult {
            models: hf_models,
            total_count: models.len(),
            search_query: enhanced_query,
        })
    }

    /// Get curated legal model sets
    pub async fn get_legal_model_sets(&self) -> Result<HashMap<String, Vec<HuggingFaceModel>>> {
        let mut model_sets = HashMap::new();

        // Contract Analysis Set
        model_sets.insert("contract_analysis".to_string(), vec![
            self.get_model_info("microsoft/DialoGPT-legal").await?,
            self.get_model_info("roberta-legal").await?,
        ].into_iter().flatten().collect());

        // Legal Research Set
        model_sets.insert("legal_research".to_string(), vec![
            self.get_model_info("law-ai/InLegalBERT").await?,
            self.get_model_info("nlpaueb/legal-bert-base-uncased").await?,
        ].into_iter().flatten().collect());

        // Document Processing Set
        model_sets.insert("document_processing".to_string(), vec![
            self.get_model_info("allenai/longformer-base-4096").await?,
            self.get_model_info("microsoft/layoutlm-base-uncased").await?,
        ].into_iter().flatten().collect());

        // General Legal Assistant Set
        model_sets.insert("general_legal".to_string(), vec![
            self.get_model_info("microsoft/Phi-3-mini-4k-instruct-gguf").await?,
            self.get_model_info("TheBloke/Llama-2-7B-Chat-GGUF").await?,
            self.get_model_info("TheBloke/CodeLlama-7B-Instruct-GGUF").await?,
        ].into_iter().flatten().collect());

        Ok(model_sets)
    }

    /// Download a model with progress tracking
    pub async fn download_model<F>(
        &self,
        model: &HuggingFaceModel,
        destination: &Path,
        progress_callback: Option<F>,
    ) -> Result<()>
    where
        F: Fn(u64, u64) + Send + Sync,
    {
        // Verify download URL and start download
        let response = self.client
            .get(&model.download_url)
            .send()
            .await
            .context("Failed to start model download")?;

        if !response.status().is_success() {
            return Err(anyhow::anyhow!("Download failed: {}", response.status()));
        }

        let total_size = response.content_length().unwrap_or(0);
        let mut downloaded = 0u64;

        // Create destination file
        let mut file = fs::File::create(destination).await
            .context("Failed to create destination file")?;

        // Stream download with progress tracking
        let mut stream = response.bytes_stream();
        use tokio_stream::StreamExt;

        while let Some(chunk) = stream.next().await {
            let chunk = chunk.context("Failed to read download chunk")?;
            file.write_all(&chunk).await
                .context("Failed to write chunk to file")?;

            downloaded += chunk.len() as u64;

            if let Some(ref callback) = progress_callback {
                callback(downloaded, total_size);
            }
        }

        // Verify download integrity
        let file_size = fs::metadata(destination).await?.len();
        if total_size > 0 && file_size != total_size {
            fs::remove_file(destination).await?;
            return Err(anyhow::anyhow!(
                "Download verification failed: expected {} bytes, got {}",
                total_size, file_size
            ));
        }

        // Verify model format (basic GGUF header check)
        self.verify_gguf_format(destination).await?;

        log::info!("Successfully downloaded model: {} ({} bytes)", model.filename, file_size);
        Ok(())
    }

    /// Get detailed model information
    async fn get_model_info(&self, model_id: &str) -> Result<Option<HuggingFaceModel>> {
        let url = format!("{}/models/{}", self.api_base, model_id);

        let response = self.client
            .get(&url)
            .send()
            .await
            .context("Failed to get model info")?;

        if !response.status().is_success() {
            log::warn!("Failed to get info for model {}: {}", model_id, response.status());
            return Ok(None);
        }

        let model_data: serde_json::Value = response.json().await
            .context("Failed to parse model info")?;

        self.parse_model_data(&model_data).await
    }

    /// Parse model data from HuggingFace API response
    async fn parse_model_data(&self, data: &serde_json::Value) -> Result<Option<HuggingFaceModel>> {
        let model_id = data["id"].as_str().unwrap_or("").to_string();
        let tags = data["tags"].as_array()
            .map(|arr| arr.iter().filter_map(|v| v.as_str()).map(|s| s.to_string()).collect())
            .unwrap_or_default();

        // Calculate legal relevance score
        let legal_score = self.calculate_legal_score(&model_id, &tags,
            data["description"].as_str().unwrap_or(""));

        // Find GGUF files
        if let Some(siblings) = data["siblings"].as_array() {
            for file in siblings {
                if let Some(filename) = file["rfilename"].as_str() {
                    if filename.ends_with(".gguf") || filename.ends_with(".ggml") {
                        return Ok(Some(HuggingFaceModel {
                            id: uuid::Uuid::new_v4().to_string(),
                            model_id: model_id.clone(),
                            sha: file["sha"].as_str().unwrap_or("").to_string(),
                            filename: filename.to_string(),
                            size: file["size"].as_u64().unwrap_or(0),
                            download_url: format!("https://huggingface.co/{}/resolve/main/{}",
                                                model_id, filename),
                            legal_score,
                            tags: tags.clone(),
                            license: data["license"].as_str().unwrap_or("unknown").to_string(),
                            paper: data["paper"].as_str().map(|s| s.to_string()),
                            description: data["description"].as_str().unwrap_or("").to_string(),
                        }));
                    }
                }
            }
        }

        Ok(None)
    }

    /// Calculate legal relevance score for a model
    fn calculate_legal_score(&self, model_id: &str, tags: &[String], description: &str) -> f32 {
        let mut score = 0.0;

        // Legal keywords with weights
        let legal_keywords = vec![
            ("legal", 3.0),
            ("law", 2.5),
            ("contract", 2.0),
            ("court", 2.0),
            ("lawyer", 1.5),
            ("document", 1.0),
            ("text", 0.5),
            ("nlp", 0.3),
        ];

        let text_to_check = format!("{} {} {}", model_id, tags.join(" "), description).to_lowercase();

        for (keyword, weight) in legal_keywords {
            if text_to_check.contains(keyword) {
                score += weight;
            }
        }

        // Boost for instruction-tuned models
        if text_to_check.contains("instruct") || text_to_check.contains("chat") {
            score += 1.0;
        }

        // Boost for GGUF format
        if tags.iter().any(|tag| tag.contains("gguf")) {
            score += 1.5;
        }

        // Normalize score to 0-10 range
        (score / 10.0).min(10.0)
    }

    /// Verify GGUF file format
    async fn verify_gguf_format(&self, file_path: &Path) -> Result<()> {
        let mut file = fs::File::open(file_path).await?;
        let mut header = [0u8; 4];

        use tokio::io::AsyncReadExt;
        file.read_exact(&mut header).await?;

        // GGUF magic number
        if &header == b"GGUF" {
            Ok(())
        } else if &header == b"GGML" {
            Ok(()) // Also accept GGML format
        } else {
            Err(anyhow::anyhow!("Invalid model file format"))
        }
    }

    /// Check for model updates
    pub async fn check_model_updates(&self, local_models: &[crate::llm_manager::ModelInfo]) -> Result<Vec<String>> {
        let mut updates_available = Vec::new();

        for local_model in local_models {
            if let Some(url) = &local_model.download_url {
                // Extract model ID from URL
                if let Some(model_id) = url.split('/').nth(3) {
                    if let Ok(Some(remote_model)) = self.get_model_info(model_id).await {
                        if remote_model.sha != local_model.version {
                            updates_available.push(local_model.id.clone());
                        }
                    }
                }
            }
        }

        Ok(updates_available)
    }
}

// Tauri commands for HuggingFace integration
#[tauri::command]
pub async fn search_huggingface_models(
    query: String,
    limit: usize,
) -> Result<ModelSearchResult, String> {
    let client = HuggingFaceClient::new();
    client.search_legal_models(&query, limit).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_legal_model_sets() -> Result<HashMap<String, Vec<HuggingFaceModel>>, String> {
    let client = HuggingFaceClient::new();
    client.get_legal_model_sets().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn download_huggingface_model(
    model_id: String,
    download_url: String,
    filename: String,
    destination_path: String,
) -> Result<(), String> {
    let client = HuggingFaceClient::new();
    let destination = Path::new(&destination_path);

    let model = HuggingFaceModel {
        id: model_id.clone(),
        model_id,
        sha: String::new(),
        filename,
        size: 0,
        download_url,
        legal_score: 0.0,
        tags: Vec::new(),
        license: String::new(),
        paper: None,
        description: String::new(),
    };

    client.download_model(&model, destination, None::<fn(u64, u64)>).await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn check_model_updates(
    local_models: Vec<crate::llm_manager::ModelInfo>,
) -> Result<Vec<String>, String> {
    let client = HuggingFaceClient::new();
    client.check_model_updates(&local_models).await.map_err(|e| e.to_string())
}