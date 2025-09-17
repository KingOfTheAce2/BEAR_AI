// Tauri commands for LLM Management System
use crate::llm_manager::{
    LlmManagerRef, ModelInfo, ModelPullRequest, GenerateRequest, ChatRequest,
    EmbeddingRequest, ModelCreateRequest, RunningModel, GpuInfo, LlmConfig,
    initialize_llm_manager, GenerateResponse, ChatResponse, EmbeddingResponse
};
use tauri::State;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use anyhow::Result;

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
        Ok(_) => Ok(CommandResult::success("LLM Manager initialized successfully".to_string())),
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
        Ok(CommandResult::error("LLM Manager not initialized".to_string()))
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
        Ok(CommandResult::error("LLM Manager not initialized".to_string()))
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
            Ok(_) => Ok(CommandResult::success("Model pulled successfully".to_string())),
            Err(e) => Ok(CommandResult::error(e.to_string())),
        }
    } else {
        Ok(CommandResult::error("LLM Manager not initialized".to_string()))
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
        Ok(CommandResult::error("LLM Manager not initialized".to_string()))
    }
}

#[tauri::command]
pub async fn llm_generate(
    manager: State<'_, LlmManagerRef>,
    request: GenerateRequest,
) -> Result<CommandResult<GenerateResponse>, String> {
    let manager_guard = manager.read().await;
    if let Some(ref llm_manager) = *manager_guard {
        let result = llm_manager.generate(request).await;
        Ok(result.into())
    } else {
        Ok(CommandResult::error("LLM Manager not initialized".to_string()))
    }
}

#[tauri::command]
pub async fn llm_chat(
    manager: State<'_, LlmManagerRef>,
    request: ChatRequest,
) -> Result<CommandResult<ChatResponse>, String> {
    let manager_guard = manager.read().await;
    if let Some(ref llm_manager) = *manager_guard {
        let result = llm_manager.chat(request).await;
        Ok(result.into())
    } else {
        Ok(CommandResult::error("LLM Manager not initialized".to_string()))
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
        Ok(CommandResult::error("LLM Manager not initialized".to_string()))
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
            Ok(_) => Ok(CommandResult::success("Model created successfully".to_string())),
            Err(e) => Ok(CommandResult::error(e.to_string())),
        }
    } else {
        Ok(CommandResult::error("LLM Manager not initialized".to_string()))
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
            Ok(_) => Ok(CommandResult::success("Model copied successfully".to_string())),
            Err(e) => Ok(CommandResult::error(e.to_string())),
        }
    } else {
        Ok(CommandResult::error("LLM Manager not initialized".to_string()))
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
        Ok(CommandResult::error("LLM Manager not initialized".to_string()))
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
        Ok(CommandResult::error("LLM Manager not initialized".to_string()))
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
            description: "Code Llama 7B - Specialized for code generation and legal document automation".to_string(),
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
            description: "Llama 3 8B - General purpose model excellent for legal analysis".to_string(),
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
            description: "Phi-3 Mini - Microsoft's efficient model for legal document processing".to_string(),
            size: "2.3GB".to_string(),
            tags: vec!["efficient".to_string(), "legal".to_string(), "3.8b".to_string()],
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
            tags: vec!["reasoning".to_string(), "legal".to_string(), "7b".to_string()],
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
            tags: vec!["professional".to_string(), "legal".to_string(), "7b".to_string()],
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
    let recommended: Vec<_> = library.into_iter()
        .filter(|model| model.recommended_for_legal)
        .collect();

    Ok(CommandResult::success(recommended))
}

// Performance and monitoring commands

#[derive(Serialize, Deserialize, Debug)]
pub struct ModelPerformanceMetrics {
    pub model_name: String,
    pub avg_tokens_per_second: f32,
    pub avg_response_time_ms: u64,
    pub memory_usage_mb: u64,
    pub gpu_utilization: f32,
    pub total_requests: u64,
    pub error_count: u64,
    pub uptime_seconds: u64,
}

#[tauri::command]
pub async fn llm_get_performance_metrics(
    manager: State<'_, LlmManagerRef>,
    model_name: Option<String>,
) -> Result<CommandResult<Vec<ModelPerformanceMetrics>>, String> {
    let manager_guard = manager.read().await;
    if let Some(ref _llm_manager) = *manager_guard {
        // TODO: Implement actual performance tracking
        let metrics = vec![
            ModelPerformanceMetrics {
                model_name: "llama3:8b".to_string(),
                avg_tokens_per_second: 15.2,
                avg_response_time_ms: 2500,
                memory_usage_mb: 4096,
                gpu_utilization: 78.5,
                total_requests: 1250,
                error_count: 5,
                uptime_seconds: 86400,
            }
        ];

        let filtered_metrics = if let Some(name) = model_name {
            metrics.into_iter().filter(|m| m.model_name == name).collect()
        } else {
            metrics
        };

        Ok(CommandResult::success(filtered_metrics))
    } else {
        Ok(CommandResult::error("LLM Manager not initialized".to_string()))
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
    let sys = sysinfo::System::new_all();

    let total_memory_gb = sys.total_memory() as f32 / (1024.0 * 1024.0 * 1024.0);
    let used_memory_gb = sys.used_memory() as f32 / (1024.0 * 1024.0 * 1024.0);
    let available_memory_gb = sys.available_memory() as f32 / (1024.0 * 1024.0 * 1024.0);

    let usage = SystemResourceUsage {
        total_memory_gb,
        used_memory_gb,
        available_memory_gb,
        cpu_usage_percent: 0.0, // Would need real-time CPU monitoring
        gpu_memory_used_gb: 0.0, // Would need GPU monitoring
        gpu_memory_total_gb: 0.0,
        disk_space_used_gb: 0.0, // Would need disk space calculation
        disk_space_available_gb: 0.0,
        active_models: 0,
    };

    Ok(CommandResult::success(usage))
}