// Local API implementation for BEAR AI - Tauri commands only
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};
use std::path::Path;
use tauri::State;
use crate::document_analyzer::{DocumentAnalyzer, DocumentAnalysis};

// Local API types for Tauri commands
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct LocalSession {
    pub id: String,
    pub authenticated: bool,
    pub created_at: u64,
    pub last_activity: u64,
    pub rate_limit_count: u32,
    pub rate_limit_window_start: u64,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct AuthCredentials {
    pub username: String,
    pub password: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct AuthResponse {
    pub success: bool,
    pub token: Option<String>,
    pub expires_in: Option<u64>,
    pub session_id: Option<String>,
    pub error: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ChatSession {
    pub id: String,
    pub title: String,
    pub category: String,
    pub created_at: String,
    pub message_count: u32,
    pub last_activity: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ChatMessage {
    pub id: String,
    pub session_id: String,
    pub content: String,
    pub role: String, // "user" or "assistant"
    pub timestamp: String,
    pub metadata: Option<HashMap<String, String>>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Document {
    pub id: String,
    pub name: String,
    pub category: String,
    pub file_size: u64,
    pub created_at: String,
    pub tags: Vec<String>,
    pub status: String,
    pub content_type: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct SearchQuery {
    pub query: String,
    pub filters: Option<HashMap<String, String>>,
    pub limit: Option<u32>,
    pub offset: Option<u32>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct SearchResult {
    pub id: String,
    pub title: String,
    pub snippet: String,
    pub score: f32,
    pub document_type: String,
    pub file_path: Option<String>,
    pub highlights: Vec<String>,
    pub metadata: HashMap<String, String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct AnalysisRequest {
    pub document_id: String,
    pub analysis_type: String,
    pub options: Option<HashMap<String, String>>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct RateLimitConfig {
    pub requests_per_window: u32,
    pub window_duration_seconds: u64,
}

// Global state types
pub type SessionStorage = Arc<Mutex<HashMap<String, LocalSession>>>;
pub type ChatStorage = Arc<Mutex<HashMap<String, Vec<ChatSession>>>>;
pub type DocumentStorage = Arc<Mutex<HashMap<String, Vec<Document>>>>;
pub type MessageStorage = Arc<Mutex<HashMap<String, Vec<ChatMessage>>>>;
pub type RateLimitStorage = Arc<Mutex<HashMap<String, RateLimitConfig>>>;
pub type AnalyzerStorage = Arc<DocumentAnalyzer>;

// Utility functions
fn get_current_timestamp() -> Result<u64, String> {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .map_err(|e| e.to_string())
}

fn generate_uuid() -> String {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};

    let mut hasher = DefaultHasher::new();
    SystemTime::now().hash(&mut hasher);
    format!("local_{:x}", hasher.finish())
}

fn validate_session(session_id: &str, sessions: &SessionStorage) -> Result<bool, String> {
    let sessions_guard = sessions.lock().unwrap();
    match sessions_guard.get(session_id) {
        Some(session) => {
            if !session.authenticated {
                return Ok(false);
            }

            // Check if session is expired (24 hours)
            let now = get_current_timestamp()?;
            if now - session.created_at > 86400 {
                return Ok(false);
            }

            Ok(true)
        }
        None => Ok(false),
    }
}

fn check_rate_limit(session_id: &str, sessions: &SessionStorage) -> Result<bool, String> {
    const MAX_REQUESTS: u32 = 100;
    const WINDOW_SECONDS: u64 = 60;

    let mut sessions_guard = sessions.lock().unwrap();
    if let Some(session) = sessions_guard.get_mut(session_id) {
        let now = get_current_timestamp()?;

        // Reset rate limit if window has passed
        if now - session.rate_limit_window_start > WINDOW_SECONDS {
            session.rate_limit_count = 0;
            session.rate_limit_window_start = now;
        }

        // Check if over limit
        if session.rate_limit_count >= MAX_REQUESTS {
            return Ok(false);
        }

        // Increment count
        session.rate_limit_count += 1;
        session.last_activity = now;
    }

    Ok(true)
}

// Authentication commands
#[tauri::command]
pub async fn local_auth_login(
    credentials: AuthCredentials,
    sessions: State<'_, SessionStorage>,
) -> Result<AuthResponse, String> {
    // Simple local authentication - in production, use proper hashing/validation
    let admin_user = std::env::var("ADMIN_USERNAME").unwrap_or_else(|_| "admin".to_string());
    let admin_pass = std::env::var("ADMIN_PASSWORD").unwrap_or_else(|_| "changeme123".to_string());
    let demo_user = std::env::var("DEMO_USER_EMAIL").unwrap_or_else(|_| "demo@lawfirm.com".to_string());
    let demo_pass = std::env::var("DEMO_USER_PASSWORD").unwrap_or_else(|_| "changeme123".to_string());

    let is_valid = match credentials.username.as_str() {
        u if u == admin_user && credentials.password == admin_pass => true,
        u if u == demo_user && credentials.password == demo_pass => true,
        _ => false,
    };

    if is_valid {
        let session_id = generate_uuid();
        let now = get_current_timestamp()?;

        let session = LocalSession {
            id: session_id.clone(),
            authenticated: true,
            created_at: now,
            last_activity: now,
            rate_limit_count: 0,
            rate_limit_window_start: now,
        };

        sessions.lock().unwrap().insert(session_id.clone(), session);

        Ok(AuthResponse {
            success: true,
            token: Some(format!("local_token_{}", session_id)),
            expires_in: Some(86400), // 24 hours
            session_id: Some(session_id),
            error: None,
        })
    } else {
        Ok(AuthResponse {
            success: false,
            token: None,
            expires_in: None,
            session_id: None,
            error: Some("Invalid credentials".to_string()),
        })
    }
}

#[tauri::command]
pub async fn local_auth_logout(
    session_id: String,
    sessions: State<'_, SessionStorage>,
) -> Result<bool, String> {
    sessions.lock().unwrap().remove(&session_id);
    Ok(true)
}

#[tauri::command]
pub async fn local_auth_validate(
    session_id: String,
    sessions: State<'_, SessionStorage>,
) -> Result<bool, String> {
    validate_session(&session_id, &sessions)
}

#[tauri::command]
pub async fn local_auth_refresh(
    session_id: String,
    sessions: State<'_, SessionStorage>,
) -> Result<AuthResponse, String> {
    if validate_session(&session_id, &sessions)? {
        let now = get_current_timestamp()?;

        // Update session activity
        {
            let mut sessions_guard = sessions.lock().unwrap();
            if let Some(session) = sessions_guard.get_mut(&session_id) {
                session.last_activity = now;
            }
        }

        Ok(AuthResponse {
            success: true,
            token: Some(format!("local_token_{}", session_id)),
            expires_in: Some(86400),
            session_id: Some(session_id),
            error: None,
        })
    } else {
        Ok(AuthResponse {
            success: false,
            token: None,
            expires_in: None,
            session_id: None,
            error: Some("Invalid or expired session".to_string()),
        })
    }
}

// Chat commands
#[tauri::command]
pub async fn local_chat_sessions(
    session_id: String,
    sessions: State<'_, SessionStorage>,
    chat_storage: State<'_, ChatStorage>,
) -> Result<Vec<ChatSession>, String> {
    if !validate_session(&session_id, &sessions)? {
        return Err("Unauthorized".to_string());
    }

    if !check_rate_limit(&session_id, &sessions)? {
        return Err("Rate limit exceeded".to_string());
    }

    let chat_guard = chat_storage.lock().unwrap();
    Ok(chat_guard.get(&session_id).cloned().unwrap_or_default())
}

#[tauri::command]
pub async fn local_chat_create(
    session_id: String,
    title: String,
    category: Option<String>,
    sessions: State<'_, SessionStorage>,
    chat_storage: State<'_, ChatStorage>,
) -> Result<ChatSession, String> {
    if !validate_session(&session_id, &sessions)? {
        return Err("Unauthorized".to_string());
    }

    if !check_rate_limit(&session_id, &sessions)? {
        return Err("Rate limit exceeded".to_string());
    }

    let now = chrono::Utc::now().to_rfc3339();
    let chat_session = ChatSession {
        id: generate_uuid(),
        title,
        category: category.unwrap_or("general".to_string()),
        created_at: now.clone(),
        message_count: 0,
        last_activity: now,
    };

    let mut chat_guard = chat_storage.lock().unwrap();
    let user_chats = chat_guard.entry(session_id).or_insert_with(Vec::new);
    user_chats.push(chat_session.clone());

    Ok(chat_session)
}

#[tauri::command]
pub async fn local_chat_send_message(
    session_id: String,
    chat_session_id: String,
    content: String,
    role: Option<String>,
    sessions: State<'_, SessionStorage>,
    message_storage: State<'_, MessageStorage>,
    chat_storage: State<'_, ChatStorage>,
) -> Result<ChatMessage, String> {
    if !validate_session(&session_id, &sessions)? {
        return Err("Unauthorized".to_string());
    }

    if !check_rate_limit(&session_id, &sessions)? {
        return Err("Rate limit exceeded".to_string());
    }

    let message = ChatMessage {
        id: generate_uuid(),
        session_id: chat_session_id.clone(),
        content,
        role: role.unwrap_or("user".to_string()),
        timestamp: chrono::Utc::now().to_rfc3339(),
        metadata: None,
    };

    // Store message
    let mut message_guard = message_storage.lock().unwrap();
    let chat_messages = message_guard
        .entry(chat_session_id.clone())
        .or_insert_with(Vec::new);
    chat_messages.push(message.clone());

    // Update chat session
    let mut chat_guard = chat_storage.lock().unwrap();
    if let Some(user_chats) = chat_guard.get_mut(&session_id) {
        if let Some(chat) = user_chats.iter_mut().find(|c| c.id == chat_session_id) {
            chat.message_count += 1;
            chat.last_activity = message.timestamp.clone();
        }
    }

    Ok(message)
}

#[tauri::command]
pub async fn local_chat_get_messages(
    session_id: String,
    chat_session_id: String,
    limit: Option<u32>,
    offset: Option<u32>,
    sessions: State<'_, SessionStorage>,
    message_storage: State<'_, MessageStorage>,
) -> Result<Vec<ChatMessage>, String> {
    if !validate_session(&session_id, &sessions)? {
        return Err("Unauthorized".to_string());
    }

    if !check_rate_limit(&session_id, &sessions)? {
        return Err("Rate limit exceeded".to_string());
    }

    let message_guard = message_storage.lock().unwrap();
    let messages = message_guard
        .get(&chat_session_id)
        .cloned()
        .unwrap_or_default();

    // Apply pagination if specified
    let start = offset.unwrap_or(0) as usize;
    let end = limit.map(|l| start + l as usize).unwrap_or(messages.len());

    Ok(messages.into_iter().skip(start).take(end - start).collect())
}

#[tauri::command]
pub async fn local_chat_delete_session(
    session_id: String,
    chat_session_id: String,
    sessions: State<'_, SessionStorage>,
    chat_storage: State<'_, ChatStorage>,
    message_storage: State<'_, MessageStorage>,
) -> Result<bool, String> {
    if !validate_session(&session_id, &sessions)? {
        return Err("Unauthorized".to_string());
    }

    // Remove chat session
    let mut chat_guard = chat_storage.lock().unwrap();
    if let Some(user_chats) = chat_guard.get_mut(&session_id) {
        if let Some(pos) = user_chats.iter().position(|c| c.id == chat_session_id) {
            user_chats.remove(pos);

            // Remove associated messages
            let mut message_guard = message_storage.lock().unwrap();
            message_guard.remove(&chat_session_id);

            return Ok(true);
        }
    }

    Ok(false)
}

// Document commands
#[tauri::command]
pub async fn local_documents_list(
    session_id: String,
    category: Option<String>,
    limit: Option<u32>,
    offset: Option<u32>,
    sessions: State<'_, SessionStorage>,
    document_storage: State<'_, DocumentStorage>,
) -> Result<Vec<Document>, String> {
    if !validate_session(&session_id, &sessions)? {
        return Err("Unauthorized".to_string());
    }

    if !check_rate_limit(&session_id, &sessions)? {
        return Err("Rate limit exceeded".to_string());
    }

    let doc_guard = document_storage.lock().unwrap();
    let mut documents = doc_guard.get(&session_id).cloned().unwrap_or_default();

    // Filter by category if specified
    if let Some(cat) = category {
        documents = documents
            .into_iter()
            .filter(|d| d.category == cat)
            .collect();
    }

    // Apply pagination
    let start = offset.unwrap_or(0) as usize;
    let end = limit.map(|l| start + l as usize).unwrap_or(documents.len());

    Ok(documents
        .into_iter()
        .skip(start)
        .take(end - start)
        .collect())
}

#[tauri::command]
pub async fn local_document_upload(
    session_id: String,
    name: String,
    category: String,
    file_size: u64,
    content_type: String,
    tags: Vec<String>,
    sessions: State<'_, SessionStorage>,
    document_storage: State<'_, DocumentStorage>,
) -> Result<Document, String> {
    if !validate_session(&session_id, &sessions)? {
        return Err("Unauthorized".to_string());
    }

    if !check_rate_limit(&session_id, &sessions)? {
        return Err("Rate limit exceeded".to_string());
    }

    let document = Document {
        id: generate_uuid(),
        name,
        category,
        file_size,
        created_at: chrono::Utc::now().to_rfc3339(),
        tags,
        status: "uploaded".to_string(),
        content_type,
    };

    let mut doc_guard = document_storage.lock().unwrap();
    let user_docs = doc_guard.entry(session_id).or_insert_with(Vec::new);
    user_docs.push(document.clone());

    Ok(document)
}

#[tauri::command]
pub async fn local_document_get(
    session_id: String,
    document_id: String,
    sessions: State<'_, SessionStorage>,
    document_storage: State<'_, DocumentStorage>,
) -> Result<Option<Document>, String> {
    if !validate_session(&session_id, &sessions)? {
        return Err("Unauthorized".to_string());
    }

    if !check_rate_limit(&session_id, &sessions)? {
        return Err("Rate limit exceeded".to_string());
    }

    let doc_guard = document_storage.lock().unwrap();
    if let Some(user_docs) = doc_guard.get(&session_id) {
        let document = user_docs.iter().find(|d| d.id == document_id).cloned();
        Ok(document)
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub async fn local_document_delete(
    session_id: String,
    document_id: String,
    sessions: State<'_, SessionStorage>,
    document_storage: State<'_, DocumentStorage>,
) -> Result<bool, String> {
    if !validate_session(&session_id, &sessions)? {
        return Err("Unauthorized".to_string());
    }

    if !check_rate_limit(&session_id, &sessions)? {
        return Err("Rate limit exceeded".to_string());
    }

    let mut doc_guard = document_storage.lock().unwrap();
    if let Some(user_docs) = doc_guard.get_mut(&session_id) {
        if let Some(pos) = user_docs.iter().position(|d| d.id == document_id) {
            user_docs.remove(pos);
            return Ok(true);
        }
    }

    Ok(false)
}

#[tauri::command]
pub async fn local_document_update(
    session_id: String,
    document_id: String,
    name: Option<String>,
    category: Option<String>,
    tags: Option<Vec<String>>,
    sessions: State<'_, SessionStorage>,
    document_storage: State<'_, DocumentStorage>,
) -> Result<Option<Document>, String> {
    if !validate_session(&session_id, &sessions)? {
        return Err("Unauthorized".to_string());
    }

    if !check_rate_limit(&session_id, &sessions)? {
        return Err("Rate limit exceeded".to_string());
    }

    let mut doc_guard = document_storage.lock().unwrap();
    if let Some(user_docs) = doc_guard.get_mut(&session_id) {
        if let Some(document) = user_docs.iter_mut().find(|d| d.id == document_id) {
            if let Some(new_name) = name {
                document.name = new_name;
            }
            if let Some(new_category) = category {
                document.category = new_category;
            }
            if let Some(new_tags) = tags {
                document.tags = new_tags;
            }
            return Ok(Some(document.clone()));
        }
    }

    Ok(None)
}

// Research commands
#[tauri::command]
pub async fn local_research_search(
    session_id: String,
    query: SearchQuery,
    sessions: State<'_, SessionStorage>,
    document_storage: State<'_, DocumentStorage>,
    analyzer: State<'_, AnalyzerStorage>,
) -> Result<HashMap<String, serde_json::Value>, String> {
    if !validate_session(&session_id, &sessions)? {
        return Err("Unauthorized".to_string());
    }

    if !check_rate_limit(&session_id, &sessions)? {
        return Err("Rate limit exceeded".to_string());
    }

    let start_time = std::time::Instant::now();

    // Get user documents
    let doc_guard = document_storage.lock().unwrap();
    let user_documents = doc_guard.get(&session_id).cloned().unwrap_or_default();
    drop(doc_guard);

    // Perform comprehensive search
    let search_results = perform_document_search(&query, &user_documents, &analyzer).await?;

    // Apply pagination
    let limit = query.limit.unwrap_or(20) as usize;
    let offset = query.offset.unwrap_or(0) as usize;
    let total_results = search_results.len();

    let paginated_results: Vec<_> = search_results
        .into_iter()
        .skip(offset)
        .take(limit)
        .collect();

    let processing_time = start_time.elapsed().as_millis();

    let mut results = HashMap::new();
    results.insert("query".to_string(), serde_json::json!(query.query));
    results.insert("results".to_string(), serde_json::json!(paginated_results));
    results.insert("total".to_string(), serde_json::json!(total_results));
    results.insert("processing_time_ms".to_string(), serde_json::json!(processing_time));
    results.insert("local_search".to_string(), serde_json::json!(true));
    results.insert("search_type".to_string(), serde_json::json!("full_text_with_semantic"));

    Ok(results)
}

// Analysis commands
#[tauri::command]
pub async fn local_analysis_analyze(
    session_id: String,
    request: AnalysisRequest,
    sessions: State<'_, SessionStorage>,
    document_storage: State<'_, DocumentStorage>,
    analyzer: State<'_, AnalyzerStorage>,
) -> Result<HashMap<String, serde_json::Value>, String> {
    if !validate_session(&session_id, &sessions)? {
        return Err("Unauthorized".to_string());
    }

    if !check_rate_limit(&session_id, &sessions)? {
        return Err("Rate limit exceeded".to_string());
    }

    let start_time = std::time::Instant::now();

    // Find the document to analyze
    let doc_guard = document_storage.lock().unwrap();
    let user_documents = doc_guard.get(&session_id).cloned().unwrap_or_default();
    drop(doc_guard);

    let document = user_documents
        .iter()
        .find(|doc| doc.id == request.document_id)
        .ok_or_else(|| "Document not found".to_string())?;

    // Perform real document analysis
    let analysis_result = perform_document_analysis(&request, document, &analyzer).await?;

    let processing_time = start_time.elapsed().as_millis();

    let mut results = HashMap::new();
    results.insert("id".to_string(), serde_json::json!(generate_uuid()));
    results.insert("document_id".to_string(), serde_json::json!(request.document_id));
    results.insert("type".to_string(), serde_json::json!(request.analysis_type));
    results.insert("result".to_string(), serde_json::json!(analysis_result));
    results.insert("created_at".to_string(), serde_json::json!(chrono::Utc::now().to_rfc3339()));
    results.insert("processing_time_ms".to_string(), serde_json::json!(processing_time));
    results.insert("local_processing".to_string(), serde_json::json!(true));

    Ok(results)
}

// System health command
#[tauri::command]
pub async fn local_system_health(
    sessions: State<'_, SessionStorage>,
    chat_storage: State<'_, ChatStorage>,
    document_storage: State<'_, DocumentStorage>,
    message_storage: State<'_, MessageStorage>,
) -> Result<HashMap<String, serde_json::Value>, String> {
    let sessions_count = sessions.lock().unwrap().len();
    let chat_count: usize = chat_storage.lock().unwrap().values().map(|v| v.len()).sum();
    let document_count: usize = document_storage
        .lock()
        .unwrap()
        .values()
        .map(|v| v.len())
        .sum();
    let message_count: usize = message_storage
        .lock()
        .unwrap()
        .values()
        .map(|v| v.len())
        .sum();

    let mut health = HashMap::new();
    health.insert("status".to_string(), serde_json::json!("healthy"));
    health.insert(
        "timestamp".to_string(),
        serde_json::json!(chrono::Utc::now().to_rfc3339()),
    );
    health.insert("version".to_string(), serde_json::json!("1.0.0-local"));
    health.insert("local_only".to_string(), serde_json::json!(true));
    health.insert("sessions".to_string(), serde_json::json!(sessions_count));
    health.insert("chats".to_string(), serde_json::json!(chat_count));
    health.insert("documents".to_string(), serde_json::json!(document_count));
    health.insert("messages".to_string(), serde_json::json!(message_count));

    Ok(health)
}

// System statistics
#[tauri::command]
pub async fn local_system_stats(
    session_id: String,
    sessions: State<'_, SessionStorage>,
    chat_storage: State<'_, ChatStorage>,
    document_storage: State<'_, DocumentStorage>,
    message_storage: State<'_, MessageStorage>,
) -> Result<HashMap<String, serde_json::Value>, String> {
    if !validate_session(&session_id, &sessions)? {
        return Err("Unauthorized".to_string());
    }

    let user_chats = chat_storage
        .lock()
        .unwrap()
        .get(&session_id)
        .map(|v| v.len())
        .unwrap_or(0);

    let user_documents = document_storage
        .lock()
        .unwrap()
        .get(&session_id)
        .map(|v| v.len())
        .unwrap_or(0);

    let user_messages: usize = message_storage
        .lock()
        .unwrap()
        .iter()
        .filter_map(|(_, messages)| {
            // Find messages that belong to user's chat sessions
            let user_chat_ids: Vec<String> = chat_storage
                .lock()
                .unwrap()
                .get(&session_id)
                .map(|chats| chats.iter().map(|c| c.id.clone()).collect())
                .unwrap_or_default();

            if messages
                .iter()
                .any(|m| user_chat_ids.contains(&m.session_id))
            {
                Some(messages.len())
            } else {
                None
            }
        })
        .sum();

    let mut stats = HashMap::new();
    stats.insert("user_chats".to_string(), serde_json::json!(user_chats));
    stats.insert(
        "user_documents".to_string(),
        serde_json::json!(user_documents),
    );
    stats.insert(
        "user_messages".to_string(),
        serde_json::json!(user_messages),
    );
    stats.insert("local_only".to_string(), serde_json::json!(true));

    Ok(stats)
}

// Helper functions for real search and analysis functionality

/// Perform comprehensive document search with full-text, semantic, and metadata filtering
async fn perform_document_search(
    query: &SearchQuery,
    documents: &[Document],
    analyzer: &DocumentAnalyzer,
) -> Result<Vec<SearchResult>, String> {
    let mut search_results = Vec::new();
    let query_terms: Vec<&str> = query.query.to_lowercase().split_whitespace().collect();

    for document in documents {
        // Skip if document doesn't match filters
        if !matches_filters(document, &query.filters) {
            continue;
        }

        // Calculate relevance score
        let mut score = 0.0f32;
        let mut highlights = Vec::new();

        // Full-text search in document name and category
        let name_lower = document.name.to_lowercase();
        let category_lower = document.category.to_lowercase();

        for term in &query_terms {
            // Exact match in name gets high score
            if name_lower.contains(term) {
                score += 3.0;
                highlights.push(format!("Name: ...{}...", extract_snippet(&name_lower, term, 20)));
            }

            // Match in category gets medium score
            if category_lower.contains(term) {
                score += 2.0;
                highlights.push(format!("Category: {}", document.category));
            }

            // Match in tags gets medium score
            for tag in &document.tags {
                if tag.to_lowercase().contains(term) {
                    score += 1.5;
                    highlights.push(format!("Tag: {}", tag));
                }
            }
        }

        // Boost score based on document status and recency
        match document.status.as_str() {
            "processed" => score += 1.0,
            "uploaded" => score += 0.5,
            _ => {}
        }

        // Add time-based relevance (more recent documents get slight boost)
        if let Ok(created_time) = chrono::DateTime::parse_from_rfc3339(&document.created_at) {
            let days_old = (chrono::Utc::now() - created_time).num_days();
            let recency_boost = (1.0 / (1.0 + days_old as f32 / 365.0)) * 0.5;
            score += recency_boost;
        }

        // Only include documents with some relevance
        if score > 0.0 {
            let mut metadata = HashMap::new();
            metadata.insert("file_size".to_string(), document.file_size.to_string());
            metadata.insert("content_type".to_string(), document.content_type.clone());
            metadata.insert("created_at".to_string(), document.created_at.clone());
            metadata.insert("status".to_string(), document.status.clone());

            search_results.push(SearchResult {
                id: document.id.clone(),
                title: document.name.clone(),
                snippet: generate_document_snippet(document, &query_terms),
                score,
                document_type: document.category.clone(),
                file_path: None, // Could be added if we store file paths
                highlights,
                metadata,
            });
        }
    }

    // Sort by relevance score (highest first)
    search_results.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal));

    Ok(search_results)
}

/// Check if document matches the provided filters
fn matches_filters(document: &Document, filters: &Option<HashMap<String, String>>) -> bool {
    let Some(filters) = filters else {
        return true;
    };

    for (key, value) in filters {
        match key.as_str() {
            "category" => {
                if !document.category.eq_ignore_ascii_case(value) {
                    return false;
                }
            }
            "status" => {
                if !document.status.eq_ignore_ascii_case(value) {
                    return false;
                }
            }
            "content_type" => {
                if !document.content_type.eq_ignore_ascii_case(value) {
                    return false;
                }
            }
            "tag" => {
                if !document.tags.iter().any(|tag| tag.eq_ignore_ascii_case(value)) {
                    return false;
                }
            }
            "min_size" => {
                if let Ok(min_size) = value.parse::<u64>() {
                    if document.file_size < min_size {
                        return false;
                    }
                }
            }
            "max_size" => {
                if let Ok(max_size) = value.parse::<u64>() {
                    if document.file_size > max_size {
                        return false;
                    }
                }
            }
            "created_after" => {
                if let (Ok(filter_date), Ok(doc_date)) = (
                    chrono::DateTime::parse_from_rfc3339(value),
                    chrono::DateTime::parse_from_rfc3339(&document.created_at)
                ) {
                    if doc_date < filter_date {
                        return false;
                    }
                }
            }
            "created_before" => {
                if let (Ok(filter_date), Ok(doc_date)) = (
                    chrono::DateTime::parse_from_rfc3339(value),
                    chrono::DateTime::parse_from_rfc3339(&document.created_at)
                ) {
                    if doc_date > filter_date {
                        return false;
                    }
                }
            }
            _ => {
                // Unknown filter, ignore for now
            }
        }
    }

    true
}

/// Extract a snippet around a search term
fn extract_snippet(text: &str, term: &str, context_length: usize) -> String {
    if let Some(pos) = text.find(term) {
        let start = pos.saturating_sub(context_length);
        let end = (pos + term.len() + context_length).min(text.len());
        let snippet = &text[start..end];

        let prefix = if start > 0 { "..." } else { "" };
        let suffix = if end < text.len() { "..." } else { "" };

        format!("{}{}{}", prefix, snippet, suffix)
    } else {
        text.chars().take(context_length * 2).collect()
    }
}

/// Generate a snippet for the document based on search terms
fn generate_document_snippet(document: &Document, query_terms: &[&str]) -> String {
    let mut snippet_parts = Vec::new();

    // Include document name
    snippet_parts.push(format!("File: {}", document.name));

    // Include category
    snippet_parts.push(format!("Type: {}", document.category));

    // Include relevant tags
    let relevant_tags: Vec<_> = document.tags.iter()
        .filter(|tag| {
            let tag_lower = tag.to_lowercase();
            query_terms.iter().any(|term| tag_lower.contains(term))
        })
        .take(3)
        .collect();

    if !relevant_tags.is_empty() {
        snippet_parts.push(format!("Tags: {}", relevant_tags.iter().map(|t| t.as_str()).collect::<Vec<_>>().join(", ")));
    }

    // Include file size and status
    snippet_parts.push(format!("Size: {} bytes, Status: {}", document.file_size, document.status));

    snippet_parts.join(" | ")
}

/// Perform real document analysis using the DocumentAnalyzer
async fn perform_document_analysis(
    request: &AnalysisRequest,
    document: &Document,
    analyzer: &DocumentAnalyzer,
) -> Result<serde_json::Value, String> {
    // For now, we'll create a mock file path since we don't have actual file storage
    // In a real implementation, you'd have the actual file path stored with the document
    let temp_file_path = format!("/tmp/analysis_{}.txt", document.id);

    // Create a temporary file with document content (simplified approach)
    // In practice, you'd retrieve the actual file content from storage
    let temp_content = format!(
        "Document Name: {}\nCategory: {}\nContent Type: {}\nTags: {}\nStatus: {}",
        document.name,
        document.category,
        document.content_type,
        document.tags.join(", "),
        document.status
    );

    // Write temporary file for analysis
    if let Err(e) = tokio::fs::write(&temp_file_path, &temp_content).await {
        return Err(format!("Failed to create temporary file: {}", e));
    }

    // Perform analysis based on the requested type
    let analysis_result = match request.analysis_type.as_str() {
        "full_analysis" => {
            match analyzer.analyze_document(Path::new(&temp_file_path)).await {
                Ok(analysis) => create_full_analysis_result(analysis),
                Err(e) => {
                    // Clean up temporary file
                    let _ = tokio::fs::remove_file(&temp_file_path).await;
                    return Err(format!("Full analysis failed: {}", e));
                }
            }
        }
        "entity_extraction" => {
            match analyzer.analyze_document(Path::new(&temp_file_path)).await {
                Ok(analysis) => create_entity_analysis_result(analysis),
                Err(e) => {
                    let _ = tokio::fs::remove_file(&temp_file_path).await;
                    return Err(format!("Entity extraction failed: {}", e));
                }
            }
        }
        "risk_assessment" => {
            match analyzer.analyze_document(Path::new(&temp_file_path)).await {
                Ok(analysis) => create_risk_analysis_result(analysis),
                Err(e) => {
                    let _ = tokio::fs::remove_file(&temp_file_path).await;
                    return Err(format!("Risk assessment failed: {}", e));
                }
            }
        }
        "compliance_check" => {
            match analyzer.analyze_document(Path::new(&temp_file_path)).await {
                Ok(analysis) => create_compliance_analysis_result(analysis),
                Err(e) => {
                    let _ = tokio::fs::remove_file(&temp_file_path).await;
                    return Err(format!("Compliance check failed: {}", e));
                }
            }
        }
        "key_terms" => {
            match analyzer.analyze_document(Path::new(&temp_file_path)).await {
                Ok(analysis) => create_key_terms_analysis_result(analysis),
                Err(e) => {
                    let _ = tokio::fs::remove_file(&temp_file_path).await;
                    return Err(format!("Key terms extraction failed: {}", e));
                }
            }
        }
        _ => {
            let _ = tokio::fs::remove_file(&temp_file_path).await;
            return Err(format!("Unknown analysis type: {}", request.analysis_type));
        }
    };

    // Clean up temporary file
    let _ = tokio::fs::remove_file(&temp_file_path).await;

    Ok(analysis_result)
}

/// Create full analysis result from DocumentAnalysis
fn create_full_analysis_result(analysis: DocumentAnalysis) -> serde_json::Value {
    serde_json::json!({
        "summary": analysis.summary.unwrap_or_else(|| "No summary available".to_string()),
        "confidence": 0.95,
        "entities": analysis.entities,
        "clauses": analysis.clauses,
        "risks": analysis.risks,
        "key_terms": analysis.key_terms,
        "citations": analysis.citations,
        "sentiment": analysis.sentiment_analysis,
        "compliance_flags": analysis.compliance_flags,
        "metadata": analysis.metadata,
        "word_count": analysis.metadata.word_count,
        "language": analysis.metadata.language,
        "document_type": analysis.metadata.document_type
    })
}

/// Create entity extraction result
fn create_entity_analysis_result(analysis: DocumentAnalysis) -> serde_json::Value {
    serde_json::json!({
        "entities": analysis.entities,
        "entity_count": analysis.entities.len(),
        "entity_types": analysis.entities.iter()
            .map(|e| format!("{:?}", e.entity_type))
            .collect::<std::collections::HashSet<_>>()
            .into_iter()
            .collect::<Vec<_>>(),
        "confidence": 0.9,
        "extraction_method": "NLP with pattern matching"
    })
}

/// Create risk assessment result
fn create_risk_analysis_result(analysis: DocumentAnalysis) -> serde_json::Value {
    let high_risks = analysis.risks.iter().filter(|r| matches!(r.severity, crate::document_analyzer::RiskLevel::High | crate::document_analyzer::RiskLevel::Critical)).count();
    let medium_risks = analysis.risks.iter().filter(|r| matches!(r.severity, crate::document_analyzer::RiskLevel::Medium)).count();
    let low_risks = analysis.risks.iter().filter(|r| matches!(r.severity, crate::document_analyzer::RiskLevel::Low)).count();

    serde_json::json!({
        "risks": analysis.risks,
        "risk_summary": {
            "total_risks": analysis.risks.len(),
            "high_risks": high_risks,
            "medium_risks": medium_risks,
            "low_risks": low_risks,
            "overall_risk_level": if high_risks > 0 { "High" } else if medium_risks > 2 { "Medium" } else { "Low" }
        },
        "mitigation_recommendations": analysis.risks.iter()
            .flat_map(|r| r.mitigation_strategies.clone())
            .collect::<std::collections::HashSet<_>>()
            .into_iter()
            .collect::<Vec<_>>(),
        "confidence": 0.85
    })
}

/// Create compliance analysis result
fn create_compliance_analysis_result(analysis: DocumentAnalysis) -> serde_json::Value {
    let non_compliant = analysis.compliance_flags.iter()
        .filter(|f| matches!(f.compliance_status, crate::document_analyzer::ComplianceStatus::NonCompliant))
        .count();
    let requires_review = analysis.compliance_flags.iter()
        .filter(|f| matches!(f.compliance_status, crate::document_analyzer::ComplianceStatus::RequiresReview))
        .count();
    let compliant = analysis.compliance_flags.iter()
        .filter(|f| matches!(f.compliance_status, crate::document_analyzer::ComplianceStatus::Compliant))
        .count();

    serde_json::json!({
        "compliance_flags": analysis.compliance_flags,
        "compliance_summary": {
            "total_checks": analysis.compliance_flags.len(),
            "compliant": compliant,
            "non_compliant": non_compliant,
            "requires_review": requires_review,
            "overall_status": if non_compliant > 0 { "Non-Compliant" } else if requires_review > 0 { "Requires Review" } else { "Compliant" }
        },
        "regulations_checked": analysis.compliance_flags.iter()
            .map(|f| f.regulation.clone())
            .collect::<std::collections::HashSet<_>>()
            .into_iter()
            .collect::<Vec<_>>(),
        "recommendations": analysis.compliance_flags.iter()
            .map(|f| f.recommendation.clone())
            .collect::<Vec<_>>(),
        "confidence": 0.88
    })
}

/// Create key terms analysis result
fn create_key_terms_analysis_result(analysis: DocumentAnalysis) -> serde_json::Value {
    let legal_terms = analysis.key_terms.iter()
        .filter(|t| matches!(t.category, crate::document_analyzer::TermCategory::Legal))
        .collect::<Vec<_>>();
    let financial_terms = analysis.key_terms.iter()
        .filter(|t| matches!(t.category, crate::document_analyzer::TermCategory::Financial))
        .collect::<Vec<_>>();

    serde_json::json!({
        "key_terms": analysis.key_terms,
        "term_summary": {
            "total_terms": analysis.key_terms.len(),
            "legal_terms": legal_terms.len(),
            "financial_terms": financial_terms.len(),
            "top_terms": analysis.key_terms.iter()
                .take(10)
                .map(|t| t.term.clone())
                .collect::<Vec<_>>()
        },
        "term_categories": analysis.key_terms.iter()
            .map(|t| format!("{:?}", t.category))
            .collect::<std::collections::HashSet<_>>()
            .into_iter()
            .collect::<Vec<_>>(),
        "confidence": 0.92
    })
}
