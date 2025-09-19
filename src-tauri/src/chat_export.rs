use anyhow::{Context, Result};
use chrono::{DateTime, Utc};
use printpdf::*;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};

/// Chat Export Engine for BEAR AI
/// Provides export functionality for chat conversations in multiple formats
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub id: String,
    pub timestamp: DateTime<Utc>,
    pub role: MessageRole,
    pub content: String,
    pub metadata: Option<HashMap<String, String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum MessageRole {
    User,
    Assistant,
    System,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatSession {
    pub id: String,
    pub title: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub messages: Vec<ChatMessage>,
    pub metadata: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportOptions {
    pub include_metadata: bool,
    pub include_timestamps: bool,
    pub format_style: ExportStyle,
    pub page_header: Option<String>,
    pub page_footer: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ExportStyle {
    Professional,
    Casual,
    Legal,
    Technical,
}

#[derive(Debug)]
pub struct ChatExporter {
    export_path: PathBuf,
}

impl ChatExporter {
    /// Initialize the chat exporter
    pub fn new(app_data_dir: &Path) -> Result<Self> {
        let export_path = app_data_dir.join("exports");
        std::fs::create_dir_all(&export_path)?;

        Ok(Self { export_path })
    }

    /// Export chat session to markdown format
    pub async fn export_to_markdown(
        &self,
        session: &ChatSession,
        options: &ExportOptions,
    ) -> Result<PathBuf> {
        let filename = format!("chat_export_{}.md", session.id);
        let file_path = self.export_path.join(&filename);

        let mut content = String::new();

        // Add header
        content.push_str(&format!("# Chat Export: {}\n\n", session.title));

        if options.include_metadata {
            content.push_str("## Session Information\n\n");
            content.push_str(&format!("- **Session ID**: {}\n", session.id));
            content.push_str(&format!(
                "- **Created**: {}\n",
                session.created_at.format("%Y-%m-%d %H:%M:%S UTC")
            ));
            content.push_str(&format!(
                "- **Last Updated**: {}\n",
                session.updated_at.format("%Y-%m-%d %H:%M:%S UTC")
            ));
            content.push_str(&format!(
                "- **Total Messages**: {}\n\n",
                session.messages.len()
            ));

            // Add custom metadata
            if !session.metadata.is_empty() {
                content.push_str("### Additional Metadata\n\n");
                for (key, value) in &session.metadata {
                    content.push_str(&format!("- **{}**: {}\n", key, value));
                }
                content.push('\n');
            }
        }

        content.push_str("## Conversation\n\n");

        // Add messages
        for message in &session.messages {
            let role_prefix = match message.role {
                MessageRole::User => "👤 **User**",
                MessageRole::Assistant => "🤖 **Assistant**",
                MessageRole::System => "⚙️ **System**",
            };

            content.push_str(&format!("### {}", role_prefix));

            if options.include_timestamps {
                content.push_str(&format!(" - {}", message.timestamp.format("%H:%M:%S")));
            }

            content.push_str("\n\n");
            content.push_str(&message.content);
            content.push_str("\n\n---\n\n");
        }

        // Add footer
        if let Some(footer) = &options.page_footer {
            content.push_str(&format!("\n\n{}\n", footer));
        }

        content.push_str(&format!(
            "\n*Exported on {} using BEAR AI Legal Assistant*\n",
            Utc::now().format("%Y-%m-%d %H:%M:%S UTC")
        ));

        fs::write(&file_path, content)?;
        Ok(file_path)
    }

    /// Export chat session to plain text format
    pub async fn export_to_txt(
        &self,
        session: &ChatSession,
        options: &ExportOptions,
    ) -> Result<PathBuf> {
        let filename = format!("chat_export_{}.txt", session.id);
        let file_path = self.export_path.join(&filename);

        let mut content = String::new();

        // Add header
        content.push_str(&format!("CHAT EXPORT: {}\n", session.title.to_uppercase()));
        content.push_str(&"=".repeat(80));
        content.push('\n');

        if options.include_metadata {
            content.push_str("\nSESSION INFORMATION:\n");
            content.push_str(&format!("Session ID: {}\n", session.id));
            content.push_str(&format!(
                "Created: {}\n",
                session.created_at.format("%Y-%m-%d %H:%M:%S UTC")
            ));
            content.push_str(&format!(
                "Last Updated: {}\n",
                session.updated_at.format("%Y-%m-%d %H:%M:%S UTC")
            ));
            content.push_str(&format!("Total Messages: {}\n", session.messages.len()));
        }

        content.push_str("\nCONVERSATION:\n");
        content.push_str(&"=".repeat(80));
        content.push('\n');

        // Add messages
        for (index, message) in session.messages.iter().enumerate() {
            content.push_str(&format!("\n[Message {}] ", index + 1));

            let role_text = match message.role {
                MessageRole::User => "USER",
                MessageRole::Assistant => "ASSISTANT",
                MessageRole::System => "SYSTEM",
            };

            content.push_str(role_text);

            if options.include_timestamps {
                content.push_str(&format!(" - {}", message.timestamp.format("%H:%M:%S")));
            }

            content.push_str(":\n");
            content.push_str(&"-".repeat(40));
            content.push('\n');
            content.push_str(&message.content);
            content.push_str("\n\n");
        }

        // Add footer
        if let Some(footer) = &options.page_footer {
            content.push_str(&format!("\n{}\n", footer));
        }

        content.push_str(&format!(
            "\nExported on {} using BEAR AI Legal Assistant\n",
            Utc::now().format("%Y-%m-%d %H:%M:%S UTC")
        ));

        fs::write(&file_path, content)?;
        Ok(file_path)
    }

    /// Export chat session to PDF format
    pub async fn export_to_pdf(
        &self,
        session: &ChatSession,
        options: &ExportOptions,
    ) -> Result<PathBuf> {
        let filename = format!("chat_export_{}.pdf", session.id);
        let file_path = self.export_path.join(&filename);

        // Create PDF document
        let (doc, page1, layer1) =
            PdfDocument::new(&session.title, Mm(210.0), Mm(297.0), "Layer 1");
        let current_layer = doc.get_page(page1).get_layer(layer1);

        // Set up fonts
        let font = doc.add_builtin_font(BuiltinFont::Helvetica)?;
        let font_bold = doc.add_builtin_font(BuiltinFont::HelveticaBold)?;

        let mut y_position = Mm(270.0);
        let margin_left = Mm(20.0);
        let margin_right = Mm(190.0);
        let line_height = Mm(6.0);

        // Add title
        current_layer.use_text(
            &format!("Chat Export: {}", session.title),
            16.0,
            margin_left,
            y_position,
            &font_bold,
        );
        y_position -= line_height * 2.0;

        // Add session info
        if options.include_metadata {
            current_layer.use_text(
                "Session Information:",
                12.0,
                margin_left,
                y_position,
                &font_bold,
            );
            y_position -= line_height;

            let info_lines = vec![
                format!("Session ID: {}", session.id),
                format!(
                    "Created: {}",
                    session.created_at.format("%Y-%m-%d %H:%M:%S UTC")
                ),
                format!(
                    "Last Updated: {}",
                    session.updated_at.format("%Y-%m-%d %H:%M:%S UTC")
                ),
                format!("Total Messages: {}", session.messages.len()),
            ];

            for line in info_lines {
                current_layer.use_text(&line, 10.0, margin_left, y_position, &font);
                y_position -= line_height;
            }
            y_position -= line_height;
        }

        // Add conversation header
        current_layer.use_text("Conversation:", 12.0, margin_left, y_position, &font_bold);
        y_position -= line_height * 1.5;

        // Add messages
        for (index, message) in session.messages.iter().enumerate() {
            // Check if we need a new page
            if y_position < Mm(30.0) {
                let (new_page, new_layer) = doc.add_page(Mm(210.0), Mm(297.0), "Layer 1");
                let current_layer = doc.get_page(new_page).get_layer(new_layer);
                y_position = Mm(270.0);
            }

            // Message header
            let role_text = match message.role {
                MessageRole::User => "User",
                MessageRole::Assistant => "Assistant",
                MessageRole::System => "System",
            };

            let header_text = if options.include_timestamps {
                format!(
                    "[{}] {} - {}",
                    index + 1,
                    role_text,
                    message.timestamp.format("%H:%M:%S")
                )
            } else {
                format!("[{}] {}", index + 1, role_text)
            };

            current_layer.use_text(&header_text, 10.0, margin_left, y_position, &font_bold);
            y_position -= line_height;

            // Message content (simplified text wrapping)
            let words: Vec<&str> = message.content.split_whitespace().collect();
            let mut current_line = String::new();
            const MAX_CHARS_PER_LINE: usize = 80;

            for word in words {
                if current_line.len() + word.len() + 1 > MAX_CHARS_PER_LINE {
                    if !current_line.is_empty() {
                        current_layer.use_text(
                            &current_line,
                            9.0,
                            margin_left + Mm(5.0),
                            y_position,
                            &font,
                        );
                        y_position -= line_height;
                        current_line.clear();
                    }
                }
                if !current_line.is_empty() {
                    current_line.push(' ');
                }
                current_line.push_str(word);
            }

            if !current_line.is_empty() {
                current_layer.use_text(
                    &current_line,
                    9.0,
                    margin_left + Mm(5.0),
                    y_position,
                    &font,
                );
                y_position -= line_height;
            }

            y_position -= line_height * 0.5;
        }

        // Add footer
        y_position = Mm(20.0);
        current_layer.use_text(
            &format!(
                "Exported on {} using BEAR AI Legal Assistant",
                Utc::now().format("%Y-%m-%d %H:%M:%S UTC")
            ),
            8.0,
            margin_left,
            y_position,
            &font,
        );

        // Save PDF
        doc.save(&mut std::io::BufWriter::new(std::fs::File::create(
            &file_path,
        )?))?;
        Ok(file_path)
    }

    /// Get available export formats
    pub fn get_supported_formats() -> Vec<String> {
        vec!["markdown".to_string(), "txt".to_string(), "pdf".to_string()]
    }

    /// Export to specified format
    pub async fn export_session(
        &self,
        session: &ChatSession,
        format: &str,
        options: &ExportOptions,
    ) -> Result<PathBuf> {
        match format.to_lowercase().as_str() {
            "markdown" | "md" => self.export_to_markdown(session, options).await,
            "txt" | "text" => self.export_to_txt(session, options).await,
            "pdf" => self.export_to_pdf(session, options).await,
            _ => Err(anyhow::anyhow!("Unsupported export format: {}", format)),
        }
    }
}

// Tauri commands for chat export
#[tauri::command]
pub async fn export_chat_session(
    exporter: tauri::State<'_, std::sync::Arc<std::sync::Mutex<ChatExporter>>>,
    session_data: String,
    format: String,
    options_data: String,
) -> Result<String, String> {
    let session: ChatSession = serde_json::from_str(&session_data)
        .map_err(|e| format!("Failed to parse session data: {}", e))?;

    let options: ExportOptions = serde_json::from_str(&options_data)
        .map_err(|e| format!("Failed to parse export options: {}", e))?;

    let exporter = exporter.lock().unwrap();
    let file_path = exporter
        .export_session(&session, &format, &options)
        .await
        .map_err(|e| format!("Export failed: {}", e))?;

    Ok(file_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn get_export_formats() -> Result<Vec<String>, String> {
    Ok(ChatExporter::get_supported_formats())
}

#[tauri::command]
pub async fn create_export_options(
    include_metadata: bool,
    include_timestamps: bool,
    style: String,
) -> Result<String, String> {
    let format_style = match style.to_lowercase().as_str() {
        "professional" => ExportStyle::Professional,
        "casual" => ExportStyle::Casual,
        "legal" => ExportStyle::Legal,
        "technical" => ExportStyle::Technical,
        _ => ExportStyle::Professional,
    };

    let options = ExportOptions {
        include_metadata,
        include_timestamps,
        format_style,
        page_header: Some("BEAR AI Legal Assistant - Chat Export".to_string()),
        page_footer: Some("Confidential - Legal Professional Privilege May Apply".to_string()),
    };

    serde_json::to_string(&options).map_err(|e| e.to_string())
}
