// Swagger UI setup and configuration
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

/**
 * Swagger configuration options
 */
const swaggerOptions: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'BEAR AI Legal Assistant API',
      version: '1.0.0',
      description: `
        Comprehensive RESTful API for BEAR AI Legal Assistant platform providing 
        AI-powered legal document analysis, research, and assistance capabilities.
        
        ## Features
        - Document analysis and processing
        - AI-powered legal research
        - Chat-based legal assistance
        - Case law and statute search
        - Document management
        - User authentication and authorization
        
        ## Authentication
        This API uses JWT Bearer tokens for authentication. Include the token in the Authorization header:
        \`\`\`
        Authorization: Bearer <your-jwt-token>
        \`\`\`
      `,
      contact: {
        name: 'BEAR AI Support',
        email: 'support@bear-ai.com'
      },
      license: {
        name: 'PROPRIETARY',
        url: 'https://bear-ai.com/license'
      },
      termsOfService: 'https://bear-ai.com/terms'
    },
    servers: [
      {
        url: 'https://api.bear-ai.com/v1',
        description: 'Production server'
      },
      {
        url: 'https://staging-api.bear-ai.com/v1',
        description: 'Staging server'
      },
      {
        url: 'http://localhost:3001/api/v1',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        },
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key'
        }
      }
    },
    security: [
      { BearerAuth: [] }
    ]
  },
  apis: [
    './src/api/routes/*.ts',
    './src/api/routes/*.js',
    './src/api/types/*.ts'
  ]
};

/**
 * Custom Swagger UI options
 */
const swaggerUiOptions: swaggerUi.SwaggerUiOptions = {
  customCss: `
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info { margin: 50px 0; }
    .swagger-ui .info .title { color: #2c3e50; }
    .swagger-ui .btn.authorize { 
      background-color: #3498db; 
      border-color: #3498db; 
    }
    .swagger-ui .btn.authorize:hover { 
      background-color: #2980b9; 
      border-color: #2980b9; 
    }
    .swagger-ui .scheme-container { 
      background: #f8f9fa; 
      padding: 20px; 
      border-radius: 4px; 
      margin-bottom: 20px; 
    }
  `,
  customSiteTitle: 'BEAR AI API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    docExpansion: 'list',
    defaultModelsExpandDepth: 2,
    defaultModelExpandDepth: 2,
    tryItOutEnabled: true
  }
};

/**
 * Load OpenAPI specification from YAML file
 */
function loadOpenApiSpec(): any {
  try {
    const yamlPath = path.join(__dirname, '../openapi.yaml');
    const yamlContent = fs.readFileSync(yamlPath, 'utf8');
    return yaml.load(yamlContent);
  } catch (error) {
    console.warn('Could not load OpenAPI YAML file, falling back to JSDoc generation');
    return swaggerJSDoc(swaggerOptions);
  }
}

/**
 * Setup Swagger documentation for Express app
 */
export function setupSwagger(app: Express): void {
  const specs = loadOpenApiSpec();

  // Enhanced Swagger UI setup with custom options
  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(specs, swaggerUiOptions)
  );

  // Raw OpenAPI spec endpoint
  app.get('/api/docs.json', (req, res) => {
    res.json(specs);
  });

  // YAML version of the spec
  app.get('/api/docs.yaml', (req, res) => {
    res.set('Content-Type', 'application/x-yaml');
    res.send(yaml.dump(specs, { indent: 2 }));
  });

  // API documentation landing page
  app.get('/api', (req, res) => {
    res.redirect('/api/docs');
  });

  console.log(`📚 API Documentation available at: /api/docs`);
  console.log(`📄 OpenAPI Spec (JSON): /api/docs.json`);
  console.log(`📄 OpenAPI Spec (YAML): /api/docs.yaml`);
}

/**
 * Generate interactive API explorer
 */
export function createApiExplorer(app: Express): void {
  // Custom API explorer with additional tools
  app.get('/api/explorer', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>BEAR AI API Explorer</title>
        <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui.css" />
        <style>
          body { margin: 0; padding: 0; }
          .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            text-align: center;
          }
          .explorer-container { padding: 20px; }
          .tools { 
            display: flex; 
            gap: 20px; 
            margin-bottom: 20px; 
            flex-wrap: wrap;
          }
          .tool-card {
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 15px;
            flex: 1;
            min-width: 250px;
          }
          .tool-card h3 { margin-top: 0; color: #333; }
          .btn {
            background: #3498db;
            color: white;
            padding: 8px 16px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
          }
          .btn:hover { background: #2980b9; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🐻 BEAR AI API Explorer</h1>
          <p>Comprehensive tools for API development and testing</p>
        </div>
        
        <div class="explorer-container">
          <div class="tools">
            <div class="tool-card">
              <h3>📚 Interactive Documentation</h3>
              <p>Browse and test all API endpoints with Swagger UI</p>
              <a href="/api/docs" class="btn">Open Documentation</a>
            </div>
            
            <div class="tool-card">
              <h3>📄 OpenAPI Specification</h3>
              <p>Download the complete API specification</p>
              <a href="/api/docs.json" class="btn">JSON Format</a>
              <a href="/api/docs.yaml" class="btn">YAML Format</a>
            </div>
            
            <div class="tool-card">
              <h3>🔧 API Testing Tools</h3>
              <p>Test endpoints with authentication and validation</p>
              <a href="/api/test" class="btn">API Tester</a>
            </div>
            
            <div class="tool-card">
              <h3>📊 Health Monitor</h3>
              <p>Check API health and system status</p>
              <a href="/api/v1/system/health" class="btn">Health Check</a>
            </div>
            
            <div class="tool-card">
              <h3>🔑 Authentication Guide</h3>
              <p>Learn how to authenticate with the API</p>
              <a href="/api/auth-guide" class="btn">Auth Guide</a>
            </div>
            
            <div class="tool-card">
              <h3>💡 Code Examples</h3>
              <p>Sample code in multiple programming languages</p>
              <a href="/api/examples" class="btn">View Examples</a>
            </div>
          </div>
        </div>
      </body>
      </html>
    `);
  });
}

/**
 * Create authentication guide
 */
export function createAuthGuide(app: Express): void {
  app.get('/api/auth-guide', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>BEAR AI API - Authentication Guide</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          .code { background: #f4f4f4; padding: 10px; border-radius: 4px; margin: 10px 0; }
          .step { margin: 20px 0; padding: 15px; border-left: 4px solid #3498db; }
        </style>
      </head>
      <body>
        <h1>🔐 BEAR AI API Authentication Guide</h1>
        
        <div class="step">
          <h2>Step 1: Login to Get Token</h2>
          <p>Send a POST request to the login endpoint:</p>
          <div class="code">
            POST /api/v1/auth/login<br>
            Content-Type: application/json<br><br>
            {<br>
            &nbsp;&nbsp;"email": "your-email@example.com",<br>
            &nbsp;&nbsp;"password": "your-password"<br>
            }
          </div>
        </div>
        
        <div class="step">
          <h2>Step 2: Use Token in Requests</h2>
          <p>Include the token in the Authorization header:</p>
          <div class="code">
            Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
          </div>
        </div>
        
        <div class="step">
          <h2>Step 3: Refresh Token When Needed</h2>
          <p>Use the refresh token to get a new access token:</p>
          <div class="code">
            POST /api/v1/auth/refresh<br>
            Content-Type: application/json<br><br>
            {<br>
            &nbsp;&nbsp;"refreshToken": "your-refresh-token"<br>
            }
          </div>
        </div>
        
        <h2>🔧 Alternative: API Key Authentication</h2>
        <p>For programmatic access, use an API key:</p>
        <div class="code">
          X-API-Key: your-api-key
        </div>
        
        <h2>📚 More Information</h2>
        <p><a href="/api/docs">View complete API documentation</a></p>
      </body>
      </html>
    `);
  });
}

/**
 * Create code examples page
 */
export function createCodeExamples(app: Express): void {
  app.get('/api/examples', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>BEAR AI API - Code Examples</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 1000px; margin: 0 auto; padding: 20px; }
          .example { margin: 20px 0; }
          .code { background: #f4f4f4; padding: 15px; border-radius: 4px; overflow-x: auto; }
          .tabs { display: flex; margin-bottom: 10px; }
          .tab { padding: 10px 20px; background: #ddd; cursor: pointer; border-radius: 4px 4px 0 0; }
          .tab.active { background: #3498db; color: white; }
          .tab-content { display: none; }
          .tab-content.active { display: block; }
        </style>
      </head>
      <body>
        <h1>💡 BEAR AI API - Code Examples</h1>
        
        <div class="example">
          <h2>Authentication</h2>
          <div class="tabs">
            <div class="tab active" onclick="showTab('auth', 'javascript')">JavaScript</div>
            <div class="tab" onclick="showTab('auth', 'python')">Python</div>
            <div class="tab" onclick="showTab('auth', 'curl')">cURL</div>
          </div>
          
          <div id="auth-javascript" class="tab-content active">
            <div class="code">
// JavaScript/Node.js example
const response = await fetch('/api/v1/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'attorney@lawfirm.com',
    password: 'securePassword123'
  })
});

const { token } = await response.json();

// Use token in subsequent requests
const chatResponse = await fetch('/api/v1/chat/sessions', {
  headers: {
    'Authorization': \`Bearer \${token}\`
  }
});
            </div>
          </div>
          
          <div id="auth-python" class="tab-content">
            <div class="code">
# Python example
import requests

# Login
response = requests.post('/api/v1/auth/login', json={
    'email': 'attorney@lawfirm.com',
    'password': 'securePassword123'
})

token = response.json()['token']

# Use token
headers = {'Authorization': f'Bearer {token}'}
chat_response = requests.get('/api/v1/chat/sessions', headers=headers)
            </div>
          </div>
          
          <div id="auth-curl" class="tab-content">
            <div class="code">
# cURL example
curl -X POST /api/v1/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"attorney@lawfirm.com","password":"securePassword123"}'

# Use returned token
curl -X GET /api/v1/chat/sessions \\
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
            </div>
          </div>
        </div>
        
        <div class="example">
          <h2>Document Upload</h2>
          <div class="tabs">
            <div class="tab active" onclick="showTab('upload', 'javascript')">JavaScript</div>
            <div class="tab" onclick="showTab('upload', 'python')">Python</div>
            <div class="tab" onclick="showTab('upload', 'curl')">cURL</div>
          </div>
          
          <div id="upload-javascript" class="tab-content active">
            <div class="code">
// Upload document
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('category', 'contract');
formData.append('tags', JSON.stringify(['employment', 'confidential']));

const response = await fetch('/api/v1/documents', {
  method: 'POST',
  headers: {
    'Authorization': \`Bearer \${token}\`
  },
  body: formData
});

const document = await response.json();
console.log('Document uploaded:', document);
            </div>
          </div>
          
          <div id="upload-python" class="tab-content">
            <div class="code">
# Python document upload
import requests

files = {'file': open('contract.pdf', 'rb')}
data = {
    'category': 'contract',
    'tags': ['employment', 'confidential']
}

response = requests.post(
    '/api/v1/documents',
    files=files,
    data=data,
    headers={'Authorization': f'Bearer {token}'}
)

document = response.json()
print('Document uploaded:', document)
            </div>
          </div>
          
          <div id="upload-curl" class="tab-content">
            <div class="code">
curl -X POST /api/v1/documents \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -F "file=@contract.pdf" \\
  -F "category=contract" \\
  -F "tags=employment,confidential"
            </div>
          </div>
        </div>
        
        <script>
          function showTab(section, language) {
            // Hide all tabs in section
            const contents = document.querySelectorAll(\`[id^="\${section}-"]\`);
            contents.forEach(content => content.classList.remove('active'));
            
            // Remove active from all tabs in section
            const tabs = document.querySelectorAll(\`#\${section}-javascript\`).parentElement.querySelectorAll('.tab');
            tabs.forEach(tab => tab.classList.remove('active'));
            
            // Show selected tab
            document.getElementById(\`\${section}-\${language}\`).classList.add('active');
            event.target.classList.add('active');
          }
        </script>
      </body>
      </html>
    `);
  });
}

/**
 * Enhanced API documentation setup
 */
export function setupEnhancedDocs(app: Express): void {
  setupSwagger(app);
  createApiExplorer(app);
  createAuthGuide(app);
  createCodeExamples(app);
  
  console.log(`🚀 Enhanced API Documentation Setup Complete:`);
  console.log(`   📚 Documentation: /api/docs`);
  console.log(`   🔍 Explorer: /api/explorer`);
  console.log(`   🔐 Auth Guide: /api/auth-guide`);
  console.log(`   💡 Examples: /api/examples`);
}