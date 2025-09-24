//! BEAR AI Legal Assistant - Rust Library
//! Enhanced with NVIDIA Nemotron RAG capabilities

// Existing modules
pub mod auth;
pub mod database;
pub mod document_analyzer;
pub mod document_processor;
pub mod filesystem;
pub mod local_api;
pub mod notification;
pub mod subscription;
pub mod user_interface;

// New NVIDIA Nemotron RAG module
pub mod nemotron_rag;

use tauri::{Manager, State};
use std::sync::Arc;

// Re-export core types
pub use nemotron_rag::{NemotronRAG, NemotronConfig};

/// Application state with RAG system
#[derive(Clone)]
pub struct AppState {
    pub rag_system: Option<Arc<nemotron_rag::NemotronRAG>>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            rag_system: None,
        }
    }
}

/// Initialize the RAG system
#[tauri::command]
pub async fn initialize_rag_system(
    config: nemotron_rag::NemotronConfig,
    state: State<'_, Arc<tokio::sync::RwLock<AppState>>>,
) -> Result<String, String> {
    let mut rag = nemotron_rag::NemotronRAG::new(config)
        .await
        .map_err(|e| format!("Failed to create RAG system: {}", e))?;

    rag.initialize()
        .await
        .map_err(|e| format!("Failed to initialize RAG system: {}", e))?;

    let mut app_state = state.write().await;
    app_state.rag_system = Some(Arc::new(rag));

    Ok("RAG system initialized successfully".to_string())
}

/// Process a legal document through the RAG system
#[tauri::command]
pub async fn process_legal_document(
    document: nemotron_rag::LegalDocument,
    state: State<'_, Arc<tokio::sync::RwLock<AppState>>>,
) -> Result<Vec<nemotron_rag::RAGChunk>, String> {
    let app_state = state.read().await;

    let rag_system = app_state.rag_system
        .as_ref()
        .ok_or("RAG system not initialized")?;

    let mut rag_clone = rag_system.as_ref().clone();
    rag_clone.process_document(document)
        .await
        .map_err(|e| format!("Failed to process document: {}", e))
}

/// Retrieve legal information using the RAG system
#[tauri::command]
pub async fn retrieve_legal_info(
    context: nemotron_rag::QueryContext,
    state: State<'_, Arc<tokio::sync::RwLock<AppState>>>,
) -> Result<nemotron_rag::RetrievalResult, String> {
    let app_state = state.read().await;

    let rag_system = app_state.rag_system
        .as_ref()
        .ok_or("RAG system not initialized")?;

    rag_system.retrieve(context)
        .await
        .map_err(|e| format!("Failed to retrieve information: {}", e))
}

/// Generate legal response using agentic reasoning
#[tauri::command]
pub async fn generate_agentic_response(
    query: String,
    retrieval_results: nemotron_rag::RetrievalResult,
    state: State<'_, Arc<tokio::sync::RwLock<AppState>>>,
) -> Result<serde_json::Value, String> {
    let app_state = state.read().await;

    let rag_system = app_state.rag_system
        .as_ref()
        .ok_or("RAG system not initialized")?;

    let response = rag_system.agentic_reasoning(query, retrieval_results)
        .await
        .map_err(|e| format!("Failed to generate response: {}", e))?;

    serde_json::to_value(&response)
        .map_err(|e| format!("Failed to serialize response: {}", e))
}

/// Perform multi-hop reasoning for complex queries
#[tauri::command]
pub async fn multi_hop_reasoning(
    query: String,
    max_hops: Option<usize>,
    state: State<'_, Arc<tokio::sync::RwLock<AppState>>>,
) -> Result<serde_json::Value, String> {
    let app_state = state.read().await;

    let rag_system = app_state.rag_system
        .as_ref()
        .ok_or("RAG system not initialized")?;

    let response = rag_system.multi_hop_reasoning(query, max_hops.unwrap_or(3))
        .await
        .map_err(|e| format!("Failed to perform multi-hop reasoning: {}", e))?;

    serde_json::to_value(&response)
        .map_err(|e| format!("Failed to serialize response: {}", e))
}

/// Get RAG system health status
#[tauri::command]
pub async fn get_rag_health(
    state: State<'_, Arc<tokio::sync::RwLock<AppState>>>,
) -> Result<serde_json::Value, String> {
    let app_state = state.read().await;

    let health_status = if app_state.rag_system.is_some() {
        serde_json::json!({
            "status": "healthy",
            "initialized": true,
            "timestamp": chrono::Utc::now().to_rfc3339()
        })
    } else {
        serde_json::json!({
            "status": "not_initialized",
            "initialized": false,
            "timestamp": chrono::Utc::now().to_rfc3339()
        })
    };

    Ok(health_status)
}

/// Create default Nemotron configuration
#[tauri::command]
pub fn create_default_nemotron_config() -> nemotron_rag::NemotronConfig {
    nemotron_rag::NemotronConfig {
        nemotron_api_key: String::new(), // To be set by user
        nemo_retriever_url: "https://api.nemo.nvidia.com".to_string(),
        embedding_model: "nv-embed-v2".to_string(),
        generation_model: "nemotron-4-340b-instruct".to_string(),
        vector_db_type: nemotron_rag::VectorDbType::Qdrant,
        vector_db_url: std::env::var("VECTOR_DB_URL")
            .unwrap_or_else(|_| "http://localhost:6333".to_string()),
        redis_url: std::env::var("REDIS_URL")
            .ok()
            .or_else(|| Some("redis://localhost:6379".to_string())),
        max_chunk_size: 512,
        chunk_overlap: 50,
        reranking_model: "nemotron-rerank".to_string(),
        confidence_threshold: 0.7,
        enable_gpu_acceleration: true,
        cache_ttl: 3600,
        lance_db_path: None,
        max_results: 25,
        embedding_dimension: 768,
    }
}

// Re-export existing commands
pub use auth::*;
pub use database::*;
pub use document_analyzer::*;
pub use document_processor::*;
pub use filesystem::*;
pub use local_api::*;
pub use notification::*;
pub use subscription::*;
pub use user_interface::*;