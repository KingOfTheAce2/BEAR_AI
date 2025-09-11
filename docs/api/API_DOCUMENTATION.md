# BEAR AI API Documentation

## Table of Contents

1. [API Overview](#api-overview)
2. [Authentication](#authentication)
3. [Workflow API](#workflow-api)
4. [Agent Management API](#agent-management-api)
5. [Model Management API](#model-management-api)
6. [Document Processing API](#document-processing-api)
7. [Security API](#security-api)
8. [Plugin API](#plugin-api)
9. [Monitoring and Analytics API](#monitoring-and-analytics-api)
10. [WebSocket API](#websocket-api)

## API Overview

BEAR AI provides a comprehensive Local REST API for programmatic access to all system features. The API operates entirely locally with no network dependencies, ensuring complete privacy and security.

### Base Configuration

```yaml
# Local API Configuration
api:
  version: "v1"
  base_url: "http://127.0.0.1:8000"
  protocol: "HTTP/1.1"
  format: "application/json"
  network_access: false  # Offline-only operation
  
# Security
security:
  authentication: "bearer_token"
  rate_limiting: true
  cors_enabled: false
  air_gap_mode: true  # No external connections
  
# Features
features:
  rest_api: true
  websocket: true
  streaming: true
  batch_processing: true
```

### API Standards

- **RESTful Design**: Standard HTTP methods and status codes
- **JSON Format**: All requests and responses use JSON
- **Idempotent Operations**: Safe retry mechanisms
- **Error Handling**: Comprehensive error responses with details
- **Versioning**: API versioning for backward compatibility
- **Rate Limiting**: Configurable request throttling

### HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 202 | Accepted | Request accepted for processing |
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Authentication required |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource conflict |
| 422 | Unprocessable Entity | Validation errors |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |
| 503 | Service Unavailable | Service temporarily unavailable |

## Authentication

### Bearer Token Authentication

BEAR AI uses bearer token authentication for API access:

```bash
# Obtain token
curl -X POST http://127.0.0.1:8000/api/v1/auth/token \
  -H "Content-Type: application/json" \
  -d '{
    "username": "your_username",
    "password": "your_password"
  }'

# Response
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 3600
}
```

```bash
# Use token in requests
curl -X GET http://127.0.0.1:8000/api/v1/workflows \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Authentication Endpoints

#### POST /api/v1/auth/token

Generate access token for API authentication.

**Request:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "access_token": "string",
  "token_type": "bearer",
  "expires_in": 3600,
  "refresh_token": "string"
}
```

#### POST /api/v1/auth/refresh

Refresh an expired access token.

**Request:**
```json
{
  "refresh_token": "string"
}
```

**Response:**
```json
{
  "access_token": "string", 
  "token_type": "bearer",
  "expires_in": 3600
}
```

#### POST /api/v1/auth/logout

Revoke access token and log out.

**Request:**
```json
{
  "token": "string"
}
```

**Response:**
```json
{
  "message": "Successfully logged out"
}
```

## Workflow API

### Workflow Management

#### POST /api/v1/workflows

Create and execute a new workflow.

**Request:**
```json
{
  "name": "Legal Document Review",
  "description": "Comprehensive legal document analysis workflow",
  "steps": [
    {
      "id": "extract_text",
      "name": "Extract Text",
      "type": "document_processing",
      "agent": "document_processor",
      "parameters": {
        "ocr_enabled": true,
        "preserve_formatting": true
      }
    },
    {
      "id": "analyze_content",
      "name": "Analyze Content",
      "type": "llm_generation",
      "agent": "legal_analyzer",
      "depends_on": ["extract_text"],
      "parameters": {
        "prompt_template": "legal_analysis",
        "max_tokens": 2000,
        "temperature": 0.3
      }
    },
    {
      "id": "validate_results",
      "name": "Validate Results", 
      "type": "validation",
      "agent": "validator",
      "depends_on": ["analyze_content"],
      "parameters": {
        "validation_criteria": {
          "min_length": 500,
          "required_sections": ["summary", "risks", "recommendations"]
        }
      }
    }
  ],
  "configuration": {
    "timeout": 300,
    "retry_attempts": 3,
    "parallel_execution": true
  }
}
```

**Response:**
```json
{
  "workflow_id": "wf_12345678-1234-1234-1234-123456789012",
  "status": "running",
  "created_at": "2024-01-15T14:30:22Z",
  "estimated_completion": "2024-01-15T14:35:22Z",
  "steps_total": 3,
  "steps_completed": 0,
  "execution_url": "/api/v1/workflows/wf_12345678-1234-1234-1234-123456789012"
}
```

#### GET /api/v1/workflows

List all workflows with filtering and pagination.

**Query Parameters:**
- `status`: Filter by status (running, completed, failed, cancelled)
- `limit`: Number of results per page (default: 20, max: 100)
- `offset`: Pagination offset (default: 0)
- `sort_by`: Sort field (created_at, updated_at, name)
- `sort_order`: Sort direction (asc, desc)

**Request:**
```bash
GET /api/v1/workflows?status=running&limit=10&offset=0&sort_by=created_at&sort_order=desc
```

**Response:**
```json
{
  "workflows": [
    {
      "workflow_id": "wf_12345678-1234-1234-1234-123456789012",
      "name": "Legal Document Review",
      "status": "running",
      "created_at": "2024-01-15T14:30:22Z",
      "updated_at": "2024-01-15T14:32:15Z",
      "progress": {
        "steps_completed": 2,
        "steps_total": 3,
        "percentage": 67
      },
      "estimated_completion": "2024-01-15T14:35:22Z"
    }
  ],
  "pagination": {
    "total": 15,
    "limit": 10,
    "offset": 0,
    "has_more": true
  }
}
```

#### GET /api/v1/workflows/{workflow_id}

Get detailed information about a specific workflow.

**Response:**
```json
{
  "workflow_id": "wf_12345678-1234-1234-1234-123456789012",
  "name": "Legal Document Review",
  "description": "Comprehensive legal document analysis workflow",
  "status": "completed",
  "created_at": "2024-01-15T14:30:22Z",
  "completed_at": "2024-01-15T14:35:45Z",
  "execution_time": 323.5,
  "steps": [
    {
      "id": "extract_text",
      "name": "Extract Text",
      "status": "completed",
      "started_at": "2024-01-15T14:30:23Z",
      "completed_at": "2024-01-15T14:31:15Z",
      "execution_time": 52.3,
      "agent": "document_processor",
      "result": {
        "pages_processed": 15,
        "text_length": 12500,
        "confidence_score": 0.95
      }
    },
    {
      "id": "analyze_content",
      "name": "Analyze Content",
      "status": "completed",
      "started_at": "2024-01-15T14:31:15Z",
      "completed_at": "2024-01-15T14:34:22Z",
      "execution_time": 187.2,
      "agent": "legal_analyzer",
      "result": {
        "analysis_length": 2500,
        "key_points": 12,
        "risks_identified": 3,
        "recommendations": 8
      }
    }
  ],
  "results": {
    "summary": "Document analysis completed successfully",
    "key_findings": [
      "Contract contains standard liability clauses",
      "Payment terms favor counterparty",
      "Termination clauses require review"
    ],
    "risk_assessment": {
      "overall_risk": "medium",
      "primary_concerns": [
        "Extended payment terms",
        "Limited termination rights"
      ]
    },
    "recommendations": [
      "Negotiate shorter payment terms",
      "Add termination for convenience clause",
      "Review indemnification provisions"
    ]
  },
  "metadata": {
    "documents_processed": 1,
    "total_tokens_used": 15000,
    "agents_involved": 3,
    "cost_estimate": "$0.45"
  }
}
```

#### PUT /api/v1/workflows/{workflow_id}

Update workflow configuration or pause/resume execution.

**Request:**
```json
{
  "action": "pause",  // pause, resume, cancel
  "configuration": {
    "timeout": 600,
    "retry_attempts": 5
  }
}
```

**Response:**
```json
{
  "workflow_id": "wf_12345678-1234-1234-1234-123456789012",
  "status": "paused",
  "message": "Workflow paused successfully"
}
```

#### DELETE /api/v1/workflows/{workflow_id}

Cancel and delete a workflow.

**Response:**
```json
{
  "message": "Workflow cancelled and deleted successfully",
  "workflow_id": "wf_12345678-1234-1234-1234-123456789012"
}
```

### Workflow Templates

#### GET /api/v1/workflow-templates

List available workflow templates.

**Response:**
```json
{
  "templates": [
    {
      "template_id": "legal_document_review",
      "name": "Legal Document Review",
      "description": "Comprehensive review and analysis of legal documents",
      "category": "legal",
      "steps_count": 5,
      "estimated_time": "5-10 minutes",
      "required_agents": ["document_processor", "legal_analyzer", "validator"]
    },
    {
      "template_id": "contract_comparison",
      "name": "Contract Comparison",
      "description": "Compare two contracts and identify differences",
      "category": "legal",
      "steps_count": 4,
      "estimated_time": "3-7 minutes",
      "required_agents": ["document_processor", "comparison_analyzer"]
    }
  ]
}
```

#### POST /api/v1/workflows/from-template

Create workflow from template.

**Request:**
```json
{
  "template_id": "legal_document_review",
  "name": "Q1 Contract Review",
  "parameters": {
    "document_type": "service_agreement",
    "analysis_depth": "comprehensive",
    "include_risk_assessment": true
  },
  "configuration": {
    "timeout": 600,
    "priority": "high"
  }
}
```

## Agent Management API

### Agent Operations

#### GET /api/v1/agents

List all available agents with their current status.

**Query Parameters:**
- `type`: Filter by agent type (coordinator, executor, validator, monitor)
- `status`: Filter by status (active, idle, busy, offline)
- `capabilities`: Filter by capabilities (comma-separated)

**Response:**
```json
{
  "agents": [
    {
      "agent_id": "agent_12345678-1234-1234-1234-123456789012",
      "name": "Legal Analysis Specialist",
      "type": "executor",
      "status": "idle",
      "capabilities": [
        "legal_analysis",
        "contract_review",
        "risk_assessment",
        "regulatory_compliance"
      ],
      "specializations": [
        "corporate_law",
        "contract_law",
        "intellectual_property"
      ],
      "performance_metrics": {
        "tasks_completed": 247,
        "tasks_failed": 3,
        "success_rate": 0.988,
        "average_response_time": 4.2,
        "uptime": "99.5%"
      },
      "current_load": 0,
      "max_concurrent_tasks": 5,
      "created_at": "2024-01-10T09:15:30Z",
      "last_active": "2024-01-15T14:25:18Z"
    }
  ],
  "summary": {
    "total_agents": 12,
    "active_agents": 8,
    "busy_agents": 3,
    "idle_agents": 5,
    "offline_agents": 4
  }
}
```

#### GET /api/v1/agents/{agent_id}

Get detailed information about a specific agent.

**Response:**
```json
{
  "agent_id": "agent_12345678-1234-1234-1234-123456789012",
  "name": "Legal Analysis Specialist",
  "description": "Specialized agent for legal document analysis and review",
  "type": "executor",
  "status": "active",
  "version": "2.1.0",
  "capabilities": [
    {
      "name": "legal_analysis",
      "description": "Analyze legal documents for key terms and issues",
      "confidence": 0.95,
      "parameters": {
        "supported_document_types": ["contracts", "agreements", "legal_briefs"],
        "languages": ["en", "es", "fr"],
        "max_document_size": "50MB"
      }
    }
  ],
  "specializations": [
    "corporate_law",
    "contract_law",
    "intellectual_property"
  ],
  "configuration": {
    "model": "mistral-7b-legal-v2",
    "temperature": 0.3,
    "max_tokens": 4000,
    "context_window": 8192,
    "memory_limit": "4GB",
    "timeout": 300
  },
  "performance_metrics": {
    "lifetime_stats": {
      "tasks_completed": 1247,
      "tasks_failed": 18,
      "success_rate": 0.986,
      "total_execution_time": 15420.5
    },
    "recent_performance": {
      "last_24h_tasks": 23,
      "average_response_time": 4.2,
      "error_rate": 0.014,
      "throughput": "5.2 tasks/hour"
    },
    "resource_usage": {
      "cpu_utilization": "45%",
      "memory_usage": "2.8GB / 4GB",
      "gpu_utilization": "78%"
    }
  },
  "current_tasks": [
    {
      "task_id": "task_87654321",
      "workflow_id": "wf_12345678",
      "started_at": "2024-01-15T14:30:15Z",
      "estimated_completion": "2024-01-15T14:34:30Z",
      "progress": 0.65
    }
  ],
  "health_status": {
    "status": "healthy",
    "last_health_check": "2024-01-15T14:29:45Z",
    "issues": []
  }
}
```

#### POST /api/v1/agents

Create a new agent instance.

**Request:**
```json
{
  "name": "Contract Review Specialist",
  "type": "executor",
  "specializations": [
    "contract_review",
    "legal_analysis",
    "risk_assessment"
  ],
  "capabilities": [
    {
      "name": "contract_analysis",
      "confidence": 0.9,
      "parameters": {
        "supported_formats": ["pdf", "docx", "txt"],
        "max_file_size": "25MB"
      }
    }
  ],
  "configuration": {
    "model": "mistral-7b-legal-v2",
    "temperature": 0.2,
    "max_tokens": 2000,
    "memory_limit": "2GB",
    "timeout": 180
  },
  "auto_start": true
}
```

**Response:**
```json
{
  "agent_id": "agent_98765432-1234-1234-1234-123456789012",
  "name": "Contract Review Specialist",
  "status": "initializing",
  "message": "Agent created successfully and starting up",
  "estimated_ready_time": "2024-01-15T14:32:00Z"
}
```

#### PUT /api/v1/agents/{agent_id}

Update agent configuration or control agent state.

**Request:**
```json
{
  "action": "update_config",  // update_config, start, stop, restart
  "configuration": {
    "temperature": 0.4,
    "max_tokens": 3000,
    "timeout": 240
  },
  "capabilities": [
    {
      "name": "advanced_legal_analysis",
      "confidence": 0.95,
      "parameters": {
        "analysis_depth": "comprehensive"
      }
    }
  ]
}
```

**Response:**
```json
{
  "agent_id": "agent_98765432-1234-1234-1234-123456789012",
  "status": "updated",
  "message": "Agent configuration updated successfully",
  "restart_required": false
}
```

#### DELETE /api/v1/agents/{agent_id}

Stop and remove an agent instance.

**Response:**
```json
{
  "message": "Agent stopped and removed successfully",
  "agent_id": "agent_98765432-1234-1234-1234-123456789012",
  "final_status": {
    "tasks_completed": 15,
    "uptime": "2h 45m",
    "last_activity": "2024-01-15T14:30:22Z"
  }
}
```

### Agent Coordination

#### POST /api/v1/agents/coordinate

Create agent coordination session for collaborative tasks.

**Request:**
```json
{
  "session_name": "Complex Legal Analysis",
  "coordinator_agent": "coordinator_001",
  "participating_agents": [
    "legal_analyzer_001",
    "risk_assessor_001", 
    "compliance_checker_001",
    "document_processor_001"
  ],
  "coordination_strategy": "hierarchical",  // hierarchical, mesh, pipeline
  "shared_context": {
    "case_type": "merger_acquisition",
    "jurisdiction": "delaware",
    "urgency": "high"
  },
  "configuration": {
    "timeout": 1800,
    "allow_agent_communication": true,
    "shared_memory_enabled": true
  }
}
```

**Response:**
```json
{
  "session_id": "coord_11111111-2222-3333-4444-555555555555",
  "status": "active",
  "coordinator": "coordinator_001",
  "participants": 4,
  "created_at": "2024-01-15T14:30:00Z",
  "communication_channels": {
    "broadcast": "session_broadcast_001",
    "direct_messaging": true,
    "shared_memory": "session_memory_001"
  }
}
```

## Model Management API

### Model Operations

#### GET /api/v1/models

List available AI models.

**Query Parameters:**
- `status`: Filter by status (loaded, available, downloading, failed)
- `type`: Filter by model type (language, embedding, classification)
- `size`: Filter by size range (small, medium, large, xlarge)

**Response:**
```json
{
  "models": [
    {
      "model_id": "mistral-7b-instruct-q4",
      "name": "Mistral 7B Instruct Q4",
      "description": "7B parameter instruction-following model, 4-bit quantized",
      "type": "language_model",
      "size": {
        "parameters": "7B",
        "disk_size": "4.2GB",
        "memory_requirement": "6GB"
      },
      "status": "loaded",
      "capabilities": [
        "text_generation",
        "instruction_following",
        "conversation",
        "analysis"
      ],
      "performance": {
        "tokens_per_second": 24.5,
        "context_length": 8192,
        "quality_score": 8.7
      },
      "metadata": {
        "provider": "mistralai",
        "license": "apache-2.0",
        "last_updated": "2024-01-10T00:00:00Z",
        "download_url": "huggingface.co/mistralai/Mistral-7B-Instruct-v0.2"
      }
    }
  ],
  "summary": {
    "total_models": 8,
    "loaded_models": 3,
    "available_models": 5,
    "total_disk_usage": "32.1GB",
    "total_memory_usage": "18.5GB"
  }
}
```

#### GET /api/v1/models/{model_id}

Get detailed information about a specific model.

**Response:**
```json
{
  "model_id": "mistral-7b-instruct-q4",
  "name": "Mistral 7B Instruct Q4",
  "description": "7B parameter instruction-following model optimized for legal and business use cases",
  "type": "language_model",
  "version": "0.2",
  "status": "loaded",
  "file_path": "/models/mistral-7b-instruct-q4.gguf",
  "size": {
    "parameters": "7,241,732,096",
    "disk_size": "4,237,891,584",
    "memory_usage": "6,442,450,944",
    "context_length": 8192
  },
  "quantization": {
    "method": "Q4_0",
    "bits_per_weight": 4.5,
    "compression_ratio": 0.28
  },
  "performance_metrics": {
    "load_time": 12.5,
    "tokens_per_second": 24.5,
    "first_token_latency": 0.85,
    "memory_efficiency": 0.92,
    "throughput_score": 8.3
  },
  "capabilities": [
    {
      "name": "text_generation",
      "description": "Generate coherent text continuations",
      "confidence": 0.95
    },
    {
      "name": "instruction_following",
      "description": "Follow complex instructions and prompts",
      "confidence": 0.92
    },
    {
      "name": "legal_analysis",
      "description": "Analyze legal documents and contracts",
      "confidence": 0.88
    }
  ],
  "configuration": {
    "default_temperature": 0.7,
    "max_tokens": 2048,
    "top_p": 0.9,
    "top_k": 40,
    "repeat_penalty": 1.1
  },
  "usage_statistics": {
    "total_tokens_generated": 1247829,
    "total_requests": 3421,
    "average_tokens_per_request": 365,
    "total_processing_time": "45h 32m 18s"
  },
  "health_status": {
    "status": "healthy",
    "last_health_check": "2024-01-15T14:29:30Z",
    "performance_degradation": 0.02,
    "memory_leaks": false,
    "error_rate": 0.001
  }
}
```

#### POST /api/v1/models/load

Load a model into memory for use.

**Request:**
```json
{
  "model_id": "mistral-7b-instruct-q4",
  "configuration": {
    "gpu_layers": 35,
    "context_length": 4096,
    "batch_size": 512,
    "threading": {
      "num_threads": 8,
      "batch_threads": 8
    }
  },
  "priority": "high",
  "preload_cache": true
}
```

**Response:**
```json
{
  "model_id": "mistral-7b-instruct-q4",
  "status": "loading",
  "load_progress": 0,
  "estimated_load_time": 15.2,
  "message": "Model loading initiated",
  "load_job_id": "load_87654321"
}
```

#### POST /api/v1/models/unload

Unload a model from memory.

**Request:**
```json
{
  "model_id": "mistral-7b-instruct-q4",
  "force": false,
  "save_cache": true
}
```

**Response:**
```json
{
  "model_id": "mistral-7b-instruct-q4",
  "status": "unloaded",
  "memory_freed": "6.2GB",
  "message": "Model unloaded successfully"
}
```

#### POST /api/v1/models/{model_id}/generate

Generate text using a specific model.

**Request:**
```json
{
  "prompt": "Analyze the following contract clause for potential risks:\n\n[CONTRACT CLAUSE TEXT]",
  "parameters": {
    "max_tokens": 1000,
    "temperature": 0.3,
    "top_p": 0.9,
    "top_k": 40,
    "repeat_penalty": 1.1,
    "stop_sequences": ["\\n\\n", "---"]
  },
  "stream": false,
  "include_usage": true
}
```

**Response:**
```json
{
  "model_id": "mistral-7b-instruct-q4",
  "generated_text": "After analyzing the provided contract clause, I have identified several potential risks:\n\n1. **Liability Exposure**: The clause contains broad indemnification language that could expose your organization to unlimited liability...",
  "usage": {
    "prompt_tokens": 150,
    "completion_tokens": 485,
    "total_tokens": 635
  },
  "performance": {
    "generation_time": 4.2,
    "tokens_per_second": 115.5,
    "first_token_latency": 0.12
  },
  "metadata": {
    "request_id": "req_12345678",
    "timestamp": "2024-01-15T14:30:22Z",
    "model_version": "0.2",
    "finished_reason": "stop"
  }
}
```

#### GET /api/v1/models/recommendations

Get model recommendations based on hardware and use case.

**Query Parameters:**
- `use_case`: Intended use case (legal_analysis, document_processing, general)
- `hardware_profile`: Hardware profile (laptop, desktop, workstation, server)
- `performance_priority`: Priority (speed, quality, balanced)

**Response:**
```json
{
  "hardware_profile": {
    "detected_hardware": {
      "cpu": "Intel i7-12700K",
      "ram": "32GB",
      "gpu": "NVIDIA RTX 4070",
      "storage": "NVMe SSD"
    },
    "performance_class": "high_end_desktop"
  },
  "recommendations": [
    {
      "model_id": "mistral-7b-instruct-q4",
      "recommendation_score": 9.2,
      "reasoning": "Optimal balance of performance and quality for legal analysis",
      "expected_performance": {
        "tokens_per_second": 24.5,
        "memory_usage": "6GB",
        "quality_rating": 8.7
      },
      "suitability": {
        "legal_analysis": 9.0,
        "document_processing": 8.5,
        "general_tasks": 8.8
      }
    }
  ],
  "alternative_options": [
    {
      "model_id": "llama-2-7b-chat-q4",
      "recommendation_score": 8.5,
      "reasoning": "Good alternative with strong conversation abilities",
      "trade_offs": "Slightly lower legal domain performance"
    }
  ]
}
```

## Document Processing API

### Document Upload and Processing

#### POST /api/v1/documents/upload

Upload documents for processing.

**Request (multipart/form-data):**
```bash
curl -X POST http://127.0.0.1:8000/api/v1/documents/upload \
  -H "Authorization: Bearer <token>" \
  -F "files=@contract1.pdf" \
  -F "files=@contract2.docx" \
  -F "processing_options={
    \"extract_text\": true,
    \"ocr_enabled\": true,
    \"pii_detection\": true,
    \"format_preservation\": true
  }"
```

**Response:**
```json
{
  "upload_session_id": "upload_12345678-1234-1234-1234-123456789012",
  "documents": [
    {
      "document_id": "doc_11111111-1111-1111-1111-111111111111",
      "filename": "contract1.pdf",
      "size": 2547891,
      "type": "application/pdf",
      "status": "processing",
      "estimated_completion": "2024-01-15T14:32:30Z"
    },
    {
      "document_id": "doc_22222222-2222-2222-2222-222222222222",
      "filename": "contract2.docx", 
      "size": 856432,
      "type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "status": "processing",
      "estimated_completion": "2024-01-15T14:31:45Z"
    }
  ],
  "processing_options": {
    "extract_text": true,
    "ocr_enabled": true,
    "pii_detection": true,
    "format_preservation": true
  }
}
```

#### GET /api/v1/documents

List uploaded documents with filtering options.

**Query Parameters:**
- `status`: Filter by status (processing, completed, failed)
- `type`: Filter by document type (pdf, docx, txt, etc.)
- `uploaded_after`: Filter by upload date (ISO 8601)
- `limit`: Number of results (default: 20, max: 100)
- `offset`: Pagination offset

**Response:**
```json
{
  "documents": [
    {
      "document_id": "doc_11111111-1111-1111-1111-111111111111",
      "filename": "contract1.pdf",
      "original_filename": "Service Agreement - Q1 2024.pdf",
      "size": 2547891,
      "type": "application/pdf",
      "status": "completed",
      "uploaded_at": "2024-01-15T14:30:00Z",
      "processed_at": "2024-01-15T14:32:15Z",
      "processing_time": 135.2,
      "metadata": {
        "pages": 15,
        "word_count": 3420,
        "language": "en",
        "pii_detected": 12,
        "classification": "legal_contract"
      }
    }
  ],
  "pagination": {
    "total": 45,
    "limit": 20,
    "offset": 0,
    "has_more": true
  }
}
```

#### GET /api/v1/documents/{document_id}

Get detailed information about a specific document.

**Response:**
```json
{
  "document_id": "doc_11111111-1111-1111-1111-111111111111",
  "filename": "contract1.pdf",
  "original_filename": "Service Agreement - Q1 2024.pdf",
  "size": 2547891,
  "type": "application/pdf",
  "status": "completed",
  "uploaded_at": "2024-01-15T14:30:00Z",
  "processed_at": "2024-01-15T14:32:15Z",
  "processing_time": 135.2,
  "content": {
    "text": "SERVICE AGREEMENT\n\nThis Service Agreement (\"Agreement\") is entered into...",
    "pages": 15,
    "word_count": 3420,
    "character_count": 18750,
    "language": "en",
    "structure": {
      "sections": [
        {
          "title": "1. DEFINITIONS",
          "page": 1,
          "content_preview": "For purposes of this Agreement, the following terms..."
        }
      ],
      "tables": 3,
      "images": 2
    }
  },
  "analysis": {
    "document_type": "service_agreement",
    "confidence": 0.95,
    "key_entities": [
      {
        "entity": "Company A Corp",
        "type": "organization",
        "mentions": 15
      },
      {
        "entity": "2024-03-15",
        "type": "date",
        "mentions": 3
      }
    ],
    "legal_concepts": [
      "liability",
      "indemnification", 
      "intellectual_property",
      "termination"
    ]
  },
  "security": {
    "pii_detection": {
      "enabled": true,
      "items_detected": 12,
      "categories": {
        "names": 8,
        "addresses": 2,
        "phone_numbers": 1,
        "email_addresses": 1
      },
      "scrubbed": true
    },
    "classification": "confidential",
    "access_level": "restricted"
  },
  "processing_logs": [
    {
      "timestamp": "2024-01-15T14:30:15Z",
      "step": "text_extraction",
      "status": "completed",
      "duration": 45.2
    },
    {
      "timestamp": "2024-01-15T14:31:00Z",
      "step": "pii_detection",
      "status": "completed",
      "duration": 32.1
    }
  ]
}
```

#### GET /api/v1/documents/{document_id}/content

Get processed document content with formatting options.

**Query Parameters:**
- `format`: Output format (text, markdown, html, json)
- `include_metadata`: Include processing metadata
- `pii_handling`: PII handling (scrubbed, original, masked)

**Response:**
```json
{
  "document_id": "doc_11111111-1111-1111-1111-111111111111",
  "format": "text",
  "content": "SERVICE AGREEMENT\n\nThis Service Agreement (\"Agreement\") is entered into on [DATE] between [COMPANY_NAME] and [CLIENT_NAME]...",
  "metadata": {
    "pages": 15,
    "word_count": 3420,
    "pii_items_scrubbed": 12,
    "processing_timestamp": "2024-01-15T14:32:15Z"
  }
}
```

#### POST /api/v1/documents/{document_id}/analyze

Analyze a document with specific analysis types.

**Request:**
```json
{
  "analysis_types": [
    "legal_review",
    "risk_assessment", 
    "compliance_check",
    "entity_extraction"
  ],
  "parameters": {
    "legal_review": {
      "focus_areas": ["liability", "termination", "payment"],
      "jurisdiction": "delaware",
      "analysis_depth": "comprehensive"
    },
    "risk_assessment": {
      "risk_categories": ["financial", "legal", "operational"],
      "severity_threshold": "medium"
    }
  },
  "output_format": "detailed_report"
}
```

**Response:**
```json
{
  "analysis_id": "analysis_87654321-4321-4321-4321-210987654321",
  "document_id": "doc_11111111-1111-1111-1111-111111111111",
  "status": "processing",
  "analysis_types": ["legal_review", "risk_assessment", "compliance_check", "entity_extraction"],
  "estimated_completion": "2024-01-15T14:40:00Z",
  "results_url": "/api/v1/documents/doc_11111111-1111-1111-1111-111111111111/analysis/analysis_87654321-4321-4321-4321-210987654321"
}
```

## Security API

### PII Detection and Protection

#### POST /api/v1/security/pii/detect

Detect personally identifiable information in text.

**Request:**
```json
{
  "text": "John Smith's email is john.smith@company.com and his SSN is 123-45-6789. He lives at 123 Main Street, New York, NY 10001.",
  "detection_config": {
    "sensitivity": "high",
    "custom_patterns": [
      {
        "name": "employee_id",
        "pattern": "EMP\\d{6}",
        "confidence": 0.9
      }
    ],
    "exclude_types": [],
    "include_context": true
  }
}
```

**Response:**
```json
{
  "detection_id": "detect_12345678-1234-1234-1234-123456789012",
  "text_length": 147,
  "pii_items": [
    {
      "type": "person_name",
      "value": "John Smith",
      "start_pos": 0,
      "end_pos": 10,
      "confidence": 0.95,
      "context": "John Smith's email is",
      "severity": "medium"
    },
    {
      "type": "email_address",
      "value": "john.smith@company.com",
      "start_pos": 23,
      "end_pos": 45,
      "confidence": 1.0,
      "context": "email is john.smith@company.com and his",
      "severity": "high"
    },
    {
      "type": "ssn",
      "value": "123-45-6789",
      "start_pos": 58,
      "end_pos": 69,
      "confidence": 1.0,
      "context": "and his SSN is 123-45-6789. He lives",
      "severity": "high"
    },
    {
      "type": "address",
      "value": "123 Main Street, New York, NY 10001",
      "start_pos": 84,
      "end_pos": 120,
      "confidence": 0.98,
      "context": "He lives at 123 Main Street, New York, NY 10001.",
      "severity": "medium"
    }
  ],
  "summary": {
    "total_items": 4,
    "high_risk_items": 2,
    "medium_risk_items": 2,
    "low_risk_items": 0,
    "overall_risk_score": 0.87
  },
  "recommendations": [
    "Scrub high-risk PII items before processing",
    "Consider additional protection for SSN data",
    "Review data handling policies for email addresses"
  ]
}
```

#### POST /api/v1/security/pii/scrub

Scrub PII from text with configurable replacement strategies.

**Request:**
```json
{
  "text": "John Smith's email is john.smith@company.com and his SSN is 123-45-6789.",
  "scrubbing_config": {
    "strategy": "replace_with_tokens",  // replace_with_tokens, hash, redact, anonymize
    "preserve_structure": true,
    "custom_replacements": {
      "person_name": "[CLIENT_NAME]",
      "email_address": "[EMAIL_ADDRESS]",
      "ssn": "[SSN]"
    },
    "hash_algorithm": "sha256",
    "include_mapping": true
  }
}
```

**Response:**
```json
{
  "scrubbing_id": "scrub_98765432-4321-4321-4321-123456789012",
  "original_length": 74,
  "scrubbed_text": "[CLIENT_NAME]'s email is [EMAIL_ADDRESS] and his SSN is [SSN].",
  "scrubbed_length": 63,
  "items_scrubbed": 3,
  "scrubbing_summary": [
    {
      "type": "person_name",
      "original_value": "[REDACTED]",
      "replacement": "[CLIENT_NAME]",
      "position": "0-10"
    },
    {
      "type": "email_address",
      "original_value": "[REDACTED]",
      "replacement": "[EMAIL_ADDRESS]", 
      "position": "23-45"
    },
    {
      "type": "ssn",
      "original_value": "[REDACTED]",
      "replacement": "[SSN]",
      "position": "58-69"
    }
  ],
  "reverse_mapping": {
    "enabled": true,
    "mapping_id": "map_11111111-2222-3333-4444-555555555555",
    "expiry": "2024-01-22T14:30:00Z"
  },
  "audit_trail": {
    "processed_at": "2024-01-15T14:30:00Z",
    "processing_time": 0.125,
    "user_id": "user_12345",
    "compliance_flags": ["GDPR", "HIPAA"]
  }
}
```

#### POST /api/v1/security/pii/restore

Restore original PII from scrubbed text using reverse mapping.

**Request:**
```json
{
  "scrubbed_text": "[CLIENT_NAME]'s email is [EMAIL_ADDRESS] and his SSN is [SSN].",
  "mapping_id": "map_11111111-2222-3333-4444-555555555555",
  "authorization": {
    "reason": "Legal review requires original data",
    "authorized_by": "senior_partner",
    "case_number": "CASE-2024-001"
  }
}
```

**Response:**
```json
{
  "restoration_id": "restore_55555555-5555-5555-5555-555555555555",
  "restored_text": "John Smith's email is john.smith@company.com and his SSN is 123-45-6789.",
  "items_restored": 3,
  "authorization_logged": true,
  "audit_trail": {
    "restored_at": "2024-01-15T15:15:00Z",
    "authorized_by": "senior_partner",
    "reason": "Legal review requires original data",
    "case_number": "CASE-2024-001",
    "compliance_review_required": false
  }
}
```

### Access Control and Auditing

#### GET /api/v1/security/audit-logs

Retrieve security audit logs with filtering and pagination.

**Query Parameters:**
- `start_date`: Start date for log retrieval (ISO 8601)
- `end_date`: End date for log retrieval (ISO 8601) 
- `event_type`: Filter by event type (pii_detection, document_access, user_login)
- `user_id`: Filter by specific user
- `severity`: Filter by severity (low, medium, high, critical)
- `limit`: Number of results (default: 50, max: 500)
- `offset`: Pagination offset

**Response:**
```json
{
  "audit_logs": [
    {
      "log_id": "log_12345678-1234-1234-1234-123456789012",
      "timestamp": "2024-01-15T14:30:22.123Z",
      "event_type": "pii_detection",
      "severity": "high",
      "user_id": "user_98765",
      "user_name": "jane.doe@firm.com",
      "action": "document_processing",
      "resource": "contract_review_2024.pdf",
      "details": {
        "document_id": "doc_11111111-1111-1111-1111-111111111111",
        "pii_items_detected": 12,
        "high_risk_items": 3,
        "processing_time": 45.2,
        "agent_used": "legal_analyzer_v2"
      },
      "ip_address": "127.0.0.1",
      "user_agent": "BEAR-AI-Client/2.0.0",
      "session_id": "session_87654321",
      "result": "SUCCESS",
      "risk_score": 0.87,
      "compliance_flags": ["GDPR_ARTICLE_32", "PRIVACY_PROTECTION"]
    }
  ],
  "pagination": {
    "total": 1247,
    "limit": 50,
    "offset": 0,
    "has_more": true
  },
  "summary": {
    "total_events": 1247,
    "critical_events": 5,
    "high_risk_events": 23,
    "medium_risk_events": 156,
    "low_risk_events": 1063,
    "date_range": {
      "start": "2024-01-01T00:00:00Z",
      "end": "2024-01-15T23:59:59Z"
    }
  }
}
```

#### POST /api/v1/security/access-control/validate

Validate user permissions for specific actions.

**Request:**
```json
{
  "user_id": "user_98765",
  "action": "document_analyze",
  "resource": "doc_11111111-1111-1111-1111-111111111111",
  "context": {
    "document_classification": "confidential",
    "client_matter": "matter_12345",
    "requested_analysis": "legal_review"
  }
}
```

**Response:**
```json
{
  "validation_id": "validate_11111111-1111-1111-1111-111111111111",
  "user_id": "user_98765",
  "action": "document_analyze",
  "permission_granted": true,
  "access_level": "full",
  "restrictions": [],
  "valid_until": "2024-01-15T18:30:00Z",
  "authorization_details": {
    "role": "senior_associate",
    "permissions": [
      "document_read",
      "document_analyze", 
      "workflow_create",
      "pii_access_masked"
    ],
    "client_access": ["matter_12345", "matter_67890"],
    "document_classifications": ["public", "internal", "confidential"]
  },
  "audit_logged": true,
  "session_token": "session_token_87654321"
}
```

This comprehensive API documentation provides detailed information about all BEAR AI endpoints, request/response formats, and usage examples. The API is designed to support the full functionality of BEAR AI while maintaining strict privacy and security standards.