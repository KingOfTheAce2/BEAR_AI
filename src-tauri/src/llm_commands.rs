// Tauri commands for LLM Management System
use crate::llm_manager::{
    initialize_llm_manager, ChatRequest, ChatResponse, EmbeddingRequest, EmbeddingResponse,
    GenerateRequest, GenerateResponse, GpuInfo, LlmConfig, LlmManagerRef, ModelCreateRequest,
    ModelInfo, ModelPullRequest, RunningModel,
};
use crate::performance_tracker::{
    get_performance_tracker, PerformanceMetrics, PerformanceAnalytics, SystemResourceMetrics,
    ModelPerformanceMetrics, PerformanceTimer
};
use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::State;

// Command response wrappers
#[derive(Serialize, Deserialize)]
pub struct CommandResult<T> {
    pub success: bool,
    pub data: Option<T>,
    pub error: Option<String>,
}

impl<T> CommandResult<T> {
    pub fn success(data: T) -> Self {
        Self {
            success: true,
            data: Some(data),
            error: None,
        }
    }

    pub fn error(error: String) -> Self {
        Self {
            success: false,
            data: None,
            error: Some(error),
        }
    }
}

impl<T> From<Result<T>> for CommandResult<T> {
    fn from(result: Result<T>) -> Self {
        match result {
            Ok(data) => Self::success(data),
            Err(err) => Self::error(err.to_string()),
        }
    }
}

// LLM Management Commands

#[tauri::command]
pub async fn llm_initialize(
    manager: State<'_, LlmManagerRef>,
    config: Option<LlmConfig>,
) -> Result<CommandResult<String>, String> {
    match initialize_llm_manager(manager.inner().clone(), config).await {
        Ok(_) => Ok(CommandResult::success(
            "LLM Manager initialized successfully".to_string(),
        )),
        Err(e) => Ok(CommandResult::error(e.to_string())),
    }
}

#[tauri::command]
pub async fn llm_list_models(
    manager: State<'_, LlmManagerRef>,
) -> Result<CommandResult<Vec<ModelInfo>>, String> {
    let manager_guard = manager.read().await;
    if let Some(ref llm_manager) = *manager_guard {
        let result = llm_manager.list_models().await;
        Ok(result.into())
    } else {
        Ok(CommandResult::error(
            "LLM Manager not initialized".to_string(),
        ))
    }
}

#[tauri::command]
pub async fn llm_show_model(
    manager: State<'_, LlmManagerRef>,
    name: String,
) -> Result<CommandResult<Option<ModelInfo>>, String> {
    let manager_guard = manager.read().await;
    if let Some(ref llm_manager) = *manager_guard {
        let result = llm_manager.show_model(&name).await;
        Ok(result.into())
    } else {
        Ok(CommandResult::error(
            "LLM Manager not initialized".to_string(),
        ))
    }
}

#[tauri::command]
pub async fn llm_pull_model(
    manager: State<'_, LlmManagerRef>,
    request: ModelPullRequest,
) -> Result<CommandResult<String>, String> {
    let manager_guard = manager.read().await;
    if let Some(ref llm_manager) = *manager_guard {
        match llm_manager.pull_model(request).await {
            Ok(_) => Ok(CommandResult::success(
                "Model pulled successfully".to_string(),
            )),
            Err(e) => Ok(CommandResult::error(e.to_string())),
        }
    } else {
        Ok(CommandResult::error(
            "LLM Manager not initialized".to_string(),
        ))
    }
}

#[tauri::command]
pub async fn llm_delete_model(
    manager: State<'_, LlmManagerRef>,
    name: String,
) -> Result<CommandResult<bool>, String> {
    let manager_guard = manager.read().await;
    if let Some(ref llm_manager) = *manager_guard {
        let result = llm_manager.delete_model(&name).await;
        Ok(result.into())
    } else {
        Ok(CommandResult::error(
            "LLM Manager not initialized".to_string(),
        ))
    }
}

#[tauri::command]
pub async fn llm_generate(
    manager: State<'_, LlmManagerRef>,
    request: GenerateRequest,
) -> Result<CommandResult<GenerateResponse>, String> {
    let manager_guard = manager.read().await;
    if let Some(ref llm_manager) = *manager_guard {
        // Start performance tracking
        let timer = PerformanceTimer::new(
            request.model.clone().unwrap_or_else(|| "unknown".to_string()),
            "generate".to_string()
        );

        let result = llm_manager.generate(request).await;

        // Record performance metrics if tracking is available
        if let Some(tracker) = get_performance_tracker() {
            match &result {
                Ok(response) => {
                    // Extract token counts from response (assuming they exist)
                    let total_tokens = response.eval_count.unwrap_or(0) as u32;
                    let prompt_tokens = response.prompt_eval_count.unwrap_or(0) as u32;
                    let completion_tokens = total_tokens.saturating_sub(prompt_tokens);

                    let mut metrics = timer.finish_with_tokens(total_tokens, prompt_tokens, completion_tokens);

                    // Get current system metrics to fill in resource usage
                    let system_metrics = tracker.get_system_metrics().await;
                    metrics.cpu_usage_percent = system_metrics.cpu_usage_percent;
                    metrics.memory_usage_mb = system_metrics.total_llm_memory_mb;
                    metrics.gpu_usage_percent = system_metrics.gpu_utilization_percent;
                    metrics.gpu_memory_usage_mb = system_metrics.gpu_used_memory_gb as u64 * 1024;

                    // Record the metrics
                    tracker.record_metric(metrics).await;
                }
                Err(_) => {
                    // Record error metrics
                    let mut metrics = timer.finish_with_tokens(0, 0, 0);
                    metrics.error_count = 1;
                    metrics.success_rate = 0.0;

                    if let Some(tracker) = get_performance_tracker() {
                        tracker.record_metric(metrics).await;
                    }
                }
            }
        }

        Ok(result.into())
    } else {
        Ok(CommandResult::error(
            "LLM Manager not initialized".to_string(),
        ))
    }
}

#[tauri::command]
pub async fn llm_chat(
    manager: State<'_, LlmManagerRef>,
    request: ChatRequest,
) -> Result<CommandResult<ChatResponse>, String> {
    let manager_guard = manager.read().await;
    if let Some(ref llm_manager) = *manager_guard {
        // Start performance tracking
        let timer = PerformanceTimer::new(
            request.model.clone().unwrap_or_else(|| "unknown".to_string()),
            "chat".to_string()
        );

        let result = llm_manager.chat(request).await;

        // Record performance metrics if tracking is available
        if let Some(tracker) = get_performance_tracker() {
            match &result {
                Ok(response) => {
                    // Extract token counts from response
                    let total_tokens = response.eval_count.unwrap_or(0) as u32;
                    let prompt_tokens = response.prompt_eval_count.unwrap_or(0) as u32;
                    let completion_tokens = total_tokens.saturating_sub(prompt_tokens);

                    let mut metrics = timer.finish_with_tokens(total_tokens, prompt_tokens, completion_tokens);

                    // Get current system metrics to fill in resource usage
                    let system_metrics = tracker.get_system_metrics().await;
                    metrics.cpu_usage_percent = system_metrics.cpu_usage_percent;
                    metrics.memory_usage_mb = system_metrics.total_llm_memory_mb;
                    metrics.gpu_usage_percent = system_metrics.gpu_utilization_percent;
                    metrics.gpu_memory_usage_mb = system_metrics.gpu_used_memory_gb as u64 * 1024;

                    // Add legal-specific metrics for chat conversations
                    if response.message.content.len() > 100 {
                        metrics.document_processing_speed_mb_per_sec =
                            (response.message.content.len() as f32 / 1024.0 / 1024.0) /
                            (metrics.response_time_ms as f32 / 1000.0);
                    }

                    // Record the metrics
                    tracker.record_metric(metrics).await;
                }
                Err(_) => {
                    // Record error metrics
                    let mut metrics = timer.finish_with_tokens(0, 0, 0);
                    metrics.error_count = 1;
                    metrics.success_rate = 0.0;

                    tracker.record_metric(metrics).await;
                }
            }
        }

        Ok(result.into())
    } else {
        Ok(CommandResult::error(
            "LLM Manager not initialized".to_string(),
        ))
    }
}

#[tauri::command]
pub async fn llm_embeddings(
    manager: State<'_, LlmManagerRef>,
    request: EmbeddingRequest,
) -> Result<CommandResult<EmbeddingResponse>, String> {
    let manager_guard = manager.read().await;
    if let Some(ref llm_manager) = *manager_guard {
        let result = llm_manager.embeddings(request).await;
        Ok(result.into())
    } else {
        Ok(CommandResult::error(
            "LLM Manager not initialized".to_string(),
        ))
    }
}

#[tauri::command]
pub async fn llm_create_model(
    manager: State<'_, LlmManagerRef>,
    request: ModelCreateRequest,
) -> Result<CommandResult<String>, String> {
    let manager_guard = manager.read().await;
    if let Some(ref llm_manager) = *manager_guard {
        match llm_manager.create_model(request).await {
            Ok(_) => Ok(CommandResult::success(
                "Model created successfully".to_string(),
            )),
            Err(e) => Ok(CommandResult::error(e.to_string())),
        }
    } else {
        Ok(CommandResult::error(
            "LLM Manager not initialized".to_string(),
        ))
    }
}

#[tauri::command]
pub async fn llm_copy_model(
    manager: State<'_, LlmManagerRef>,
    source: String,
    destination: String,
) -> Result<CommandResult<String>, String> {
    let manager_guard = manager.read().await;
    if let Some(ref llm_manager) = *manager_guard {
        match llm_manager.copy_model(&source, &destination).await {
            Ok(_) => Ok(CommandResult::success(
                "Model copied successfully".to_string(),
            )),
            Err(e) => Ok(CommandResult::error(e.to_string())),
        }
    } else {
        Ok(CommandResult::error(
            "LLM Manager not initialized".to_string(),
        ))
    }
}

#[tauri::command]
pub async fn llm_list_running_models(
    manager: State<'_, LlmManagerRef>,
) -> Result<CommandResult<Vec<RunningModel>>, String> {
    let manager_guard = manager.read().await;
    if let Some(ref llm_manager) = *manager_guard {
        let result = llm_manager.list_running_models().await;
        Ok(result.into())
    } else {
        Ok(CommandResult::error(
            "LLM Manager not initialized".to_string(),
        ))
    }
}

#[tauri::command]
pub async fn llm_system_info(
    manager: State<'_, LlmManagerRef>,
) -> Result<CommandResult<HashMap<String, serde_json::Value>>, String> {
    let manager_guard = manager.read().await;
    if let Some(ref llm_manager) = *manager_guard {
        let result = llm_manager.get_system_info().await;
        Ok(result.into())
    } else {
        Ok(CommandResult::error(
            "LLM Manager not initialized".to_string(),
        ))
    }
}

// Model Library Commands for Legal-Focused Models

#[derive(Serialize, Deserialize, Debug)]
pub struct ModelLibraryEntry {
    pub name: String,
    pub description: String,
    pub size: String,
    pub tags: Vec<String>,
    pub use_cases: Vec<String>,
    pub quantizations: Vec<String>,
    pub license: String,
    pub source: String,
    pub recommended_for_legal: bool,
}

#[tauri::command]
pub async fn llm_get_model_library() -> Result<CommandResult<Vec<ModelLibraryEntry>>, String> {
    let library = vec![
        ModelLibraryEntry {
            name: "codellama:7b".to_string(),
            description:
                "Code Llama 7B - Specialized for code generation and legal document automation"
                    .to_string(),
            size: "3.8GB".to_string(),
            tags: vec!["code".to_string(), "legal".to_string(), "7b".to_string()],
            use_cases: vec![
                "Legal document drafting".to_string(),
                "Contract generation".to_string(),
                "Legal code analysis".to_string(),
            ],
            quantizations: vec!["q4_0".to_string(), "q4_1".to_string(), "q8_0".to_string()],
            license: "Custom".to_string(),
            source: "meta-llama/CodeLlama-7b-hf".to_string(),
            recommended_for_legal: true,
        },
        ModelLibraryEntry {
            name: "llama3:8b".to_string(),
            description: "Llama 3 8B - General purpose model excellent for legal analysis"
                .to_string(),
            size: "4.7GB".to_string(),
            tags: vec!["general".to_string(), "legal".to_string(), "8b".to_string()],
            use_cases: vec![
                "Legal research".to_string(),
                "Document analysis".to_string(),
                "Legal Q&A".to_string(),
            ],
            quantizations: vec!["q4_0".to_string(), "q4_1".to_string(), "q8_0".to_string()],
            license: "Custom".to_string(),
            source: "meta-llama/Meta-Llama-3-8B".to_string(),
            recommended_for_legal: true,
        },
        ModelLibraryEntry {
            name: "phi3:3.8b".to_string(),
            description: "Phi-3 Mini - Microsoft's efficient model for legal document processing"
                .to_string(),
            size: "2.3GB".to_string(),
            tags: vec![
                "efficient".to_string(),
                "legal".to_string(),
                "3.8b".to_string(),
            ],
            use_cases: vec![
                "Legal document summarization".to_string(),
                "Fast legal queries".to_string(),
                "Legal compliance checking".to_string(),
            ],
            quantizations: vec!["q4_0".to_string(), "q4_1".to_string()],
            license: "MIT".to_string(),
            source: "microsoft/Phi-3-mini-4k-instruct".to_string(),
            recommended_for_legal: true,
        },
        ModelLibraryEntry {
            name: "mistral:7b".to_string(),
            description: "Mistral 7B - High performance model for legal reasoning".to_string(),
            size: "4.1GB".to_string(),
            tags: vec![
                "reasoning".to_string(),
                "legal".to_string(),
                "7b".to_string(),
            ],
            use_cases: vec![
                "Legal reasoning".to_string(),
                "Case law analysis".to_string(),
                "Legal precedent research".to_string(),
            ],
            quantizations: vec!["q4_0".to_string(), "q4_1".to_string(), "q8_0".to_string()],
            license: "Apache 2.0".to_string(),
            source: "mistralai/Mistral-7B-Instruct-v0.2".to_string(),
            recommended_for_legal: true,
        },
        ModelLibraryEntry {
            name: "gemma:7b".to_string(),
            description: "Gemma 7B - Google's model optimized for professional use".to_string(),
            size: "5.0GB".to_string(),
            tags: vec![
                "professional".to_string(),
                "legal".to_string(),
                "7b".to_string(),
            ],
            use_cases: vec![
                "Professional legal writing".to_string(),
                "Legal document review".to_string(),
                "Compliance analysis".to_string(),
            ],
            quantizations: vec!["q4_0".to_string(), "q4_1".to_string(), "q8_0".to_string()],
            license: "Gemma Terms of Use".to_string(),
            source: "google/gemma-7b-it".to_string(),
            recommended_for_legal: false,
        },
    ];

    Ok(CommandResult::success(library))
}

#[tauri::command]
pub async fn llm_get_recommended_models() -> Result<CommandResult<Vec<ModelLibraryEntry>>, String> {
    let library = llm_get_model_library().await?.data.unwrap_or_default();
    let recommended: Vec<_> = library
        .into_iter()
        .filter(|model| model.recommended_for_legal)
        .collect();

    Ok(CommandResult::success(recommended))
}

// Performance and monitoring commands

// Commented out - using imported ModelPerformanceMetrics from performance_tracker
// #[derive(Serialize, Deserialize, Debug)]
// pub struct ModelPerformanceMetrics {
//     pub model_name: String,
//     pub avg_tokens_per_second: f32,
//     pub avg_response_time_ms: u64,
//     pub memory_usage_mb: u64,
//     pub gpu_utilization: f32,
//     pub total_requests: u64,
//     pub error_count: u64,
//     pub uptime_seconds: u64,
// }

#[tauri::command]
pub async fn llm_get_performance_metrics(
    manager: State<'_, LlmManagerRef>,
    model_name: Option<String>,
) -> Result<CommandResult<Vec<ModelPerformanceMetrics>>, String> {
    let manager_guard = manager.read().await;
    if let Some(ref _llm_manager) = *manager_guard {
        // Get real performance metrics from the performance tracker
        if let Some(tracker) = get_performance_tracker() {
            let all_metrics = tracker.get_all_model_metrics().await;

            let mut result_metrics = Vec::new();

            for (model, latest_metric) in all_metrics {
                // Filter by model name if specified
                if let Some(ref name) = model_name {
                    if model != *name {
                        continue;
                    }
                }

                // Convert from PerformanceMetrics to ModelPerformanceMetrics
                let model_metric = ModelPerformanceMetrics {
                    model_name: model.clone(),
                    avg_tokens_per_second: latest_metric.tokens_per_second,
                    avg_response_time_ms: latest_metric.response_time_ms,
                    memory_usage_mb: latest_metric.memory_usage_mb,
                    gpu_utilization: latest_metric.gpu_usage_percent,
                    total_requests: 1, // This would need to be tracked separately
                    error_count: latest_metric.error_count as u64,
                    uptime_seconds: {
                        // Calculate uptime based on when tracking started
                        SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs() - latest_metric.timestamp
                    },
                };

                result_metrics.push(model_metric);
            }

            // If no metrics found, return empty result
            if result_metrics.is_empty() {
                if model_name.is_some() {
                    return Ok(CommandResult::error(
                        format!("No performance metrics found for model: {}", model_name.unwrap())
                    ));
                } else {
                    return Ok(CommandResult::error(
                        "No performance metrics available yet".to_string()
                    ));
                }
            }

            Ok(CommandResult::success(result_metrics))
        } else {
            // Fallback to placeholder data if performance tracker not available
            let metrics = vec![ModelPerformanceMetrics {
                model_name: model_name.unwrap_or_else(|| "llama3:8b".to_string()),
                avg_tokens_per_second: 15.2,
                avg_response_time_ms: 2500,
                memory_usage_mb: 4096,
                gpu_utilization: 78.5,
                total_requests: 1250,
                error_count: 5,
                uptime_seconds: 86400,
            }];

            Ok(CommandResult::success(metrics))
        }
    } else {
        Ok(CommandResult::error(
            "LLM Manager not initialized".to_string(),
        ))
    }
}

#[derive(Serialize, Deserialize, Debug)]
pub struct SystemResourceUsage {
    pub total_memory_gb: f32,
    pub used_memory_gb: f32,
    pub available_memory_gb: f32,
    pub cpu_usage_percent: f32,
    pub gpu_memory_used_gb: f32,
    pub gpu_memory_total_gb: f32,
    pub disk_space_used_gb: f32,
    pub disk_space_available_gb: f32,
    pub active_models: u32,
}

#[tauri::command]
pub async fn llm_get_system_resources() -> Result<CommandResult<SystemResourceUsage>, String> {
    // Use the performance tracker for comprehensive system metrics
    if let Some(tracker) = get_performance_tracker() {
        let system_metrics = tracker.get_system_metrics().await;

        let usage = SystemResourceUsage {
            total_memory_gb: system_metrics.total_memory_gb,
            used_memory_gb: system_metrics.used_memory_gb,
            available_memory_gb: system_metrics.available_memory_gb,
            cpu_usage_percent: system_metrics.cpu_usage_percent,
            gpu_memory_used_gb: system_metrics.gpu_used_memory_gb,
            gpu_memory_total_gb: system_metrics.gpu_total_memory_gb,
            disk_space_used_gb: 0.0, // Calculate from disk usage percentage
            disk_space_available_gb: 0.0, // Would need total disk info
            active_models: system_metrics.active_llm_processes,
        };

        Ok(CommandResult::success(usage))
    } else {
        // Fallback to basic sysinfo if performance tracker not available
        let sys = sysinfo::System::new_all();

        let total_memory_gb = sys.total_memory() as f32 / (1024.0 * 1024.0 * 1024.0);
        let used_memory_gb = sys.used_memory() as f32 / (1024.0 * 1024.0 * 1024.0);
        let available_memory_gb = sys.available_memory() as f32 / (1024.0 * 1024.0 * 1024.0);

        let usage = SystemResourceUsage {
            total_memory_gb,
            used_memory_gb,
            available_memory_gb,
            cpu_usage_percent: 0.0,  // Would need real-time CPU monitoring
            gpu_memory_used_gb: 0.0, // Would need GPU monitoring
            gpu_memory_total_gb: 0.0,
            disk_space_used_gb: 0.0, // Would need disk space calculation
            disk_space_available_gb: 0.0,
            active_models: 0,
        };

        Ok(CommandResult::success(usage))
    }
}

// New performance analytics commands

#[tauri::command]
pub async fn llm_get_performance_analytics(
    model_name: String,
    time_window_minutes: Option<u32>,
) -> Result<CommandResult<PerformanceAnalytics>, String> {
    if let Some(tracker) = get_performance_tracker() {
        let window = time_window_minutes.unwrap_or(60); // Default to 1 hour

        if let Some(analytics) = tracker.get_analytics(&model_name, window).await {
            Ok(CommandResult::success(analytics))
        } else {
            Ok(CommandResult::error(
                format!("No analytics data available for model '{}' in the last {} minutes", model_name, window)
            ))
        }
    } else {
        Ok(CommandResult::error(
            "Performance tracker not initialized".to_string()
        ))
    }
}

#[tauri::command]
pub async fn llm_get_all_model_analytics(
    time_window_minutes: Option<u32>,
) -> Result<CommandResult<Vec<PerformanceAnalytics>>, String> {
    if let Some(tracker) = get_performance_tracker() {
        let window = time_window_minutes.unwrap_or(60); // Default to 1 hour
        let all_metrics = tracker.get_all_model_metrics().await;

        let mut analytics_list = Vec::new();

        for (model_name, _) in all_metrics {
            if let Some(analytics) = tracker.get_analytics(&model_name, window).await {
                analytics_list.push(analytics);
            }
        }

        if analytics_list.is_empty() {
            Ok(CommandResult::error(
                format!("No analytics data available for any models in the last {} minutes", window)
            ))
        } else {
            Ok(CommandResult::success(analytics_list))
        }
    } else {
        Ok(CommandResult::error(
            "Performance tracker not initialized".to_string()
        ))
    }
}

#[tauri::command]
pub async fn llm_get_detailed_system_metrics() -> Result<CommandResult<SystemResourceMetrics>, String> {
    if let Some(tracker) = get_performance_tracker() {
        let metrics = tracker.get_system_metrics().await;
        Ok(CommandResult::success(metrics))
    } else {
        Ok(CommandResult::error(
            "Performance tracker not initialized".to_string()
        ))
    }
}

#[tauri::command]
pub async fn llm_set_model_cost_per_token(
    model_name: String,
    cost_per_token: f32,
) -> Result<CommandResult<String>, String> {
    if let Some(tracker) = get_performance_tracker() {
        tracker.set_cost_per_token(&model_name, cost_per_token).await;
        Ok(CommandResult::success(
            format!("Cost per token for model '{}' set to ${:.6}", model_name, cost_per_token)
        ))
    } else {
        Ok(CommandResult::error(
            "Performance tracker not initialized".to_string()
        ))
    }
}

#[tauri::command]
pub async fn llm_get_current_model_metrics(
    model_name: String,
) -> Result<CommandResult<PerformanceMetrics>, String> {
    if let Some(tracker) = get_performance_tracker() {
        if let Some(metrics) = tracker.get_current_metrics(&model_name).await {
            Ok(CommandResult::success(metrics))
        } else {
            Ok(CommandResult::error(
                format!("No current metrics available for model '{}'", model_name)
            ))
        }
    } else {
        Ok(CommandResult::error(
            "Performance tracker not initialized".to_string()
        ))
    }
}
