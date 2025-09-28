//! BEAR AI Legal Assistant - Rust Library
//! Enhanced with NVIDIA Nemotron RAG capabilities

// Existing modules that actually exist
pub mod chat_export;
pub mod document_analyzer;
pub mod enterprise_management;
pub mod hardware_detection;
pub mod huggingface;
pub mod licensing;
pub mod llm_commands;
pub mod llm_manager;
pub mod local_api;
pub mod mcp_server;
pub mod model_commands;
pub mod mollie_integration;
pub mod nemotron_rag;
pub mod ocr_processor;
pub mod performance_tracker;
pub mod pii_detector;
pub mod security;
pub mod stripe_integration;
pub mod stripe_integration_v2;

use tauri::State;
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
// Commented out - duplicate command
// #[tauri::command]
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

/// Process a legal document
// Commented out - duplicate command
// #[tauri::command]
pub async fn process_legal_document(
    document: String,
    state: State<'_, Arc<tokio::sync::RwLock<AppState>>>,
) -> Result<String, String> {
    let app_state = state.read().await;
    let rag_system = app_state.rag_system.as_ref()
        .ok_or_else(|| "RAG system not initialized".to_string())?;

    // Create a LegalDocument from the string input
    let legal_doc = nemotron_rag::LegalDocument {
        id: uuid::Uuid::new_v4().to_string(),
        title: "Document".to_string(),
        content: document,
        jurisdiction: "General".to_string(),
        document_type: nemotron_rag::DocumentType::Brief,
        last_updated: chrono::Utc::now(),
        citations: Vec::new(),
        metadata: nemotron_rag::DocumentMetadata {
            court: None,
            judge: None,
            parties: Vec::new(),
            topics: Vec::new(),
            precedential_value: nemotron_rag::PrecedentialValue::NotPrecedential,
            confidence: 1.0,
        },
    };

    let mut rag_mut = rag_system.clone();
    Arc::get_mut(&mut rag_mut)
        .ok_or_else(|| "Cannot get mutable reference to RAG system".to_string())?
        .process_document(legal_doc)
        .await
        .map_err(|e| format!("Failed to process document: {}", e))?;

    Ok("Document processed successfully".to_string())
}

/// Retrieve legal information
// Commented out - duplicate command
// #[tauri::command]
pub async fn retrieve_legal_info(
    query: String,
    state: State<'_, Arc<tokio::sync::RwLock<AppState>>>,
) -> Result<nemotron_rag::RetrievalResult, String> {
    let app_state = state.read().await;
    let rag_system = app_state.rag_system.as_ref()
        .ok_or_else(|| "RAG system not initialized".to_string())?;

    // Create QueryContext from the string query
    let context = nemotron_rag::QueryContext {
        query,
        jurisdiction: None,
        document_types: None,
        time_range: None,
        precedential_only: None,
        require_citations: None,
        max_results: None,
        confidence_threshold: None,
    };

    rag_system.retrieve(context)
        .await
        .map_err(|e| format!("Failed to retrieve information: {}", e))
}

/// Generate an agentic response
// Commented out - duplicate command
// #[tauri::command]
pub async fn generate_agentic_response(
    query: String,
    state: State<'_, Arc<tokio::sync::RwLock<AppState>>>,
) -> Result<String, String> {
    let app_state = state.read().await;
    let rag_system = app_state.rag_system.as_ref()
        .ok_or_else(|| "RAG system not initialized".to_string())?;

    // Create QueryContext from the string query
    let context = nemotron_rag::QueryContext {
        query: query.clone(),
        jurisdiction: None,
        document_types: None,
        time_range: None,
        precedential_only: None,
        require_citations: None,
        max_results: None,
        confidence_threshold: None,
    };

    let retrieval_results = rag_system.retrieve(context)
        .await
        .map_err(|e| format!("Failed to retrieve information: {}", e))?;

    // Generate response based on retrieval
    let context = retrieval_results.chunks.iter()
        .map(|c| c.content.clone())
        .collect::<Vec<_>>()
        .join("\n\n");

    Ok(format!("Based on the retrieved context:\n\n{}\n\nResponse: {}", context, query))
}

/// Perform multi-hop reasoning
// Commented out - duplicate command
// #[tauri::command]
pub async fn multi_hop_reasoning(
    query: String,
    max_hops: Option<usize>,
    state: State<'_, Arc<tokio::sync::RwLock<AppState>>>,
) -> Result<String, String> {
    let app_state = state.read().await;
    let rag_system = app_state.rag_system.as_ref()
        .ok_or_else(|| "RAG system not initialized".to_string())?;

    let mut current_query = query.clone();
    let mut all_results = Vec::new();
    let hops = max_hops.unwrap_or(3);

    for hop in 0..hops {
        // Create QueryContext from the current query
        let context = nemotron_rag::QueryContext {
            query: current_query.clone(),
            jurisdiction: None,
            document_types: None,
            time_range: None,
            precedential_only: None,
            require_citations: None,
            max_results: None,
            confidence_threshold: None,
        };

        let results = rag_system.retrieve(context)
            .await
            .map_err(|e| format!("Failed at hop {}: {}", hop, e))?;

        if results.chunks.is_empty() {
            break;
        }

        all_results.push(results.clone());

        // Generate next query based on results
        current_query = format!("Based on: {}, what about: {}",
            results.chunks[0].content, query);
    }

    Ok(format!("Multi-hop reasoning completed with {} hops", all_results.len()))
}

/// Get RAG health status
// Commented out - duplicate command
// #[tauri::command]
pub async fn get_rag_health(
    state: State<'_, Arc<tokio::sync::RwLock<AppState>>>,
) -> Result<nemotron_rag::RAGHealth, String> {
    let app_state = state.read().await;
    let rag_system = app_state.rag_system.as_ref()
        .ok_or_else(|| "RAG system not initialized".to_string())?;

    rag_system.get_health()
        .await
        .map_err(|e| format!("Failed to get health status: {}", e))
}

/// Create default Nemotron configuration
// Commented out - duplicate command
// #[tauri::command]
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