use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::Path;
use std::sync::{Arc, Mutex};
use tokio::net::TcpListener;
use tokio::sync::mpsc;
use uuid::Uuid;

/// Local MCP (Model Context Protocol) Server for BEAR AI
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
        // TODO: Implement MCP protocol handling
        // This would handle the actual MCP message protocol
        Ok(())
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
