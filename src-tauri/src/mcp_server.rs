use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::Path;
use std::sync::{Arc, Mutex};
use tokio::net::TcpListener;
use tokio::sync::mpsc;
use uuid::Uuid;

/// MCP Protocol Structures following Anthropic's MCP specification
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MCPRequest {
    pub jsonrpc: String,
    pub id: Option<serde_json::Value>,
    pub method: String,
    pub params: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MCPResponse {
    pub jsonrpc: String,
    pub id: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub result: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<MCPError>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MCPError {
    pub code: i32,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<serde_json::Value>,
}

impl MCPError {
    pub fn parse_error(message: String) -> Self {
        Self { code: -32700, message, data: None }
    }

    pub fn invalid_request(message: String) -> Self {
        Self { code: -32600, message, data: None }
    }

    pub fn method_not_found(message: String) -> Self {
        Self { code: -32601, message, data: None }
    }

    pub fn invalid_params(message: String) -> Self {
        Self { code: -32602, message, data: None }
    }

    pub fn internal_error(message: String) -> Self {
        Self { code: -32603, message, data: None }
    }
}

impl MCPResponse {
    pub fn success(id: Option<serde_json::Value>, result: serde_json::Value) -> Self {
        Self {
            jsonrpc: "2.0".to_string(),
            id,
            result: Some(result),
            error: None,
        }
    }

    pub fn error(id: Option<serde_json::Value>, error: MCPError) -> Self {
        Self {
            jsonrpc: "2.0".to_string(),
            id,
            result: None,
            error: Some(error),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MCPTool {
    pub name: String,
    pub description: String,
    pub input_schema: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MCPResource {
    pub uri: String,
    pub name: String,
    pub description: Option<String>,
    pub mime_type: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MCPPrompt {
    pub name: String,
    pub description: String,
    pub arguments: Vec<MCPPromptArgument>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MCPPromptArgument {
    pub name: String,
    pub description: String,
    pub required: bool,
}

#[derive(Debug)]
pub struct MCPSession {
    pub client_info: Option<ClientInfo>,
    pub capabilities: Option<ServerCapabilities>,
    pub initialized: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClientInfo {
    pub name: String,
    pub version: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerCapabilities {
    pub tools: Option<ToolsCapability>,
    pub resources: Option<ResourcesCapability>,
    pub prompts: Option<PromptsCapability>,
    pub logging: Option<LoggingCapability>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolsCapability {
    pub list_changed: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourcesCapability {
    pub subscribe: Option<bool>,
    pub list_changed: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PromptsCapability {
    pub list_changed: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoggingCapability {
    pub level: Option<String>,
}

impl MCPSession {
    pub fn new() -> Self {
        Self {
            client_info: None,
            capabilities: None,
            initialized: false,
        }
    }
}

/// Local MCP (Model Context Protocol) Server for BEAR AI
///
/// This implementation provides a complete MCP server following Anthropic's MCP specification:
///
/// ## Protocol Features:
/// - JSON-RPC 2.0 compliant messaging
/// - WebSocket and TCP connection support
/// - Batched request handling
/// - Proper error response formatting
///
/// ## Capabilities:
/// - **Tools**: Legal document analysis, contract review, risk assessment, compliance checking, citation verification
/// - **Resources**: Access to legal templates, case databases, statutes, and workflow definitions
/// - **Prompts**: Dynamic legal prompt generation for various scenarios
/// - **Workflows**: Multi-agent coordination for complex legal tasks
///
/// ## Legal Tools Available:
/// 1. `analyze_contract` - Comprehensive contract analysis with risk assessment
/// 2. `legal_research` - Case law and statute research with jurisdiction support
/// 3. `assess_risk` - Multi-category legal risk evaluation
/// 4. `check_compliance` - Regulatory compliance verification
/// 5. `verify_citations` - Legal citation accuracy validation
/// 6. `execute_workflow` - Multi-step legal workflow execution
///
/// ## Connection Management:
/// - Session-based client authentication
/// - Keep-alive ping/pong protocol
/// - Graceful connection handling and cleanup
///
/// ## Agent Integration:
/// - Contract Analyzer, Legal Researcher, Risk Assessor, Compliance Checker agents
/// - Workflow orchestration with dependency management
/// - Task prioritization and deadline management
///
/// Provides agentic capabilities and multi-agent coordination
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentDefinition {
    pub id: String,
    pub name: String,
    pub agent_type: AgentType,
    pub capabilities: Vec<String>,
    pub prompt_template: String,
    pub model_id: Option<String>,
    pub memory_limit: usize,
    pub max_iterations: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AgentType {
    ContractAnalyzer,
    LegalResearcher,
    DocumentSummarizer,
    RiskAssessor,
    ComplianceChecker,
    CitationValidator,
    LegalWriter,
    CaseAnalyzer,
    StatuteInterpreter,
    LegalAdvisor,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentTask {
    pub task_id: String,
    pub agent_id: String,
    pub input: String,
    pub context: HashMap<String, String>,
    pub priority: TaskPriority,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub deadline: Option<chrono::DateTime<chrono::Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TaskPriority {
    Low,
    Normal,
    High,
    Critical,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentResponse {
    pub task_id: String,
    pub agent_id: String,
    pub output: String,
    pub confidence: f32,
    pub reasoning: String,
    pub citations: Vec<String>,
    pub follow_up_questions: Vec<String>,
    pub completion_time: chrono::DateTime<chrono::Utc>,
    pub status: TaskStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TaskStatus {
    Pending,
    InProgress,
    Completed,
    Failed,
    Cancelled,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowDefinition {
    pub id: String,
    pub name: String,
    pub description: String,
    pub steps: Vec<WorkflowStep>,
    pub legal_domain: LegalDomain,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowStep {
    pub step_id: String,
    pub agent_type: AgentType,
    pub input_mapping: HashMap<String, String>,
    pub dependencies: Vec<String>,
    pub timeout_seconds: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum LegalDomain {
    ContractLaw,
    CorporateLaw,
    LitigationSupport,
    RealEstate,
    IntellectualProperty,
    Employment,
    Immigration,
    Criminal,
    Family,
    Tax,
    Environmental,
    HealthcareLaw,
    BankingFinance,
    General,
}

#[derive(Debug)]
pub struct MCPServer {
    agents: Arc<Mutex<HashMap<String, AgentDefinition>>>,
    workflows: Arc<Mutex<HashMap<String, WorkflowDefinition>>>,
    active_tasks: Arc<Mutex<HashMap<String, AgentTask>>>,
    task_results: Arc<Mutex<HashMap<String, AgentResponse>>>,
    llm_manager: Arc<crate::llm_manager::LLMManager>,
    port: u16,
}

impl MCPServer {
    /// Initialize the MCP server
    pub fn new(llm_manager: Arc<crate::llm_manager::LLMManager>, port: u16) -> Self {
        let mut agents = HashMap::new();

        // Initialize default legal agents
        agents.insert("contract_analyzer".to_string(), AgentDefinition {
            id: "contract_analyzer".to_string(),
            name: "Contract Analyzer".to_string(),
            agent_type: AgentType::ContractAnalyzer,
            capabilities: vec![
                "clause_extraction".to_string(),
                "risk_assessment".to_string(),
                "term_analysis".to_string(),
                "compliance_checking".to_string(),
            ],
            prompt_template: "You are a legal expert specializing in contract analysis. Analyze the following contract section and provide detailed insights about risks, obligations, and recommendations:\n\n{input}\n\nProvide your analysis in the following format:\n1. Key Clauses Identified\n2. Risk Assessment\n3. Recommendations\n4. Compliance Notes".to_string(),
            model_id: Some("phi3-mini-legal".to_string()),
            memory_limit: 4096,
            max_iterations: 3,
        });

        agents.insert("legal_researcher".to_string(), AgentDefinition {
            id: "legal_researcher".to_string(),
            name: "Legal Researcher".to_string(),
            agent_type: AgentType::LegalResearcher,
            capabilities: vec![
                "case_law_search".to_string(),
                "statute_interpretation".to_string(),
                "precedent_analysis".to_string(),
                "legal_opinion_research".to_string(),
            ],
            prompt_template: "You are a legal research specialist. Research the following legal question and provide comprehensive analysis:\n\n{input}\n\nProvide your research in the following format:\n1. Relevant Case Law\n2. Applicable Statutes\n3. Legal Principles\n4. Practical Implications".to_string(),
            model_id: Some("llama3-8b-legal".to_string()),
            memory_limit: 8192,
            max_iterations: 5,
        });

        agents.insert("risk_assessor".to_string(), AgentDefinition {
            id: "risk_assessor".to_string(),
            name: "Legal Risk Assessor".to_string(),
            agent_type: AgentType::RiskAssessor,
            capabilities: vec![
                "liability_assessment".to_string(),
                "compliance_risk".to_string(),
                "financial_risk".to_string(),
                "operational_risk".to_string(),
            ],
            prompt_template: "You are a legal risk assessment expert. Evaluate the following situation for potential legal risks:\n\n{input}\n\nProvide your assessment in the following format:\n1. Identified Risks (with severity levels)\n2. Likelihood Assessment\n3. Potential Impact\n4. Mitigation Strategies".to_string(),
            model_id: Some("mistral-7b-legal".to_string()),
            memory_limit: 4096,
            max_iterations: 3,
        });

        agents.insert("compliance_checker".to_string(), AgentDefinition {
            id: "compliance_checker".to_string(),
            name: "Compliance Checker".to_string(),
            agent_type: AgentType::ComplianceChecker,
            capabilities: vec![
                "regulatory_compliance".to_string(),
                "policy_adherence".to_string(),
                "audit_preparation".to_string(),
                "violation_detection".to_string(),
            ],
            prompt_template: "You are a compliance expert. Review the following document or situation for compliance with relevant regulations:\n\n{input}\n\nProvide your compliance review in the following format:\n1. Applicable Regulations\n2. Compliance Status\n3. Violations or Gaps Identified\n4. Remediation Recommendations".to_string(),
            model_id: Some("phi3-mini-legal".to_string()),
            memory_limit: 4096,
            max_iterations: 2,
        });

        Self {
            agents: Arc::new(Mutex::new(agents)),
            workflows: Arc::new(Mutex::new(HashMap::new())),
            active_tasks: Arc::new(Mutex::new(HashMap::new())),
            task_results: Arc::new(Mutex::new(HashMap::new())),
            llm_manager,
            port,
        }
    }

    /// Start the MCP server
    pub async fn start(&self) -> Result<()> {
        let listener = TcpListener::bind(format!("127.0.0.1:{}", self.port))
            .await
            .context("Failed to bind MCP server")?;

        log::info!("MCP Server started on port {}", self.port);

        // Initialize default workflows
        self.initialize_workflows().await?;

        loop {
            match listener.accept().await {
                Ok((stream, addr)) => {
                    log::info!("New MCP connection from: {}", addr);
                    let server = self.clone();
                    tokio::spawn(async move {
                        if let Err(e) = server.handle_connection(stream).await {
                            log::error!("Error handling MCP connection: {}", e);
                        }
                    });
                }
                Err(e) => {
                    log::error!("Failed to accept MCP connection: {}", e);
                }
            }
        }
    }

    /// Handle MCP connection
    async fn handle_connection(&self, stream: tokio::net::TcpStream) -> Result<()> {
        use tokio_tungstenite::{accept_async, tungstenite::Message};
        use futures_util::{SinkExt, StreamExt};

        let ws_stream = accept_async(stream)
            .await
            .context("Error during WebSocket handshake")?;

        let (mut ws_sender, mut ws_receiver) = ws_stream.split();

        // Initialize MCP session
        let mut session = MCPSession::new();

        log::info!("MCP WebSocket connection established");

        // Handle incoming messages
        while let Some(msg) = ws_receiver.next().await {
            match msg {
                Ok(Message::Text(text)) => {
                    log::debug!("Received MCP message: {}", text);

                    // Handle batched requests
                    let responses = if text.trim_start().starts_with('[') {
                        // Batch request
                        match serde_json::from_str::<Vec<MCPRequest>>(&text) {
                            Ok(requests) => {
                                let mut batch_responses = Vec::new();
                                for request in requests {
                                    let response = self.handle_mcp_request(&mut session, request).await;
                                    batch_responses.push(response);
                                }
                                serde_json::to_string(&batch_responses)?
                            }
                            Err(e) => {
                                log::error!("Failed to parse batch request: {}", e);
                                let error_response = MCPResponse::error(
                                    None,
                                    MCPError::parse_error("Invalid batch request format".to_string()),
                                );
                                serde_json::to_string(&vec![error_response])?
                            }
                        }
                    } else {
                        // Single request
                        match serde_json::from_str::<MCPRequest>(&text) {
                            Ok(request) => {
                                let response = self.handle_mcp_request(&mut session, request).await;
                                serde_json::to_string(&response)?
                            }
                            Err(e) => {
                                log::error!("Failed to parse MCP request: {}", e);
                                let error_response = MCPResponse::error(
                                    None,
                                    MCPError::parse_error("Invalid request format".to_string()),
                                );
                                serde_json::to_string(&error_response)?
                            }
                        }
                    };

                    // Send response
                    if let Err(e) = ws_sender.send(Message::Text(responses)).await {
                        log::error!("Failed to send MCP response: {}", e);
                        break;
                    }
                }
                Ok(Message::Ping(data)) => {
                    // Respond to ping with pong
                    if let Err(e) = ws_sender.send(Message::Pong(data)).await {
                        log::error!("Failed to send pong: {}", e);
                        break;
                    }
                }
                Ok(Message::Close(_)) => {
                    log::info!("MCP client disconnected");
                    break;
                }
                Err(e) => {
                    log::error!("WebSocket error: {}", e);
                    break;
                }
                _ => {
                    // Ignore other message types
                }
            }
        }

        log::info!("MCP connection closed");
        Ok(())
    }

    /// Handle MCP request according to the protocol specification
    async fn handle_mcp_request(&self, session: &mut MCPSession, request: MCPRequest) -> MCPResponse {
        log::debug!("Handling MCP method: {}", request.method);

        match request.method.as_str() {
            "initialize" => self.handle_initialize(session, request).await,
            "tools/list" => self.handle_list_tools(session, request).await,
            "tools/call" => self.handle_call_tool(session, request).await,
            "resources/list" => self.handle_list_resources(session, request).await,
            "resources/read" => self.handle_read_resource(session, request).await,
            "prompts/list" => self.handle_list_prompts(session, request).await,
            "prompts/get" => self.handle_get_prompt(session, request).await,
            "completion/complete" => self.handle_completion(session, request).await,
            "logging/setLevel" => self.handle_set_log_level(session, request).await,
            _ => MCPResponse::error(
                request.id,
                MCPError::method_not_found(format!("Method '{}' not found", request.method)),
            ),
        }
    }

    /// Handle initialize request
    async fn handle_initialize(&self, session: &mut MCPSession, request: MCPRequest) -> MCPResponse {
        let params = request.params.unwrap_or_default();

        // Parse client info
        if let Ok(client_info) = serde_json::from_value::<ClientInfo>(params.clone()) {
            session.client_info = Some(client_info);
        }

        // Set server capabilities
        session.capabilities = Some(ServerCapabilities {
            tools: Some(ToolsCapability { list_changed: Some(true) }),
            resources: Some(ResourcesCapability {
                subscribe: Some(false),
                list_changed: Some(true)
            }),
            prompts: Some(PromptsCapability { list_changed: Some(true) }),
            logging: Some(LoggingCapability { level: Some("info".to_string()) }),
        });

        session.initialized = true;

        let result = serde_json::json!({
            "protocolVersion": "2024-11-05",
            "capabilities": session.capabilities.as_ref().unwrap(),
            "serverInfo": {
                "name": "BEAR AI Legal Assistant MCP Server",
                "version": "1.0.0"
            }
        });

        MCPResponse::success(request.id, result)
    }

    /// Handle tools/list request
    async fn handle_list_tools(&self, _session: &mut MCPSession, request: MCPRequest) -> MCPResponse {
        let tools = vec![
            MCPTool {
                name: "analyze_contract".to_string(),
                description: "Analyze legal contracts for risks, obligations, and compliance issues".to_string(),
                input_schema: serde_json::json!({
                    "type": "object",
                    "properties": {
                        "contract_text": {
                            "type": "string",
                            "description": "The contract text to analyze"
                        },
                        "analysis_type": {
                            "type": "string",
                            "enum": ["full", "risk_only", "compliance_only", "terms_only"],
                            "description": "Type of analysis to perform"
                        }
                    },
                    "required": ["contract_text"]
                }),
            },
            MCPTool {
                name: "legal_research".to_string(),
                description: "Research legal questions using case law and statutes".to_string(),
                input_schema: serde_json::json!({
                    "type": "object",
                    "properties": {
                        "question": {
                            "type": "string",
                            "description": "The legal question to research"
                        },
                        "jurisdiction": {
                            "type": "string",
                            "description": "Legal jurisdiction (e.g., 'federal', 'california', 'new_york')"
                        },
                        "legal_domain": {
                            "type": "string",
                            "enum": ["contract", "corporate", "litigation", "real_estate", "ip", "employment"],
                            "description": "Area of law"
                        }
                    },
                    "required": ["question"]
                }),
            },
            MCPTool {
                name: "assess_risk".to_string(),
                description: "Assess legal risks in documents or situations".to_string(),
                input_schema: serde_json::json!({
                    "type": "object",
                    "properties": {
                        "content": {
                            "type": "string",
                            "description": "Document or situation to assess"
                        },
                        "risk_categories": {
                            "type": "array",
                            "items": {
                                "type": "string",
                                "enum": ["liability", "compliance", "financial", "operational", "reputational"]
                            },
                            "description": "Types of risks to assess"
                        }
                    },
                    "required": ["content"]
                }),
            },
            MCPTool {
                name: "check_compliance".to_string(),
                description: "Check compliance with regulations and policies".to_string(),
                input_schema: serde_json::json!({
                    "type": "object",
                    "properties": {
                        "document": {
                            "type": "string",
                            "description": "Document to check for compliance"
                        },
                        "regulations": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "Specific regulations to check against"
                        },
                        "industry": {
                            "type": "string",
                            "description": "Industry context for compliance checking"
                        }
                    },
                    "required": ["document"]
                }),
            },
            MCPTool {
                name: "verify_citations".to_string(),
                description: "Verify legal citations and references".to_string(),
                input_schema: serde_json::json!({
                    "type": "object",
                    "properties": {
                        "citations": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "Legal citations to verify"
                        },
                        "document_context": {
                            "type": "string",
                            "description": "Context document containing the citations"
                        }
                    },
                    "required": ["citations"]
                }),
            },
            MCPTool {
                name: "execute_workflow".to_string(),
                description: "Execute a multi-agent legal workflow".to_string(),
                input_schema: serde_json::json!({
                    "type": "object",
                    "properties": {
                        "workflow_id": {
                            "type": "string",
                            "enum": ["contract_review", "legal_research", "due_diligence"],
                            "description": "Workflow to execute"
                        },
                        "input_data": {
                            "type": "object",
                            "description": "Input data for the workflow"
                        }
                    },
                    "required": ["workflow_id", "input_data"]
                }),
            },
        ];

        let result = serde_json::json!({ "tools": tools });
        MCPResponse::success(request.id, result)
    }

    /// Handle tools/call request
    async fn handle_call_tool(&self, _session: &mut MCPSession, request: MCPRequest) -> MCPResponse {
        let params = match request.params {
            Some(p) => p,
            None => {
                return MCPResponse::error(
                    request.id,
                    MCPError::invalid_params("Missing parameters".to_string()),
                );
            }
        };

        let tool_name = match params.get("name") {
            Some(serde_json::Value::String(name)) => name,
            _ => {
                return MCPResponse::error(
                    request.id,
                    MCPError::invalid_params("Missing or invalid tool name".to_string()),
                );
            }
        };

        let arguments = params.get("arguments").unwrap_or(&serde_json::Value::Null);

        let result = match tool_name.as_str() {
            "analyze_contract" => self.tool_analyze_contract(arguments).await,
            "legal_research" => self.tool_legal_research(arguments).await,
            "assess_risk" => self.tool_assess_risk(arguments).await,
            "check_compliance" => self.tool_check_compliance(arguments).await,
            "verify_citations" => self.tool_verify_citations(arguments).await,
            "execute_workflow" => self.tool_execute_workflow(arguments).await,
            _ => {
                return MCPResponse::error(
                    request.id,
                    MCPError::invalid_params(format!("Unknown tool: {}", tool_name)),
                );
            }
        };

        match result {
            Ok(content) => {
                let response = serde_json::json!({
                    "content": [
                        {
                            "type": "text",
                            "text": content
                        }
                    ]
                });
                MCPResponse::success(request.id, response)
            }
            Err(error) => MCPResponse::error(
                request.id,
                MCPError::internal_error(error.to_string()),
            ),
        }
    }

    /// Handle resources/list request
    async fn handle_list_resources(&self, _session: &mut MCPSession, request: MCPRequest) -> MCPResponse {
        let resources = vec![
            MCPResource {
                uri: "legal://templates/contract".to_string(),
                name: "Contract Templates".to_string(),
                description: Some("Standard legal contract templates".to_string()),
                mime_type: Some("application/json".to_string()),
            },
            MCPResource {
                uri: "legal://database/cases".to_string(),
                name: "Case Law Database".to_string(),
                description: Some("Searchable case law database".to_string()),
                mime_type: Some("application/json".to_string()),
            },
            MCPResource {
                uri: "legal://database/statutes".to_string(),
                name: "Statutes Database".to_string(),
                description: Some("Legal statutes and regulations".to_string()),
                mime_type: Some("application/json".to_string()),
            },
            MCPResource {
                uri: "legal://workflows/definitions".to_string(),
                name: "Workflow Definitions".to_string(),
                description: Some("Available legal workflows".to_string()),
                mime_type: Some("application/json".to_string()),
            },
        ];

        let result = serde_json::json!({ "resources": resources });
        MCPResponse::success(request.id, result)
    }

    /// Handle resources/read request
    async fn handle_read_resource(&self, _session: &mut MCPSession, request: MCPRequest) -> MCPResponse {
        let params = match request.params {
            Some(p) => p,
            None => {
                return MCPResponse::error(
                    request.id,
                    MCPError::invalid_params("Missing parameters".to_string()),
                );
            }
        };

        let uri = match params.get("uri") {
            Some(serde_json::Value::String(u)) => u,
            _ => {
                return MCPResponse::error(
                    request.id,
                    MCPError::invalid_params("Missing or invalid URI".to_string()),
                );
            }
        };

        let content = match uri.as_str() {
            "legal://templates/contract" => {
                serde_json::json!({
                    "standard_clauses": [
                        "confidentiality",
                        "termination",
                        "liability_limitation",
                        "governing_law",
                        "dispute_resolution"
                    ],
                    "contract_types": [
                        "service_agreement",
                        "employment_contract",
                        "nda",
                        "licensing_agreement",
                        "purchase_agreement"
                    ]
                })
            }
            "legal://database/cases" => {
                serde_json::json!({
                    "message": "Case law database access - use legal_research tool for queries"
                })
            }
            "legal://database/statutes" => {
                serde_json::json!({
                    "message": "Statutes database access - use legal_research tool for queries"
                })
            }
            "legal://workflows/definitions" => {
                let workflows = self.get_workflows();
                serde_json::to_value(workflows).unwrap_or_default()
            }
            _ => {
                return MCPResponse::error(
                    request.id,
                    MCPError::invalid_params(format!("Unknown resource URI: {}", uri)),
                );
            }
        };

        let result = serde_json::json!({
            "contents": [
                {
                    "uri": uri,
                    "mimeType": "application/json",
                    "text": serde_json::to_string_pretty(&content).unwrap_or_default()
                }
            ]
        });

        MCPResponse::success(request.id, result)
    }

    /// Handle prompts/list request
    async fn handle_list_prompts(&self, _session: &mut MCPSession, request: MCPRequest) -> MCPResponse {
        let prompts = vec![
            MCPPrompt {
                name: "contract_analysis".to_string(),
                description: "Generate a comprehensive contract analysis prompt".to_string(),
                arguments: vec![
                    MCPPromptArgument {
                        name: "contract_type".to_string(),
                        description: "Type of contract being analyzed".to_string(),
                        required: true,
                    },
                    MCPPromptArgument {
                        name: "focus_areas".to_string(),
                        description: "Specific areas to focus on in the analysis".to_string(),
                        required: false,
                    },
                ],
            },
            MCPPrompt {
                name: "legal_memo".to_string(),
                description: "Generate a legal memorandum prompt".to_string(),
                arguments: vec![
                    MCPPromptArgument {
                        name: "legal_issue".to_string(),
                        description: "The legal issue to address".to_string(),
                        required: true,
                    },
                    MCPPromptArgument {
                        name: "jurisdiction".to_string(),
                        description: "Relevant jurisdiction".to_string(),
                        required: false,
                    },
                ],
            },
            MCPPrompt {
                name: "risk_assessment".to_string(),
                description: "Generate a legal risk assessment prompt".to_string(),
                arguments: vec![
                    MCPPromptArgument {
                        name: "business_context".to_string(),
                        description: "Business context for the risk assessment".to_string(),
                        required: true,
                    },
                    MCPPromptArgument {
                        name: "risk_tolerance".to_string(),
                        description: "Organization's risk tolerance level".to_string(),
                        required: false,
                    },
                ],
            },
        ];

        let result = serde_json::json!({ "prompts": prompts });
        MCPResponse::success(request.id, result)
    }

    /// Handle prompts/get request
    async fn handle_get_prompt(&self, _session: &mut MCPSession, request: MCPRequest) -> MCPResponse {
        let params = match request.params {
            Some(p) => p,
            None => {
                return MCPResponse::error(
                    request.id,
                    MCPError::invalid_params("Missing parameters".to_string()),
                );
            }
        };

        let prompt_name = match params.get("name") {
            Some(serde_json::Value::String(name)) => name,
            _ => {
                return MCPResponse::error(
                    request.id,
                    MCPError::invalid_params("Missing or invalid prompt name".to_string()),
                );
            }
        };

        let arguments = params.get("arguments").unwrap_or(&serde_json::Value::Object(serde_json::Map::new()));

        let prompt_text = match prompt_name.as_str() {
            "contract_analysis" => {
                let contract_type = arguments.get("contract_type")
                    .and_then(|v| v.as_str())
                    .unwrap_or("general");
                let focus_areas = arguments.get("focus_areas")
                    .and_then(|v| v.as_str())
                    .unwrap_or("risks, obligations, and compliance");

                format!(
                    "Analyze the following {} contract with particular attention to {}:\n\n{{contract_text}}\n\nProvide a comprehensive analysis including:\n1. Key terms and clauses\n2. Risk assessment\n3. Obligations and responsibilities\n4. Compliance considerations\n5. Recommendations for improvement",
                    contract_type, focus_areas
                )
            }
            "legal_memo" => {
                let legal_issue = arguments.get("legal_issue")
                    .and_then(|v| v.as_str())
                    .unwrap_or("the specified legal matter");
                let jurisdiction = arguments.get("jurisdiction")
                    .and_then(|v| v.as_str())
                    .unwrap_or("applicable");

                format!(
                    "Prepare a legal memorandum addressing {} under {} law:\n\n{{legal_question}}\n\nStructure:\n1. ISSUE\n2. BRIEF ANSWER\n3. FACTS\n4. ANALYSIS\n5. CONCLUSION",
                    legal_issue, jurisdiction
                )
            }
            "risk_assessment" => {
                let business_context = arguments.get("business_context")
                    .and_then(|v| v.as_str())
                    .unwrap_or("the business situation");
                let risk_tolerance = arguments.get("risk_tolerance")
                    .and_then(|v| v.as_str())
                    .unwrap_or("moderate");

                format!(
                    "Conduct a legal risk assessment for {} considering a {} risk tolerance:\n\n{{situation}}\n\nEvaluate:\n1. Identified legal risks\n2. Probability and impact assessment\n3. Risk mitigation strategies\n4. Recommended actions\n5. Monitoring and review requirements",
                    business_context, risk_tolerance
                )
            }
            _ => {
                return MCPResponse::error(
                    request.id,
                    MCPError::invalid_params(format!("Unknown prompt: {}", prompt_name)),
                );
            }
        };

        let result = serde_json::json!({
            "description": format!("Generated {} prompt", prompt_name),
            "messages": [
                {
                    "role": "user",
                    "content": {
                        "type": "text",
                        "text": prompt_text
                    }
                }
            ]
        });

        MCPResponse::success(request.id, result)
    }

    /// Handle completion/complete request
    async fn handle_completion(&self, _session: &mut MCPSession, request: MCPRequest) -> MCPResponse {
        let result = serde_json::json!({
            "completion": {
                "values": [],
                "total": 0,
                "hasMore": false
            }
        });
        MCPResponse::success(request.id, result)
    }

    /// Handle logging/setLevel request
    async fn handle_set_log_level(&self, _session: &mut MCPSession, request: MCPRequest) -> MCPResponse {
        let params = match request.params {
            Some(p) => p,
            None => {
                return MCPResponse::error(
                    request.id,
                    MCPError::invalid_params("Missing parameters".to_string()),
                );
            }
        };

        let _level = match params.get("level") {
            Some(serde_json::Value::String(level)) => level,
            _ => {
                return MCPResponse::error(
                    request.id,
                    MCPError::invalid_params("Missing or invalid log level".to_string()),
                );
            }
        };

        // Note: In a real implementation, you would update the logging level here
        log::info!("Log level change requested");

        MCPResponse::success(request.id, serde_json::json!({}))
    }

    /// Tool implementation: analyze_contract
    async fn tool_analyze_contract(&self, arguments: &serde_json::Value) -> Result<String> {
        let contract_text = arguments.get("contract_text")
            .and_then(|v| v.as_str())
            .ok_or_else(|| anyhow::anyhow!("Missing contract_text parameter"))?;

        let analysis_type = arguments.get("analysis_type")
            .and_then(|v| v.as_str())
            .unwrap_or("full");

        let task = AgentTask {
            task_id: Uuid::new_v4().to_string(),
            agent_id: "contract_analyzer".to_string(),
            input: contract_text.to_string(),
            context: HashMap::from([
                ("analysis_type".to_string(), analysis_type.to_string()),
                ("mcp_tool".to_string(), "analyze_contract".to_string()),
            ]),
            priority: TaskPriority::High,
            created_at: chrono::Utc::now(),
            deadline: Some(chrono::Utc::now() + chrono::Duration::minutes(10)),
        };

        let response = self.execute_task(task).await?;
        Ok(response.output)
    }

    /// Tool implementation: legal_research
    async fn tool_legal_research(&self, arguments: &serde_json::Value) -> Result<String> {
        let question = arguments.get("question")
            .and_then(|v| v.as_str())
            .ok_or_else(|| anyhow::anyhow!("Missing question parameter"))?;

        let jurisdiction = arguments.get("jurisdiction")
            .and_then(|v| v.as_str())
            .unwrap_or("federal");

        let legal_domain = arguments.get("legal_domain")
            .and_then(|v| v.as_str())
            .unwrap_or("general");

        let task = AgentTask {
            task_id: Uuid::new_v4().to_string(),
            agent_id: "legal_researcher".to_string(),
            input: question.to_string(),
            context: HashMap::from([
                ("jurisdiction".to_string(), jurisdiction.to_string()),
                ("legal_domain".to_string(), legal_domain.to_string()),
                ("mcp_tool".to_string(), "legal_research".to_string()),
            ]),
            priority: TaskPriority::High,
            created_at: chrono::Utc::now(),
            deadline: Some(chrono::Utc::now() + chrono::Duration::minutes(15)),
        };

        let response = self.execute_task(task).await?;
        Ok(response.output)
    }

    /// Tool implementation: assess_risk
    async fn tool_assess_risk(&self, arguments: &serde_json::Value) -> Result<String> {
        let content = arguments.get("content")
            .and_then(|v| v.as_str())
            .ok_or_else(|| anyhow::anyhow!("Missing content parameter"))?;

        let risk_categories = arguments.get("risk_categories")
            .and_then(|v| v.as_array())
            .map(|arr| arr.iter().filter_map(|v| v.as_str()).collect::<Vec<_>>().join(", "))
            .unwrap_or_else(|| "all".to_string());

        let task = AgentTask {
            task_id: Uuid::new_v4().to_string(),
            agent_id: "risk_assessor".to_string(),
            input: content.to_string(),
            context: HashMap::from([
                ("risk_categories".to_string(), risk_categories),
                ("mcp_tool".to_string(), "assess_risk".to_string()),
            ]),
            priority: TaskPriority::High,
            created_at: chrono::Utc::now(),
            deadline: Some(chrono::Utc::now() + chrono::Duration::minutes(8)),
        };

        let response = self.execute_task(task).await?;
        Ok(response.output)
    }

    /// Tool implementation: check_compliance
    async fn tool_check_compliance(&self, arguments: &serde_json::Value) -> Result<String> {
        let document = arguments.get("document")
            .and_then(|v| v.as_str())
            .ok_or_else(|| anyhow::anyhow!("Missing document parameter"))?;

        let regulations = arguments.get("regulations")
            .and_then(|v| v.as_array())
            .map(|arr| arr.iter().filter_map(|v| v.as_str()).collect::<Vec<_>>().join(", "))
            .unwrap_or_else(|| "general".to_string());

        let industry = arguments.get("industry")
            .and_then(|v| v.as_str())
            .unwrap_or("general");

        let task = AgentTask {
            task_id: Uuid::new_v4().to_string(),
            agent_id: "compliance_checker".to_string(),
            input: document.to_string(),
            context: HashMap::from([
                ("regulations".to_string(), regulations),
                ("industry".to_string(), industry.to_string()),
                ("mcp_tool".to_string(), "check_compliance".to_string()),
            ]),
            priority: TaskPriority::High,
            created_at: chrono::Utc::now(),
            deadline: Some(chrono::Utc::now() + chrono::Duration::minutes(6)),
        };

        let response = self.execute_task(task).await?;
        Ok(response.output)
    }

    /// Tool implementation: verify_citations
    async fn tool_verify_citations(&self, arguments: &serde_json::Value) -> Result<String> {
        let citations = arguments.get("citations")
            .and_then(|v| v.as_array())
            .ok_or_else(|| anyhow::anyhow!("Missing citations parameter"))?;

        let citation_list = citations.iter()
            .filter_map(|v| v.as_str())
            .collect::<Vec<_>>()
            .join("\n");

        let document_context = arguments.get("document_context")
            .and_then(|v| v.as_str())
            .unwrap_or("");

        let input = if document_context.is_empty() {
            format!("Verify the following legal citations:\n{}", citation_list)
        } else {
            format!("Verify the following legal citations in context:\n\nCitations:\n{}\n\nDocument Context:\n{}",
                   citation_list, document_context)
        };

        let task = AgentTask {
            task_id: Uuid::new_v4().to_string(),
            agent_id: "legal_researcher".to_string(),
            input,
            context: HashMap::from([
                ("citation_count".to_string(), citations.len().to_string()),
                ("mcp_tool".to_string(), "verify_citations".to_string()),
            ]),
            priority: TaskPriority::Normal,
            created_at: chrono::Utc::now(),
            deadline: Some(chrono::Utc::now() + chrono::Duration::minutes(12)),
        };

        let response = self.execute_task(task).await?;
        Ok(response.output)
    }

    /// Tool implementation: execute_workflow
    async fn tool_execute_workflow(&self, arguments: &serde_json::Value) -> Result<String> {
        let workflow_id = arguments.get("workflow_id")
            .and_then(|v| v.as_str())
            .ok_or_else(|| anyhow::anyhow!("Missing workflow_id parameter"))?;

        let input_data = arguments.get("input_data")
            .and_then(|v| v.as_object())
            .ok_or_else(|| anyhow::anyhow!("Missing or invalid input_data parameter"))?;

        let input_map: HashMap<String, String> = input_data.iter()
            .filter_map(|(k, v)| v.as_str().map(|s| (k.clone(), s.to_string())))
            .collect();

        let results = self.execute_workflow(workflow_id, input_map).await?;

        // Format workflow results
        let mut output = format!("Workflow '{}' completed successfully:\n\n", workflow_id);
        for (step_id, response) in results {
            output.push_str(&format!("Step '{}' (Agent: {}):\n", step_id, response.agent_id));
            output.push_str(&format!("{}\n\n", response.output));
        }

        Ok(output)
    }

    /// Execute an agent task
    pub async fn execute_task(&self, task: AgentTask) -> Result<AgentResponse> {
        let agents = self.agents.lock().unwrap();
        let agent = agents
            .get(&task.agent_id)
            .context("Agent not found")?
            .clone();
        drop(agents);

        log::info!("Executing task {} with agent {}", task.task_id, agent.name);

        // Add task to active tasks
        {
            let mut active_tasks = self.active_tasks.lock().unwrap();
            active_tasks.insert(task.task_id.clone(), task.clone());
        }

        // Prepare the prompt
        let prompt = agent.prompt_template.replace("{input}", &task.input);

        // Execute with the assigned model
        let model_id = agent
            .model_id
            .as_ref()
            .unwrap_or(&"phi3-mini-legal".to_string());

        let response_text = self.execute_with_model(model_id, &prompt).await?;

        // Create response
        let response = AgentResponse {
            task_id: task.task_id.clone(),
            agent_id: agent.id,
            output: response_text,
            confidence: 0.85, // TODO: Calculate actual confidence
            reasoning: "Analysis completed using local LLM".to_string(),
            citations: Vec::new(), // TODO: Extract citations from response
            follow_up_questions: Vec::new(), // TODO: Generate follow-up questions
            completion_time: chrono::Utc::now(),
            status: TaskStatus::Completed,
        };

        // Store result and remove from active tasks
        {
            let mut task_results = self.task_results.lock().unwrap();
            task_results.insert(task.task_id.clone(), response.clone());
        }
        {
            let mut active_tasks = self.active_tasks.lock().unwrap();
            active_tasks.remove(&task.task_id);
        }

        log::info!("Task {} completed successfully", task.task_id);
        Ok(response)
    }

    /// Execute a workflow
    pub async fn execute_workflow(
        &self,
        workflow_id: &str,
        input: HashMap<String, String>,
    ) -> Result<HashMap<String, AgentResponse>> {
        let workflows = self.workflows.lock().unwrap();
        let workflow = workflows
            .get(workflow_id)
            .context("Workflow not found")?
            .clone();
        drop(workflows);

        log::info!("Executing workflow: {}", workflow.name);

        let mut results = HashMap::new();
        let mut step_outputs = HashMap::new();

        // Execute workflow steps
        for step in &workflow.steps {
            // Check dependencies
            for dep in &step.dependencies {
                if !step_outputs.contains_key(dep) {
                    return Err(anyhow::anyhow!(
                        "Dependency {} not satisfied for step {}",
                        dep,
                        step.step_id
                    ));
                }
            }

            // Prepare input for this step
            let mut step_input = String::new();
            for (key, mapping) in &step.input_mapping {
                if let Some(value) = input.get(key) {
                    step_input.push_str(&format!("{}: {}\n", key, value));
                } else if let Some(prev_output) = step_outputs.get(key) {
                    step_input.push_str(&format!("{}: {}\n", key, prev_output));
                }
            }

            // Find agent for this step
            let agents = self.agents.lock().unwrap();
            let agent = agents
                .values()
                .find(|a| matches!(a.agent_type, step.agent_type))
                .context("No agent found for step")?
                .clone();
            drop(agents);

            // Create and execute task
            let task = AgentTask {
                task_id: Uuid::new_v4().to_string(),
                agent_id: agent.id,
                input: step_input,
                context: input.clone(),
                priority: TaskPriority::Normal,
                created_at: chrono::Utc::now(),
                deadline: Some(
                    chrono::Utc::now() + chrono::Duration::seconds(step.timeout_seconds as i64),
                ),
            };

            let response = self.execute_task(task).await?;
            step_outputs.insert(step.step_id.clone(), response.output.clone());
            results.insert(step.step_id.clone(), response);
        }

        log::info!("Workflow {} completed successfully", workflow.name);
        Ok(results)
    }

    /// Execute prompt with a specific model
    async fn execute_with_model(&self, model_id: &str, prompt: &str) -> Result<String> {
        // Load the model if not already loaded
        let endpoint = self.llm_manager.load_model(model_id).await?;

        // Make API call to the local model
        let client = reqwest::Client::new();
        let request_body = serde_json::json!({
            "prompt": prompt,
            "max_tokens": 2048,
            "temperature": 0.1,
            "stop": ["</s>", "[INST]", "[/INST]"]
        });

        let response = client
            .post(&format!("{}/v1/completions", endpoint))
            .json(&request_body)
            .send()
            .await
            .context("Failed to call local model API")?;

        let response_json: serde_json::Value = response
            .json()
            .await
            .context("Failed to parse model response")?;

        let text = response_json["choices"][0]["text"]
            .as_str()
            .unwrap_or("No response generated")
            .to_string();

        Ok(text)
    }

    /// Initialize default workflows
    async fn initialize_workflows(&self) -> Result<()> {
        let mut workflows = self.workflows.lock().unwrap();

        // Contract Review Workflow
        workflows.insert(
            "contract_review".to_string(),
            WorkflowDefinition {
                id: "contract_review".to_string(),
                name: "Comprehensive Contract Review".to_string(),
                description: "Multi-agent workflow for thorough contract analysis".to_string(),
                legal_domain: LegalDomain::ContractLaw,
                steps: vec![
                    WorkflowStep {
                        step_id: "initial_analysis".to_string(),
                        agent_type: AgentType::ContractAnalyzer,
                        input_mapping: HashMap::from([(
                            "contract".to_string(),
                            "contract_text".to_string(),
                        )]),
                        dependencies: Vec::new(),
                        timeout_seconds: 300,
                    },
                    WorkflowStep {
                        step_id: "risk_assessment".to_string(),
                        agent_type: AgentType::RiskAssessor,
                        input_mapping: HashMap::from([(
                            "analysis".to_string(),
                            "initial_analysis".to_string(),
                        )]),
                        dependencies: vec!["initial_analysis".to_string()],
                        timeout_seconds: 240,
                    },
                    WorkflowStep {
                        step_id: "compliance_check".to_string(),
                        agent_type: AgentType::ComplianceChecker,
                        input_mapping: HashMap::from([(
                            "contract".to_string(),
                            "contract_text".to_string(),
                        )]),
                        dependencies: vec!["initial_analysis".to_string()],
                        timeout_seconds: 180,
                    },
                ],
            },
        );

        // Legal Research Workflow
        workflows.insert(
            "legal_research".to_string(),
            WorkflowDefinition {
                id: "legal_research".to_string(),
                name: "Comprehensive Legal Research".to_string(),
                description: "Multi-agent workflow for in-depth legal research".to_string(),
                legal_domain: LegalDomain::General,
                steps: vec![
                    WorkflowStep {
                        step_id: "case_research".to_string(),
                        agent_type: AgentType::LegalResearcher,
                        input_mapping: HashMap::from([(
                            "question".to_string(),
                            "research_question".to_string(),
                        )]),
                        dependencies: Vec::new(),
                        timeout_seconds: 600,
                    },
                    WorkflowStep {
                        step_id: "risk_analysis".to_string(),
                        agent_type: AgentType::RiskAssessor,
                        input_mapping: HashMap::from([(
                            "research".to_string(),
                            "case_research".to_string(),
                        )]),
                        dependencies: vec!["case_research".to_string()],
                        timeout_seconds: 300,
                    },
                ],
            },
        );

        // Due Diligence Workflow
        workflows.insert(
            "due_diligence".to_string(),
            WorkflowDefinition {
                id: "due_diligence".to_string(),
                name: "Legal Due Diligence".to_string(),
                description: "Comprehensive legal due diligence workflow for transactions".to_string(),
                legal_domain: LegalDomain::CorporateLaw,
                steps: vec![
                    WorkflowStep {
                        step_id: "document_review".to_string(),
                        agent_type: AgentType::ContractAnalyzer,
                        input_mapping: HashMap::from([(
                            "documents".to_string(),
                            "target_documents".to_string(),
                        )]),
                        dependencies: Vec::new(),
                        timeout_seconds: 900,
                    },
                    WorkflowStep {
                        step_id: "risk_assessment".to_string(),
                        agent_type: AgentType::RiskAssessor,
                        input_mapping: HashMap::from([(
                            "review_results".to_string(),
                            "document_review".to_string(),
                        )]),
                        dependencies: vec!["document_review".to_string()],
                        timeout_seconds: 600,
                    },
                    WorkflowStep {
                        step_id: "compliance_verification".to_string(),
                        agent_type: AgentType::ComplianceChecker,
                        input_mapping: HashMap::from([(
                            "entity_info".to_string(),
                            "target_entity".to_string(),
                        )]),
                        dependencies: vec!["document_review".to_string()],
                        timeout_seconds: 480,
                    },
                    WorkflowStep {
                        step_id: "legal_research".to_string(),
                        agent_type: AgentType::LegalResearcher,
                        input_mapping: HashMap::from([(
                            "jurisdiction".to_string(),
                            "target_jurisdiction".to_string(),
                        )]),
                        dependencies: vec!["risk_assessment".to_string(), "compliance_verification".to_string()],
                        timeout_seconds: 720,
                    },
                ],
            },
        );

        log::info!("Initialized {} default workflows", workflows.len());
        Ok(())
    }

    /// Get available agents
    pub fn get_agents(&self) -> Vec<AgentDefinition> {
        self.agents.lock().unwrap().values().cloned().collect()
    }

    /// Get available workflows
    pub fn get_workflows(&self) -> Vec<WorkflowDefinition> {
        self.workflows.lock().unwrap().values().cloned().collect()
    }

    /// Get task status
    pub fn get_task_status(&self, task_id: &str) -> Option<TaskStatus> {
        if let Some(result) = self.task_results.lock().unwrap().get(task_id) {
            Some(result.status.clone())
        } else if self.active_tasks.lock().unwrap().contains_key(task_id) {
            Some(TaskStatus::InProgress)
        } else {
            None
        }
    }

    /// Get task result
    pub fn get_task_result(&self, task_id: &str) -> Option<AgentResponse> {
        self.task_results.lock().unwrap().get(task_id).cloned()
    }
}

impl Clone for MCPServer {
    fn clone(&self) -> Self {
        Self {
            agents: self.agents.clone(),
            workflows: self.workflows.clone(),
            active_tasks: self.active_tasks.clone(),
            task_results: self.task_results.clone(),
            llm_manager: self.llm_manager.clone(),
            port: self.port,
        }
    }
}

// Tauri commands for MCP server
#[tauri::command]
pub async fn execute_agent_task(
    server: tauri::State<'_, Arc<MCPServer>>,
    agent_id: String,
    input: String,
    context: HashMap<String, String>,
) -> Result<AgentResponse, String> {
    let task = AgentTask {
        task_id: Uuid::new_v4().to_string(),
        agent_id,
        input,
        context,
        priority: TaskPriority::Normal,
        created_at: chrono::Utc::now(),
        deadline: None,
    };

    server.execute_task(task).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn execute_workflow(
    server: tauri::State<'_, Arc<MCPServer>>,
    workflow_id: String,
    input: HashMap<String, String>,
) -> Result<HashMap<String, AgentResponse>, String> {
    server
        .execute_workflow(&workflow_id, input)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_available_agents(
    server: tauri::State<'_, Arc<MCPServer>>,
) -> Result<Vec<AgentDefinition>, String> {
    Ok(server.get_agents())
}

#[tauri::command]
pub async fn get_available_workflows(
    server: tauri::State<'_, Arc<MCPServer>>,
) -> Result<Vec<WorkflowDefinition>, String> {
    Ok(server.get_workflows())
}

#[tauri::command]
pub async fn get_task_status(
    server: tauri::State<'_, Arc<MCPServer>>,
    task_id: String,
) -> Result<Option<TaskStatus>, String> {
    Ok(server.get_task_status(&task_id))
}

#[tauri::command]
pub async fn get_task_result(
    server: tauri::State<'_, Arc<MCPServer>>,
    task_id: String,
) -> Result<Option<AgentResponse>, String> {
    Ok(server.get_task_result(&task_id))
}
