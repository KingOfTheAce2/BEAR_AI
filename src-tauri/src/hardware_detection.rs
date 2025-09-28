use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use sysinfo::System;
use tauri::command;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CpuInfo {
    pub cores: u32,
    pub threads: u32,
    pub architecture: String,
    pub brand: String,
    pub base_speed: u64,
    pub max_speed: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MemoryInfo {
    pub total: u64,
    pub available: u64,
    #[serde(rename = "type")]
    pub memory_type: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GpuSupports {
    pub cuda: Option<bool>,
    pub opencl: Option<bool>,
    pub metal: Option<bool>,
    pub vulkan: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GpuInfo {
    pub name: String,
    pub vendor: String,
    pub memory: u64,
    pub compute_capability: Option<String>,
    pub driver_version: Option<String>,
    pub supports: GpuSupports,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct HardwareCapabilities {
    pub cpu: CpuInfo,
    pub memory: MemoryInfo,
    pub gpu: Option<Vec<GpuInfo>>,
}

#[command]
pub async fn detect_hardware_capabilities() -> Result<HardwareCapabilities, String> {
    let mut system = System::new_all();
    system.refresh_all();

    // CPU Detection
    let cpu_info = detect_cpu_info(&system)?;

    // Memory Detection
    let memory_info = detect_memory_info(&system)?;

    // GPU Detection
    let gpu_info = detect_gpu_info().await?;

    Ok(HardwareCapabilities {
        cpu: cpu_info,
        memory: memory_info,
        gpu: gpu_info,
    })
}

fn detect_cpu_info(system: &System) -> Result<CpuInfo, String> {
    let cpus = system.cpus();
    if cpus.is_empty() {
        return Err("No CPU information available".to_string());
    }

    let cpu = &cpus[0];
    let logical_cores = cpus.len() as u32;

    // Try to detect physical cores (simplified approach)
    let physical_cores = detect_physical_cores().unwrap_or(logical_cores / 2);

    Ok(CpuInfo {
        cores: physical_cores,
        threads: logical_cores,
        architecture: detect_cpu_architecture(),
        brand: cpu.brand().to_string(),
        base_speed: cpu.frequency(),
        max_speed: detect_max_cpu_frequency().unwrap_or(cpu.frequency()),
    })
}

fn detect_memory_info(system: &System) -> Result<MemoryInfo, String> {
    let total_memory = system.total_memory();
    let available_memory = system.available_memory();

    Ok(MemoryInfo {
        total: total_memory,
        available: available_memory,
        memory_type: detect_memory_type(),
    })
}

async fn detect_gpu_info() -> Result<Option<Vec<GpuInfo>>, String> {
    let mut gpus = Vec::new();

    // Try to detect NVIDIA GPUs
    if let Ok(nvidia_gpus) = detect_nvidia_gpus().await {
        gpus.extend(nvidia_gpus);
    }

    // Try to detect AMD GPUs
    if let Ok(amd_gpus) = detect_amd_gpus().await {
        gpus.extend(amd_gpus);
    }

    // Try to detect Intel GPUs
    if let Ok(intel_gpus) = detect_intel_gpus().await {
        gpus.extend(intel_gpus);
    }

    if gpus.is_empty() {
        Ok(None)
    } else {
        Ok(Some(gpus))
    }
}

#[cfg(target_os = "windows")]
fn detect_physical_cores() -> Option<u32> {
    use std::process::Command;

    let output = Command::new("wmic")
        .args(&["cpu", "get", "NumberOfCores", "/value"])
        .output()
        .ok()?;

    let output_str = String::from_utf8(output.stdout).ok()?;
    let cores_line = output_str
        .lines()
        .find(|line| line.starts_with("NumberOfCores="))?;

    cores_line
        .split('=')
        .nth(1)?
        .trim()
        .parse()
        .ok()
}

#[cfg(target_os = "macos")]
fn detect_physical_cores() -> Option<u32> {
    use std::process::Command;

    let output = Command::new("sysctl")
        .args(&["-n", "hw.physicalcpu"])
        .output()
        .ok()?;

    String::from_utf8(output.stdout)
        .ok()?
        .trim()
        .parse()
        .ok()
}

#[cfg(target_os = "linux")]
fn detect_physical_cores() -> Option<u32> {
    use std::fs;

    let content = fs::read_to_string("/proc/cpuinfo").ok()?;
    let mut core_ids = std::collections::HashSet::new();

    for line in content.lines() {
        if line.starts_with("core id") {
            if let Some(id) = line.split(':').nth(1) {
                core_ids.insert(id.trim().to_string());
            }
        }
    }

    Some(core_ids.len() as u32)
}

#[cfg(target_arch = "x86_64")]
fn detect_cpu_architecture() -> String {
    "x86_64".to_string()
}

#[cfg(target_arch = "aarch64")]
fn detect_cpu_architecture() -> String {
    "aarch64".to_string()
}

#[cfg(not(any(target_arch = "x86_64", target_arch = "aarch64")))]
fn detect_cpu_architecture() -> String {
    std::env::consts::ARCH.to_string()
}


fn detect_max_cpu_frequency() -> Option<u64> {
    #[cfg(target_os = "linux")]
    {
        use std::fs;

        if let Ok(content) = fs::read_to_string("/proc/cpuinfo") {
            for line in content.lines() {
                if line.starts_with("cpu MHz") {
                    if let Some(freq_str) = line.split(':').nth(1) {
                        if let Ok(freq) = freq_str.trim().parse::<f64>() {
                            return Some((freq * 1_000_000.0) as u64);
                        }
                    }
                }
            }
        }
    }

    None
}

fn detect_memory_type() -> String {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;

        if let Ok(output) = Command::new("wmic")
            .args(&["memorychip", "get", "MemoryType", "/value"])
            .output()
        {
            if let Ok(output_str) = String::from_utf8(output.stdout) {
                for line in output_str.lines() {
                    if line.starts_with("MemoryType=") {
                        if let Some(mem_type) = line.split('=').nth(1) {
                            let type_num: u32 = mem_type.trim().parse().unwrap_or(0);
                            return match type_num {
                                20 => "DDR".to_string(),
                                21 => "DDR2".to_string(),
                                24 => "DDR3".to_string(),
                                26 => "DDR4".to_string(),
                                30 => "DDR5".to_string(),
                                _ => "Unknown".to_string(),
                            };
                        }
                    }
                }
            }
        }
    }

    "Unknown".to_string()
}

async fn detect_nvidia_gpus() -> Result<Vec<GpuInfo>, String> {
    let mut gpus = Vec::new();

    // Try using nvidia-ml-py equivalent or nvidia-smi
    #[cfg(target_os = "windows")]
    {
        if let Ok(output) = std::process::Command::new("nvidia-smi")
            .args(&["--query-gpu=name,memory.total,driver_version", "--format=csv,noheader,nounits"])
            .output()
        {
            if let Ok(output_str) = String::from_utf8(output.stdout) {
                for line in output_str.lines() {
                    let parts: Vec<&str> = line.split(',').collect();
                    if parts.len() >= 3 {
                        let memory_mb: u64 = parts[1].trim().parse().unwrap_or(0);
                        gpus.push(GpuInfo {
                            name: parts[0].trim().to_string(),
                            vendor: "NVIDIA".to_string(),
                            memory: memory_mb * 1024 * 1024, // Convert MB to bytes
                            compute_capability: detect_cuda_compute_capability(),
                            driver_version: Some(parts[2].trim().to_string()),
                            supports: GpuSupports {
                                cuda: Some(true),
                                opencl: Some(true),
                                metal: None,
                                vulkan: Some(true),
                            },
                        });
                    }
                }
            }
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        // Similar implementation for Linux/macOS
        if let Ok(output) = std::process::Command::new("nvidia-smi")
            .args(&["--query-gpu=name,memory.total,driver_version", "--format=csv,noheader,nounits"])
            .output()
        {
            if let Ok(output_str) = String::from_utf8(output.stdout) {
                for line in output_str.lines() {
                    let parts: Vec<&str> = line.split(',').collect();
                    if parts.len() >= 3 {
                        let memory_mb: u64 = parts[1].trim().parse().unwrap_or(0);
                        gpus.push(GpuInfo {
                            name: parts[0].trim().to_string(),
                            vendor: "NVIDIA".to_string(),
                            memory: memory_mb * 1024 * 1024,
                            compute_capability: detect_cuda_compute_capability(),
                            driver_version: Some(parts[2].trim().to_string()),
                            supports: GpuSupports {
                                cuda: Some(true),
                                opencl: Some(true),
                                metal: None,
                                vulkan: Some(true),
                            },
                        });
                    }
                }
            }
        }
    }

    Ok(gpus)
}

async fn detect_amd_gpus() -> Result<Vec<GpuInfo>, String> {
    let mut gpus = Vec::new();

    #[cfg(target_os = "linux")]
    {
        // Try using rocm-smi for AMD GPUs on Linux
        if let Ok(output) = std::process::Command::new("rocm-smi")
            .args(&["--showproductname", "--showmeminfo", "vram"])
            .output()
        {
            if let Ok(output_str) = String::from_utf8(output.stdout) {
                // Parse AMD GPU information
                // This is a simplified implementation
                gpus.push(GpuInfo {
                    name: "AMD GPU".to_string(),
                    vendor: "AMD".to_string(),
                    memory: 0, // Would need proper parsing
                    compute_capability: None,
                    driver_version: None,
                    supports: GpuSupports {
                        cuda: Some(false),
                        opencl: Some(true),
                        metal: None,
                        vulkan: Some(true),
                    },
                });
            }
        }
    }

    Ok(gpus)
}

async fn detect_intel_gpus() -> Result<Vec<GpuInfo>, String> {
    let mut gpus = Vec::new();

    // Intel GPU detection is more complex and platform-specific
    // This is a placeholder implementation

    Ok(gpus)
}

fn detect_cuda_compute_capability() -> Option<String> {
    // This would require more sophisticated detection
    // For now, return a common capability version
    Some("7.5".to_string())
}

#[command]
pub async fn get_recommended_model_config(hardware: HardwareCapabilities) -> Result<Vec<HashMap<String, String>>, String> {
    let mut recommendations = Vec::new();

    let total_ram_gb = hardware.memory.total / (1024 * 1024 * 1024);
    let has_gpu = hardware.gpu.is_some() && !hardware.gpu.as_ref().unwrap().is_empty();

    if total_ram_gb >= 32 {
        recommendations.push({
            let mut config = HashMap::new();
            config.insert("name".to_string(), "llama2-70b".to_string());
            config.insert("size".to_string(), "39GB".to_string());
            config.insert("ram_requirement".to_string(), "32GB".to_string());
            config.insert("performance".to_string(), "Excellent".to_string());
            config
        });
    }

    if total_ram_gb >= 16 {
        recommendations.push({
            let mut config = HashMap::new();
            config.insert("name".to_string(), "llama2-13b".to_string());
            config.insert("size".to_string(), "7.3GB".to_string());
            config.insert("ram_requirement".to_string(), "16GB".to_string());
            config.insert("performance".to_string(), "High".to_string());
            config
        });
    }

    if total_ram_gb >= 8 {
        recommendations.push({
            let mut config = HashMap::new();
            config.insert("name".to_string(), "llama2-7b".to_string());
            config.insert("size".to_string(), "3.8GB".to_string());
            config.insert("ram_requirement".to_string(), "8GB".to_string());
            config.insert("performance".to_string(), "Good".to_string());
            config
        });
    }

    if total_ram_gb >= 4 {
        recommendations.push({
            let mut config = HashMap::new();
            config.insert("name".to_string(), "tinyllama".to_string());
            config.insert("size".to_string(), "637MB".to_string());
            config.insert("ram_requirement".to_string(), "4GB".to_string());
            config.insert("performance".to_string(), "Basic".to_string());
            config
        });
    }

    Ok(recommendations)
}

#[command]
pub async fn optimize_model_settings(hardware: HardwareCapabilities, model_size_gb: f64) -> Result<HashMap<String, String>, String> {
    let mut settings = HashMap::new();

    let total_ram_gb = hardware.memory.total as f64 / (1024.0 * 1024.0 * 1024.0);
    let has_gpu = hardware.gpu.is_some() && !hardware.gpu.as_ref().unwrap().is_empty();

    // Determine optimal batch size
    let batch_size = if total_ram_gb > model_size_gb * 4.0 {
        "8"
    } else if total_ram_gb > model_size_gb * 2.0 {
        "4"
    } else {
        "1"
    };

    // Determine optimal context length
    let context_length = if total_ram_gb > 16.0 {
        "4096"
    } else if total_ram_gb > 8.0 {
        "2048"
    } else {
        "1024"
    };

    // Determine optimal thread count
    let threads = std::cmp::min(hardware.cpu.cores, 8).to_string();

    // GPU acceleration
    let gpu_acceleration = if has_gpu {
        "enabled"
    } else {
        "disabled"
    };

    settings.insert("batch_size".to_string(), batch_size.to_string());
    settings.insert("context_length".to_string(), context_length.to_string());
    settings.insert("threads".to_string(), threads);
    settings.insert("gpu_acceleration".to_string(), gpu_acceleration.to_string());

    if has_gpu {
        if let Some(gpus) = &hardware.gpu {
            if let Some(gpu) = gpus.first() {
                let gpu_memory_gb = gpu.memory as f64 / (1024.0 * 1024.0 * 1024.0);
                if gpu_memory_gb >= model_size_gb {
                    settings.insert("gpu_layers".to_string(), "all".to_string());
                } else {
                    // Partial GPU offloading
                    let layers = ((gpu_memory_gb / model_size_gb) * 32.0) as u32;
                    settings.insert("gpu_layers".to_string(), layers.to_string());
                }
            }
        }
    }

    Ok(settings)
}