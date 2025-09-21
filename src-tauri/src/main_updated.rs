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
mod stripe_integration;
#[cfg(feature = "desktop")]
mod stripe_integration_v2;
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
use llm_commands::*;
#[cfg(feature = "desktop")]
use local_api::*;
#[cfg(feature = "desktop")]
use stripe_integration::*;
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
async fn get_env_var(key: String) -> Result<String, String> {
    std::env::var(&key).map_err(|_| format!("Environment variable {} not found", key))
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

// Webhook endpoint for Stripe events
#[cfg(feature = "desktop")]
#[tauri::command]
async fn handle_stripe_webhook(
    payload: String,
    signature: String,
    stripe_client: tauri::State<'_, Arc<Mutex<Option<stripe_integration_v2::StripeClient>>>>
) -> Result<(), String> {
    stripe_integration_v2::stripe_handle_webhook(payload, signature, stripe_client).await
}

// Initialize logging with enhanced configuration
#[cfg(feature = "desktop")]
fn init_logging() {
    env_logger::Builder::from_default_env()
        .filter_level(log::LevelFilter::Info)
        .format_timestamp_secs()
        .init();
}

// Create system tray
#[cfg(feature = "desktop")]
fn create_tray() -> SystemTray {
    let quit = CustomMenuItem::new("quit".to_string(), "Quit BEAR AI");
    let show = CustomMenuItem::new("show".to_string(), "Show Window");
    let hide = CustomMenuItem::new("hide".to_string(), "Hide Window");
    let billing = CustomMenuItem::new("billing".to_string(), "Billing Dashboard");

    let tray_menu = SystemTrayMenu::new()
        .add_item(show)
        .add_item(hide)
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(billing)
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
            "billing" => {
                let window = app.get_window("main").unwrap();
                let _ = window.show();
                let _ = window.set_focus();
                // Navigate to billing dashboard
                let _ = window.emit("navigate", "/billing");
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
            get_env_var,
            show_window,
            hide_window,
            handle_stripe_webhook,
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
            // Chat export commands
            chat_export::export_chat_session,
            chat_export::get_export_formats,
            chat_export::create_export_options,
            // PII Detection commands
            detect_pii_rust,
            mask_pii_text,
            validate_dutch_bsn,
            validate_dutch_rsin,
            get_pii_audit_log,
            export_pii_audit_log,
            process_document_pii,
            // Enhanced Stripe payment integration commands
            stripe_init_client,
            stripe_create_customer,
            stripe_get_customer,
            stripe_create_subscription,
            stripe_get_subscription,
            stripe_update_subscription,
            stripe_cancel_subscription,
            stripe_create_payment_intent,
            stripe_get_invoices,
            stripe_handle_webhook,
            // New enhanced Stripe commands from v2
            stripe_create_team_subscription,
            stripe_validate_test_payment,
            stripe_configure_test_mode,
            // Enterprise management commands
            enterprise_create_account,
            enterprise_get_account,
            enterprise_add_user,
            enterprise_remove_user,
            enterprise_list_users,
            enterprise_update_user_role,
            // Hardware detection commands
            hardware_detection::detect_hardware_capabilities,
            hardware_detection::get_recommended_model_config,
            hardware_detection::optimize_model_settings,
            // Model management commands
            model_commands::download_model,
            model_commands::pause_model_download,
            model_commands::resume_model_download,
            model_commands::cancel_model_download,
            model_commands::compute_file_hash,
            model_commands::load_model,
            model_commands::unload_model,
            model_commands::benchmark_inference,
            model_commands::get_process_memory_usage,
            model_commands::get_vram_usage,
            model_commands::get_power_consumption,
            model_commands::get_cpu_temperature,
            model_commands::detect_model_quantization,
            // OCR processing commands
            process_document_ocr,
            extract_legal_entities_from_ocr,
            get_ocr_capabilities
        ])
        .manage(SessionStorage::new(Mutex::new(HashMap::new())))
        .manage(ChatStorage::new(Mutex::new(HashMap::new())))
        .manage(DocumentStorage::new(Mutex::new(HashMap::new())))
        .manage(MessageStorage::new(Mutex::new(HashMap::new())))
        .manage(create_llm_manager())
        .manage(create_stripe_client_manager())
        .manage(stripe_integration_v2::create_stripe_client_manager())
        .manage(create_enterprise_manager())
        .manage(Arc::new(Mutex::new(HashMap::<String, model_commands::DownloadProgress>::new())))
        .setup(|app| {
            // Initialize chat exporter
            let app_data_dir = app.path_resolver().app_data_dir().unwrap();
            std::fs::create_dir_all(&app_data_dir).unwrap();
            let chat_exporter = chat_export::ChatExporter::new(&app_data_dir).unwrap();
            app.manage(Arc::new(Mutex::new(chat_exporter)));

            // Initialize OCR processor
            let ocr_processor = ocr_processor::OCRProcessor::new(&app_data_dir).unwrap();
            app.manage(Arc::new(ocr_processor));

            // Initialize Stripe client from environment variables if available
            if let (Ok(secret_key), Ok(publishable_key), Ok(webhook_secret)) = (
                std::env::var("STRIPE_SECRET_KEY"),
                std::env::var("STRIPE_PUBLISHABLE_KEY"),
                std::env::var("STRIPE_WEBHOOK_SECRET"),
            ) {
                let environment = std::env::var("STRIPE_ENVIRONMENT").unwrap_or_else(|_| "test".to_string());

                let credentials = stripe_integration_v2::StripeCredentials {
                    secret_key,
                    publishable_key,
                    webhook_secret,
                    environment,
                };

                match stripe_integration_v2::StripeClient::new(credentials) {
                    Ok(client) => {
                        let stripe_manager = app.state::<Arc<Mutex<Option<stripe_integration_v2::StripeClient>>>>();
                        if let Ok(mut client_guard) = stripe_manager.lock() {
                            *client_guard = Some(client);
                            log::info!("Stripe client initialized successfully from environment variables");
                        }
                    }
                    Err(e) => {
                        log::warn!("Failed to initialize Stripe client: {}", e);
                    }
                }
            } else {
                log::info!("Stripe environment variables not found - Stripe client will need to be initialized manually");
            }

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

            log::info!("BEAR AI Legal Assistant started successfully with enhanced Stripe integration");
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