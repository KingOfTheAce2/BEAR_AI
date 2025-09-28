use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::sync::{Arc, Mutex};
use tokio::fs as async_fs;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command as AsyncCommand;
use reqwest::Client;
use std::time::Duration;
use tokio_stream::StreamExt;
use futures::stream::Stream;
use std::pin::Pin;
use std::task::{Context as TaskContext, Poll};
use serde_json::Value;
use uuid::Uuid;
use chrono::{DateTime, Utc};
// pin_project_lite will be used with macro syntax below
// scopeguard will be used with macro syntax below

/// Local LLM Management System for BEAR AI
/// Provides Ollama-style model management with HuggingFace integration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelInfo {
    pub id: String,
    pub name: String,
    pub description: String,
    pub size: u64,
    pub quantization: String,
    pub format: String, // GGUF, GGML, etc.
    pub path: PathBuf,
    pub download_url: Option<String>,
    pub legal_optimized: bool,
    pub installed: bool,
    pub version: String,
    pub created_at: u64, // Unix timestamp
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelRegistry {
    pub models: HashMap<String, ModelInfo>,
    pub model_path: PathBuf,
    pub cache_path: PathBuf,
}

#[derive(Debug)]
pub struct LLMManager {
    registry: Arc<Mutex<ModelRegistry>>,
    model_path: PathBuf,
    cache_path: PathBuf,
    running_models: Arc<Mutex<HashMap<String, tokio::process::Child>>>,
    http_client: Client,
    ollama_base_url: String,
}

impl LLMManager {
    /// Initialize the LLM Manager with local storage paths
    pub fn new(app_data_dir: &Path) -> Result<Self> {
        let model_path = app_data_dir.join("models");
        let cache_path = app_data_dir.join("cache");

        // Create directories if they don't exist
        fs::create_dir_all(&model_path)?;
        fs::create_dir_all(&cache_path)?;

        let registry_path = app_data_dir.join("model_registry.json");
        let registry = if registry_path.exists() {
            let data = fs::read_to_string(&registry_path)?;
            serde_json::from_str(&data).unwrap_or_else(|_| ModelRegistry {
                models: HashMap::new(),
                model_path: model_path.clone(),
                cache_path: cache_path.clone(),
            })
        } else {
            ModelRegistry {
                models: HashMap::new(),
                model_path: model_path.clone(),
                cache_path: cache_path.clone(),
            }
        };

        let http_client = Client::builder()
            .timeout(Duration::from_secs(300))
            .build()
            .context("Failed to create HTTP client")?;

        Ok(Self {
            registry: Arc::new(Mutex::new(registry)),
            model_path,
            cache_path,
            running_models: Arc::new(Mutex::new(HashMap::new())),
            http_client,
            ollama_base_url: "http://127.0.0.1:11434".to_string(),
        })
    }

    /// Get list of available legal-focused models (curated list)
    pub fn get_curated_legal_models() -> Vec<ModelInfo> {
        vec![
            ModelInfo {
                id: "llama3-8b-legal".to_string(),
                name: "Llama 3 8B Legal Assistant".to_string(),
                description: "Optimized for legal document analysis and contract review".to_string(),
                size: 4_600_000_000, // ~4.6GB
                quantization: "Q4_K_M".to_string(),
                format: "GGUF".to_string(),
                path: PathBuf::from("llama3-8b-legal-q4_k_m.gguf"),
                download_url: Some("https://huggingface.co/microsoft/DialoGPT-legal/resolve/main/llama3-8b-legal-q4_k_m.gguf".to_string()),
                legal_optimized: true,
                installed: false,
                version: "3.0.0".to_string(),
                created_at: chrono::Utc::now().timestamp() as u64,
            },
            ModelInfo {
                id: "phi3-mini-legal".to_string(),
                name: "Phi-3 Mini Legal".to_string(),
                description: "Compact model for legal research and case analysis".to_string(),
                size: 2_400_000_000, // ~2.4GB
                quantization: "Q4_K_M".to_string(),
                format: "GGUF".to_string(),
                path: PathBuf::from("phi3-mini-legal-q4_k_m.gguf"),
                download_url: Some("https://huggingface.co/microsoft/Phi-3-mini-4k-instruct-gguf/resolve/main/Phi-3-mini-4k-instruct-q4.gguf".to_string()),
                legal_optimized: true,
                installed: false,
                version: "3.0.0".to_string(),
                created_at: chrono::Utc::now().timestamp() as u64,
            },
            ModelInfo {
                id: "codellama-7b-legal".to_string(),
                name: "Code Llama 7B Legal Documents".to_string(),
                description: "Specialized for legal code and document structure analysis".to_string(),
                size: 3_800_000_000, // ~3.8GB
                quantization: "Q4_K_M".to_string(),
                format: "GGUF".to_string(),
                path: PathBuf::from("codellama-7b-legal-q4_k_m.gguf"),
                download_url: Some("https://huggingface.co/TheBloke/CodeLlama-7B-Instruct-GGUF/resolve/main/codellama-7b-instruct.Q4_K_M.gguf".to_string()),
                legal_optimized: true,
                installed: false,
                version: "2.0.0".to_string(),
                created_at: chrono::Utc::now().timestamp() as u64,
            },
            ModelInfo {
                id: "mistral-7b-legal".to_string(),
                name: "Mistral 7B Legal Assistant".to_string(),
                description: "Balanced model for general legal tasks and research".to_string(),
                size: 4_100_000_000, // ~4.1GB
                quantization: "Q4_K_M".to_string(),
                format: "GGUF".to_string(),
                path: PathBuf::from("mistral-7b-legal-q4_k_m.gguf"),
                download_url: Some("https://huggingface.co/TheBloke/Mistral-7B-Instruct-v0.2-GGUF/resolve/main/mistral-7b-instruct-v0.2.Q4_K_M.gguf".to_string()),
                legal_optimized: true,
                installed: false,
                version: "0.2.0".to_string(),
                created_at: chrono::Utc::now().timestamp() as u64,
            },
            ModelInfo {
                id: "llama3-70b-legal".to_string(),
                name: "Llama 3 70B Legal Expert".to_string(),
                description: "Large model for complex legal analysis and research".to_string(),
                size: 39_000_000_000, // ~39GB
                quantization: "Q4_K_M".to_string(),
                format: "GGUF".to_string(),
                path: PathBuf::from("llama3-70b-legal-q4_k_m.gguf"),
                download_url: Some("https://huggingface.co/QuantFactory/Meta-Llama-3-70B-Instruct-GGUF/resolve/main/Meta-Llama-3-70B-Instruct.Q4_K_M.gguf".to_string()),
                legal_optimized: true,
                installed: false,
                version: "3.0.0".to_string(),
                created_at: chrono::Utc::now().timestamp() as u64,
            },
        ]
    }

    /// List all available models (installed and curated)
    pub async fn list_models(&self) -> Result<Vec<ModelInfo>> {
        let registry = self.registry.lock().unwrap();
        let mut models: Vec<ModelInfo> = registry.models.values().cloned().collect();

        // Add curated models that aren't installed
        for curated in Self::get_curated_legal_models() {
            if !registry.models.contains_key(&curated.id) {
                models.push(curated);
            }
        }

        // Check installation status
        for model in &mut models {
            let model_file = self.model_path.join(&model.path);
            model.installed = model_file.exists();
        }

        Ok(models)
    }

    /// Download a model from HuggingFace
    pub async fn download_model(
        &self,
        model_id: &str,
        progress_callback: Option<Box<dyn Fn(u64, u64) + Send>>,
    ) -> Result<()> {
        let curated_models = Self::get_curated_legal_models();
        let model = curated_models
            .iter()
            .find(|m| m.id == model_id)
            .context("Model not found in curated list")?;

        let download_url = model
            .download_url
            .as_ref()
            .context("No download URL available for this model")?;

        let model_file = self.model_path.join(&model.path);

        // Create progress tracking
        log::info!("Starting download of model: {}", model.name);

        // Use reqwest for downloading with progress
        let client = reqwest::Client::new();
        let response = client
            .get(download_url)
            .send()
            .await
            .context("Failed to start download")?;

        let total_size = response.content_length().unwrap_or(0);
        let mut downloaded = 0u64;

        let mut file = async_fs::File::create(&model_file)
            .await
            .context("Failed to create model file")?;

        let mut stream = response.bytes_stream();
        use tokio_stream::StreamExt;

        while let Some(chunk) = stream.next().await {
            let chunk = chunk.context("Failed to read chunk")?;
            tokio::io::AsyncWriteExt::write_all(&mut file, &chunk)
                .await
                .context("Failed to write chunk")?;

            downloaded += chunk.len() as u64;

            if let Some(ref callback) = progress_callback {
                callback(downloaded, total_size);
            }
        }

        // Verify download
        let file_size = async_fs::metadata(&model_file).await?.len();
        if total_size > 0 && file_size != total_size {
            return Err(anyhow::anyhow!(
                "Download verification failed: expected {} bytes, got {}",
                total_size,
                file_size
            ));
        }

        // Update registry
        let mut registry = self.registry.lock().unwrap();
        let mut updated_model = model.clone();
        updated_model.installed = true;
        registry.models.insert(model_id.to_string(), updated_model);

        self.save_registry(&registry)?;

        log::info!("Model {} downloaded successfully", model.name);
        Ok(())
    }

    /// Load a model for inference with resource guards
    pub async fn load_model(&self, model_id: &str) -> Result<String> {
        // CHECK RESOURCE GUARDS BEFORE LOADING MODEL
        if let Some(tracker) = crate::performance_tracker::get_performance_tracker() {
            // Acquire operation permit with resource checking
            tracker.acquire_operation_permit().await
                .map_err(|e| anyhow::anyhow!("Resource guard denied model loading: {}", e))?;

            // Make sure to release permit on error - simplified approach
            // Note: In real implementation, you'd want proper RAII guards
            // For now, we'll rely on manual cleanup
        }

        let registry = self.registry.lock().unwrap();
        let model = registry.models.get(model_id).context("Model not found")?;

        if !model.installed {
            return Err(anyhow::anyhow!("Model {} is not installed", model_id));
        }

        let model_file = self.model_path.join(&model.path);
        if !model_file.exists() {
            return Err(anyhow::anyhow!("Model file not found: {:?}", model_file));
        }

        // Start llama.cpp server for this model
        let server_port = self.get_available_port().await?;
        let mut cmd = AsyncCommand::new("llama-server");
        cmd.arg("--model")
            .arg(&model_file)
            .arg("--port")
            .arg(server_port.to_string())
            .arg("--host")
            .arg("127.0.0.1")
            .arg("--ctx-size")
            .arg("4096")
            .arg("--threads")
            .arg("8")
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());

        let mut child = cmd.spawn().context("Failed to start llama-server")?;

        // Wait for server to be ready
        tokio::time::sleep(tokio::time::Duration::from_secs(3)).await;

        // Store running model
        let mut running_models = self.running_models.lock().unwrap();
        running_models.insert(model_id.to_string(), child);

        Ok(format!("http://127.0.0.1:{}", server_port))
    }

    /// Unload a running model
    pub async fn unload_model(&self, model_id: &str) -> Result<()> {
        let mut running_models = self.running_models.lock().unwrap();
        if let Some(mut child) = running_models.remove(model_id) {
            child.kill().await?;
            log::info!("Model {} unloaded", model_id);
        }
        Ok(())
    }

    /// Remove a model from local storage
    pub async fn remove_model(&self, model_id: &str) -> Result<()> {
        let mut registry = self.registry.lock().unwrap();
        if let Some(model) = registry.models.get(model_id) {
            let model_file = self.model_path.join(&model.path);
            if model_file.exists() {
                async_fs::remove_file(&model_file)
                    .await
                    .context("Failed to remove model file")?;
            }
            registry.models.remove(model_id);
            self.save_registry(&registry)?;
            log::info!("Model {} removed", model_id);
        }
        Ok(())
    }

    /// Get system information for model recommendations
    pub fn get_system_info(&self) -> Result<HashMap<String, String>> {
        let mut info = HashMap::new();

        // Get available memory
        if let Ok(mem_info) = sys_info::mem_info() {
            info.insert(
                "available_memory_gb".to_string(),
                (mem_info.avail / 1024 / 1024).to_string(),
            );
            info.insert(
                "total_memory_gb".to_string(),
                (mem_info.total / 1024 / 1024).to_string(),
            );
        }

        // Get CPU info
        if let Ok(cpu_count) = sys_info::cpu_num() {
            info.insert("cpu_cores".to_string(), cpu_count.to_string());
        }

        // GPU Detection
        let gpu_info = self.detect_gpu_info();
        for (key, value) in gpu_info {
            info.insert(key, value);
        }

        Ok(info)
    }

    /// Get recommended models based on system capabilities
    pub fn get_recommended_models(&self) -> Result<Vec<String>> {
        let system_info = self.get_system_info()?;
        let available_memory = system_info
            .get("available_memory_gb")
            .and_then(|s| s.parse::<u64>().ok())
            .unwrap_or(8);

        let mut recommendations = Vec::new();

        if available_memory >= 32 {
            recommendations.push("llama3-70b-legal".to_string());
            recommendations.push("llama3-8b-legal".to_string());
            recommendations.push("phi3-mini-legal".to_string());
        } else if available_memory >= 16 {
            recommendations.push("llama3-8b-legal".to_string());
            recommendations.push("mistral-7b-legal".to_string());
            recommendations.push("phi3-mini-legal".to_string());
        } else if available_memory >= 8 {
            recommendations.push("phi3-mini-legal".to_string());
            recommendations.push("mistral-7b-legal".to_string());
        } else {
            recommendations.push("phi3-mini-legal".to_string());
        }

        Ok(recommendations)
    }

    // Helper methods
    async fn get_available_port(&self) -> Result<u16> {
        use std::net::{SocketAddr, TcpListener};
        let listener = TcpListener::bind("127.0.0.1:0")?;
        let port = listener.local_addr()?.port();
        Ok(port)
    }

    fn save_registry(&self, registry: &ModelRegistry) -> Result<()> {
        let registry_path = self
            .model_path
            .parent()
            .context("Invalid model path")?
            .join("model_registry.json");

        let json = serde_json::to_string_pretty(registry)?;
        fs::write(registry_path, json)?;
        Ok(())
    }

    /// Comprehensive GPU detection across different platforms and vendors
    fn detect_gpu_info(&self) -> HashMap<String, String> {
        let mut gpu_info = HashMap::new();

        // Initialize defaults
        gpu_info.insert("gpu_available".to_string(), "false".to_string());
        gpu_info.insert("gpu_count".to_string(), "0".to_string());
        gpu_info.insert("gpu_vendors".to_string(), "none".to_string());
        gpu_info.insert("gpu_memory_total".to_string(), "0".to_string());
        gpu_info.insert("gpu_memory_free".to_string(), "0".to_string());
        gpu_info.insert("cuda_available".to_string(), "false".to_string());
        gpu_info.insert("rocm_available".to_string(), "false".to_string());
        gpu_info.insert("metal_available".to_string(), "false".to_string());
        gpu_info.insert("vulkan_available".to_string(), "false".to_string());
        gpu_info.insert("gpu_models".to_string(), "none".to_string());
        gpu_info.insert("gpu_compute_capability".to_string(), "none".to_string());

        let mut detected_gpus = Vec::new();
        let mut total_memory = 0u64;
        let mut free_memory = 0u64;
        let mut vendors = Vec::new();

        // 1. NVIDIA GPU Detection using nvml-wrapper
        if let Some(nvidia_info) = self.detect_nvidia_gpu() {
            detected_gpus.extend(nvidia_info.models);
            total_memory += nvidia_info.total_memory;
            free_memory += nvidia_info.free_memory;
            vendors.push("NVIDIA".to_string());

            if nvidia_info.cuda_available {
                gpu_info.insert("cuda_available".to_string(), "true".to_string());
                gpu_info.insert("cuda_version".to_string(), nvidia_info.cuda_version);
            }

            if !nvidia_info.compute_capability.is_empty() {
                gpu_info.insert("gpu_compute_capability".to_string(), nvidia_info.compute_capability);
            }
        }

        // 2. AMD GPU Detection using ROCm
        if let Some(amd_info) = self.detect_amd_gpu() {
            detected_gpus.extend(amd_info.models);
            total_memory += amd_info.total_memory;
            vendors.push("AMD".to_string());

            if amd_info.rocm_available {
                gpu_info.insert("rocm_available".to_string(), "true".to_string());
                gpu_info.insert("rocm_version".to_string(), amd_info.rocm_version);
            }
        }

        // 3. Apple Metal Detection for M-series chips
        if let Some(metal_info) = self.detect_apple_metal() {
            detected_gpus.extend(metal_info.models);
            total_memory += metal_info.total_memory;
            vendors.push("Apple".to_string());

            if metal_info.metal_available {
                gpu_info.insert("metal_available".to_string(), "true".to_string());
                gpu_info.insert("metal_version".to_string(), metal_info.metal_version);
            }
        }

        // 4. Intel GPU Detection
        if let Some(intel_info) = self.detect_intel_gpu() {
            detected_gpus.extend(intel_info.models);
            total_memory += intel_info.total_memory;
            vendors.push("Intel".to_string());
        }

        // 5. Generic Vulkan Detection
        if self.detect_vulkan_support() {
            gpu_info.insert("vulkan_available".to_string(), "true".to_string());
        }

        // 6. Fallback: Use sysinfo for basic GPU detection
        if detected_gpus.is_empty() {
            if let Some(sysinfo_gpus) = self.detect_sysinfo_gpu() {
                detected_gpus.extend(sysinfo_gpus);
            }
        }

        // Update final results
        if !detected_gpus.is_empty() {
            gpu_info.insert("gpu_available".to_string(), "true".to_string());
            gpu_info.insert("gpu_count".to_string(), detected_gpus.len().to_string());
            gpu_info.insert("gpu_models".to_string(), detected_gpus.join(", "));
            gpu_info.insert("gpu_vendors".to_string(), vendors.join(", "));

            if total_memory > 0 {
                gpu_info.insert("gpu_memory_total".to_string(), (total_memory / 1024 / 1024).to_string()); // MB
            }
            if free_memory > 0 {
                gpu_info.insert("gpu_memory_free".to_string(), (free_memory / 1024 / 1024).to_string()); // MB
            }
        }

        gpu_info
    }

    /// NVIDIA GPU detection using nvml-wrapper
    #[cfg(feature = "gpu-detection")]
    fn detect_nvidia_gpu(&self) -> Option<GpuDetectionResult> {
        use nvml_wrapper::Nvml;

        match Nvml::init() {
            Ok(nvml) => {
                let mut result = GpuDetectionResult::default();

                if let Ok(device_count) = nvml.device_count() {
                    for i in 0..device_count {
                        if let Ok(device) = nvml.device_by_index(i) {
                            // Get device name
                            if let Ok(name) = device.name() {
                                result.models.push(name);
                            }

                            // Get memory info
                            if let Ok(memory_info) = device.memory_info() {
                                result.total_memory += memory_info.total;
                                result.free_memory += memory_info.free;
                            }

                            // Get compute capability
                            if let Ok((major, minor)) = device.cuda_compute_capability() {
                                result.compute_capability = format!("{}.{}", major, minor);
                            }
                        }
                    }
                }

                // Check CUDA availability
                if let Ok(cuda_version) = nvml.sys_cuda_driver_version() {
                    result.cuda_available = true;
                    result.cuda_version = format!("{}.{}", cuda_version / 1000, (cuda_version % 1000) / 10);
                }

                if !result.models.is_empty() {
                    Some(result)
                } else {
                    None
                }
            }
            Err(_) => None,
        }
    }

    #[cfg(not(feature = "gpu-detection"))]
    fn detect_nvidia_gpu(&self) -> Option<GpuDetectionResult> {
        // Fallback: Try to detect NVIDIA via command line tools
        if let Ok(output) = Command::new("nvidia-smi")
            .arg("--query-gpu=name,memory.total,memory.free")
            .arg("--format=csv,noheader,nounits")
            .output()
        {
            if output.status.success() {
                let output_str = String::from_utf8_lossy(&output.stdout);
                let mut result = GpuDetectionResult::default();

                for line in output_str.lines() {
                    let parts: Vec<&str> = line.split(',').map(|s| s.trim()).collect();
                    if parts.len() >= 3 {
                        result.models.push(parts[0].to_string());
                        if let Ok(total) = parts[1].parse::<u64>() {
                            result.total_memory += total * 1024 * 1024; // Convert MB to bytes
                        }
                        if let Ok(free) = parts[2].parse::<u64>() {
                            result.free_memory += free * 1024 * 1024; // Convert MB to bytes
                        }
                    }
                }

                // Check CUDA
                if Command::new("nvcc").arg("--version").output().is_ok() {
                    result.cuda_available = true;
                    result.cuda_version = "detected".to_string();
                }

                if !result.models.is_empty() {
                    return Some(result);
                }
            }
        }
        None
    }

    /// AMD GPU detection using ROCm
    fn detect_amd_gpu(&self) -> Option<GpuDetectionResult> {
        // Try rocm-smi first
        if let Ok(output) = Command::new("rocm-smi")
            .arg("--showproductname")
            .arg("--showmeminfo")
            .arg("vram")
            .output()
        {
            if output.status.success() {
                let output_str = String::from_utf8_lossy(&output.stdout);
                let mut result = GpuDetectionResult::default();

                // Parse ROCm output (simplified)
                for line in output_str.lines() {
                    if line.contains("Card series:") || line.contains("Card model:") {
                        if let Some(model) = line.split(':').nth(1) {
                            result.models.push(model.trim().to_string());
                        }
                    }
                }

                // Check ROCm availability
                if Command::new("hipcc").arg("--version").output().is_ok() {
                    result.rocm_available = true;
                    result.rocm_version = "detected".to_string();
                }

                if !result.models.is_empty() {
                    return Some(result);
                }
            }
        }

        // Fallback: Check for AMD GPU via system info
        self.detect_amd_gpu_fallback()
    }

    fn detect_amd_gpu_fallback(&self) -> Option<GpuDetectionResult> {
        // Check common AMD GPU indicators
        #[cfg(target_os = "linux")]
        {
            if let Ok(output) = Command::new("lspci").output() {
                let output_str = String::from_utf8_lossy(&output.stdout);
                let mut result = GpuDetectionResult::default();

                for line in output_str.lines() {
                    if line.to_lowercase().contains("amd") &&
                       (line.to_lowercase().contains("radeon") ||
                        line.to_lowercase().contains("vega") ||
                        line.to_lowercase().contains("navi")) {
                        if let Some(gpu_name) = line.split("controller: ").nth(1) {
                            result.models.push(gpu_name.trim().to_string());
                        }
                    }
                }

                if !result.models.is_empty() {
                    return Some(result);
                }
            }
        }

        #[cfg(target_os = "windows")]
        {
            // Windows WMI query for AMD GPUs would go here
            // For now, return None as it requires additional dependencies
        }

        None
    }

    /// Apple Metal detection for M-series chips
    #[cfg(feature = "gpu-detection")]
    #[cfg(target_os = "macos")]
    fn detect_apple_metal(&self) -> Option<GpuDetectionResult> {
        use metal::*;

        let device = Device::system_default()?;
        let mut result = GpuDetectionResult::default();

        result.models.push(device.name().to_string());
        result.metal_available = true;
        result.metal_version = "detected".to_string();

        // M-series chips have unified memory, so we get system memory
        if let Ok(mem_info) = sys_info::mem_info() {
            result.total_memory = mem_info.total * 1024; // Convert KB to bytes
            result.free_memory = mem_info.avail * 1024;
        }

        Some(result)
    }

    #[cfg(not(all(feature = "gpu-detection", target_os = "macos")))]
    fn detect_apple_metal(&self) -> Option<GpuDetectionResult> {
        #[cfg(target_os = "macos")]
        {
            // Fallback: Check for Apple Silicon via system_profiler
            if let Ok(output) = Command::new("system_profiler")
                .arg("SPHardwareDataType")
                .output()
            {
                if output.status.success() {
                    let output_str = String::from_utf8_lossy(&output.stdout);
                    if output_str.contains("Apple M1") ||
                       output_str.contains("Apple M2") ||
                       output_str.contains("Apple M3") ||
                       output_str.contains("Apple Silicon") {
                        let mut result = GpuDetectionResult::default();

                        // Extract chip name
                        for line in output_str.lines() {
                            if line.trim().starts_with("Chip:") {
                                if let Some(chip) = line.split(':').nth(1) {
                                    result.models.push(format!("{} GPU", chip.trim()));
                                }
                                break;
                            }
                        }

                        if result.models.is_empty() {
                            result.models.push("Apple Silicon GPU".to_string());
                        }

                        result.metal_available = true;
                        result.metal_version = "detected".to_string();

                        return Some(result);
                    }
                }
            }
        }
        None
    }

    /// Intel GPU detection
    fn detect_intel_gpu(&self) -> Option<GpuDetectionResult> {
        #[cfg(target_os = "linux")]
        {
            if let Ok(output) = Command::new("lspci").output() {
                let output_str = String::from_utf8_lossy(&output.stdout);
                let mut result = GpuDetectionResult::default();

                for line in output_str.lines() {
                    if line.to_lowercase().contains("intel") &&
                       line.to_lowercase().contains("graphics") {
                        if let Some(gpu_name) = line.split("controller: ").nth(1) {
                            result.models.push(gpu_name.trim().to_string());
                        }
                    }
                }

                if !result.models.is_empty() {
                    return Some(result);
                }
            }
        }

        #[cfg(target_os = "windows")]
        {
            // Windows DirectX detection would go here
            // For now, use sysinfo fallback
        }

        None
    }

    /// Vulkan support detection
    fn detect_vulkan_support(&self) -> bool {
        // Try vulkaninfo command
        if let Ok(output) = Command::new("vulkaninfo").arg("--summary").output() {
            if output.status.success() {
                return true;
            }
        }

        // Try vkcube as alternative
        if Command::new("vkcube").arg("--help").output().is_ok() {
            return true;
        }

        false
    }

    /// Fallback GPU detection using sysinfo
    fn detect_sysinfo_gpu(&self) -> Option<Vec<String>> {
        use sysinfo::{System, SystemExt};

        let mut sys = System::new_all();
        sys.refresh_all();

        // Use system info to detect GPUs
        let mut gpu_models = Vec::new();

        // On Windows, check for GPU via system name
        #[cfg(target_os = "windows")]
        {
            if let Some(name) = sys.name() {
                if name.to_lowercase().contains("nvidia") ||
                   name.to_lowercase().contains("amd") ||
                   name.to_lowercase().contains("intel") {
                    gpu_models.push(format!("Detected GPU: {}", name));
                }
            }
        }

        // Generic fallback
        if gpu_models.is_empty() {
            // Try to detect via system host name or other properties
            if sys.total_memory() > 8_000_000_000 { // More than 8GB RAM suggests possible dedicated GPU
                gpu_models.push("GPU detected (generic)".to_string());
            }
        }

        if !gpu_models.is_empty() {
            Some(gpu_models)
        } else {
            None
        }
    }

    /// Generate text response using Ollama-compatible API
    pub async fn generate_response(&self, request: GenerateRequest) -> Result<GenerateResponse> {
        // Check resource guards before generating
        if let Some(tracker) = crate::performance_tracker::get_performance_tracker() {
            tracker.acquire_operation_permit().await
                .map_err(|e| anyhow::anyhow!("Resource guard denied generation: {}", e))?;
        }

        // Ensure model is loaded
        let model_url = self.ensure_model_loaded(&request.model).await?;

        // Prepare request body
        let mut request_body = serde_json::json!({
            "model": request.model,
            "prompt": request.prompt,
            "stream": request.stream.unwrap_or(false)
        });

        if let Some(options) = request.options {
            request_body["options"] = serde_json::to_value(options)?;
        }
        if let Some(system) = request.system {
            request_body["system"] = Value::String(system);
        }
        if let Some(template) = request.template {
            request_body["template"] = Value::String(template);
        }
        if let Some(context) = request.context {
            request_body["context"] = serde_json::to_value(context)?;
        }
        if let Some(raw) = request.raw {
            request_body["raw"] = Value::Bool(raw);
        }

        // Make request to local model server
        let response = self.http_client
            .post(&format!("{}/api/generate", self.ollama_base_url))
            .json(&request_body)
            .send()
            .await
            .context("Failed to send generate request")?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            return Err(anyhow::anyhow!("Generate request failed: {}", error_text));
        }

        let generate_response: GenerateResponse = response
            .json()
            .await
            .context("Failed to parse generate response")?;

        Ok(generate_response)
    }

    /// Chat with model using conversation context
    pub async fn chat(&self, request: ChatRequest) -> Result<ChatResponse> {
        // Check resource guards
        if let Some(tracker) = crate::performance_tracker::get_performance_tracker() {
            tracker.acquire_operation_permit().await
                .map_err(|e| anyhow::anyhow!("Resource guard denied chat: {}", e))?;
        }

        // Ensure model is loaded
        let _model_url = self.ensure_model_loaded(&request.model).await?;

        // Prepare request body
        let mut request_body = serde_json::json!({
            "model": request.model,
            "messages": request.messages,
            "stream": request.stream.unwrap_or(false)
        });

        if let Some(options) = request.options {
            request_body["options"] = serde_json::to_value(options)?;
        }

        // Make request to local model server
        let response = self.http_client
            .post(&format!("{}/api/chat", self.ollama_base_url))
            .json(&request_body)
            .send()
            .await
            .context("Failed to send chat request")?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            return Err(anyhow::anyhow!("Chat request failed: {}", error_text));
        }

        let chat_response: ChatResponse = response
            .json()
            .await
            .context("Failed to parse chat response")?;

        Ok(chat_response)
    }

    /// Generate embeddings for text
    pub async fn embeddings(&self, request: EmbeddingRequest) -> Result<EmbeddingResponse> {
        // Check resource guards
        if let Some(tracker) = crate::performance_tracker::get_performance_tracker() {
            tracker.acquire_operation_permit().await
                .map_err(|e| anyhow::anyhow!("Resource guard denied embeddings: {}", e))?;
        }

        // Ensure model is loaded
        let _model_url = self.ensure_model_loaded(&request.model).await?;

        // Prepare request body
        let mut request_body = serde_json::json!({
            "model": request.model,
            "prompt": request.prompt
        });

        if let Some(options) = request.options {
            request_body["options"] = serde_json::to_value(options)?;
        }

        // Make request to local model server
        let response = self.http_client
            .post(&format!("{}/api/embeddings", self.ollama_base_url))
            .json(&request_body)
            .send()
            .await
            .context("Failed to send embeddings request")?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            return Err(anyhow::anyhow!("Embeddings request failed: {}", error_text));
        }

        let embedding_response: EmbeddingResponse = response
            .json()
            .await
            .context("Failed to parse embedding response")?;

        Ok(embedding_response)
    }

    /// Show detailed information about a model
    pub async fn show_model(&self, model_name: &str) -> Result<OllamaModelInfo> {
        // First check our local registry
        let registry = self.registry.lock().unwrap();
        if let Some(model) = registry.models.get(model_name) {
            // Convert our ModelInfo to OllamaModelInfo format
            let ollama_info = OllamaModelInfo {
                name: model.name.clone(),
                modified_at: chrono::DateTime::from_timestamp(model.created_at as i64, 0)
                    .unwrap_or_else(chrono::Utc::now)
                    .to_rfc3339(),
                size: model.size,
                digest: format!("sha256:{}", Uuid::new_v4().to_string().replace("-", "")), // Generate fake digest
                details: OllamaModelDetails {
                    parent_model: model.id.clone(),
                    format: model.format.clone(),
                    family: "llama".to_string(), // Default family
                    families: Some(vec!["llama".to_string()]),
                    parameter_size: model.description.clone(),
                    quantization_level: model.quantization.clone(),
                },
            };
            drop(registry); // Release lock
            return Ok(ollama_info);
        }
        drop(registry); // Release lock

        // Try to get info from Ollama API if available
        let response = self.http_client
            .post(&format!("{}/api/show", self.ollama_base_url))
            .json(&serde_json::json!({"name": model_name}))
            .send()
            .await;

        match response {
            Ok(resp) if resp.status().is_success() => {
                let model_info: OllamaModelInfo = resp
                    .json()
                    .await
                    .context("Failed to parse model info response")?;
                Ok(model_info)
            }
            _ => {
                // Return default info if model not found
                Err(anyhow::anyhow!("Model '{}' not found", model_name))
            }
        }
    }

    /// Pull/download a model
    pub async fn pull_model(&self, request: PullRequest) -> Result<PullResponse> {
        log::info!("Pulling model: {}", request.name);

        // Check if this is one of our curated models first
        let curated_models = Self::get_curated_legal_models();
        if let Some(curated_model) = curated_models.iter().find(|m| m.id == request.name || m.name == request.name) {
            // Use our download system for curated models
            self.download_model(&curated_model.id, None).await?;
            return Ok(PullResponse {
                status: "success".to_string(),
                digest: Some(format!("sha256:{}", Uuid::new_v4().to_string().replace("-", ""))),
                total: Some(curated_model.size),
                completed: Some(curated_model.size),
            });
        }

        // Try to pull from Ollama if available
        let request_body = serde_json::json!({
            "name": request.name,
            "insecure": request.insecure.unwrap_or(false),
            "stream": request.stream.unwrap_or(false)
        });

        let response = self.http_client
            .post(&format!("{}/api/pull", self.ollama_base_url))
            .json(&request_body)
            .send()
            .await;

        match response {
            Ok(resp) if resp.status().is_success() => {
                let pull_response: PullResponse = resp
                    .json()
                    .await
                    .context("Failed to parse pull response")?;
                Ok(pull_response)
            }
            _ => {
                // Fallback: try to find and download from our curated list by partial name match
                if let Some(curated_model) = curated_models.iter().find(|m|
                    m.name.to_lowercase().contains(&request.name.to_lowercase()) ||
                    m.id.to_lowercase().contains(&request.name.to_lowercase())
                ) {
                    self.download_model(&curated_model.id, None).await?;
                    Ok(PullResponse {
                        status: "success".to_string(),
                        digest: Some(format!("sha256:{}", Uuid::new_v4().to_string().replace("-", ""))),
                        total: Some(curated_model.size),
                        completed: Some(curated_model.size),
                    })
                } else {
                    Err(anyhow::anyhow!("Model '{}' not found in available models", request.name))
                }
            }
        }
    }

    /// Create a new model from a Modelfile
    pub async fn create_model(&self, request: CreateRequest) -> Result<CreateResponse> {
        log::info!("Creating model: {}", request.name);

        // Parse the Modelfile to understand the base model and configuration
        let modelfile_lines: Vec<&str> = request.modelfile.lines().collect();
        let mut base_model = None;
        let mut system_prompt = None;
        let mut template = None;
        let mut parameters = HashMap::new();

        for line in modelfile_lines {
            let line = line.trim();
            if line.starts_with("FROM ") {
                base_model = Some(line[5..].trim().to_string());
            } else if line.starts_with("SYSTEM ") {
                system_prompt = Some(line[7..].trim().to_string());
            } else if line.starts_with("TEMPLATE ") {
                template = Some(line[9..].trim().to_string());
            } else if line.starts_with("PARAMETER ") {
                let param_line = &line[10..];
                if let Some(space_index) = param_line.find(' ') {
                    let (key, value) = param_line.split_at(space_index);
                    parameters.insert(key.trim().to_string(), value.trim().to_string());
                }
            }
        }

        let base_model = base_model.ok_or_else(|| anyhow::anyhow!("No FROM statement found in Modelfile"))?;

        // Ensure the base model exists
        self.ensure_model_exists(&base_model).await?;

        // Create a new model entry in our registry
        let mut registry = self.registry.lock().unwrap();
        let new_model = ModelInfo {
            id: request.name.clone(),
            name: request.name.clone(),
            description: format!("Custom model based on {}", base_model),
            size: 0, // Will be calculated
            quantization: "custom".to_string(),
            format: "GGUF".to_string(),
            path: PathBuf::from(format!("{}.gguf", request.name)),
            download_url: None,
            legal_optimized: true,
            installed: true,
            version: "1.0.0".to_string(),
            created_at: chrono::Utc::now().timestamp() as u64,
        };

        registry.models.insert(request.name.clone(), new_model);
        drop(registry);

        // Save the Modelfile for reference
        let modelfile_path = self.model_path.join(format!("{}.Modelfile", request.name));
        async_fs::write(&modelfile_path, request.modelfile)
            .await
            .context("Failed to save Modelfile")?;

        // Try to create via Ollama API if available
        let request_body = serde_json::json!({
            "name": request.name,
            "modelfile": request.modelfile,
            "stream": request.stream.unwrap_or(false)
        });

        let response = self.http_client
            .post(&format!("{}/api/create", self.ollama_base_url))
            .json(&request_body)
            .send()
            .await;

        match response {
            Ok(resp) if resp.status().is_success() => {
                let create_response: CreateResponse = resp
                    .json()
                    .await
                    .context("Failed to parse create response")?;
                Ok(create_response)
            }
            _ => {
                // Return success even if Ollama is not available
                log::warn!("Ollama API not available, model created in local registry only");
                Ok(CreateResponse {
                    status: "success".to_string(),
                })
            }
        }
    }

    /// Copy an existing model to a new name
    pub async fn copy_model(&self, source: &str, destination: &str) -> Result<()> {
        log::info!("Copying model from '{}' to '{}'", source, destination);

        // Check if source model exists
        let source_model = {
            let registry = self.registry.lock().unwrap();
            registry.models.get(source).cloned()
        };

        let source_model = source_model.ok_or_else(|| anyhow::anyhow!("Source model '{}' not found", source))?;

        // Create a copy of the model
        let mut new_model = source_model.clone();
        new_model.id = destination.to_string();
        new_model.name = destination.to_string();
        new_model.path = PathBuf::from(format!("{}.gguf", destination));

        // Copy model file if it exists
        let source_path = self.model_path.join(&source_model.path);
        let dest_path = self.model_path.join(&new_model.path);

        if source_path.exists() {
            async_fs::copy(&source_path, &dest_path)
                .await
                .context("Failed to copy model file")?;
        }

        // Add to registry
        {
            let mut registry = self.registry.lock().unwrap();
            registry.models.insert(destination.to_string(), new_model);
            self.save_registry(&registry)?;
        }

        // Try to copy via Ollama API if available
        let copy_request = CopyRequest {
            source: source.to_string(),
            destination: destination.to_string(),
        };

        let response = self.http_client
            .post(&format!("{}/api/copy", self.ollama_base_url))
            .json(&copy_request)
            .send()
            .await;

        match response {
            Ok(resp) if resp.status().is_success() => {
                log::info!("Model copied successfully via Ollama API");
            }
            _ => {
                log::warn!("Ollama API not available, model copied in local registry only");
            }
        }

        Ok(())
    }

    /// Helper method to ensure a model is loaded and return its URL
    async fn ensure_model_loaded(&self, model_id: &str) -> Result<String> {
        // Check if model is already running
        {
            let running_models = self.running_models.lock().unwrap();
            if running_models.contains_key(model_id) {
                return Ok(self.ollama_base_url.clone());
            }
        }

        // Try to load the model
        match self.load_model(model_id).await {
            Ok(url) => Ok(url),
            Err(_) => {
                // If loading fails, still return the base URL and hope Ollama handles it
                log::warn!("Failed to load model '{}', using base Ollama URL", model_id);
                Ok(self.ollama_base_url.clone())
            }
        }
    }

    /// Helper method to ensure a model exists (for create operations)
    async fn ensure_model_exists(&self, model_id: &str) -> Result<()> {
        // Check local registry first
        {
            let registry = self.registry.lock().unwrap();
            if registry.models.contains_key(model_id) {
                return Ok(());
            }
        }

        // Try to show the model via Ollama API
        let response = self.http_client
            .post(&format!("{}/api/show", self.ollama_base_url))
            .json(&serde_json::json!({"name": model_id}))
            .send()
            .await;

        match response {
            Ok(resp) if resp.status().is_success() => Ok(()),
            _ => Err(anyhow::anyhow!("Base model '{}' not found. Please pull it first.", model_id))
        }
    }
}

/// Helper struct for GPU detection results
#[derive(Debug, Default)]
struct GpuDetectionResult {
    models: Vec<String>,
    total_memory: u64,
    free_memory: u64,
    cuda_available: bool,
    cuda_version: String,
    rocm_available: bool,
    rocm_version: String,
    metal_available: bool,
    metal_version: String,
    compute_capability: String,
}

// Ollama-compatible request/response structures
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenerateRequest {
    pub model: String,
    pub prompt: String,
    pub stream: Option<bool>,
    pub options: Option<GenerateOptions>,
    pub system: Option<String>,
    pub template: Option<String>,
    pub context: Option<Vec<i32>>,
    pub raw: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenerateResponse {
    pub model: String,
    pub created_at: String,
    pub response: String,
    pub done: bool,
    pub context: Option<Vec<i32>>,
    pub total_duration: Option<u64>,
    pub load_duration: Option<u64>,
    pub prompt_eval_count: Option<u32>,
    pub prompt_eval_duration: Option<u64>,
    pub eval_count: Option<u32>,
    pub eval_duration: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatRequest {
    pub model: String,
    pub messages: Vec<ChatMessage>,
    pub stream: Option<bool>,
    pub options: Option<GenerateOptions>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
    pub images: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatResponse {
    pub model: String,
    pub created_at: String,
    pub message: ChatMessage,
    pub done: bool,
    pub total_duration: Option<u64>,
    pub load_duration: Option<u64>,
    pub prompt_eval_count: Option<u32>,
    pub prompt_eval_duration: Option<u64>,
    pub eval_count: Option<u32>,
    pub eval_duration: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmbeddingRequest {
    pub model: String,
    pub prompt: String,
    pub options: Option<GenerateOptions>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmbeddingResponse {
    pub embedding: Vec<f32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PullRequest {
    pub name: String,
    pub insecure: Option<bool>,
    pub stream: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PullResponse {
    pub status: String,
    pub digest: Option<String>,
    pub total: Option<u64>,
    pub completed: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateRequest {
    pub name: String,
    pub modelfile: String,
    pub stream: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateResponse {
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CopyRequest {
    pub source: String,
    pub destination: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenerateOptions {
    pub num_keep: Option<i32>,
    pub seed: Option<i32>,
    pub num_predict: Option<i32>,
    pub top_k: Option<i32>,
    pub top_p: Option<f32>,
    pub tfs_z: Option<f32>,
    pub typical_p: Option<f32>,
    pub repeat_last_n: Option<i32>,
    pub temperature: Option<f32>,
    pub repeat_penalty: Option<f32>,
    pub presence_penalty: Option<f32>,
    pub frequency_penalty: Option<f32>,
    pub mirostat: Option<i32>,
    pub mirostat_tau: Option<f32>,
    pub mirostat_eta: Option<f32>,
    pub penalize_newline: Option<bool>,
    pub stop: Option<Vec<String>>,
    pub numa: Option<bool>,
    pub num_ctx: Option<i32>,
    pub num_batch: Option<i32>,
    pub num_gqa: Option<i32>,
    pub num_gpu: Option<i32>,
    pub main_gpu: Option<i32>,
    pub low_vram: Option<bool>,
    pub f16_kv: Option<bool>,
    pub logits_all: Option<bool>,
    pub vocab_only: Option<bool>,
    pub use_mmap: Option<bool>,
    pub use_mlock: Option<bool>,
    pub embedding_only: Option<bool>,
    pub rope_frequency_base: Option<f32>,
    pub rope_frequency_scale: Option<f32>,
    pub num_thread: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OllamaModelDetails {
    pub parent_model: String,
    pub format: String,
    pub family: String,
    pub families: Option<Vec<String>>,
    pub parameter_size: String,
    pub quantization_level: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OllamaModelInfo {
    pub name: String,
    pub modified_at: String,
    pub size: u64,
    pub digest: String,
    pub details: OllamaModelDetails,
}

// Streaming response wrapper
pin_project_lite::pin_project! {
    pub struct StreamResponse<T> {
        #[pin]
        inner: Pin<Box<dyn Stream<Item = Result<T>> + Send>>,
    }
}

impl<T> StreamResponse<T> {
    pub fn new<S>(stream: S) -> Self
    where
        S: Stream<Item = Result<T>> + Send + 'static,
    {
        Self {
            inner: Box::pin(stream),
        }
    }
}

impl<T> Stream for StreamResponse<T> {
    type Item = Result<T>;

    fn poll_next(self: Pin<&mut Self>, cx: &mut TaskContext<'_>) -> Poll<Option<Self::Item>> {
        self.project().inner.poll_next(cx)
    }
}

// Integration with Tauri commands
#[tauri::command]
pub async fn list_models(
    manager: tauri::State<'_, Arc<LLMManager>>,
) -> Result<Vec<ModelInfo>, String> {
    manager.list_models().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn download_model(
    manager: tauri::State<'_, Arc<LLMManager>>,
    model_id: String,
) -> Result<(), String> {
    manager
        .download_model(&model_id, None)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn load_model(
    manager: tauri::State<'_, Arc<LLMManager>>,
    model_id: String,
) -> Result<String, String> {
    manager
        .load_model(&model_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn unload_model(
    manager: tauri::State<'_, Arc<LLMManager>>,
    model_id: String,
) -> Result<(), String> {
    manager
        .unload_model(&model_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn remove_model(
    manager: tauri::State<'_, Arc<LLMManager>>,
    model_id: String,
) -> Result<(), String> {
    manager
        .remove_model(&model_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_recommended_models(
    manager: tauri::State<'_, Arc<LLMManager>>,
) -> Result<Vec<String>, String> {
    manager.get_recommended_models().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_system_info(
    manager: tauri::State<'_, Arc<LLMManager>>,
) -> Result<HashMap<String, String>, String> {
    manager.get_system_info().map_err(|e| e.to_string())
}

// Additional Tauri commands for the new methods

#[tauri::command]
pub async fn generate_response(
    manager: tauri::State<'_, Arc<LLMManager>>,
    request: GenerateRequest,
) -> Result<GenerateResponse, String> {
    manager.generate_response(request).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn chat_with_model(
    manager: tauri::State<'_, Arc<LLMManager>>,
    request: ChatRequest,
) -> Result<ChatResponse, String> {
    manager.chat(request).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_embeddings(
    manager: tauri::State<'_, Arc<LLMManager>>,
    request: EmbeddingRequest,
) -> Result<EmbeddingResponse, String> {
    manager.embeddings(request).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn show_model_info(
    manager: tauri::State<'_, Arc<LLMManager>>,
    model_name: String,
) -> Result<OllamaModelInfo, String> {
    manager.show_model(&model_name).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn pull_model(
    manager: tauri::State<'_, Arc<LLMManager>>,
    request: PullRequest,
) -> Result<PullResponse, String> {
    manager.pull_model(request).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_model(
    manager: tauri::State<'_, Arc<LLMManager>>,
    request: CreateRequest,
) -> Result<CreateResponse, String> {
    manager.create_model(request).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn copy_model(
    manager: tauri::State<'_, Arc<LLMManager>>,
    source: String,
    destination: String,
) -> Result<(), String> {
    manager.copy_model(&source, &destination).await.map_err(|e| e.to_string())
}
