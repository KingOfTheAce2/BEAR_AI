// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{
    CustomMenuItem, Manager, SystemTray, SystemTrayEvent, SystemTrayMenu, SystemTrayMenuItem,
    Window, WindowBuilder, WindowUrl,
};
use std::collections::HashMap;

mod local_api;
mod llm_manager;
mod huggingface;
mod document_analyzer;
mod mcp_server;
mod security;
mod licensing;
mod chat_export;

use local_api::*;
use std::sync::{Arc, Mutex};

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn get_system_info() -> Result<HashMap<String, String>, String> {
    let mut info = HashMap::new();
    
    info.insert("platform".to_string(), std::env::consts::OS.to_string());
    info.insert("arch".to_string(), std::env::consts::ARCH.to_string());
    info.insert("version".to_string(), env!("CARGO_PKG_VERSION").to_string());
    
    Ok(info)
}

#[tauri::command]
async fn show_window(window: Window) -> Result<(), String> {
    window.show().map_err(|e| e.to_string())?;
    window.set_focus().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn hide_window(window: Window) -> Result<(), String> {
    window.hide().map_err(|e| e.to_string())?;
    Ok(())
}

// Initialize logging
fn init_logging() {
    env_logger::Builder::from_default_env()
        .filter_level(log::LevelFilter::Info)
        .init();
}

// Create system tray
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
            // Additional commands will be added later
            // huggingface::search_models,
            // document_analyzer::analyze_document,
            // mcp_server::start_mcp_server,
            // security::encrypt_document,
            // licensing::validate_license
        ])
        .manage(SessionStorage::new(Mutex::new(HashMap::new())))
        .manage(ChatStorage::new(Mutex::new(HashMap::new())))
        .manage(DocumentStorage::new(Mutex::new(HashMap::new())))
        .manage(MessageStorage::new(Mutex::new(HashMap::new())))
        .manage(create_llm_manager())
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

            // Initialize additional managers later
            // let security_manager = security::SecurityManager::new(&app_data_dir).unwrap();
            // app.manage(Arc::new(Mutex::new(security_manager)));
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