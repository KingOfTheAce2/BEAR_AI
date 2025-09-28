// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[cfg(feature = "desktop")]
use std::collections::HashMap;
#[cfg(feature = "desktop")]
use std::sync::{Arc, Mutex};
#[cfg(feature = "desktop")]
use tauri::{
    CustomMenuItem, Manager, SystemTray, SystemTrayEvent, SystemTrayMenu, SystemTrayMenuItem,
    Window,
};

#[cfg(feature = "desktop")]
mod chat_export;
#[cfg(feature = "desktop")]
mod document_analyzer;
#[cfg(feature = "desktop")]
mod huggingface;
#[cfg(feature = "desktop")]
mod licensing;
#[cfg(feature = "desktop")]
mod llm_commands;
#[cfg(feature = "desktop")]
mod llm_manager;
#[cfg(feature = "desktop")]
mod local_api;
#[cfg(feature = "desktop")]
mod mcp_server;
#[cfg(feature = "desktop")]
mod security;
#[cfg(feature = "desktop")]
mod stripe_integration_v2;
#[cfg(feature = "desktop")]
mod mollie_integration;
#[cfg(feature = "desktop")]
mod enterprise_management;
#[cfg(feature = "desktop")]
mod pii_detector;
#[cfg(feature = "desktop")]
mod hardware_detection;
#[cfg(feature = "desktop")]
mod model_commands;
#[cfg(feature = "desktop")]
mod ocr_processor;
#[cfg(feature = "desktop")]
mod performance_tracker;
#[cfg(feature = "desktop")]
mod nemotron_rag;

#[cfg(feature = "desktop")]
use llm_commands::*;
#[cfg(feature = "desktop")]
use llm_manager::{LLMManager, list_models, download_model, load_model, unload_model, remove_model, get_recommended_models, get_system_info as llm_get_system_info, generate_response, chat_with_model, get_embeddings, show_model_info, pull_model, create_model, copy_model};
#[cfg(feature = "desktop")]
use local_api::*;
#[cfg(feature = "desktop")]
use mollie_integration::*;
#[cfg(feature = "desktop")]
use stripe_integration_v2::*;
#[cfg(feature = "desktop")]
use pii_detector::*;
#[cfg(feature = "desktop")]
use ocr_processor::*;

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[cfg(feature = "desktop")]
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg(feature = "desktop")]
#[tauri::command]
async fn get_system_info() -> Result<HashMap<String, String>, String> {
    let mut info = HashMap::new();

    info.insert("platform".to_string(), std::env::consts::OS.to_string());
    info.insert("arch".to_string(), std::env::consts::ARCH.to_string());
    info.insert("version".to_string(), env!("CARGO_PKG_VERSION").to_string());

    Ok(info)
}

#[cfg(feature = "desktop")]
#[tauri::command]
async fn show_window(window: Window) -> Result<(), String> {
    window.show().map_err(|e| e.to_string())?;
    window.set_focus().map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg(feature = "desktop")]
#[tauri::command]
async fn hide_window(window: Window) -> Result<(), String> {
    window.hide().map_err(|e| e.to_string())?;
    Ok(())
}

// NVIDIA Nemotron RAG command wrappers
#[cfg(feature = "desktop")]
#[tauri::command]
async fn initialize_rag_system(
    config: bear_ai_legal_assistant::nemotron_rag::NemotronConfig,
    state: tauri::State<'_, Arc<tokio::sync::RwLock<bear_ai_legal_assistant::AppState>>>,
) -> Result<String, String> {
    bear_ai_legal_assistant::initialize_rag_system(config, state).await
}

#[cfg(feature = "desktop")]
#[tauri::command]
async fn process_legal_document(
    document: String,
    state: tauri::State<'_, Arc<tokio::sync::RwLock<bear_ai_legal_assistant::AppState>>>,
) -> Result<String, String> {
    bear_ai_legal_assistant::process_legal_document(document, state).await
}

#[cfg(feature = "desktop")]
#[tauri::command]
async fn retrieve_legal_info(
    query: String,
    state: tauri::State<'_, Arc<tokio::sync::RwLock<bear_ai_legal_assistant::AppState>>>,
) -> Result<bear_ai_legal_assistant::nemotron_rag::RetrievalResult, String> {
    bear_ai_legal_assistant::retrieve_legal_info(query, state).await
}

#[cfg(feature = "desktop")]
#[tauri::command]
async fn generate_agentic_response(
    query: String,
    state: tauri::State<'_, Arc<tokio::sync::RwLock<bear_ai_legal_assistant::AppState>>>,
) -> Result<String, String> {
    bear_ai_legal_assistant::generate_agentic_response(query, state).await
}

#[cfg(feature = "desktop")]
#[tauri::command]
async fn multi_hop_reasoning(
    query: String,
    max_hops: Option<usize>,
    state: tauri::State<'_, Arc<tokio::sync::RwLock<bear_ai_legal_assistant::AppState>>>,
) -> Result<String, String> {
    bear_ai_legal_assistant::multi_hop_reasoning(query, max_hops, state).await
}

#[cfg(feature = "desktop")]
#[tauri::command]
async fn get_rag_health(
    state: tauri::State<'_, Arc<tokio::sync::RwLock<bear_ai_legal_assistant::AppState>>>,
) -> Result<bear_ai_legal_assistant::nemotron_rag::RAGHealth, String> {
    bear_ai_legal_assistant::get_rag_health(state).await
}

#[cfg(feature = "desktop")]
#[tauri::command]
fn create_default_nemotron_config() -> bear_ai_legal_assistant::nemotron_rag::NemotronConfig {
    bear_ai_legal_assistant::create_default_nemotron_config()
}

// Initialize logging
#[cfg(feature = "desktop")]
fn init_logging() {
    env_logger::Builder::from_default_env()
        .filter_level(log::LevelFilter::Info)
        .init();
}

// Create LLM Manager instance
#[cfg(feature = "desktop")]
fn create_local_llm_manager() -> Result<Arc<LLMManager>, Box<dyn std::error::Error>> {
    let app_data_dir = dirs::data_dir()
        .ok_or("Could not determine app data directory")?
        .join("bear-ai");

    let manager = LLMManager::new(&app_data_dir)?;
    Ok(Arc::new(manager))
}

// Create Document Analyzer instance
#[cfg(feature = "desktop")]
fn create_document_analyzer() -> Result<local_api::AnalyzerStorage, Box<dyn std::error::Error>> {
    let app_data_dir = dirs::data_dir()
        .ok_or("Could not determine app data directory")?
        .join("bear-ai");

    std::fs::create_dir_all(&app_data_dir)?;

    // Create LLM manager for the analyzer (optional)
    let llm_manager = create_local_llm_manager().ok();

    let analyzer = document_analyzer::DocumentAnalyzer::new(&app_data_dir, llm_manager)?;
    Ok(Arc::new(analyzer))
}

// Create system tray
#[cfg(feature = "desktop")]
fn create_tray() -> SystemTray {
    let quit = CustomMenuItem::new("quit".to_string(), "Quit BEAR AI");
    let show = CustomMenuItem::new("show".to_string(), "Show Window");
    let hide = CustomMenuItem::new("hide".to_string(), "Hide Window");

    let tray_menu = SystemTrayMenu::new()
        .add_item(show)
        .add_item(hide)
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(quit);

    SystemTray::new().with_menu(tray_menu)
}

// Handle system tray events
#[cfg(feature = "desktop")]
fn handle_tray_event(app: &tauri::AppHandle, event: SystemTrayEvent) {
    match event {
        SystemTrayEvent::LeftClick {
            position: _,
            size: _,
            ..
        } => {
            let window = app.get_window("main").unwrap();
            if window.is_visible().unwrap_or(false) {
                let _ = window.hide();
            } else {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }
        SystemTrayEvent::MenuItemClick { id, .. } => match id.as_str() {
            "quit" => {
                std::process::exit(0);
            }
            "show" => {
                let window = app.get_window("main").unwrap();
                let _ = window.show();
                let _ = window.set_focus();
            }
            "hide" => {
                let window = app.get_window("main").unwrap();
                let _ = window.hide();
            }
            _ => {}
        },
        _ => {}
    }
}

#[cfg(feature = "desktop")]
fn main() {
    init_logging();

    tauri::Builder::default()
        .system_tray(create_tray())
        .on_system_tray_event(handle_tray_event)
        .invoke_handler(tauri::generate_handler![
            greet,
            get_system_info,
            show_window,
            hide_window,
            // NVIDIA Nemotron RAG commands
            initialize_rag_system,
            process_legal_document,
            retrieve_legal_info,
            generate_agentic_response,
            multi_hop_reasoning,
            get_rag_health,
            create_default_nemotron_config,
            // Local API Authentication commands
            local_auth_login,
            local_auth_logout,
            local_auth_validate,
            local_auth_refresh,
            // Local API Chat commands
            local_chat_sessions,
            local_chat_create,
            local_chat_send_message,
            local_chat_get_messages,
            local_chat_delete_session,
            // Local API Document commands
            local_documents_list,
            local_document_upload,
            local_document_get,
            local_document_delete,
            local_document_update,
            // Local API Research commands
            local_research_search,
            // Local API Analysis commands
            local_analysis_analyze,
            // Local API System commands
            local_system_health,
            local_system_stats,
            // LLM Management commands
            llm_initialize,
            llm_list_models,
            llm_show_model,
            llm_pull_model,
            llm_delete_model,
            llm_generate,
            llm_chat,
            llm_embeddings,
            llm_create_model,
            llm_copy_model,
            llm_list_running_models,
            llm_system_info,
            llm_get_model_library,
            llm_get_recommended_models,
            llm_get_performance_metrics,
            llm_get_system_resources,
            // Performance analytics commands
            llm_get_performance_analytics,
            llm_get_all_model_analytics,
            llm_get_detailed_system_metrics,
            llm_set_model_cost_per_token,
            llm_get_current_model_metrics,
            // Chat export commands
            chat_export::export_chat_session,
            chat_export::get_export_formats,
            chat_export::create_export_options,
            // Security management commands
            security::encrypt_document,
            security::decrypt_document,
            security::validate_document_security,
            security::get_security_config,
            security::update_security_config,
            // Session management commands
            security::create_user_session,
            security::validate_user_session,
            security::refresh_user_session,
            security::revoke_user_session,
            security::revoke_all_user_sessions,
            security::get_current_user_id,
            security::cleanup_expired_sessions,
            security::get_user_session_count,
            // Additional commands will be added later
            // huggingface::search_models,
            // document_analyzer::analyze_document,
            // mcp_server::start_mcp_server,
            // licensing::validate_license

            // PII Detection commands
            detect_pii_rust,
            mask_pii_text,
            validate_dutch_bsn,
            validate_dutch_rsin,
            get_pii_audit_log,
            export_pii_audit_log,
            process_document_pii,
            // Stripe payment integration commands (v2)
            stripe_init_client,
            stripe_create_customer,
            stripe_create_subscription,
            stripe_get_subscription,
            stripe_create_payment_intent,
            stripe_list_invoices,
            stripe_handle_webhook,
            stripe_create_team_subscription,
            stripe_validate_test_payment,
            stripe_configure_test_mode,
            get_env_var,
            // Mollie payment integration commands
            mollie_init_client,
            mollie_create_customer,
            mollie_get_customer,
            mollie_update_customer,
            mollie_delete_customer,
            mollie_create_payment,
            mollie_get_payment,
            mollie_cancel_payment,
            mollie_list_payments,
            mollie_create_subscription,
            mollie_get_subscription,
            mollie_update_subscription,
            mollie_cancel_subscription,
            mollie_list_subscriptions,
            mollie_create_mandate,
            mollie_get_mandate,
            mollie_revoke_mandate,
            mollie_list_mandates,
            mollie_create_refund,
            mollie_get_refund,
            mollie_list_refunds,
            mollie_get_chargeback,
            mollie_list_chargebacks,
            mollie_get_payment_methods,
            mollie_get_ideal_issuers,
            mollie_handle_webhook,
            // Enterprise management commands
            enterprise_create_account,
            enterprise_get_account,
            enterprise_add_user,
            enterprise_remove_user,
            enterprise_list_users,
            enterprise_update_user_role,
            // Model management commands
            hardware_detection::detect_hardware_capabilities,
            hardware_detection::get_recommended_model_config,
            hardware_detection::optimize_model_settings,
            model_commands::download_model,
            model_commands::pause_model_download,
            model_commands::resume_model_download,
            model_commands::cancel_model_download,
            model_commands::compute_file_hash,
            model_commands::load_model,
            // OCR processing commands
            process_document_ocr,
            extract_legal_entities_from_ocr,
            get_ocr_capabilities,
            model_commands::unload_model,
            model_commands::benchmark_inference,
            model_commands::get_process_memory_usage,
            model_commands::get_vram_usage,
            model_commands::get_power_consumption,
            model_commands::get_cpu_temperature,
            model_commands::detect_model_quantization,
            // Local LLM Manager commands (with GPU detection)
            list_models,
            download_model,
            load_model,
            unload_model,
            remove_model,
            get_recommended_models,
            llm_get_system_info,
            // New Ollama-compatible LLM methods
            generate_response,
            chat_with_model,
            get_embeddings,
            show_model_info,
            pull_model,
            create_model,
            copy_model
        ])
        .manage(SessionStorage::new(Mutex::new(HashMap::new())))
        .manage(ChatStorage::new(Mutex::new(HashMap::new())))
        .manage(DocumentStorage::new(Mutex::new(HashMap::new())))
        .manage(MessageStorage::new(Mutex::new(HashMap::new())))
        .manage(create_local_llm_manager().unwrap_or_else(|e| {
            log::error!("Failed to create LLM manager: {}", e);
            Arc::new(LLMManager::new(&std::path::PathBuf::from(".")).unwrap())
        }))
        .manage(create_document_analyzer().unwrap_or_else(|e| {
            log::error!("Failed to create document analyzer: {}", e);
            let default_path = std::path::PathBuf::from(".");
            Arc::new(document_analyzer::DocumentAnalyzer::new(&default_path, None).unwrap())
        }))
        .manage(create_stripe_client_manager())
        .manage(create_mollie_client_manager())
        .manage(create_enterprise_manager())
        .manage(Arc::new(Mutex::new(HashMap::<String, model_commands::DownloadProgress>::new())))
        .manage(Arc::new(tokio::sync::RwLock::new(bear_ai_legal_assistant::AppState::default())))
        // Additional managed state will be added later
        // .manage(Arc::new(Mutex::new(huggingface::HuggingFaceClient::new().unwrap())))
        // .manage(Arc::new(Mutex::new(document_analyzer::DocumentAnalyzer::new().unwrap())))
        // .manage(Arc::new(Mutex::new(mcp_server::MCPServer::new().unwrap())))
        .setup(|app| {
            // Initialize chat exporter
            let app_data_dir = app.path_resolver().app_data_dir().unwrap();
            std::fs::create_dir_all(&app_data_dir).unwrap();
            let chat_exporter = chat_export::ChatExporter::new(&app_data_dir).unwrap();
            app.manage(Arc::new(Mutex::new(chat_exporter)));

            // Initialize OCR processor
            let ocr_processor = ocr_processor::OCRProcessor::new(&app_data_dir).unwrap();
            app.manage(Arc::new(ocr_processor));

            // Initialize security manager
            let security_manager = security::SecurityManager::new(&app_data_dir).unwrap();
            app.manage(Arc::new(Mutex::new(security_manager)));

            // Initialize performance tracker
            let performance_path = app_data_dir.join("performance_metrics.json");
            match tokio::runtime::Runtime::new() {
                Ok(rt) => {
                    if let Err(e) = rt.block_on(performance_tracker::initialize_performance_tracker(performance_path)) {
                        log::error!("Failed to initialize performance tracker: {}", e);
                    } else {
                        log::info!("Performance tracker initialized successfully");
                    }
                }
                Err(e) => {
                    log::error!("Failed to create runtime for performance tracker: {}", e);
                }
            }

            // Initialize additional managers later
            // let license_manager = licensing::LicenseManager::new(&app_data_dir).unwrap();
            // app.manage(Arc::new(Mutex::new(license_manager)));

            // Configure the main window
            let window = app.get_window("main").unwrap();

            // Set window properties
            #[cfg(target_os = "windows")]
            {
                use tauri::api::process::{Command, CommandEvent};

                // Additional Windows-specific setup
                log::info!("Setting up Windows-specific configurations");
            }

            // Handle window close to minimize to tray instead of exit
            let app_handle = app.handle();
            window.on_window_event(move |event| {
                match event {
                    tauri::WindowEvent::CloseRequested { api, .. } => {
                        // Prevent default close behavior
                        api.prevent_close();
                        // Hide window instead
                        if let Some(window) = app_handle.get_window("main") {
                            let _ = window.hide();
                        }
                    }
                    _ => {}
                }
            });

            log::info!("BEAR AI Legal Assistant started successfully");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(not(feature = "desktop"))]
fn main() {
    println!(
        "BEAR AI headless build: desktop features are disabled. Enable the `desktop` feature to build the full Tauri application."
    );
}
