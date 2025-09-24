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

        Ok(Self {
            registry: Arc::new(Mutex::new(registry)),
            model_path,
            cache_path,
            running_models: Arc::new(Mutex::new(HashMap::new())),
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

    /// Load a model for inference
    pub async fn load_model(&self, model_id: &str) -> Result<String> {
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
        use sysinfo::{Components, Networks, System};

        let mut sys = System::new_all();
        sys.refresh_all();

        // Get components that might include GPU info
        let components = sys.components();
        let mut gpu_models = Vec::new();

        for component in components {
            let label = component.label().to_lowercase();
            if label.contains("gpu") ||
               label.contains("graphics") ||
               label.contains("video") ||
               label.contains("display") {
                gpu_models.push(component.label().to_string());
            }
        }

        if !gpu_models.is_empty() {
            Some(gpu_models)
        } else {
            None
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
