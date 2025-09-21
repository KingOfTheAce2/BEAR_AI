// BEAR AI Local MCP Server for Agent Coordination
// This module implements a complete Model Context Protocol server for local agent management
// Provides secure, sandboxed agent execution with comprehensive monitoring and audit logging

pub mod protocol;
pub mod agent_manager;
pub mod legal_agents;
pub mod workflows;
pub mod security;
pub mod audit;
pub mod memory;
pub mod coordination;

use std::sync::Arc;
use tokio::sync::RwLock;
use dashmap::DashMap;
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc};

// Core MCP Server State
#[derive(Debug, Clone)]
pub struct McpServer {
    pub id: Uuid,
    pub agents: Arc<DashMap<Uuid, agent_manager::Agent>>,
    pub workflows: Arc<DashMap<Uuid, workflows::Workflow>>,
    pub security_context: Arc<RwLock<security::SecurityContext>>,
    pub audit_logger: Arc<audit::AuditLogger>,
    pub memory_store: Arc<memory::MemoryStore>,
    pub coordinator: Arc<coordination::AgentCoordinator>,
    pub status: Arc<RwLock<ServerStatus>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ServerStatus {
    Starting,
    Running,
    Paused,
    Stopping,
    Stopped,
    Error(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerConfig {
    pub max_agents: usize,
    pub max_memory_mb: usize,
    pub enable_sandbox: bool,
    pub audit_level: audit::AuditLevel,
    pub coordination_strategy: coordination::CoordinationStrategy,
    pub security_policy: security::SecurityPolicy,
}

impl Default for ServerConfig {
    fn default() -> Self {
        Self {
            max_agents: 50,
            max_memory_mb: 2048,
            enable_sandbox: true,
            audit_level: audit::AuditLevel::Full,
            coordination_strategy: coordination::CoordinationStrategy::Hierarchical,
            security_policy: security::SecurityPolicy::Strict,
        }
    }
}

impl McpServer {
    pub async fn new(config: ServerConfig) -> anyhow::Result<Self> {
        let server_id = Uuid::new_v4();
        let audit_logger = Arc::new(audit::AuditLogger::new(&format!("mcp_server_{}", server_id)).await?);

        // Log server initialization
        audit_logger.log_system_event(
            audit::SystemEvent::ServerStarting {
                server_id,
                config: config.clone()
            }
        ).await?;

        let security_context = Arc::new(RwLock::new(
            security::SecurityContext::new(config.security_policy.clone()).await?
        ));

        let memory_store = Arc::new(
            memory::MemoryStore::new().await?
        );

        let coordinator = Arc::new(
            coordination::AgentCoordinator::new(config.coordination_strategy.clone()).await?
        );

        Ok(Self {
            id: server_id,
            agents: Arc::new(DashMap::new()),
            workflows: Arc::new(DashMap::new()),
            security_context,
            audit_logger,
            memory_store,
            coordinator,
            status: Arc::new(RwLock::new(ServerStatus::Starting)),
        })
    }

    pub async fn start(&self) -> anyhow::Result<()> {
        {
            let mut status = self.status.write().await;
            *status = ServerStatus::Running;
        }

        self.audit_logger.log_system_event(
            audit::SystemEvent::ServerStarted {
                server_id: self.id,
                timestamp: Utc::now(),
            }
        ).await?;

        log::info!("BEAR AI MCP Server started with ID: {}", self.id);
        Ok(())
    }

    pub async fn stop(&self) -> anyhow::Result<()> {
        {
            let mut status = self.status.write().await;
            *status = ServerStatus::Stopping;
        }

        // Stop all active agents
        for agent_ref in self.agents.iter() {
            agent_ref.value().stop().await?;
        }

        // Stop coordinator
        self.coordinator.stop().await?;

        {
            let mut status = self.status.write().await;
            *status = ServerStatus::Stopped;
        }

        self.audit_logger.log_system_event(
            audit::SystemEvent::ServerStopped {
                server_id: self.id,
                timestamp: Utc::now(),
            }
        ).await?;

        log::info!("BEAR AI MCP Server stopped");
        Ok(())
    }

    pub async fn spawn_agent(&self, agent_type: legal_agents::LegalAgentType, config: agent_manager::AgentConfig) -> anyhow::Result<Uuid> {
        // Security check
        {
            let security = self.security_context.read().await;
            security.validate_agent_spawn(&agent_type, &config)?;
        }

        // Check agent limits
        if self.agents.len() >= self.config.max_agents {
            return Err(anyhow::anyhow!("Maximum agent limit reached"));
        }

        let agent = agent_manager::Agent::new(agent_type, config, self.clone()).await?;
        let agent_id = agent.id;

        // Log agent creation
        self.audit_logger.log_agent_event(
            audit::AgentEvent::AgentSpawned {
                agent_id,
                agent_type: agent.agent_type.clone(),
                timestamp: Utc::now(),
            }
        ).await?;

        // Register with coordinator
        self.coordinator.register_agent(&agent).await?;

        // Store agent
        self.agents.insert(agent_id, agent);

        log::info!("Spawned agent {} of type {:?}", agent_id, agent_type);
        Ok(agent_id)
    }

    pub async fn execute_workflow(&self, workflow: workflows::Workflow) -> anyhow::Result<workflows::WorkflowResult> {
        let workflow_id = workflow.id;

        // Security validation
        {
            let security = self.security_context.read().await;
            security.validate_workflow(&workflow)?;
        }

        // Log workflow start
        self.audit_logger.log_workflow_event(
            audit::WorkflowEvent::WorkflowStarted {
                workflow_id,
                workflow_type: workflow.workflow_type.clone(),
                timestamp: Utc::now(),
            }
        ).await?;

        // Store workflow
        self.workflows.insert(workflow_id, workflow.clone());

        // Execute through coordinator
        let result = self.coordinator.execute_workflow(workflow).await?;

        // Log workflow completion
        self.audit_logger.log_workflow_event(
            audit::WorkflowEvent::WorkflowCompleted {
                workflow_id,
                result: result.clone(),
                timestamp: Utc::now(),
            }
        ).await?;

        Ok(result)
    }

    pub async fn get_server_status(&self) -> ServerStatus {
        self.status.read().await.clone()
    }

    pub async fn get_agent_count(&self) -> usize {
        self.agents.len()
    }

    pub async fn get_workflow_count(&self) -> usize {
        self.workflows.len()
    }
}

// Export main types
pub use agent_manager::{Agent, AgentConfig, AgentStatus};
pub use legal_agents::{LegalAgentType, ContractAnalyzer, LegalResearcher, ComplianceChecker, DocumentDrafter};
pub use workflows::{Workflow, WorkflowType, WorkflowResult, WorkflowStatus};
pub use security::{SecurityContext, SecurityPolicy, PermissionLevel};
pub use audit::{AuditLogger, AuditLevel, SystemEvent, AgentEvent, WorkflowEvent};
pub use memory::{MemoryStore, MemoryEntry, MemoryQuery};
pub use coordination::{AgentCoordinator, CoordinationStrategy, CoordinationMessage};