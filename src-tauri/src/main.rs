// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{
    CustomMenuItem, Manager, SystemTray, SystemTrayEvent, SystemTrayMenu, SystemTrayMenuItem,
    Window, WindowBuilder, WindowUrl,
};
use std::collections::HashMap;

mod local_api;
use local_api::*;

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
            local_system_stats
        ])
        .manage(SessionStorage::new(Mutex::new(HashMap::new())))
        .manage(ChatStorage::new(Mutex::new(HashMap::new())))
        .manage(DocumentStorage::new(Mutex::new(HashMap::new())))
        .manage(MessageStorage::new(Mutex::new(HashMap::new())))
        .setup(|app| {
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