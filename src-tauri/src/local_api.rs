// Local API implementation for BEAR AI - Tauri commands only
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::State;

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
    let is_valid = match credentials.username.as_str() {
        "admin" if credentials.password == "admin123" => true,
        "user" if credentials.password == "user123" => true,
        "demo" if credentials.password == "demo123" => true,
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
    Ok(chat_guard
        .get(&session_id)
        .cloned()
        .unwrap_or_default())
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
    let chat_messages = message_guard.entry(chat_session_id.clone()).or_insert_with(Vec::new);
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
    let mut documents = doc_guard
        .get(&session_id)
        .cloned()
        .unwrap_or_default();
    
    // Filter by category if specified
    if let Some(cat) = category {
        documents = documents.into_iter().filter(|d| d.category == cat).collect();
    }
    
    // Apply pagination
    let start = offset.unwrap_or(0) as usize;
    let end = limit.map(|l| start + l as usize).unwrap_or(documents.len());
    
    Ok(documents.into_iter().skip(start).take(end - start).collect())
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
) -> Result<HashMap<String, serde_json::Value>, String> {
    if !validate_session(&session_id, &sessions)? {
        return Err("Unauthorized".to_string());
    }
    
    if !check_rate_limit(&session_id, &sessions)? {
        return Err("Rate limit exceeded".to_string());
    }
    
    // Mock search results - in production, integrate with local search engine
    let mut results = HashMap::new();
    results.insert("query".to_string(), serde_json::json!(query.query));
    results.insert("results".to_string(), serde_json::json!([]));
    results.insert("total".to_string(), serde_json::json!(0));
    results.insert("processing_time_ms".to_string(), serde_json::json!(50));
    results.insert("local_search".to_string(), serde_json::json!(true));
    
    Ok(results)
}

// Analysis commands
#[tauri::command]
pub async fn local_analysis_analyze(
    session_id: String,
    request: AnalysisRequest,
    sessions: State<'_, SessionStorage>,
) -> Result<HashMap<String, serde_json::Value>, String> {
    if !validate_session(&session_id, &sessions)? {
        return Err("Unauthorized".to_string());
    }
    
    if !check_rate_limit(&session_id, &sessions)? {
        return Err("Rate limit exceeded".to_string());
    }
    
    // Mock analysis results - in production, integrate with local AI models
    let mut results = HashMap::new();
    results.insert("id".to_string(), serde_json::json!(generate_uuid()));
    results.insert("document_id".to_string(), serde_json::json!(request.document_id));
    results.insert("type".to_string(), serde_json::json!(request.analysis_type));
    results.insert("result".to_string(), serde_json::json!({
        "summary": "Analysis completed using local processing",
        "confidence": 0.95,
        "local_processing": true
    }));
    results.insert("created_at".to_string(), serde_json::json!(chrono::Utc::now().to_rfc3339()));
    results.insert("processing_time_ms".to_string(), serde_json::json!(1200));
    
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
    let document_count: usize = document_storage.lock().unwrap().values().map(|v| v.len()).sum();
    let message_count: usize = message_storage.lock().unwrap().values().map(|v| v.len()).sum();
    
    let mut health = HashMap::new();
    health.insert("status".to_string(), serde_json::json!("healthy"));
    health.insert("timestamp".to_string(), serde_json::json!(chrono::Utc::now().to_rfc3339()));
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
    
    let user_chats = chat_storage.lock().unwrap()
        .get(&session_id)
        .map(|v| v.len())
        .unwrap_or(0);
    
    let user_documents = document_storage.lock().unwrap()
        .get(&session_id)
        .map(|v| v.len())
        .unwrap_or(0);
    
    let user_messages: usize = message_storage.lock().unwrap()
        .iter()
        .filter_map(|(_, messages)| {
            // Find messages that belong to user's chat sessions
            let user_chat_ids: Vec<String> = chat_storage.lock().unwrap()
                .get(&session_id)
                .map(|chats| chats.iter().map(|c| c.id.clone()).collect())
                .unwrap_or_default();
            
            if messages.iter().any(|m| user_chat_ids.contains(&m.session_id)) {
                Some(messages.len())
            } else {
                None
            }
        })
        .sum();
    
    let mut stats = HashMap::new();
    stats.insert("user_chats".to_string(), serde_json::json!(user_chats));
    stats.insert("user_documents".to_string(), serde_json::json!(user_documents));
    stats.insert("user_messages".to_string(), serde_json::json!(user_messages));
    stats.insert("local_only".to_string(), serde_json::json!(true));
    
    Ok(stats)
}