# BEAR AI Legal Assistant - API Specifications

## Overview

This document defines the complete Local API specification for the BEAR AI legal assistant backend services. The API operates entirely offline, following REST principles with local WebSocket connections and in-memory event handling.

## API Design Principles

1. **RESTful Design**: Standard HTTP methods and status codes
2. **Consistent Structure**: Uniform request/response formats
3. **Security First**: Authentication, authorization, and data encryption
4. **Performance**: Pagination, caching, and efficient data transfer
5. **Legal Compliance**: Audit logging and data retention policies

## Base Configuration

```typescript
// Local API Configuration (Offline-Only)
const API_CONFIG = {
  baseURL: 'http://127.0.0.1:8000/api/v1',
  timeout: 30000,
  networkAccess: false,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Offline-Mode': 'true',
  },
};

// Local WebSocket Configuration
const WS_CONFIG = {
  baseURL: 'ws://127.0.0.1:8000/ws',
  reconnectInterval: 5000,
  maxReconnectAttempts: 5,
  offlineOnly: true,
};
```

## Authentication & Authorization

### 1.1 Authentication Endpoints

#### POST /auth/login
Authenticate user and receive access token.

**Request:**
```json
{
  "email": "lawyer@firm.com",
  "password": "securepassword",
  "rememberMe": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr_123",
      "email": "lawyer@firm.com",
      "name": "John Doe",
      "role": "attorney",
      "firm": "Smith & Associates",
      "barNumber": "12345",
      "permissions": ["read", "write", "admin"]
    },
    "tokens": {
      "accessToken": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
      "refreshToken": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
      "expiresIn": 3600
    }
  }
}
```

#### POST /auth/refresh
Refresh expired access token.

**Request:**
```json
{
  "refreshToken": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

#### POST /auth/logout
Invalidate current session.

**Request:**
```json
{
  "refreshToken": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

### 1.2 Authorization Headers

All authenticated requests must include:
```http
Authorization: Bearer {access_token}
X-Client-Version: 1.0.0
X-Request-ID: req_abc123
```

## 2. Chat/Conversation API

### 2.1 Conversation Management

#### GET /conversations
List user's conversations with pagination.

**Parameters:**
- `page` (number, default: 1): Page number
- `limit` (number, default: 20, max: 100): Items per page
- `search` (string, optional): Search in conversation titles
- `sort` (enum: 'newest', 'oldest', 'updated', default: 'updated'): Sort order

**Response:**
```json
{
  "success": true,
  "data": {
    "conversations": [
      {
        "id": "conv_123",
        "title": "Contract Review - ABC Corp",
        "lastMessage": {
          "id": "msg_456",
          "content": "The contract looks good overall...",
          "timestamp": "2024-01-15T10:30:00Z",
          "type": "assistant"
        },
        "messageCount": 15,
        "createdAt": "2024-01-15T09:00:00Z",
        "updatedAt": "2024-01-15T10:30:00Z",
        "tags": ["contract", "review"],
        "caseId": "case_789",
        "isArchived": false
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "pages": 3
    }
  }
}
```

#### POST /conversations
Create new conversation.

**Request:**
```json
{
  "title": "Contract Review - XYZ Corp",
  "initialMessage": "Please review this contract for potential issues",
  "caseId": "case_456",
  "tags": ["contract", "review"]
}
```

#### GET /conversations/{conversationId}
Get conversation details.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "conv_123",
    "title": "Contract Review - ABC Corp",
    "createdAt": "2024-01-15T09:00:00Z",
    "updatedAt": "2024-01-15T10:30:00Z",
    "tags": ["contract", "review"],
    "caseId": "case_789",
    "metadata": {
      "practiceArea": "corporate",
      "priority": "high"
    }
  }
}
```

#### PUT /conversations/{conversationId}
Update conversation metadata.

**Request:**
```json
{
  "title": "Updated Contract Review - ABC Corp",
  "tags": ["contract", "review", "urgent"],
  "metadata": {
    "priority": "urgent"
  }
}
```

#### DELETE /conversations/{conversationId}
Archive/delete conversation.

### 2.2 Message Management

#### GET /conversations/{conversationId}/messages
Get messages in conversation with pagination.

**Parameters:**
- `before` (string, optional): Message ID to get messages before
- `after` (string, optional): Message ID to get messages after
- `limit` (number, default: 50, max: 100): Number of messages

**Response:**
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "msg_123",
        "conversationId": "conv_123",
        "content": "Please review this contract",
        "type": "user",
        "timestamp": "2024-01-15T10:00:00Z",
        "status": "sent",
        "attachments": [
          {
            "id": "att_456",
            "name": "contract.pdf",
            "size": 1024000,
            "type": "application/pdf",
            "url": "/documents/att_456/download"
          }
        ]
      },
      {
        "id": "msg_124",
        "conversationId": "conv_123",
        "content": "I've reviewed the contract and found several key areas that need attention...",
        "type": "assistant",
        "timestamp": "2024-01-15T10:02:00Z",
        "status": "sent",
        "metadata": {
          "confidence": 0.92,
          "processingTime": 2.4,
          "model": "bear-ai-legal-v2",
          "sources": [
            {
              "type": "case_law",
              "citation": "Smith v. Jones, 123 F.3d 456 (9th Cir. 2023)",
              "relevance": 0.85
            }
          ],
          "legalContext": ["contract law", "commercial agreements"],
          "suggestedActions": [
            "Review clause 3.2 for ambiguity",
            "Consider adding force majeure provision"
          ]
        }
      }
    ],
    "hasMore": true,
    "nextCursor": "msg_125"
  }
}
```

#### POST /conversations/{conversationId}/messages
Send new message.

**Request:**
```json
{
  "content": "What are the key risks in this contract?",
  "attachments": [
    {
      "name": "contract_v2.pdf",
      "data": "base64_encoded_file_data",
      "type": "application/pdf"
    }
  ]
}
```

**Response (Immediate):**
```json
{
  "success": true,
  "data": {
    "messageId": "msg_789",
    "status": "processing",
    "estimatedResponseTime": 3.5
  }
}
```

#### GET /conversations/{conversationId}/messages/stream
Server-Sent Events endpoint for real-time message streaming.

**Response Stream:**
```
event: message_start
data: {"messageId": "msg_124", "timestamp": "2024-01-15T10:02:00Z"}

event: message_chunk
data: {"messageId": "msg_124", "content": "I've reviewed", "isComplete": false}

event: message_chunk
data: {"messageId": "msg_124", "content": " the contract and found", "isComplete": false}

event: message_complete
data: {"messageId": "msg_124", "metadata": {...}, "isComplete": true}
```

## 3. Document Management API

### 3.1 Document CRUD Operations

#### GET /documents
List documents with filtering and pagination.

**Parameters:**
- `page` (number, default: 1): Page number
- `limit` (number, default: 20, max: 100): Items per page
- `caseId` (string, optional): Filter by case
- `clientId` (string, optional): Filter by client
- `type` (enum, optional): Filter by document type
- `tags` (array, optional): Filter by tags
- `search` (string, optional): Search in document content/title
- `sortBy` (enum: 'name', 'date', 'size', 'type', default: 'date'): Sort field
- `sortOrder` (enum: 'asc', 'desc', default: 'desc'): Sort direction
- `dateFrom` (ISO date, optional): Filter documents from date
- `dateTo` (ISO date, optional): Filter documents to date

**Response:**
```json
{
  "success": true,
  "data": {
    "documents": [
      {
        "id": "doc_123",
        "title": "Service Agreement - ABC Corp",
        "filename": "service_agreement_abc.pdf",
        "type": "contract",
        "mimeType": "application/pdf",
        "size": 2048576,
        "uploadDate": "2024-01-15T09:00:00Z",
        "lastModified": "2024-01-15T09:30:00Z",
        "version": 2,
        "tags": ["contract", "service", "abc-corp"],
        "caseId": "case_789",
        "clientId": "client_456",
        "uploadedBy": {
          "id": "usr_123",
          "name": "John Doe"
        },
        "securityClassification": "confidential",
        "annotations": {
          "count": 3,
          "lastAnnotation": "2024-01-15T09:25:00Z"
        },
        "metadata": {
          "practiceArea": "corporate",
          "jurisdiction": "california",
          "effectiveDate": "2024-01-01",
          "expirationDate": "2024-12-31"
        },
        "permissions": {
          "read": true,
          "write": true,
          "delete": false,
          "share": true
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "pages": 8
    },
    "aggregations": {
      "byType": {
        "contract": 45,
        "brief": 32,
        "correspondence": 28,
        "evidence": 25,
        "other": 20
      },
      "bySize": {
        "totalSize": 524288000,
        "averageSize": 3495253
      }
    }
  }
}
```

#### POST /documents
Upload new document.

**Request (multipart/form-data):**
```
Content-Type: multipart/form-data

--boundary
Content-Disposition: form-data; name="file"; filename="contract.pdf"
Content-Type: application/pdf

[binary file data]
--boundary
Content-Disposition: form-data; name="metadata"
Content-Type: application/json

{
  "title": "Service Agreement - ABC Corp",
  "type": "contract",
  "caseId": "case_789",
  "clientId": "client_456",
  "tags": ["contract", "service"],
  "securityClassification": "confidential",
  "description": "Updated service agreement with new terms",
  "metadata": {
    "practiceArea": "corporate",
    "effectiveDate": "2024-01-01"
  }
}
--boundary--
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "doc_456",
    "title": "Service Agreement - ABC Corp",
    "filename": "service_agreement_abc.pdf",
    "uploadStatus": "processing",
    "processingJobs": [
      {
        "type": "text_extraction",
        "status": "queued"
      },
      {
        "type": "content_analysis",
        "status": "queued"
      },
      {
        "type": "virus_scan",
        "status": "processing"
      }
    ]
  }
}
```

#### GET /documents/{documentId}
Get document metadata and details.

#### PUT /documents/{documentId}
Update document metadata.

#### DELETE /documents/{documentId}
Delete document (soft delete with audit trail).

#### GET /documents/{documentId}/download
Download document file.

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/pdf
Content-Disposition: attachment; filename="contract.pdf"
Content-Length: 2048576
X-Document-Version: 2
X-Security-Classification: confidential

[binary file data]
```

#### GET /documents/{documentId}/preview
Get document preview/thumbnail.

**Parameters:**
- `page` (number, default: 1): Page number for multi-page documents
- `size` (enum: 'small', 'medium', 'large', default: 'medium'): Preview size

### 3.2 Document Processing

#### GET /documents/{documentId}/text
Extract text content from document.

**Response:**
```json
{
  "success": true,
  "data": {
    "text": "This Service Agreement is entered into...",
    "pages": [
      {
        "number": 1,
        "text": "This Service Agreement is entered into...",
        "wordCount": 245
      }
    ],
    "totalWordCount": 1250,
    "extractedAt": "2024-01-15T09:05:00Z",
    "confidence": 0.98
  }
}
```

#### POST /documents/{documentId}/analyze
Perform AI analysis on document.

**Request:**
```json
{
  "analysisTypes": ["key_terms", "risks", "obligations", "dates"],
  "context": {
    "practiceArea": "corporate",
    "reviewPurpose": "compliance"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "analysisId": "analysis_789",
    "status": "processing",
    "estimatedCompletion": "2024-01-15T09:10:00Z"
  }
}
```

#### GET /documents/{documentId}/analysis/{analysisId}
Get analysis results.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "analysis_789",
    "documentId": "doc_123",
    "status": "completed",
    "completedAt": "2024-01-15T09:08:00Z",
    "results": {
      "keyTerms": [
        {
          "term": "force majeure",
          "frequency": 3,
          "importance": 0.9,
          "positions": [125, 890, 1205]
        }
      ],
      "risks": [
        {
          "type": "unlimited_liability",
          "description": "Section 5.2 contains unlimited liability clause",
          "severity": "high",
          "location": {
            "page": 2,
            "section": "5.2"
          }
        }
      ],
      "obligations": [
        {
          "party": "client",
          "obligation": "Monthly payment of $5,000",
          "dueDate": "1st of each month",
          "location": {
            "page": 3,
            "section": "6.1"
          }
        }
      ],
      "importantDates": [
        {
          "type": "effective_date",
          "date": "2024-01-01",
          "description": "Agreement becomes effective"
        },
        {
          "type": "renewal_deadline",
          "date": "2024-11-01",
          "description": "Deadline for renewal notice"
        }
      ]
    },
    "confidence": 0.94,
    "processingTime": 8.2
  }
}
```

### 3.3 Document Annotations

#### GET /documents/{documentId}/annotations
Get all annotations for document.

**Response:**
```json
{
  "success": true,
  "data": {
    "annotations": [
      {
        "id": "ann_123",
        "documentId": "doc_123",
        "type": "highlight",
        "content": "This clause is problematic",
        "position": {
          "page": 1,
          "startOffset": 1250,
          "endOffset": 1380,
          "coordinates": {
            "x": 150,
            "y": 300,
            "width": 200,
            "height": 20
          }
        },
        "color": "#ffeb3b",
        "createdBy": {
          "id": "usr_123",
          "name": "John Doe"
        },
        "createdAt": "2024-01-15T09:15:00Z",
        "lastModified": "2024-01-15T09:20:00Z",
        "tags": ["risk", "review"],
        "replies": [
          {
            "id": "reply_456",
            "content": "Agreed, we should revise this",
            "createdBy": {
              "id": "usr_456",
              "name": "Jane Smith"
            },
            "createdAt": "2024-01-15T09:25:00Z"
          }
        ]
      }
    ]
  }
}
```

#### POST /documents/{documentId}/annotations
Create new annotation.

#### PUT /documents/{documentId}/annotations/{annotationId}
Update existing annotation.

#### DELETE /documents/{documentId}/annotations/{annotationId}
Delete annotation.

## 4. Legal Research API

### 4.1 Search Operations

#### POST /research/search
Perform legal research search.

**Request:**
```json
{
  "query": "contract liability limitation clause",
  "filters": {
    "jurisdiction": ["federal", "california"],
    "documentTypes": ["case_law", "statutes"],
    "dateRange": {
      "from": "2020-01-01",
      "to": "2024-01-15"
    },
    "courts": ["supreme_court", "circuit_court"],
    "practiceAreas": ["contract_law", "commercial_law"]
  },
  "searchOptions": {
    "includeSnippets": true,
    "highlightTerms": true,
    "maxResults": 50,
    "sortBy": "relevance",
    "includeRelatedTerms": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "searchId": "search_123",
    "query": "contract liability limitation clause",
    "results": [
      {
        "id": "result_456",
        "title": "Smith v. Jones - Liability Limitation in Service Contracts",
        "type": "case_law",
        "citation": "Smith v. Jones, 123 F.3d 456 (9th Cir. 2023)",
        "url": "https://caselaw.example.com/smith-v-jones",
        "jurisdiction": "federal_9th_circuit",
        "court": "9th Circuit Court of Appeals",
        "dateDecided": "2023-03-15",
        "relevanceScore": 0.95,
        "snippet": "The court held that <em>liability limitation clauses</em> in commercial service contracts are generally enforceable when...",
        "keyPoints": [
          "Liability limitations must be clearly stated",
          "Unconscionability analysis applies",
          "Public policy exceptions exist"
        ],
        "citedBy": 15,
        "relatedCases": ["case_789", "case_012"],
        "practiceAreas": ["contract_law", "commercial_litigation"]
      }
    ],
    "totalResults": 247,
    "searchTime": 0.85,
    "suggestions": {
      "relatedTerms": ["indemnification", "damages", "breach"],
      "refinements": [
        "Add 'unconscionable' to search",
        "Filter by specific circuit",
        "Include secondary sources"
      ]
    },
    "filters": {
      "applied": {
        "jurisdiction": ["federal", "california"],
        "documentTypes": ["case_law", "statutes"]
      },
      "available": {
        "courts": [
          {"name": "Supreme Court", "count": 5},
          {"name": "Circuit Courts", "count": 45},
          {"name": "District Courts", "count": 78}
        ],
        "years": [
          {"year": "2023", "count": 89},
          {"year": "2022", "count": 67}
        ]
      }
    }
  }
}
```

#### GET /research/search/{searchId}
Get saved search results.

#### POST /research/search/save
Save search query and results.

**Request:**
```json
{
  "name": "Contract Liability Research",
  "query": "contract liability limitation clause",
  "filters": {...},
  "description": "Research for ABC Corp contract review",
  "tags": ["contract", "liability", "abc-corp"]
}
```

### 4.2 Citation Management

#### GET /research/citations
Get user's citation library.

**Response:**
```json
{
  "success": true,
  "data": {
    "citations": [
      {
        "id": "cite_123",
        "title": "Smith v. Jones",
        "citation": "Smith v. Jones, 123 F.3d 456 (9th Cir. 2023)",
        "citationFormats": {
          "bluebook": "Smith v. Jones, 123 F.3d 456 (9th Cir. 2023)",
          "apa": "Smith v. Jones, 123 F.3d 456 (9th Cir. 2023)",
          "mla": "Smith v. Jones. 123 F.3d 456. 9th Cir., 2023"
        },
        "url": "https://caselaw.example.com/smith-v-jones",
        "abstract": "Case dealing with liability limitation clauses...",
        "tags": ["contract", "liability", "limitation"],
        "notes": "Important precedent for ABC Corp case",
        "addedAt": "2024-01-15T10:00:00Z",
        "addedBy": "usr_123"
      }
    ],
    "folders": [
      {
        "id": "folder_456",
        "name": "Contract Law Research",
        "citationIds": ["cite_123", "cite_789"],
        "createdAt": "2024-01-15T09:00:00Z"
      }
    ]
  }
}
```

#### POST /research/citations
Add citation to library.

#### PUT /research/citations/{citationId}
Update citation details.

#### DELETE /research/citations/{citationId}
Remove citation from library.

## 5. Case Management API

### 5.1 Case Operations

#### GET /cases
List cases with filtering.

**Parameters:**
- `status` (enum, optional): active, closed, archived
- `assignedTo` (string, optional): Filter by assigned attorney
- `clientId` (string, optional): Filter by client
- `practiceArea` (enum, optional): Filter by practice area
- `search` (string, optional): Search in case details

**Response:**
```json
{
  "success": true,
  "data": {
    "cases": [
      {
        "id": "case_123",
        "caseNumber": "2024-CV-001",
        "title": "ABC Corp vs. XYZ Inc. - Contract Dispute",
        "client": {
          "id": "client_456",
          "name": "ABC Corporation",
          "type": "corporate"
        },
        "status": "active",
        "practiceArea": "commercial_litigation",
        "assignedAttorney": {
          "id": "usr_123",
          "name": "John Doe"
        },
        "createdDate": "2024-01-01T00:00:00Z",
        "lastActivity": "2024-01-15T10:30:00Z",
        "nextDeadline": {
          "date": "2024-02-01T17:00:00Z",
          "description": "Discovery deadline",
          "type": "discovery"
        },
        "documentCount": 45,
        "conversationCount": 8,
        "estimatedValue": 500000,
        "billableHours": 125.5,
        "tags": ["commercial", "contract", "dispute"]
      }
    ]
  }
}
```

#### POST /cases
Create new case.

#### GET /cases/{caseId}
Get case details.

#### PUT /cases/{caseId}
Update case information.

## 6. User Management API

### 6.1 User Profile

#### GET /users/profile
Get current user profile.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "usr_123",
    "email": "lawyer@firm.com",
    "name": "John Doe",
    "title": "Senior Associate",
    "firm": {
      "id": "firm_456",
      "name": "Smith & Associates",
      "address": "123 Law St, Legal City, CA 90210"
    },
    "barAdmissions": [
      {
        "state": "california",
        "barNumber": "12345",
        "admissionDate": "2018-06-15"
      }
    ],
    "practiceAreas": ["corporate", "litigation", "intellectual_property"],
    "permissions": ["read", "write", "admin"],
    "preferences": {
      "theme": "light",
      "notifications": {
        "email": true,
        "push": false,
        "desktop": true
      },
      "defaultCitationFormat": "bluebook",
      "autoSave": true,
      "language": "en-US"
    },
    "subscription": {
      "plan": "professional",
      "status": "active",
      "renewalDate": "2024-12-01T00:00:00Z",
      "features": ["unlimited_conversations", "document_analysis", "research_tools"]
    }
  }
}
```

#### PUT /users/profile
Update user profile.

#### PUT /users/preferences
Update user preferences.

## 7. System/Admin API

### 7.1 System Health

#### GET /system/health
System health check.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-15T10:30:00Z",
    "services": {
      "database": "healthy",
      "ai_service": "healthy",
      "document_processor": "healthy",
      "search_engine": "healthy",
      "websocket": "healthy"
    },
    "metrics": {
      "uptime": 99.9,
      "responseTime": 145,
      "activeUsers": 24,
      "processingQueue": 3
    }
  }
}
```

### 7.2 Usage Analytics

#### GET /analytics/usage
Get usage statistics.

**Parameters:**
- `period` (enum): day, week, month, year
- `metric` (enum): conversations, documents, searches, users

## 8. Real-time Features

### 8.1 WebSocket Events

Connection: `ws://localhost:8000/ws?token={access_token}`

**Events:**

#### Message Streaming
```json
{
  "type": "message_stream",
  "data": {
    "conversationId": "conv_123",
    "messageId": "msg_456",
    "content": "The contract appears to have...",
    "isComplete": false,
    "metadata": {
      "confidence": 0.87,
      "processingTime": 1.2
    }
  }
}
```

#### Document Processing Updates
```json
{
  "type": "document_processing",
  "data": {
    "documentId": "doc_123",
    "status": "text_extraction_complete",
    "progress": 75,
    "nextStep": "content_analysis"
  }
}
```

#### Notification Events
```json
{
  "type": "notification",
  "data": {
    "id": "notif_789",
    "title": "New case deadline approaching",
    "message": "Discovery deadline for ABC Corp case is in 3 days",
    "type": "deadline_reminder",
    "priority": "high",
    "actionUrl": "/cases/case_123"
  }
}
```

## 9. Error Handling

### 9.1 Standard Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": {
      "field": "email",
      "issue": "Invalid email format"
    },
    "requestId": "req_abc123",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### 9.2 HTTP Status Codes

- `200 OK`: Successful request
- `201 Created`: Resource created successfully
- `204 No Content`: Successful request with no response body
- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource conflict (e.g., duplicate)
- `422 Unprocessable Entity`: Validation errors
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error
- `503 Service Unavailable`: Service temporarily unavailable

### 9.3 Error Codes

- `INVALID_REQUEST`: Malformed request
- `AUTHENTICATION_REQUIRED`: Missing or invalid auth token
- `INSUFFICIENT_PERMISSIONS`: User lacks required permissions
- `VALIDATION_ERROR`: Request validation failed
- `RESOURCE_NOT_FOUND`: Requested resource doesn't exist
- `RESOURCE_CONFLICT`: Resource already exists or conflicts
- `RATE_LIMIT_EXCEEDED`: API rate limit exceeded
- `SERVICE_UNAVAILABLE`: Required service is down
- `PROCESSING_ERROR`: Error during AI processing
- `STORAGE_ERROR`: File storage/retrieval error

## 10. Rate Limiting

### 10.1 Rate Limits by Endpoint

| Endpoint Category | Rate Limit | Window |
|------------------|------------|---------|
| Authentication | 5 requests | 1 minute |
| Chat Messages | 30 requests | 1 minute |
| Document Upload | 10 requests | 1 minute |
| Search | 20 requests | 1 minute |
| General API | 100 requests | 1 minute |

### 10.2 Rate Limit Headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1642262400
X-RateLimit-Window: 60
```

## 11. Security Considerations

### 11.1 Data Encryption

- All API communication over HTTPS/TLS 1.3
- Sensitive data encrypted at rest using AES-256
- JWT tokens for stateless authentication
- File uploads scanned for malware

### 11.2 Access Control

- Role-based access control (RBAC)
- Document-level permissions
- Audit logging for all sensitive operations
- IP whitelisting for admin operations

### 11.3 Data Privacy

- Compliance with attorney-client privilege
- GDPR/CCPA compliance for data handling
- Data retention policies by document type
- Secure deletion with verification

## 12. API Versioning

### 12.1 Version Strategy

- URL versioning: `/api/v1/`, `/api/v2/`
- Backward compatibility for at least 2 major versions
- Deprecation notices 6 months before removal
- Migration guides for breaking changes

### 12.2 Version Headers

```http
API-Version: v1
Deprecation: Sun, 01 Jan 2025 00:00:00 GMT
Link: <https://api.bear-ai.com/v2/endpoint>; rel="successor-version"
```

This comprehensive API specification provides a solid foundation for building the BEAR AI legal assistant backend services with proper security, performance, and legal industry compliance considerations.