// MCP Protocol Implementation for BEAR AI Local Agent Communication
// Implements the Model Context Protocol for secure agent-to-agent communication

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;
use chrono::{DateTime, Utc};
use tokio::sync::{mpsc, RwLock};
use std::sync::Arc;

// MCP Protocol Version
pub const MCP_VERSION: &str = "1.0.0";

// Core MCP Message Types
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum McpMessage {
    // Initialization
    Initialize {
        version: String,
        client_info: ClientInfo,
        capabilities: Capabilities,
    },
    InitializeResult {
        version: String,
        server_info: ServerInfo,
        capabilities: Capabilities,
    },

    // Agent Management
    SpawnAgent {
        id: String,
        agent_type: String,
        config: serde_json::Value,
    },
    AgentSpawned {
        id: String,
        agent_id: String,
        status: String,
    },

    // Resource Management
    ListResources {
        id: String,
        cursor: Option<String>,
    },
    ListResourcesResult {
        id: String,
        resources: Vec<Resource>,
        next_cursor: Option<String>,
    },

    ReadResource {
        id: String,
        uri: String,
    },
    ReadResourceResult {
        id: String,
        contents: ResourceContents,
    },

    // Tool Execution
    CallTool {
        id: String,
        name: String,
        arguments: serde_json::Value,
    },
    CallToolResult {
        id: String,
        content: Vec<ToolContent>,
        is_error: bool,
    },

    // Agent Communication
    SendMessage {
        id: String,
        from_agent: Uuid,
        to_agent: Uuid,
        message: AgentMessage,
    },
    MessageReceived {
        id: String,
        acknowledged: bool,
    },

    // Workflow Control
    StartWorkflow {
        id: String,
        workflow_type: String,
        config: serde_json::Value,
    },
    WorkflowStarted {
        id: String,
        workflow_id: String,
        status: String,
    },

    // Error Handling
    Error {
        id: String,
        code: i32,
        message: String,
        data: Option<serde_json::Value>,
    },

    // Notifications
    Notification {
        method: String,
        params: serde_json::Value,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClientInfo {
    pub name: String,
    pub version: String,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerInfo {
    pub name: String,
    pub version: String,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Capabilities {
    pub resources: Option<ResourceCapabilities>,
    pub tools: Option<ToolCapabilities>,
    pub agents: Option<AgentCapabilities>,
    pub workflows: Option<WorkflowCapabilities>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourceCapabilities {
    pub subscribe: bool,
    pub list_changed: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolCapabilities {
    pub list_changed: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentCapabilities {
    pub spawn: bool,
    pub communicate: bool,
    pub coordinate: bool,
    pub sandbox: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowCapabilities {
    pub execute: bool,
    pub monitor: bool,
    pub coordinate: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Resource {
    pub uri: String,
    pub name: String,
    pub description: Option<String>,
    pub mime_type: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum ResourceContents {
    Text {
        uri: String,
        mime_type: String,
        text: String,
    },
    Blob {
        uri: String,
        mime_type: String,
        blob: String, // base64 encoded
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum ToolContent {
    Text {
        text: String,
    },
    Image {
        data: String, // base64 encoded
        mime_type: String,
    },
    Resource {
        resource: Resource,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentMessage {
    pub message_type: AgentMessageType,
    pub content: serde_json::Value,
    pub timestamp: DateTime<Utc>,
    pub priority: MessagePriority,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AgentMessageType {
    TaskRequest,
    TaskResponse,
    ResourceRequest,
    ResourceResponse,
    Coordination,
    Status,
    Error,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum MessagePriority {
    Low,
    Normal,
    High,
    Critical,
}

// MCP Protocol Handler
pub struct McpProtocolHandler {
    pub client_info: Option<ClientInfo>,
    pub server_info: ServerInfo,
    pub capabilities: Capabilities,
    pub message_handlers: Arc<RwLock<HashMap<String, MessageHandler>>>,
    pub notification_handlers: Arc<RwLock<HashMap<String, NotificationHandler>>>,
    pub resources: Arc<RwLock<HashMap<String, Resource>>>,
    pub tools: Arc<RwLock<HashMap<String, Tool>>>,
}

pub type MessageHandler = Box<dyn Fn(&McpMessage) -> Result<McpMessage, McpError> + Send + Sync>;
pub type NotificationHandler = Box<dyn Fn(&serde_json::Value) -> Result<(), McpError> + Send + Sync>;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tool {
    pub name: String,
    pub description: String,
    pub input_schema: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpError {
    pub code: i32,
    pub message: String,
    pub data: Option<serde_json::Value>,
}

impl std::fmt::Display for McpError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "MCP Error {}: {}", self.code, self.message)
    }
}

impl std::error::Error for McpError {}

// Error codes following JSON-RPC 2.0 specification
pub mod error_codes {
    pub const PARSE_ERROR: i32 = -32700;
    pub const INVALID_REQUEST: i32 = -32600;
    pub const METHOD_NOT_FOUND: i32 = -32601;
    pub const INVALID_PARAMS: i32 = -32602;
    pub const INTERNAL_ERROR: i32 = -32603;

    // MCP specific errors
    pub const AGENT_NOT_FOUND: i32 = -32001;
    pub const AGENT_SPAWN_FAILED: i32 = -32002;
    pub const RESOURCE_NOT_FOUND: i32 = -32003;
    pub const TOOL_EXECUTION_FAILED: i32 = -32004;
    pub const SECURITY_VIOLATION: i32 = -32005;
    pub const WORKFLOW_FAILED: i32 = -32006;
}

impl McpProtocolHandler {
    pub fn new() -> Self {
        let server_info = ServerInfo {
            name: "BEAR AI MCP Server".to_string(),
            version: MCP_VERSION.to_string(),
            description: Some("Local MCP server for BEAR AI legal agent coordination".to_string()),
        };

        let capabilities = Capabilities {
            resources: Some(ResourceCapabilities {
                subscribe: true,
                list_changed: true,
            }),
            tools: Some(ToolCapabilities {
                list_changed: true,
            }),
            agents: Some(AgentCapabilities {
                spawn: true,
                communicate: true,
                coordinate: true,
                sandbox: true,
            }),
            workflows: Some(WorkflowCapabilities {
                execute: true,
                monitor: true,
                coordinate: true,
            }),
        };

        Self {
            client_info: None,
            server_info,
            capabilities,
            message_handlers: Arc::new(RwLock::new(HashMap::new())),
            notification_handlers: Arc::new(RwLock::new(HashMap::new())),
            resources: Arc::new(RwLock::new(HashMap::new())),
            tools: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub async fn handle_message(&self, message: McpMessage) -> Result<Option<McpMessage>, McpError> {
        match message {
            McpMessage::Initialize { version, client_info, capabilities } => {
                self.handle_initialize(version, client_info, capabilities).await
            },
            McpMessage::ListResources { id, cursor } => {
                self.handle_list_resources(id, cursor).await
            },
            McpMessage::ReadResource { id, uri } => {
                self.handle_read_resource(id, uri).await
            },
            McpMessage::CallTool { id, name, arguments } => {
                self.handle_call_tool(id, name, arguments).await
            },
            McpMessage::SpawnAgent { id, agent_type, config } => {
                self.handle_spawn_agent(id, agent_type, config).await
            },
            McpMessage::SendMessage { id, from_agent, to_agent, message } => {
                self.handle_send_message(id, from_agent, to_agent, message).await
            },
            McpMessage::StartWorkflow { id, workflow_type, config } => {
                self.handle_start_workflow(id, workflow_type, config).await
            },
            _ => {
                Err(McpError {
                    code: error_codes::METHOD_NOT_FOUND,
                    message: "Message type not supported".to_string(),
                    data: None,
                })
            }
        }
    }

    async fn handle_initialize(&self, version: String, client_info: ClientInfo, _capabilities: Capabilities) -> Result<Option<McpMessage>, McpError> {
        if version != MCP_VERSION {
            return Err(McpError {
                code: error_codes::INVALID_PARAMS,
                message: format!("Unsupported MCP version: {}", version),
                data: None,
            });
        }

        Ok(Some(McpMessage::InitializeResult {
            version: MCP_VERSION.to_string(),
            server_info: self.server_info.clone(),
            capabilities: self.capabilities.clone(),
        }))
    }

    async fn handle_list_resources(&self, id: String, _cursor: Option<String>) -> Result<Option<McpMessage>, McpError> {
        let resources = self.resources.read().await;
        let resource_list: Vec<Resource> = resources.values().cloned().collect();

        Ok(Some(McpMessage::ListResourcesResult {
            id,
            resources: resource_list,
            next_cursor: None,
        }))
    }

    async fn handle_read_resource(&self, id: String, uri: String) -> Result<Option<McpMessage>, McpError> {
        let resources = self.resources.read().await;

        if let Some(resource) = resources.get(&uri) {
            // For demo purposes, return empty text content
            let contents = ResourceContents::Text {
                uri: uri.clone(),
                mime_type: "text/plain".to_string(),
                text: format!("Content for resource: {}", resource.name),
            };

            Ok(Some(McpMessage::ReadResourceResult {
                id,
                contents,
            }))
        } else {
            Err(McpError {
                code: error_codes::RESOURCE_NOT_FOUND,
                message: format!("Resource not found: {}", uri),
                data: None,
            })
        }
    }

    async fn handle_call_tool(&self, id: String, name: String, arguments: serde_json::Value) -> Result<Option<McpMessage>, McpError> {
        let tools = self.tools.read().await;

        if tools.contains_key(&name) {
            // Execute tool with actual implementation
            let result = self.execute_tool(&name, arguments).await?;
            let content = vec![ToolContent::Text {
                text: result,
            }];

            Ok(Some(McpMessage::CallToolResult {
                id,
                content,
                is_error: false,
            }))
        } else {
            Err(McpError {
                code: error_codes::METHOD_NOT_FOUND,
                message: format!("Tool not found: {}", name),
                data: None,
            })
        }
    }

    async fn handle_spawn_agent(&self, id: String, agent_type: String, config: serde_json::Value) -> Result<Option<McpMessage>, McpError> {
        // This would integrate with the actual agent manager
        let agent_id = Uuid::new_v4().to_string();

        Ok(Some(McpMessage::AgentSpawned {
            id,
            agent_id,
            status: "spawned".to_string(),
        }))
    }

    async fn handle_send_message(&self, id: String, _from_agent: Uuid, _to_agent: Uuid, _message: AgentMessage) -> Result<Option<McpMessage>, McpError> {
        // This would route the message to the target agent
        Ok(Some(McpMessage::MessageReceived {
            id,
            acknowledged: true,
        }))
    }

    async fn handle_start_workflow(&self, id: String, workflow_type: String, config: serde_json::Value) -> Result<Option<McpMessage>, McpError> {
        // This would integrate with the workflow manager
        let workflow_id = Uuid::new_v4().to_string();

        Ok(Some(McpMessage::WorkflowStarted {
            id,
            workflow_id,
            status: "started".to_string(),
        }))
    }

    pub async fn add_resource(&self, uri: String, resource: Resource) {
        let mut resources = self.resources.write().await;
        resources.insert(uri, resource);
    }

    pub async fn add_tool(&self, name: String, tool: Tool) {
        let mut tools = self.tools.write().await;
        tools.insert(name, tool);
    }

    pub async fn send_notification(&self, method: String, params: serde_json::Value) -> McpMessage {
        McpMessage::Notification { method, params }
    }
}

// Transport layer for MCP messages
pub struct McpTransport {
    pub tx: mpsc::UnboundedSender<McpMessage>,
    pub rx: mpsc::UnboundedReceiver<McpMessage>,
}

impl McpTransport {
    pub fn new() -> (Self, mpsc::UnboundedSender<McpMessage>) {
        let (tx, rx) = mpsc::unbounded_channel();
        let sender = tx.clone();

        (Self { tx, rx }, sender)
    }

    pub async fn send(&self, message: McpMessage) -> Result<(), McpError> {
        self.tx.send(message).map_err(|_| McpError {
            code: error_codes::INTERNAL_ERROR,
            message: "Failed to send message".to_string(),
            data: None,
        })?;
        Ok(())
    }

    pub async fn receive(&mut self) -> Option<McpMessage> {
        self.rx.recv().await
    }
}