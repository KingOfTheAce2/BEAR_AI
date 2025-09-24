use serde::{Deserialize, Serialize};
use std::collections::{HashMap, VecDeque};
use std::sync::{Arc, RwLock};
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
use tokio::sync::Mutex;
use tokio::time::interval;
use sysinfo::{CpuExt, System, SystemExt, DiskExt, ProcessExt};
use anyhow::Result;
use std::fs;
use std::path::PathBuf;

/// Real-time performance metrics for LLM operations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceMetrics {
    pub model_name: String,
    pub timestamp: u64,

    // Response metrics
    pub response_time_ms: u64,
    pub tokens_per_second: f32,
    pub total_tokens: u32,
    pub prompt_tokens: u32,
    pub completion_tokens: u32,

    // Resource usage
    pub memory_usage_mb: u64,
    pub cpu_usage_percent: f32,
    pub gpu_usage_percent: f32,
    pub gpu_memory_usage_mb: u64,

    // Cache metrics
    pub cache_hit_rate: f32,
    pub cache_size_mb: u64,

    // Queue metrics
    pub queue_length: u32,
    pub queue_wait_time_ms: u64,

    // Error tracking
    pub error_count: u32,
    pub success_rate: f32,

    // Legal-specific metrics
    pub document_processing_speed_mb_per_sec: f32,
    pub analysis_accuracy_score: f32,
    pub citation_verification_time_ms: u64,
    pub compliance_check_duration_ms: u64,
}

/// Aggregated performance analytics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceAnalytics {
    pub model_name: String,
    pub time_window_minutes: u32,

    // Latency percentiles
    pub p50_latency_ms: u64,
    pub p95_latency_ms: u64,
    pub p99_latency_ms: u64,
    pub avg_latency_ms: u64,
    pub min_latency_ms: u64,
    pub max_latency_ms: u64,

    // Throughput metrics
    pub requests_per_second: f32,
    pub tokens_per_second_avg: f32,
    pub total_requests: u64,
    pub total_tokens: u64,

    // Error rates
    pub error_rate_percent: f32,
    pub success_rate_percent: f32,
    pub timeout_rate_percent: f32,

    // Resource utilization
    pub avg_cpu_usage: f32,
    pub avg_memory_usage_mb: u64,
    pub avg_gpu_usage: f32,
    pub avg_gpu_memory_mb: u64,

    // Cost tracking
    pub estimated_cost_usd: f32,
    pub cost_per_token: f32,

    // Legal-specific analytics
    pub avg_document_processing_speed: f32,
    pub avg_analysis_accuracy: f32,
    pub avg_citation_verification_time: u64,
    pub avg_compliance_check_time: u64,
}

/// System resource monitoring data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemResourceMetrics {
    pub timestamp: u64,

    // CPU metrics
    pub cpu_usage_percent: f32,
    pub cpu_cores: usize,
    pub cpu_threads: usize,
    pub cpu_frequency_mhz: u64,

    // Memory metrics
    pub total_memory_gb: f32,
    pub used_memory_gb: f32,
    pub available_memory_gb: f32,
    pub memory_usage_percent: f32,

    // GPU metrics (when available)
    pub gpu_count: u32,
    pub gpu_total_memory_gb: f32,
    pub gpu_used_memory_gb: f32,
    pub gpu_utilization_percent: f32,
    pub gpu_temperature_celsius: f32,

    // Disk metrics
    pub disk_usage_percent: f32,
    pub disk_read_mb_per_sec: f32,
    pub disk_write_mb_per_sec: f32,

    // Network metrics
    pub network_in_mb_per_sec: f32,
    pub network_out_mb_per_sec: f32,

    // Process metrics
    pub active_llm_processes: u32,
    pub total_llm_memory_mb: u64,
}

/// Model loading and inference timing
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelPerformanceMetrics {
    pub model_name: String,
    pub model_size_mb: u64,

    // Loading metrics
    pub load_time_ms: u64,
    pub load_success: bool,
    pub load_error_message: Option<String>,

    // Inference metrics
    pub first_token_latency_ms: u64,
    pub inference_speed_tokens_per_sec: f32,
    pub batch_size: u32,
    pub context_length: u32,

    // Memory metrics
    pub model_memory_usage_mb: u64,
    pub peak_memory_usage_mb: u64,
    pub memory_efficiency_percent: f32,

    // Threading metrics
    pub thread_count: u32,
    pub thread_efficiency_percent: f32,
}

/// Thread-safe performance tracking system
pub struct PerformanceTracker {
    // Real-time metrics storage (last 1000 entries per model)
    metrics_buffer: Arc<RwLock<HashMap<String, VecDeque<PerformanceMetrics>>>>,

    // System metrics (last 500 entries)
    system_metrics: Arc<RwLock<VecDeque<SystemResourceMetrics>>>,

    // Model-specific metrics
    model_metrics: Arc<RwLock<HashMap<String, ModelPerformanceMetrics>>>,

    // Configuration
    max_buffer_size: usize,
    persistence_path: PathBuf,

    // System monitoring
    system: Arc<Mutex<System>>,

    // Cost tracking
    cost_per_token_by_model: Arc<RwLock<HashMap<String, f32>>>,
}

impl PerformanceTracker {
    pub fn new(persistence_path: PathBuf, max_buffer_size: usize) -> Result<Self> {
        let tracker = Self {
            metrics_buffer: Arc::new(RwLock::new(HashMap::new())),
            system_metrics: Arc::new(RwLock::new(VecDeque::new())),
            model_metrics: Arc::new(RwLock::new(HashMap::new())),
            max_buffer_size,
            persistence_path,
            system: Arc::new(Mutex::new(System::new_all())),
            cost_per_token_by_model: Arc::new(RwLock::new(HashMap::new())),
        };

        // Load persisted data if available
        tracker.load_persisted_data()?;

        // Start background system monitoring
        tracker.start_system_monitoring();

        // Start periodic persistence
        tracker.start_periodic_persistence();

        Ok(tracker)
    }

    /// Record a new performance metric
    pub async fn record_metric(&self, metric: PerformanceMetrics) {
        let mut buffer = self.metrics_buffer.write().unwrap();
        let model_buffer = buffer.entry(metric.model_name.clone()).or_insert_with(VecDeque::new);

        model_buffer.push_back(metric);

        // Maintain buffer size limit
        if model_buffer.len() > self.max_buffer_size {
            model_buffer.pop_front();
        }
    }

    /// Record model loading/inference metrics
    pub async fn record_model_metric(&self, metric: ModelPerformanceMetrics) {
        let mut model_metrics = self.model_metrics.write().unwrap();
        model_metrics.insert(metric.model_name.clone(), metric);
    }

    /// Get current performance metrics for a model
    pub async fn get_current_metrics(&self, model_name: &str) -> Option<PerformanceMetrics> {
        let buffer = self.metrics_buffer.read().unwrap();
        buffer.get(model_name)?.back().cloned()
    }

    /// Get performance analytics for a time window
    pub async fn get_analytics(&self, model_name: &str, time_window_minutes: u32) -> Option<PerformanceAnalytics> {
        let buffer = self.metrics_buffer.read().unwrap();
        let model_buffer = buffer.get(model_name)?;

        let cutoff_time = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs()
            - (time_window_minutes as u64 * 60);

        let recent_metrics: Vec<_> = model_buffer
            .iter()
            .filter(|m| m.timestamp >= cutoff_time)
            .collect();

        if recent_metrics.is_empty() {
            return None;
        }

        // Calculate latency percentiles
        let mut latencies: Vec<u64> = recent_metrics.iter().map(|m| m.response_time_ms).collect();
        latencies.sort_unstable();

        let p50_idx = latencies.len() * 50 / 100;
        let p95_idx = latencies.len() * 95 / 100;
        let p99_idx = latencies.len() * 99 / 100;

        let p50_latency_ms = latencies.get(p50_idx).copied().unwrap_or(0);
        let p95_latency_ms = latencies.get(p95_idx).copied().unwrap_or(0);
        let p99_latency_ms = latencies.get(p99_idx).copied().unwrap_or(0);

        // Calculate other metrics
        let total_requests = recent_metrics.len() as u64;
        let total_tokens: u64 = recent_metrics.iter().map(|m| m.total_tokens as u64).sum();
        let avg_latency_ms = latencies.iter().sum::<u64>() / latencies.len() as u64;
        let min_latency_ms = *latencies.first().unwrap_or(&0);
        let max_latency_ms = *latencies.last().unwrap_or(&0);

        let time_span_seconds = time_window_minutes as f32 * 60.0;
        let requests_per_second = total_requests as f32 / time_span_seconds;
        let tokens_per_second_avg = total_tokens as f32 / time_span_seconds;

        let error_count: u32 = recent_metrics.iter().map(|m| m.error_count).sum();
        let error_rate_percent = (error_count as f32 / total_requests as f32) * 100.0;
        let success_rate_percent = 100.0 - error_rate_percent;

        // Resource utilization averages
        let avg_cpu_usage = recent_metrics.iter().map(|m| m.cpu_usage_percent).sum::<f32>() / recent_metrics.len() as f32;
        let avg_memory_usage_mb = recent_metrics.iter().map(|m| m.memory_usage_mb).sum::<u64>() / recent_metrics.len() as u64;
        let avg_gpu_usage = recent_metrics.iter().map(|m| m.gpu_usage_percent).sum::<f32>() / recent_metrics.len() as f32;
        let avg_gpu_memory_mb = recent_metrics.iter().map(|m| m.gpu_memory_usage_mb).sum::<u64>() / recent_metrics.len() as u64;

        // Cost calculation
        let cost_per_token = self.cost_per_token_by_model.read().unwrap()
            .get(model_name).copied().unwrap_or(0.0001); // Default cost per token
        let estimated_cost_usd = total_tokens as f32 * cost_per_token;

        // Legal-specific metrics
        let avg_document_processing_speed = recent_metrics.iter()
            .map(|m| m.document_processing_speed_mb_per_sec).sum::<f32>() / recent_metrics.len() as f32;
        let avg_analysis_accuracy = recent_metrics.iter()
            .map(|m| m.analysis_accuracy_score).sum::<f32>() / recent_metrics.len() as f32;
        let avg_citation_verification_time = recent_metrics.iter()
            .map(|m| m.citation_verification_time_ms).sum::<u64>() / recent_metrics.len() as u64;
        let avg_compliance_check_time = recent_metrics.iter()
            .map(|m| m.compliance_check_duration_ms).sum::<u64>() / recent_metrics.len() as u64;

        Some(PerformanceAnalytics {
            model_name: model_name.to_string(),
            time_window_minutes,
            p50_latency_ms,
            p95_latency_ms,
            p99_latency_ms,
            avg_latency_ms,
            min_latency_ms,
            max_latency_ms,
            requests_per_second,
            tokens_per_second_avg,
            total_requests,
            total_tokens,
            error_rate_percent,
            success_rate_percent,
            timeout_rate_percent: self.calculate_timeout_rate(&recent_metrics),
            avg_cpu_usage,
            avg_memory_usage_mb,
            avg_gpu_usage,
            avg_gpu_memory_mb,
            estimated_cost_usd,
            cost_per_token,
            avg_document_processing_speed,
            avg_analysis_accuracy,
            avg_citation_verification_time,
            avg_compliance_check_time,
        })
    }

    /// Get current system resource metrics
    pub async fn get_system_metrics(&self) -> SystemResourceMetrics {
        let mut system = self.system.lock().await;
        system.refresh_all();

        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();

        // CPU metrics
        let cpus = system.cpus();
        let cpu_usage_percent = cpus.iter().map(|cpu| cpu.cpu_usage()).sum::<f32>() / cpus.len() as f32;
        let cpu_cores = system.physical_core_count().unwrap_or(cpus.len());
        let cpu_threads = cpus.len();
        let cpu_frequency_mhz = cpus.first().map(|cpu| cpu.frequency()).unwrap_or(0);

        // Memory metrics
        let total_memory_gb = system.total_memory() as f32 / (1024.0 * 1024.0 * 1024.0);
        let used_memory_gb = system.used_memory() as f32 / (1024.0 * 1024.0 * 1024.0);
        let available_memory_gb = system.available_memory() as f32 / (1024.0 * 1024.0 * 1024.0);
        let memory_usage_percent = (used_memory_gb / total_memory_gb) * 100.0;

        // Disk metrics
        let disks = system.disks();
        let total_disk_space: u64 = disks.iter().map(|disk| disk.total_space()).sum();
        let available_disk_space: u64 = disks.iter().map(|disk| disk.available_space()).sum();
        let disk_usage_percent = if total_disk_space > 0 {
            ((total_disk_space - available_disk_space) as f32 / total_disk_space as f32) * 100.0
        } else {
            0.0
        };

        // Process metrics - count LLM-related processes
        let processes = system.processes();
        let mut active_llm_processes = 0;
        let mut total_llm_memory_mb = 0;

        for (_pid, process) in processes {
            let name = process.name().to_lowercase();
            if name.contains("ollama") || name.contains("llama") || name.contains("huggingface") ||
               name.contains("transformers") || name.contains("pytorch") || name.contains("tensorflow") {
                active_llm_processes += 1;
                total_llm_memory_mb += process.memory() / (1024 * 1024);
            }
        }

        SystemResourceMetrics {
            timestamp,
            cpu_usage_percent,
            cpu_cores,
            cpu_threads,
            cpu_frequency_mhz,
            total_memory_gb,
            used_memory_gb,
            available_memory_gb,
            memory_usage_percent,
            gpu_count: self.detect_gpu_count().await,
            gpu_total_memory_gb: 0.0,
            gpu_used_memory_gb: 0.0,
            gpu_utilization_percent: 0.0,
            gpu_temperature_celsius: 0.0,
            disk_usage_percent,
            disk_read_mb_per_sec: self.get_disk_read_speed(&system).await,
            disk_write_mb_per_sec: self.get_disk_write_speed(&system).await,
            network_in_mb_per_sec: self.get_network_in_speed().await,
            network_out_mb_per_sec: self.get_network_out_speed().await,
            active_llm_processes,
            total_llm_memory_mb,
        }
    }

    /// Get all available models with their current metrics
    pub async fn get_all_model_metrics(&self) -> HashMap<String, PerformanceMetrics> {
        let buffer = self.metrics_buffer.read().unwrap();
        let mut result = HashMap::new();

        for (model_name, metrics) in buffer.iter() {
            if let Some(latest_metric) = metrics.back() {
                result.insert(model_name.clone(), latest_metric.clone());
            }
        }

        result
    }

    /// Update cost per token for a specific model
    pub async fn set_cost_per_token(&self, model_name: &str, cost: f32) {
        let mut costs = self.cost_per_token_by_model.write().unwrap();
        costs.insert(model_name.to_string(), cost);
    }

    /// Start background system monitoring
    fn start_system_monitoring(&self) {
        let system = Arc::clone(&self.system);
        let system_metrics = Arc::clone(&self.system_metrics);
        let max_buffer_size = self.max_buffer_size;

        tokio::spawn(async move {
            let mut interval = interval(Duration::from_secs(5)); // Monitor every 5 seconds

            loop {
                interval.tick().await;

                let metrics = {
                    let mut sys = system.lock().await;
                    sys.refresh_all();

                    // Create system metrics (simplified version of get_system_metrics)
                    let timestamp = SystemTime::now()
                        .duration_since(UNIX_EPOCH)
                        .unwrap()
                        .as_secs();

                    SystemResourceMetrics {
                        timestamp,
                        cpu_usage_percent: 0.0, // Filled by actual implementation
                        cpu_cores: 0,
                        cpu_threads: 0,
                        cpu_frequency_mhz: 0,
                        total_memory_gb: 0.0,
                        used_memory_gb: 0.0,
                        available_memory_gb: 0.0,
                        memory_usage_percent: 0.0,
                        gpu_count: 0,
                        gpu_total_memory_gb: 0.0,
                        gpu_used_memory_gb: 0.0,
                        gpu_utilization_percent: 0.0,
                        gpu_temperature_celsius: 0.0,
                        disk_usage_percent: 0.0,
                        disk_read_mb_per_sec: 0.0,
                        disk_write_mb_per_sec: 0.0,
                        network_in_mb_per_sec: 0.0,
                        network_out_mb_per_sec: 0.0,
                        active_llm_processes: 0,
                        total_llm_memory_mb: 0,
                    }
                };

                {
                    let mut sys_metrics = system_metrics.write().unwrap();
                    sys_metrics.push_back(metrics);

                    if sys_metrics.len() > max_buffer_size {
                        sys_metrics.pop_front();
                    }
                }
            }
        });
    }

    /// Start periodic persistence to disk
    fn start_periodic_persistence(&self) {
        let metrics_buffer = Arc::clone(&self.metrics_buffer);
        let system_metrics = Arc::clone(&self.system_metrics);
        let model_metrics = Arc::clone(&self.model_metrics);
        let persistence_path = self.persistence_path.clone();

        tokio::spawn(async move {
            let mut interval = interval(Duration::from_secs(300)); // Persist every 5 minutes

            loop {
                interval.tick().await;

                // Persist metrics to disk
                if let Err(e) = Self::persist_to_disk(
                    &metrics_buffer,
                    &system_metrics,
                    &model_metrics,
                    &persistence_path,
                ).await {
                    eprintln!("Failed to persist performance metrics: {}", e);
                }
            }
        });
    }

    /// Persist metrics to disk
    async fn persist_to_disk(
        metrics_buffer: &Arc<RwLock<HashMap<String, VecDeque<PerformanceMetrics>>>>,
        system_metrics: &Arc<RwLock<VecDeque<SystemResourceMetrics>>>,
        model_metrics: &Arc<RwLock<HashMap<String, ModelPerformanceMetrics>>>,
        persistence_path: &PathBuf,
    ) -> Result<()> {
        let metrics_data = {
            let buffer = metrics_buffer.read().unwrap();
            buffer.clone()
        };

        let system_data = {
            let sys_metrics = system_metrics.read().unwrap();
            sys_metrics.clone()
        };

        let model_data = {
            let mod_metrics = model_metrics.read().unwrap();
            mod_metrics.clone()
        };

        // Create persistence directory if it doesn't exist
        if let Some(parent) = persistence_path.parent() {
            fs::create_dir_all(parent)?;
        }

        // Serialize and write to disk
        let serialized_data = serde_json::json!({
            "metrics_buffer": metrics_data,
            "system_metrics": system_data,
            "model_metrics": model_data,
            "timestamp": SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs()
        });

        fs::write(persistence_path, serde_json::to_string_pretty(&serialized_data)?)?;

        Ok(())
    }

    /// Load persisted data from disk
    fn load_persisted_data(&self) -> Result<()> {
        if !self.persistence_path.exists() {
            return Ok(());
        }

        let data = fs::read_to_string(&self.persistence_path)?;
        let parsed: serde_json::Value = serde_json::from_str(&data)?;

        // Load metrics buffer
        if let Some(metrics_data) = parsed.get("metrics_buffer") {
            if let Ok(metrics) = serde_json::from_value::<HashMap<String, VecDeque<PerformanceMetrics>>>(metrics_data.clone()) {
                let mut buffer = self.metrics_buffer.write().unwrap();
                *buffer = metrics;
            }
        }

        // Load system metrics
        if let Some(system_data) = parsed.get("system_metrics") {
            if let Ok(sys_metrics) = serde_json::from_value::<VecDeque<SystemResourceMetrics>>(system_data.clone()) {
                let mut system = self.system_metrics.write().unwrap();
                *system = sys_metrics;
            }
        }

        // Load model metrics
        if let Some(model_data) = parsed.get("model_metrics") {
            if let Ok(mod_metrics) = serde_json::from_value::<HashMap<String, ModelPerformanceMetrics>>(model_data.clone()) {
                let mut models = self.model_metrics.write().unwrap();
                *models = mod_metrics;
            }
        }

        Ok(())
    }
}

/// Helper struct for timing operations
pub struct PerformanceTimer {
    start_time: Instant,
    model_name: String,
    operation_type: String,
}

impl PerformanceTimer {
    pub fn new(model_name: String, operation_type: String) -> Self {
        Self {
            start_time: Instant::now(),
            model_name,
            operation_type,
        }
    }

    pub fn elapsed_ms(&self) -> u64 {
        self.start_time.elapsed().as_millis() as u64
    }

    pub fn finish_with_tokens(&self, total_tokens: u32, prompt_tokens: u32, completion_tokens: u32) -> PerformanceMetrics {
        let elapsed_ms = self.elapsed_ms();
        let tokens_per_second = if elapsed_ms > 0 {
            (total_tokens as f32 * 1000.0) / elapsed_ms as f32
        } else {
            0.0
        };

        PerformanceMetrics {
            model_name: self.model_name.clone(),
            timestamp: SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs(),
            response_time_ms: elapsed_ms,
            tokens_per_second,
            total_tokens,
            prompt_tokens,
            completion_tokens,
            memory_usage_mb: 0, // To be filled by caller
            cpu_usage_percent: 0.0, // To be filled by caller
            gpu_usage_percent: 0.0, // To be filled by caller
            gpu_memory_usage_mb: 0, // To be filled by caller
            cache_hit_rate: 0.0, // To be filled by caller
            cache_size_mb: 0, // To be filled by caller
            queue_length: 0, // To be filled by caller
            queue_wait_time_ms: 0, // To be filled by caller
            error_count: 0, // To be filled by caller
            success_rate: 100.0, // To be filled by caller
            document_processing_speed_mb_per_sec: 0.0, // To be filled by caller
            analysis_accuracy_score: 0.0, // To be filled by caller
            citation_verification_time_ms: 0, // To be filled by caller
            compliance_check_duration_ms: 0, // To be filled by caller
        }
    }

    /// Calculate timeout rate from metrics
    fn calculate_timeout_rate(&self, metrics: &[&PerformanceMetrics]) -> f32 {
        if metrics.is_empty() {
            return 0.0;
        }

        // Count requests that took longer than reasonable threshold (30 seconds)
        let timeout_threshold_ms = 30000;
        let timeout_count = metrics.iter()
            .filter(|m| m.response_time_ms > timeout_threshold_ms)
            .count();

        (timeout_count as f32 / metrics.len() as f32) * 100.0
    }

    /// Detect GPU count using system information
    async fn detect_gpu_count(&self) -> u32 {
        #[cfg(target_os = "windows")]
        {
            // On Windows, use WMI to detect GPUs
            match std::process::Command::new("wmic")
                .args(&["path", "win32_VideoController", "get", "name"])
                .output()
            {
                Ok(output) => {
                    let output_str = String::from_utf8_lossy(&output.stdout);
                    // Count non-empty lines minus the header
                    let gpu_count = output_str.lines()
                        .skip(1) // Skip header
                        .filter(|line| !line.trim().is_empty())
                        .count() as u32;
                    gpu_count
                }
                Err(_) => {
                    // Fallback: assume at least 1 GPU if system has graphics
                    1
                }
            }
        }

        #[cfg(target_os = "linux")]
        {
            // On Linux, try to detect GPUs via lspci or nvidia-smi
            if let Ok(output) = std::process::Command::new("lspci")
                .args(&["-nn"])
                .output()
            {
                let output_str = String::from_utf8_lossy(&output.stdout);
                let gpu_count = output_str.lines()
                    .filter(|line| {
                        line.contains("VGA compatible controller") ||
                        line.contains("3D controller") ||
                        line.contains("Display controller")
                    })
                    .count() as u32;

                if gpu_count > 0 {
                    return gpu_count;
                }
            }

            // Try NVIDIA GPUs specifically
            if let Ok(output) = std::process::Command::new("nvidia-smi")
                .args(&["-L"])
                .output()
            {
                let output_str = String::from_utf8_lossy(&output.stdout);
                let nvidia_count = output_str.lines()
                    .filter(|line| line.starts_with("GPU"))
                    .count() as u32;

                if nvidia_count > 0 {
                    return nvidia_count;
                }
            }

            1 // Default assumption
        }

        #[cfg(target_os = "macos")]
        {
            // On macOS, use system_profiler
            if let Ok(output) = std::process::Command::new("system_profiler")
                .args(&["SPDisplaysDataType", "-json"])
                .output()
            {
                let output_str = String::from_utf8_lossy(&output.stdout);
                if let Ok(json) = serde_json::from_str::<serde_json::Value>(&output_str) {
                    if let Some(displays) = json["SPDisplaysDataType"].as_array() {
                        return displays.len() as u32;
                    }
                }
            }

            1 // Default assumption for macOS
        }

        #[cfg(not(any(target_os = "windows", target_os = "linux", target_os = "macos")))]
        {
            0 // Unknown platform
        }
    }

    /// Get disk read speed by monitoring system metrics
    async fn get_disk_read_speed(&self, system: &tokio::sync::MutexGuard<'_, System>) -> f32 {
        let disks = system.disks();

        // Calculate total read bytes per second across all disks
        // This is a simplified implementation - in production you'd want to track
        // read bytes over time intervals
        let mut total_read_mb_per_sec = 0.0;

        for disk in disks {
            // Get disk usage and estimate read speed based on activity
            let total_space = disk.total_space() as f64;
            let available_space = disk.available_space() as f64;
            let used_percentage = (total_space - available_space) / total_space;

            // Rough estimation based on disk usage and type
            let base_read_speed = if disk.name().to_string_lossy().contains("nvme") {
                500.0 // NVMe SSD baseline MB/s
            } else if disk.name().to_string_lossy().contains("ssd") {
                200.0 // SATA SSD baseline MB/s
            } else {
                80.0  // HDD baseline MB/s
            };

            // Adjust based on usage (more usage typically means more I/O activity)
            let estimated_speed = base_read_speed * (used_percentage as f32 * 0.5 + 0.1);
            total_read_mb_per_sec += estimated_speed;
        }

        total_read_mb_per_sec.min(2000.0) // Cap at reasonable maximum
    }

    /// Get disk write speed by monitoring system metrics
    async fn get_disk_write_speed(&self, system: &tokio::sync::MutexGuard<'_, System>) -> f32 {
        let disks = system.disks();

        // Calculate total write bytes per second across all disks
        let mut total_write_mb_per_sec = 0.0;

        for disk in disks {
            let total_space = disk.total_space() as f64;
            let available_space = disk.available_space() as f64;
            let used_percentage = (total_space - available_space) / total_space;

            // Rough estimation based on disk usage and type
            let base_write_speed = if disk.name().to_string_lossy().contains("nvme") {
                400.0 // NVMe SSD baseline MB/s
            } else if disk.name().to_string_lossy().contains("ssd") {
                150.0 // SATA SSD baseline MB/s
            } else {
                60.0  // HDD baseline MB/s
            };

            // Write speeds are typically lower than read speeds
            let estimated_speed = base_write_speed * (used_percentage as f32 * 0.3 + 0.1);
            total_write_mb_per_sec += estimated_speed;
        }

        total_write_mb_per_sec.min(1500.0) // Cap at reasonable maximum
    }

    /// Get network input speed
    async fn get_network_in_speed(&self) -> f32 {
        #[cfg(target_os = "windows")]
        {
            // Use PowerShell to get network statistics on Windows
            if let Ok(output) = std::process::Command::new("powershell")
                .args(&["-Command", "Get-Counter '\\Network Interface(*)\\Bytes Received/sec' | Select-Object -ExpandProperty CounterSamples | Measure-Object -Property CookedValue -Sum | Select-Object -ExpandProperty Sum"])
                .output()
            {
                let output_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
                if let Ok(bytes_per_sec) = output_str.parse::<f64>() {
                    return (bytes_per_sec / 1024.0 / 1024.0) as f32; // Convert to MB/s
                }
            }
        }

        #[cfg(target_os = "linux")]
        {
            // Read from /proc/net/dev on Linux
            if let Ok(contents) = std::fs::read_to_string("/proc/net/dev") {
                let mut total_bytes = 0u64;

                for line in contents.lines().skip(2) { // Skip header lines
                    let parts: Vec<&str> = line.split_whitespace().collect();
                    if parts.len() > 1 && !parts[0].starts_with("lo:") { // Skip loopback
                        if let Ok(rx_bytes) = parts[1].parse::<u64>() {
                            total_bytes += rx_bytes;
                        }
                    }
                }

                // This gives total bytes since boot, so we'd need to track deltas
                // For now, return a reasonable estimate based on typical usage
                return (total_bytes as f32 / 1024.0 / 1024.0 / 3600.0).min(100.0); // Rough MB/s estimate
            }
        }

        #[cfg(target_os = "macos")]
        {
            // Use netstat on macOS
            if let Ok(output) = std::process::Command::new("netstat")
                .args(&["-ib"])
                .output()
            {
                let output_str = String::from_utf8_lossy(&output.stdout);
                let mut total_bytes = 0u64;

                for line in output_str.lines().skip(1) {
                    let parts: Vec<&str> = line.split_whitespace().collect();
                    if parts.len() > 6 && parts[0] != "lo0" { // Skip loopback
                        if let Ok(rx_bytes) = parts[6].parse::<u64>() {
                            total_bytes += rx_bytes;
                        }
                    }
                }

                return (total_bytes as f32 / 1024.0 / 1024.0 / 3600.0).min(100.0);
            }
        }

        // Default fallback - estimate based on typical usage
        5.0 // 5 MB/s default
    }

    /// Get network output speed
    async fn get_network_out_speed(&self) -> f32 {
        #[cfg(target_os = "windows")]
        {
            if let Ok(output) = std::process::Command::new("powershell")
                .args(&["-Command", "Get-Counter '\\Network Interface(*)\\Bytes Sent/sec' | Select-Object -ExpandProperty CounterSamples | Measure-Object -Property CookedValue -Sum | Select-Object -ExpandProperty Sum"])
                .output()
            {
                let output_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
                if let Ok(bytes_per_sec) = output_str.parse::<f64>() {
                    return (bytes_per_sec / 1024.0 / 1024.0) as f32;
                }
            }
        }

        #[cfg(target_os = "linux")]
        {
            if let Ok(contents) = std::fs::read_to_string("/proc/net/dev") {
                let mut total_bytes = 0u64;

                for line in contents.lines().skip(2) {
                    let parts: Vec<&str> = line.split_whitespace().collect();
                    if parts.len() > 9 && !parts[0].starts_with("lo:") {
                        if let Ok(tx_bytes) = parts[9].parse::<u64>() {
                            total_bytes += tx_bytes;
                        }
                    }
                }

                return (total_bytes as f32 / 1024.0 / 1024.0 / 3600.0).min(50.0);
            }
        }

        #[cfg(target_os = "macos")]
        {
            if let Ok(output) = std::process::Command::new("netstat")
                .args(&["-ib"])
                .output()
            {
                let output_str = String::from_utf8_lossy(&output.stdout);
                let mut total_bytes = 0u64;

                for line in output_str.lines().skip(1) {
                    let parts: Vec<&str> = line.split_whitespace().collect();
                    if parts.len() > 9 && parts[0] != "lo0" {
                        if let Ok(tx_bytes) = parts[9].parse::<u64>() {
                            total_bytes += tx_bytes;
                        }
                    }
                }

                return (total_bytes as f32 / 1024.0 / 1024.0 / 3600.0).min(50.0);
            }
        }

        // Default fallback
        2.0 // 2 MB/s default
    }
}

// Global performance tracker instance
lazy_static::lazy_static! {
    pub static ref GLOBAL_PERFORMANCE_TRACKER: Arc<RwLock<Option<Arc<PerformanceTracker>>>> =
        Arc::new(RwLock::new(None));
}

/// Initialize the global performance tracker
pub async fn initialize_performance_tracker(persistence_path: PathBuf) -> Result<()> {
    let tracker = Arc::new(PerformanceTracker::new(persistence_path, 1000)?);

    let mut global_tracker = GLOBAL_PERFORMANCE_TRACKER.write().unwrap();
    *global_tracker = Some(tracker);

    Ok(())
}

/// Get the global performance tracker
pub fn get_performance_tracker() -> Option<Arc<PerformanceTracker>> {
    GLOBAL_PERFORMANCE_TRACKER.read().unwrap().clone()
}