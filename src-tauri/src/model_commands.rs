use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::process::Stdio;
use std::fs;
use log::{info, warn, error, debug};
use tokio::process::Command as TokioCommand;
use reqwest::Client;
use futures::stream::StreamExt;
use bytes::Bytes;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tokio::io::AsyncWriteExt;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ModelInfo {
    pub id: String,
    pub name: String,
    pub description: String,
    pub size: ModelSize,
    pub requirements: ModelRequirements,
    pub capabilities: ModelCapabilities,
    pub status: ModelStatus,
    pub local_path: Option<String>,
    pub download_url: Option<String>,
    pub checksum: Option<String>,
    pub license: String,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ModelSize {
    pub parameters: String, // e.g., "7B", "13B", "70B"
    pub file_size: u64, // bytes
    pub memory_required: u64, // bytes
    pub vram_required: u64, // bytes (for GPU inference)
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ModelRequirements {
    pub minimum_ram: u64, // bytes
    pub recommended_ram: u64, // bytes
    pub minimum_vram: u64, // bytes
    pub recommended_vram: u64, // bytes
    pub cpu_cores: u32,
    pub storage_space: u64, // bytes
    pub supports_cpu: bool,
    pub supports_gpu: bool,
    pub supports_metal: bool,
    pub quantization_levels: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ModelCapabilities {
    pub tasks: Vec<String>, // "text-generation", "code-generation", "chat", etc.
    pub languages: Vec<String>,
    pub context_length: u32,
    pub fine_tuned: bool,
    pub instruction_following: bool,
    pub reasoning: bool,
    pub coding: bool,
    pub math: bool,
    pub multimodal: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub enum ModelStatus {
    Available,     // Available for download
    Downloading,   // Currently downloading
    Installing,    // Installing/extracting
    Installed,     // Ready to use
    Running,       // Currently loaded and running
    Error,         // Error state
    Updating,      // Updating to newer version
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DownloadProgress {
    pub model_id: String,
    pub bytes_downloaded: u64,
    pub total_bytes: u64,
    pub percentage: f32,
    pub speed: u64, // bytes per second
    pub eta_seconds: u64, // estimated time remaining
    pub status: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ModelConfig {
    pub model_path: String,
    pub context_length: u32,
    pub temperature: f32,
    pub top_p: f32,
    pub top_k: u32,
    pub repeat_penalty: f32,
    pub gpu_layers: u32,
    pub threads: u32,
    pub batch_size: u32,
    pub quantization: String,
    pub mmap: bool,
    pub mlock: bool,
}

impl Default for ModelConfig {
    fn default() -> Self {
        Self {
            model_path: String::new(),
            context_length: 2048,
            temperature: 0.7,
            top_p: 0.9,
            top_k: 40,
            repeat_penalty: 1.1,
            gpu_layers: 0,
            threads: num_cpus::get() as u32,
            batch_size: 512,
            quantization: "q4_0".to_string(),
            mmap: true,
            mlock: false,
        }
    }
}

pub struct ModelManager {
    models: Arc<Mutex<HashMap<String, ModelInfo>>>,
    models_directory: PathBuf,
    download_progress: Arc<Mutex<HashMap<String, DownloadProgress>>>,
    running_models: Arc<Mutex<HashMap<String, ModelProcess>>>,
    client: Client,
}

#[derive(Debug)]
struct ModelProcess {
    process: tokio::process::Child,
    config: ModelConfig,
    started_at: Instant,
    port: u16,
}

impl ModelManager {
    pub fn new(models_directory: PathBuf) -> Result<Self> {
        // Create models directory if it doesn't exist
        fs::create_dir_all(&models_directory)?;

        let client = Client::builder()
            .timeout(Duration::from_secs(300))
            .build()?;

        let mut manager = Self {
            models: Arc::new(Mutex::new(HashMap::new())),
            models_directory,
            download_progress: Arc::new(Mutex::new(HashMap::new())),
            running_models: Arc::new(Mutex::new(HashMap::new())),
            client,
        };

        // Load available models
        manager.refresh_model_catalog()?;

        Ok(manager)
    }

    // Refresh the model catalog with predefined models
    pub fn refresh_model_catalog(&mut self) -> Result<()> {
        let mut models = self.models.lock().unwrap();

        // Define popular models for legal/coding use
        let predefined_models = vec![
            ModelInfo {
                id: "llama-2-7b-chat".to_string(),
                name: "Llama 2 7B Chat".to_string(),
                description: "Meta's Llama 2 7B model fine-tuned for chat applications".to_string(),
                size: ModelSize {
                    parameters: "7B".to_string(),
                    file_size: 3_800_000_000, // ~3.8GB
                    memory_required: 8_000_000_000, // 8GB
                    vram_required: 4_000_000_000, // 4GB
                },
                requirements: ModelRequirements {
                    minimum_ram: 8_000_000_000,
                    recommended_ram: 16_000_000_000,
                    minimum_vram: 0,
                    recommended_vram: 4_000_000_000,
                    cpu_cores: 4,
                    storage_space: 5_000_000_000,
                    supports_cpu: true,
                    supports_gpu: true,
                    supports_metal: true,
                    quantization_levels: vec!["fp16".to_string(), "q8_0".to_string(), "q4_0".to_string()],
                },
                capabilities: ModelCapabilities {
                    tasks: vec!["chat".to_string(), "text-generation".to_string()],
                    languages: vec!["en".to_string(), "es".to_string(), "fr".to_string()],
                    context_length: 4096,
                    fine_tuned: true,
                    instruction_following: true,
                    reasoning: true,
                    coding: false,
                    math: true,
                    multimodal: false,
                },
                status: ModelStatus::Available,
                local_path: None,
                download_url: Some("https://huggingface.co/TheBloke/Llama-2-7B-Chat-GGML".to_string()),
                checksum: None,
                license: "Custom".to_string(),
                created_at: chrono::Utc::now().timestamp(),
                updated_at: chrono::Utc::now().timestamp(),
            },
            ModelInfo {
                id: "codellama-7b-instruct".to_string(),
                name: "Code Llama 7B Instruct".to_string(),
                description: "Meta's Code Llama 7B model fine-tuned for code generation and instruction following".to_string(),
                size: ModelSize {
                    parameters: "7B".to_string(),
                    file_size: 3_800_000_000,
                    memory_required: 8_000_000_000,
                    vram_required: 4_000_000_000,
                },
                requirements: ModelRequirements {
                    minimum_ram: 8_000_000_000,
                    recommended_ram: 16_000_000_000,
                    minimum_vram: 0,
                    recommended_vram: 4_000_000_000,
                    cpu_cores: 4,
                    storage_space: 5_000_000_000,
                    supports_cpu: true,
                    supports_gpu: true,
                    supports_metal: true,
                    quantization_levels: vec!["fp16".to_string(), "q8_0".to_string(), "q4_0".to_string()],
                },
                capabilities: ModelCapabilities {
                    tasks: vec!["code-generation".to_string(), "text-generation".to_string()],
                    languages: vec!["en".to_string()],
                    context_length: 16384,
                    fine_tuned: true,
                    instruction_following: true,
                    reasoning: true,
                    coding: true,
                    math: true,
                    multimodal: false,
                },
                status: ModelStatus::Available,
                local_path: None,
                download_url: Some("https://huggingface.co/TheBloke/CodeLlama-7B-Instruct-GGML".to_string()),
                checksum: None,
                license: "Custom".to_string(),
                created_at: chrono::Utc::now().timestamp(),
                updated_at: chrono::Utc::now().timestamp(),
            },
            ModelInfo {
                id: "phi-2".to_string(),
                name: "Phi-2".to_string(),
                description: "Microsoft's small but capable 2.7B parameter model".to_string(),
                size: ModelSize {
                    parameters: "2.7B".to_string(),
                    file_size: 1_600_000_000, // ~1.6GB
                    memory_required: 4_000_000_000, // 4GB
                    vram_required: 2_000_000_000, // 2GB
                },
                requirements: ModelRequirements {
                    minimum_ram: 4_000_000_000,
                    recommended_ram: 8_000_000_000,
                    minimum_vram: 0,
                    recommended_vram: 2_000_000_000,
                    cpu_cores: 2,
                    storage_space: 2_500_000_000,
                    supports_cpu: true,
                    supports_gpu: true,
                    supports_metal: true,
                    quantization_levels: vec!["fp16".to_string(), "q8_0".to_string(), "q4_0".to_string()],
                },
                capabilities: ModelCapabilities {
                    tasks: vec!["text-generation".to_string(), "code-generation".to_string()],
                    languages: vec!["en".to_string()],
                    context_length: 2048,
                    fine_tuned: true,
                    instruction_following: true,
                    reasoning: true,
                    coding: true,
                    math: true,
                    multimodal: false,
                },
                status: ModelStatus::Available,
                local_path: None,
                download_url: Some("https://huggingface.co/microsoft/phi-2".to_string()),
                checksum: None,
                license: "MIT".to_string(),
                created_at: chrono::Utc::now().timestamp(),
                updated_at: chrono::Utc::now().timestamp(),
            },
        ];

        for model in predefined_models {
            // Check if model is already installed
            let model_path = self.models_directory.join(&model.id);
            let mut updated_model = model.clone();

            if model_path.exists() {
                updated_model.status = ModelStatus::Installed;
                updated_model.local_path = Some(model_path.to_string_lossy().to_string());
            }

            models.insert(model.id.clone(), updated_model);
        }

        info!("Model catalog refreshed with {} models", models.len());
        Ok(())
    }

    // List all available models
    pub fn list_models(&self) -> Vec<ModelInfo> {
        let models = self.models.lock().unwrap();
        models.values().cloned().collect()
    }

    // Get specific model info
    pub fn get_model(&self, model_id: &str) -> Option<ModelInfo> {
        let models = self.models.lock().unwrap();
        models.get(model_id).cloned()
    }

    // Download and install a model
    pub async fn download_model(&self, model_id: &str, quantization: Option<String>) -> Result<()> {
        let model_info = {
            let models = self.models.lock().unwrap();
            models.get(model_id).cloned()
        };

        let mut model_info = model_info.ok_or_else(|| anyhow!("Model not found: {}", model_id))?;

        if model_info.status == ModelStatus::Installed {
            return Ok(());
        }

        // Update status to downloading
        {
            let mut models = self.models.lock().unwrap();
            if let Some(model) = models.get_mut(model_id) {
                model.status = ModelStatus::Downloading;
            }
        }

        let download_url = model_info.download_url
            .ok_or_else(|| anyhow!("No download URL available for model: {}", model_id))?;

        let model_dir = self.models_directory.join(model_id);
        fs::create_dir_all(&model_dir)?;

        // Initialize download progress
        {
            let mut progress = self.download_progress.lock().unwrap();
            progress.insert(model_id.to_string(), DownloadProgress {
                model_id: model_id.to_string(),
                bytes_downloaded: 0,
                total_bytes: model_info.size.file_size,
                percentage: 0.0,
                speed: 0,
                eta_seconds: 0,
                status: "Starting download".to_string(),
            });
        }

        // Download model files
        match self.download_model_files(&download_url, &model_dir, model_id).await {
            Ok(_) => {
                // Update model status to installed
                {
                    let mut models = self.models.lock().unwrap();
                    if let Some(model) = models.get_mut(model_id) {
                        model.status = ModelStatus::Installed;
                        model.local_path = Some(model_dir.to_string_lossy().to_string());
                    }
                }

                // Remove download progress
                {
                    let mut progress = self.download_progress.lock().unwrap();
                    progress.remove(model_id);
                }

                info!("Model {} downloaded and installed successfully", model_id);
                Ok(())
            }
            Err(e) => {
                // Update model status to error
                {
                    let mut models = self.models.lock().unwrap();
                    if let Some(model) = models.get_mut(model_id) {
                        model.status = ModelStatus::Error;
                    }
                }

                error!("Failed to download model {}: {}", model_id, e);
                Err(e)
            }
        }
    }

    // Download model files from URL
    async fn download_model_files(&self, url: &str, destination: &Path, model_id: &str) -> Result<()> {
        info!("Starting download from: {}", url);

        let response = self.client.get(url).send().await?;
        let total_size = response.content_length().unwrap_or(0);

        let mut stream = response.bytes_stream();
        let mut downloaded = 0u64;
        let start_time = Instant::now();

        // For simplicity, assume we're downloading a single model file
        let file_path = destination.join("model.gguf");
        let mut file = tokio::fs::File::create(&file_path).await?;

        while let Some(chunk_result) = stream.next().await {
            let chunk = chunk_result?;
            file.write_all(&chunk).await?;
            downloaded += chunk.len() as u64;

            // Update progress
            let elapsed = start_time.elapsed().as_secs();
            let speed = if elapsed > 0 { downloaded / elapsed } else { 0 };
            let percentage = if total_size > 0 { (downloaded as f32 / total_size as f32) * 100.0 } else { 0.0 };
            let eta = if speed > 0 { (total_size - downloaded) / speed } else { 0 };

            {
                let mut progress = self.download_progress.lock().unwrap();
                if let Some(prog) = progress.get_mut(model_id) {
                    prog.bytes_downloaded = downloaded;
                    prog.percentage = percentage;
                    prog.speed = speed;
                    prog.eta_seconds = eta;
                    prog.status = format!("Downloading... {:.1}%", percentage);
                }
            }
        }

        file.flush().await?;
        info!("Download completed: {} bytes", downloaded);
        Ok(())
    }

    // Get download progress for a model
    pub fn get_download_progress(&self, model_id: &str) -> Option<DownloadProgress> {
        let progress = self.download_progress.lock().unwrap();
        progress.get(model_id).cloned()
    }

    // Load and run a model
    pub async fn load_model(&self, model_id: &str, config: ModelConfig) -> Result<u16> {
        let model_info = self.get_model(model_id)
            .ok_or_else(|| anyhow!("Model not found: {}", model_id))?;

        if model_info.status != ModelStatus::Installed {
            return Err(anyhow!("Model not installed: {}", model_id));
        }

        // Check if model is already running
        {
            let running_models = self.running_models.lock().unwrap();
            if let Some(process) = running_models.get(model_id) {
                return Ok(process.port);
            }
        }

        // Find an available port
        let port = self.find_available_port()?;

        // Start the model server (this is a placeholder - actual implementation would depend on the model format)
        let model_path = model_info.local_path
            .ok_or_else(|| anyhow!("Model path not available"))?;

        let mut cmd = TokioCommand::new("llama-server"); // Placeholder command
        cmd.arg("--model")
           .arg(&model_path)
           .arg("--port")
           .arg(port.to_string())
           .arg("--ctx-size")
           .arg(config.context_length.to_string())
           .arg("--threads")
           .arg(config.threads.to_string())
           .stdout(Stdio::piped())
           .stderr(Stdio::piped());

        let process = cmd.spawn()?;

        // Store the running process
        {
            let mut running_models = self.running_models.lock().unwrap();
            running_models.insert(model_id.to_string(), ModelProcess {
                process,
                config,
                started_at: Instant::now(),
                port,
            });
        }

        // Update model status
        {
            let mut models = self.models.lock().unwrap();
            if let Some(model) = models.get_mut(model_id) {
                model.status = ModelStatus::Running;
            }
        }

        info!("Model {} loaded and running on port {}", model_id, port);
        Ok(port)
    }

    // Unload a running model
    pub async fn unload_model(&self, model_id: &str) -> Result<()> {
        let process = {
            let mut running_models = self.running_models.lock().unwrap();
            running_models.remove(model_id)
        };

        if let Some(mut model_process) = process {
            model_process.process.kill().await?;

            // Update model status
            {
                let mut models = self.models.lock().unwrap();
                if let Some(model) = models.get_mut(model_id) {
                    model.status = ModelStatus::Installed;
                }
            }

            info!("Model {} unloaded", model_id);
        }

        Ok(())
    }

    // Delete a model
    pub async fn delete_model(&self, model_id: &str) -> Result<()> {
        // Unload if running
        let _ = self.unload_model(model_id).await;

        // Delete model files
        let model_dir = self.models_directory.join(model_id);
        if model_dir.exists() {
            fs::remove_dir_all(&model_dir)?;
        }

        // Update model status
        {
            let mut models = self.models.lock().unwrap();
            if let Some(model) = models.get_mut(model_id) {
                model.status = ModelStatus::Available;
                model.local_path = None;
            }
        }

        info!("Model {} deleted", model_id);
        Ok(())
    }

    // Find an available port for the model server
    fn find_available_port(&self) -> Result<u16> {
        use std::net::{TcpListener, SocketAddr};

        let listener = TcpListener::bind("127.0.0.1:0")?;
        let addr = listener.local_addr()?;
        Ok(addr.port())
    }

    // Get running models
    pub fn get_running_models(&self) -> Vec<String> {
        let running_models = self.running_models.lock().unwrap();
        running_models.keys().cloned().collect()
    }

    // Check model system requirements
    pub fn check_system_requirements(&self, model_id: &str) -> Result<HashMap<String, bool>> {
        let model = self.get_model(model_id)
            .ok_or_else(|| anyhow!("Model not found: {}", model_id))?;

        // This would integrate with the hardware detection module
        let mut requirements = HashMap::new();

        // Placeholder requirements check
        requirements.insert("ram".to_string(), true);
        requirements.insert("storage".to_string(), true);
        requirements.insert("cpu".to_string(), true);
        requirements.insert("gpu".to_string(), false); // Optional

        Ok(requirements)
    }
}

// Tauri commands for model management

#[tauri::command]
pub async fn list_available_models() -> Result<Vec<ModelInfo>, String> {
    let models_dir = dirs::data_dir()
        .ok_or_else(|| "Could not determine data directory".to_string())?
        .join("bear_ai")
        .join("models");

    let manager = ModelManager::new(models_dir)
        .map_err(|e| format!("Failed to initialize model manager: {}", e))?;

    Ok(manager.list_models())
}

// Commented out - duplicate of llm_manager.rs
// #[tauri::command]
pub async fn download_model_v2(model_id: String, quantization: Option<String>) -> Result<(), String> {
    let models_dir = dirs::data_dir()
        .ok_or_else(|| "Could not determine data directory".to_string())?
        .join("bear_ai")
        .join("models");

    let manager = ModelManager::new(models_dir)
        .map_err(|e| format!("Failed to initialize model manager: {}", e))?;

    manager.download_model(&model_id, quantization).await
        .map_err(|e| format!("Failed to download model: {}", e))
}

#[tauri::command]
pub async fn get_download_progress(model_id: String) -> Result<Option<DownloadProgress>, String> {
    let models_dir = dirs::data_dir()
        .ok_or_else(|| "Could not determine data directory".to_string())?
        .join("bear_ai")
        .join("models");

    let manager = ModelManager::new(models_dir)
        .map_err(|e| format!("Failed to initialize model manager: {}", e))?;

    Ok(manager.get_download_progress(&model_id))
}

// Commented out - duplicate of llm_manager.rs
// #[tauri::command]
pub async fn load_model_v2(model_id: String, config: ModelConfig) -> Result<u16, String> {
    let models_dir = dirs::data_dir()
        .ok_or_else(|| "Could not determine data directory".to_string())?
        .join("bear_ai")
        .join("models");

    let manager = ModelManager::new(models_dir)
        .map_err(|e| format!("Failed to initialize model manager: {}", e))?;

    manager.load_model(&model_id, config).await
        .map_err(|e| format!("Failed to load model: {}", e))
}

// Commented out - duplicate of llm_manager.rs
// #[tauri::command]
pub async fn unload_model_v2(model_id: String) -> Result<(), String> {
    let models_dir = dirs::data_dir()
        .ok_or_else(|| "Could not determine data directory".to_string())?
        .join("bear_ai")
        .join("models");

    let manager = ModelManager::new(models_dir)
        .map_err(|e| format!("Failed to initialize model manager: {}", e))?;

    manager.unload_model(&model_id).await
        .map_err(|e| format!("Failed to unload model: {}", e))
}

#[tauri::command]
pub async fn delete_model(model_id: String) -> Result<(), String> {
    let models_dir = dirs::data_dir()
        .ok_or_else(|| "Could not determine data directory".to_string())?
        .join("bear_ai")
        .join("models");

    let manager = ModelManager::new(models_dir)
        .map_err(|e| format!("Failed to initialize model manager: {}", e))?;

    manager.delete_model(&model_id).await
        .map_err(|e| format!("Failed to delete model: {}", e))
}

#[tauri::command]
pub async fn get_running_models() -> Result<Vec<String>, String> {
    let models_dir = dirs::data_dir()
        .ok_or_else(|| "Could not determine data directory".to_string())?
        .join("bear_ai")
        .join("models");

    let manager = ModelManager::new(models_dir)
        .map_err(|e| format!("Failed to initialize model manager: {}", e))?;

    Ok(manager.get_running_models())
}

#[tauri::command]
pub async fn check_model_requirements(model_id: String) -> Result<HashMap<String, bool>, String> {
    let models_dir = dirs::data_dir()
        .ok_or_else(|| "Could not determine data directory".to_string())?
        .join("bear_ai")
        .join("models");

    let manager = ModelManager::new(models_dir)
        .map_err(|e| format!("Failed to initialize model manager: {}", e))?;

    manager.check_system_requirements(&model_id)
        .map_err(|e| format!("Failed to check requirements: {}", e))
}

// Initialize model management system
pub fn init_model_management() -> Result<ModelManager> {
    let models_dir = dirs::data_dir()
        .ok_or_else(|| anyhow!("Could not determine data directory"))?
        .join("bear_ai")
        .join("models");

    ModelManager::new(models_dir)
}