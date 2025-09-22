# BEAR AI - Agent Role Specifications
## Multi-Agent Development Team Assignments

### Phase 1: Foundation & Integration Agents

#### Legal Architecture Lead (`legal-architecture-lead`)
**Primary Responsibilities:**
- Design overall system architecture and integration patterns
- Create Tauri-React IPC communication layer
- Define desktop application structure and data flow
- Establish security boundaries between frontend/backend

**Key Deliverables:**
- Tauri IPC communication architecture
- Component integration blueprints
- Security architecture documentation
- Performance optimization guidelines

**Memory Keys:**
- `bear-ai/architecture/tauri-integration`
- `bear-ai/architecture/ipc-patterns`
- `bear-ai/architecture/security-boundaries`

**Dependencies:** None
**Coordinates With:** `litigation-data-specialist`, `legal-workflow-designer`, `legal-security-director`

#### Litigation Data Specialist (`litigation-data-specialist`)
**Primary Responsibilities:**
- Complete OpenAI-compatible API server implementation
- Integrate Python AI models with REST endpoints
- Implement secure authentication and authorization
- Create document processing API layer

**Key Deliverables:**
- Fully functional API server with all endpoints
- Authentication middleware and JWT handling
- Document upload/processing endpoints
- Model management API integration

**Memory Keys:**
- `bear-ai/backend/api-endpoints`
- `bear-ai/backend/authentication`
- `bear-ai/backend/model-integration`

**Dependencies:** None
**Coordinates With:** `legal-architecture-lead`, `api-docs`, `legal-security-director`

### Phase 2: Core Features Agents

#### Legal Intelligence Analyst (`legal-intelligence-analyst`)
**Primary Responsibilities:**
- Implement advanced PII detection and scrubbing algorithms
- Create legal document analysis workflows
- Build RAG system for document retrieval and generation
- Develop multi-modal document processing capabilities

**Key Deliverables:**
- Production-ready PII detection system
- Legal document classification and analysis
- RAG implementation with vector storage
- Multi-format document processing pipeline

**Memory Keys:**
- `bear-ai/ml/pii-detection`
- `bear-ai/ml/legal-analysis`
- `bear-ai/ml/rag-system`

**Dependencies:** `litigation-data-specialist` 80% complete
**Coordinates With:** `legal-security-director`, `litigation-data-specialist`

#### Legal Workflow Designer (`legal-workflow-designer`)
**Primary Responsibilities:**
- Complete real-time chat interface with streaming support
- Implement professional document management UI
- Create advanced search and filtering components
- Build responsive dashboard and analytics views

**Key Deliverables:**
- Fully functional chat interface with streaming
- Document upload and management system
- Professional legal assistant UI
- Real-time status and monitoring dashboard

**Memory Keys:**
- `bear-ai/frontend/chat-interface`
- `bear-ai/frontend/document-ui`
- `bear-ai/frontend/dashboard`

**Dependencies:** `legal-architecture-lead` 90% complete
**Coordinates With:** `compliance-reviewer`, `legal-quality-analyst`, `legal-architecture-lead`

### Phase 3: Advanced Features Agents

#### Legal Security Director (`legal-security-director`)
**Primary Responsibilities:**
- Implement comprehensive audit logging system
- Set up encryption for sensitive legal documents
- Create role-based access control system
- Build compliance reporting and data governance

**Key Deliverables:**
- Complete audit logging infrastructure
- Data encryption at rest and in transit
- RBAC system for legal professionals
- GDPR/compliance reporting tools

**Memory Keys:**
- `bear-ai/security/audit-logging`
- `bear-ai/security/encryption`
- `bear-ai/security/access-control`

**Dependencies:** `litigation-data-specialist`, `legal-intelligence-analyst` 80% complete
**Coordinates With:** `litigation-data-specialist`, `code-analyzer`

#### Legal Performance Analyst (`legal-performance-analyst`)
**Primary Responsibilities:**
- Implement comprehensive performance monitoring
- Create memory optimization algorithms for AI models
- Build system resource management and alerting
- Optimize application performance across all platforms

**Key Deliverables:**
- Real-time performance monitoring dashboard
- Memory optimization for AI inference
- System resource management tools
- Performance alerting and reporting system

**Memory Keys:**
- `bear-ai/performance/monitoring`
- `bear-ai/performance/optimization`
- `bear-ai/performance/resource-management`

**Dependencies:** All previous phases 70% complete
**Coordinates With:** `memory-coordinator`, `smart-agent`

### Phase 4: Testing and Deployment Agents

#### Legal Quality Analyst (`legal-quality-analyst`)
**Primary Responsibilities:**
- Achieve >90% unit test coverage across all components
- Implement comprehensive integration testing suite
- Create end-to-end testing scenarios for legal workflows
- Set up automated testing in CI/CD pipelines

**Key Deliverables:**
- Complete unit test suite with high coverage
- Integration testing framework
- E2E test scenarios for legal use cases
- Automated testing integration

**Memory Keys:**
- `bear-ai/testing/unit-coverage`
- `bear-ai/testing/integration-suite`
- `bear-ai/testing/e2e-scenarios`

**Dependencies:** All feature development 90% complete
**Coordinates With:** `compliance-validator`, `tdd-london-swarm`

#### Compliance Deployment Lead (`compliance-deployment-lead`)
**Primary Responsibilities:**
- Finalize Windows installer and cross-platform packaging
- Set up automated deployment pipelines for all platforms
- Create release management workflows and version control
- Implement production monitoring and alerting systems

**Key Deliverables:**
- Automated installers for Windows, macOS, Linux
- Complete CI/CD pipeline with automated deployments
- Release management and versioning system
- Production monitoring and alerting infrastructure

**Memory Keys:**
- `bear-ai/deployment/installers`
- `bear-ai/deployment/cicd-pipeline`
- `bear-ai/deployment/monitoring`

**Dependencies:** Testing phase completion
**Coordinates With:** `workflow-automation`, `release-manager`

### Supporting Specialist Agents

#### Compliance Reviewer (`compliance-reviewer`)
**Responsibilities:**
- Review all changes for legal, ethical, and security compliance
- Ensure documentation and workflows align with legal practice standards
- Validate architectural decisions against regulatory requirements
- Provide feedback on performance and maintainability from a compliance perspective

**Memory Keys:**
- `bear-ai/reviews/code-quality`
- `bear-ai/reviews/security-checks`

#### API Documentation Specialist (`api-docs`)
**Responsibilities:**
- Maintain comprehensive API documentation
- Create integration guides and examples
- Document authentication and security requirements
- Generate OpenAPI specifications and client SDKs

**Memory Keys:**
- `bear-ai/docs/api-specifications`
- `bear-ai/docs/integration-guides`

#### Production Validator (`compliance-validator`)
**Responsibilities:**
- Validate production readiness across all components
- Perform load testing and stress testing
- Verify security and compliance requirements
- Validate cross-platform compatibility

**Memory Keys:**
- `bear-ai/validation/production-ready`
- `bear-ai/validation/load-testing`

### Coordination Agents

#### Task Orchestrator (`task-orchestrator`)
**Responsibilities:**
- Coordinate task dependencies and sequencing
- Monitor progress across all development phases
- Resolve conflicts and bottlenecks
- Maintain development timeline and milestones

**Memory Keys:**
- `bear-ai/coordination/task-status`
- `bear-ai/coordination/dependencies`

#### Memory Coordinator (`memory-coordinator`)
**Responsibilities:**
- Manage shared memory and cross-agent communication
- Optimize memory usage patterns
- Coordinate data sharing between agents
- Maintain memory consistency across the swarm

**Memory Keys:**
- `bear-ai/coordination/memory-management`
- `bear-ai/coordination/data-sharing`

## Agent Execution Pattern

### Standard Agent Workflow
1. **Pre-Task Setup**
   ```bash
   npx claude-flow@alpha hooks pre-task --description "[task-description]"
   npx claude-flow@alpha hooks session-restore --session-id "bear-ai-[phase]"
   ```

2. **Task Execution**
   - Read relevant memory keys for context
   - Implement assigned features/components
   - Update progress in shared memory
   - Coordinate with dependent agents

3. **Post-Task Cleanup**
   ```bash
   npx claude-flow@alpha hooks post-task --task-id "[task-id]"
   npx claude-flow@alpha hooks notify --message "Completed [task]" --agents "[next-agents]"
   ```

### Quality Gates
- All agents must achieve defined success criteria
- Code review required for all implementations
- Testing validation before phase completion
- Memory consistency checks at phase boundaries

This agent specification provides clear roles, responsibilities, and coordination patterns for successful multi-agent development of the BEAR AI Legal Assistant project.