// Local API Documentation Generator
// Creates comprehensive documentation for localhost-only API operations

import { localApiRegistry } from '../localApiRegistry';

/**
 * Local API Documentation Generator
 * Provides comprehensive documentation for all localhost-only operations
 */
export class LocalApiDocGenerator {
  private static instance: LocalApiDocGenerator;

  private constructor() {}

  static getInstance(): LocalApiDocGenerator {
    if (!LocalApiDocGenerator.instance) {
      LocalApiDocGenerator.instance = new LocalApiDocGenerator();
    }
    return LocalApiDocGenerator.instance;
  }

  /**
   * Generate complete API documentation
   */
  generateDocumentation(): {
    openapi: string;
    info: {
      title: string;
      version: string;
      description: string;
      contact: {
        name: string;
        url: string;
      };
    };
    servers: Array<{
      url: string;
      description: string;
    }>;
    paths: Record<string, any>;
    components: {
      schemas: Record<string, any>;
      securitySchemes: Record<string, any>;
    };
  } {
    return {
      openapi: '3.0.3',
      info: {
        title: 'BEAR AI Local API',
        version: '1.0.0',
        description: `
# BEAR AI Local API Documentation

## Overview
This API operates **100% locally** on your device using Tauri commands and WebSocket connections. 
No data is transmitted to external servers, ensuring complete privacy and security for your legal work.

## Architecture
- **Backend**: Rust/Tauri commands for data processing
- **Real-time**: Local WebSocket server (ws://127.0.0.1:8080)
- **Storage**: Local SQLite database and file system
- **Authentication**: Local session management
- **AI Processing**: Local inference without cloud dependencies

## Security Features
- All operations are localhost-only
- No external HTTP requests
- Local authentication system
- Rate limiting and request validation
- Complete attorney-client privilege protection

## Getting Started
1. Initialize the API: \`await api.initialize()\`
2. Authenticate: \`await api.auth.login({ username, password })\`
3. Use any service: \`await api.documents.list()\`
        `,
        contact: {
          name: 'BEAR AI Support',
          url: 'https://github.com/yourusername/BEAR_AI'
        }
      },
      servers: [
        {
          url: 'tauri://localhost',
          description: 'Local Tauri Commands'
        },
        {
          url: 'ws://127.0.0.1:8080',
          description: 'Local WebSocket Server'
        }
      ],
      paths: this.generatePaths(),
      components: {
        schemas: this.generateSchemas(),
        securitySchemes: {
          LocalAuth: {
            type: 'apiKey',
            in: 'header',
            name: 'X-Session-ID',
            description: 'Local session ID for authentication'
          }
        }
      }
    };
  }

  /**
   * Generate API paths/endpoints
   */
  private generatePaths(): Record<string, any> {
    return {
      '/local/auth/login': {
        post: {
          tags: ['Authentication'],
          summary: 'Local Authentication',
          description: 'Authenticate user with local credentials stored securely on device',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['username', 'password'],
                  properties: {
                    username: {
                      type: 'string',
                      description: 'Local username (admin, user, or demo)'
                    },
                    password: {
                      type: 'string',
                      description: 'Local password'
                    }
                  }
                }
              }
            }
          },
          responses: {
            200: {
              description: 'Authentication successful',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/AuthResponse' }
                }
              }
            },
            401: {
              description: 'Invalid credentials'
            }
          }
        }
      },
      '/local/auth/logout': {
        post: {
          tags: ['Authentication'],
          summary: 'Logout',
          description: 'End local session',
          security: [{ LocalAuth: [] }],
          responses: {
            200: {
              description: 'Logout successful'
            }
          }
        }
      },
      '/local/chat/sessions': {
        get: {
          tags: ['Chat'],
          summary: 'Get Chat Sessions',
          description: 'Retrieve all chat sessions stored locally',
          security: [{ LocalAuth: [] }],
          responses: {
            200: {
              description: 'Chat sessions retrieved',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/ChatSession' }
                  }
                }
              }
            }
          }
        },
        post: {
          tags: ['Chat'],
          summary: 'Create Chat Session',
          description: 'Create new chat session with local AI assistant',
          security: [{ LocalAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['title'],
                  properties: {
                    title: { type: 'string' },
                    category: { 
                      type: 'string',
                      enum: ['research', 'analysis', 'drafting', 'review']
                    }
                  }
                }
              }
            }
          },
          responses: {
            201: {
              description: 'Chat session created',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ChatSession' }
                }
              }
            }
          }
        }
      },
      '/local/documents': {
        get: {
          tags: ['Documents'],
          summary: 'List Documents',
          description: 'Get all documents stored locally with optional filtering',
          security: [{ LocalAuth: [] }],
          parameters: [
            {
              name: 'category',
              in: 'query',
              schema: {
                type: 'string',
                enum: ['contract', 'brief', 'research', 'evidence', 'correspondence', 'other']
              }
            },
            {
              name: 'limit',
              in: 'query',
              schema: { type: 'integer', default: 20 }
            },
            {
              name: 'offset',
              in: 'query',
              schema: { type: 'integer', default: 0 }
            }
          ],
          responses: {
            200: {
              description: 'Documents retrieved',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/Document' }
                      },
                      pagination: { $ref: '#/components/schemas/Pagination' }
                    }
                  }
                }
              }
            }
          }
        },
        post: {
          tags: ['Documents'],
          summary: 'Upload Document',
          description: 'Upload document to local storage with metadata extraction',
          security: [{ LocalAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  required: ['file'],
                  properties: {
                    file: { type: 'string', format: 'binary' },
                    category: { type: 'string' },
                    tags: { type: 'array', items: { type: 'string' } }
                  }
                }
              }
            }
          },
          responses: {
            201: {
              description: 'Document uploaded successfully',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Document' }
                }
              }
            }
          }
        }
      },
      '/local/research/search': {
        post: {
          tags: ['Research'],
          summary: 'Legal Research Search',
          description: 'Search local legal database for cases, statutes, and regulations',
          security: [{ LocalAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SearchQuery' }
              }
            }
          },
          responses: {
            200: {
              description: 'Search results',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/SearchResults' }
                }
              }
            }
          }
        }
      },
      '/local/analysis/analyze': {
        post: {
          tags: ['Analysis'],
          summary: 'Document Analysis',
          description: 'Analyze document using local AI models for insights and risk assessment',
          security: [{ LocalAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AnalysisRequest' }
              }
            }
          },
          responses: {
            200: {
              description: 'Analysis completed',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/AnalysisResult' }
                }
              }
            }
          }
        }
      },
      '/local/system/health': {
        get: {
          tags: ['System'],
          summary: 'System Health',
          description: 'Check health status of all local services',
          responses: {
            200: {
              description: 'System health status',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/HealthStatus' }
                }
              }
            }
          }
        }
      }
    };
  }

  /**
   * Generate schema definitions
   */
  private generateSchemas(): Record<string, any> {
    return {
      AuthResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          token: { type: 'string' },
          session_id: { type: 'string' },
          expires_in: { type: 'integer' },
          error: { type: 'string' }
        }
      },
      ChatSession: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          category: { type: 'string' },
          created_at: { type: 'string', format: 'date-time' },
          message_count: { type: 'integer' },
          last_activity: { type: 'string', format: 'date-time' }
        }
      },
      ChatMessage: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          session_id: { type: 'string' },
          content: { type: 'string' },
          role: { type: 'string', enum: ['user', 'assistant'] },
          timestamp: { type: 'string', format: 'date-time' },
          metadata: { type: 'object' }
        }
      },
      Document: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          category: { type: 'string' },
          file_size: { type: 'integer' },
          created_at: { type: 'string', format: 'date-time' },
          tags: { type: 'array', items: { type: 'string' } },
          status: { type: 'string' },
          content_type: { type: 'string' }
        }
      },
      SearchQuery: {
        type: 'object',
        required: ['query'],
        properties: {
          query: { type: 'string' },
          filters: {
            type: 'object',
            properties: {
              type: { type: 'array', items: { type: 'string' } },
              jurisdiction: { type: 'string' },
              dateRange: {
                type: 'object',
                properties: {
                  from: { type: 'string', format: 'date' },
                  to: { type: 'string', format: 'date' }
                }
              }
            }
          },
          limit: { type: 'integer', default: 20 },
          offset: { type: 'integer', default: 0 }
        }
      },
      SearchResults: {
        type: 'object',
        properties: {
          results: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                title: { type: 'string' },
                type: { type: 'string', enum: ['case', 'statute', 'regulation', 'secondary'] },
                jurisdiction: { type: 'string' },
                date: { type: 'string', format: 'date' },
                relevance: { type: 'number' },
                summary: { type: 'string' },
                citation: { type: 'string' }
              }
            }
          },
          total: { type: 'integer' },
          processing_time_ms: { type: 'integer' },
          local_search: { type: 'boolean', default: true }
        }
      },
      AnalysisRequest: {
        type: 'object',
        required: ['document_id', 'analysis_type'],
        properties: {
          document_id: { type: 'string' },
          analysis_type: { 
            type: 'string',
            enum: ['summary', 'risk_assessment', 'clause_extraction', 'compliance_check', 'citation_analysis', 'redaction_review']
          },
          options: { type: 'object' }
        }
      },
      AnalysisResult: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          document_id: { type: 'string' },
          type: { type: 'string' },
          result: { type: 'object' },
          confidence: { type: 'number' },
          created_at: { type: 'string', format: 'date-time' },
          processing_time_ms: { type: 'integer' },
          local_processing: { type: 'boolean', default: true }
        }
      },
      HealthStatus: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy'] },
          services: {
            type: 'object',
            additionalProperties: {
              type: 'object',
              properties: {
                status: { type: 'string', enum: ['up', 'down'] },
                response_time: { type: 'integer' }
              }
            }
          },
          local_only: { type: 'boolean', default: true },
          timestamp: { type: 'string', format: 'date-time' }
        }
      },
      Pagination: {
        type: 'object',
        properties: {
          page: { type: 'integer' },
          limit: { type: 'integer' },
          total: { type: 'integer' },
          hasNext: { type: 'boolean' },
          hasPrev: { type: 'boolean' }
        }
      }
    };
  }

  /**
   * Generate HTML documentation
   */
  generateHtmlDocs(): string {
    const apiDoc = this.generateDocumentation();
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${apiDoc.info.title} - API Documentation</title>
    <style>
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            line-height: 1.6; 
            margin: 0; 
            padding: 20px; 
            background: #f5f5f5; 
        }
        .container { 
            max-width: 1200px; 
            margin: 0 auto; 
            background: white; 
            padding: 30px; 
            border-radius: 8px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
        }
        .header { 
            border-bottom: 2px solid #007acc; 
            padding-bottom: 20px; 
            margin-bottom: 30px; 
        }
        .badge {
            display: inline-block;
            background: #007acc;
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
            margin-left: 10px;
        }
        .local-badge {
            background: #28a745;
        }
        .endpoint {
            border: 1px solid #ddd;
            border-radius: 6px;
            margin-bottom: 20px;
            overflow: hidden;
        }
        .endpoint-header {
            background: #f8f9fa;
            padding: 15px;
            border-bottom: 1px solid #ddd;
        }
        .method {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-weight: bold;
            font-size: 12px;
            margin-right: 10px;
        }
        .method.get { background: #61affe; color: white; }
        .method.post { background: #49cc90; color: white; }
        .method.put { background: #fca130; color: white; }
        .method.delete { background: #f93e3e; color: white; }
        .endpoint-body {
            padding: 15px;
        }
        .schema {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 4px;
            padding: 15px;
            margin: 10px 0;
        }
        .property {
            margin: 5px 0;
            padding: 5px 0;
        }
        .property-name {
            font-weight: bold;
            color: #007acc;
        }
        .property-type {
            color: #6f42c1;
            font-style: italic;
        }
        .required {
            color: #dc3545;
            font-size: 12px;
        }
        code {
            background: #f8f9fa;
            padding: 2px 4px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
        }
        pre {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 6px;
            overflow-x: auto;
            border: 1px solid #e9ecef;
        }
        .warning {
            background: #fff3cd;
            border: 1px solid #ffeeba;
            color: #856404;
            padding: 15px;
            border-radius: 6px;
            margin: 20px 0;
        }
        .success {
            background: #d1f2eb;
            border: 1px solid #a3e6d1;
            color: #0c5460;
            padding: 15px;
            border-radius: 6px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${apiDoc.info.title} <span class="badge local-badge">100% LOCAL</span></h1>
            <p>${apiDoc.info.description.replace(/\n/g, '<br>')}</p>
            <p><strong>Version:</strong> ${apiDoc.info.version}</p>
        </div>

        <div class="success">
            <h3>🔒 Privacy & Security Features</h3>
            <ul>
                <li><strong>Zero External Requests:</strong> All processing happens on your device</li>
                <li><strong>Local Authentication:</strong> No cloud-based user management</li>
                <li><strong>Attorney-Client Privilege:</strong> Complete confidentiality protection</li>
                <li><strong>Offline Operation:</strong> Works without internet connection</li>
            </ul>
        </div>

        <h2>API Endpoints</h2>
        
        ${Object.entries(apiDoc.paths).map(([path, methods]) => 
          Object.entries(methods as Record<string, any>).map(([method, spec]) => `
            <div class="endpoint">
                <div class="endpoint-header">
                    <span class="method ${method}">${method.toUpperCase()}</span>
                    <strong>${path}</strong>
                    ${spec.security ? '<span class="badge">AUTH REQUIRED</span>' : ''}
                </div>
                <div class="endpoint-body">
                    <h4>${spec.summary}</h4>
                    <p>${spec.description}</p>
                    
                    ${spec.parameters ? `
                        <h5>Parameters:</h5>
                        <div class="schema">
                            ${spec.parameters.map((param: any) => `
                                <div class="property">
                                    <span class="property-name">${param.name}</span>
                                    <span class="property-type">${param.schema?.type || 'string'}</span>
                                    ${param.required ? '<span class="required">required</span>' : ''}
                                    ${param.description ? `<br><small>${param.description}</small>` : ''}
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                    
                    ${spec.requestBody ? `
                        <h5>Request Body:</h5>
                        <div class="schema">
                            <strong>Content-Type:</strong> ${Object.keys(spec.requestBody.content)[0]}
                        </div>
                    ` : ''}
                    
                    <h5>Responses:</h5>
                    <div class="schema">
                        ${Object.entries(spec.responses).map(([code, response]: [string, any]) => `
                            <div class="property">
                                <span class="property-name">${code}</span>
                                <span>${response.description}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
          `).join('')
        ).join('')}

        <h2>Data Schemas</h2>
        ${Object.entries(apiDoc.components.schemas).map(([name, schema]: [string, any]) => `
            <div class="endpoint">
                <div class="endpoint-header">
                    <strong>${name}</strong>
                </div>
                <div class="endpoint-body">
                    <div class="schema">
                        ${schema.properties ? Object.entries(schema.properties).map(([propName, prop]: [string, any]) => `
                            <div class="property">
                                <span class="property-name">${propName}</span>
                                <span class="property-type">${prop.type}${prop.format ? ` (${prop.format})` : ''}</span>
                                ${schema.required && schema.required.includes(propName) ? '<span class="required">required</span>' : ''}
                                ${prop.description ? `<br><small>${prop.description}</small>` : ''}
                            </div>
                        `).join('') : '<em>No properties defined</em>'}
                    </div>
                </div>
            </div>
        `).join('')}

        <div class="warning">
            <h3>⚠️ Local Development Notice</h3>
            <p>This API documentation is for the localhost-only implementation of BEAR AI. 
               All endpoints use Tauri commands and local WebSocket connections. No external HTTP servers are required.</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  /**
   * Generate Markdown documentation
   */
  generateMarkdownDocs(): string {
    const apiDoc = this.generateDocumentation();
    
    return `# ${apiDoc.info.title}

${apiDoc.info.description}

**Version:** ${apiDoc.info.version}

## 🔒 Privacy & Security Features

- **Zero External Requests:** All processing happens on your device
- **Local Authentication:** No cloud-based user management  
- **Attorney-Client Privilege:** Complete confidentiality protection
- **Offline Operation:** Works without internet connection

## API Endpoints

${Object.entries(apiDoc.paths).map(([path, methods]) => 
  Object.entries(methods as Record<string, any>).map(([method, spec]) => `
### ${method.toUpperCase()} ${path}

**${spec.summary}**

${spec.description}

${spec.security ? '🔒 **Authentication Required**' : ''}

${spec.parameters ? `
**Parameters:**
${spec.parameters.map((param: any) => `
- \`${param.name}\` (${param.schema?.type || 'string'}) ${param.required ? '**required**' : ''}: ${param.description || ''}
`).join('')}
` : ''}

**Responses:**
${Object.entries(spec.responses).map(([code, response]: [string, any]) => `
- \`${code}\`: ${response.description}
`).join('')}
  `).join('')
).join('')}

## Data Schemas

${Object.entries(apiDoc.components.schemas).map(([name, schema]: [string, any]) => `
### ${name}

${schema.properties ? Object.entries(schema.properties).map(([propName, prop]: [string, any]) => `
- \`${propName}\` (${prop.type}${prop.format ? ` - ${prop.format}` : ''}): ${prop.description || ''}
`).join('') : 'No properties defined'}
`).join('')}

## Getting Started

1. **Initialize the API:**
   \`\`\`typescript
   import { api } from './src/api/localApiRegistry';
   await api.initialize();
   \`\`\`

2. **Authenticate:**
   \`\`\`typescript
   const response = await api.auth.login('admin', 'admin123');
   if (response.success) {
     console.log('Authenticated successfully');
   }
   \`\`\`

3. **Use Services:**
   \`\`\`typescript
   // Get documents
   const docs = await api.documents.list();
   
   // Create chat session
   const session = await api.chat.createSession('Legal Research', 'research');
   
   // Send message
   const response = await api.chat.sendMessage(session.data.id, 'Help me with contract analysis');
   \`\`\`

## Local Development

This API runs entirely on localhost using:
- **Tauri Commands** for backend operations
- **Local WebSocket Server** for real-time communication  
- **SQLite Database** for local data storage
- **Local File System** for document storage

No external HTTP servers or cloud services are required.
`;
  }
}

// Export singleton instance
export const localApiDocGenerator = LocalApiDocGenerator.getInstance();

export default localApiDocGenerator;