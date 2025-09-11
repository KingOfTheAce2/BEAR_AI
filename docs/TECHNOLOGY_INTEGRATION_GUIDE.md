# Technology Stack Integration Guide

## Overview

This guide provides detailed instructions for integrating the modern technology stack (Vite + TypeScript + Tauri) into BEAR AI, based on successful patterns from jan-dev.

## 1. Project Structure Setup

### 1.1 Recommended Directory Structure

```
bear-ai-v2/
├── src-tauri/                 # Tauri backend
│   ├── src/
│   │   ├── main.rs           # Tauri main process
│   │   ├── commands.rs       # Tauri commands
│   │   ├── agents/           # Agent management
│   │   └── services/         # Native services
│   ├── tauri.conf.json       # Tauri configuration
│   ├── Cargo.toml            # Rust dependencies
│   └── build.rs              # Build script
├── src/                       # Frontend TypeScript/React
│   ├── components/           # UI components
│   │   ├── agents/          # Agent UI components
│   │   ├── legal/           # Legal-specific components
│   │   ├── privacy/         # Privacy components
│   │   └── shared/          # Shared components
│   ├── services/            # Frontend services
│   │   ├── agent-orchestrator.ts
│   │   ├── model-manager.ts
│   │   └── resource-manager.ts
│   ├── types/               # TypeScript definitions
│   │   ├── agents.ts
│   │   ├── legal.ts
│   │   └── api.ts
│   ├── hooks/               # React hooks
│   ├── utils/               # Utilities
│   ├── stores/              # State management
│   ├── App.tsx              # Main app component
│   └── main.tsx             # Entry point
├── core/                     # Core library (shared)
│   ├── src/
│   │   ├── types/           # Shared types
│   │   ├── agents/          # Agent interfaces
│   │   └── services/        # Shared services
│   ├── package.json
│   └── tsconfig.json
├── extensions/               # Extension system
│   ├── legal-extension/
│   ├── privacy-extension/
│   └── model-extension/
├── python-bridge/            # Python integration layer
│   ├── src/
│   │   ├── bridge.py        # Python-Rust bridge
│   │   ├── models/          # Model wrappers
│   │   └── services/        # Python services
│   └── requirements.txt
├── docs/                     # Documentation
├── tests/                    # Test files
├── scripts/                  # Build scripts
├── package.json              # Node.js config
├── vite.config.ts           # Vite configuration
├── tsconfig.json            # TypeScript config
└── tauri.conf.json          # Tauri config
```

### 1.2 Package.json Configuration

```json
{
  "name": "bear-ai-v2",
  "private": true,
  "version": "2.0.0",
  "type": "module",
  "workspaces": {
    "packages": [
      "core",
      "extensions/*"
    ]
  },
  "scripts": {
    "dev": "tauri dev",
    "build": "npm run build:web && tauri build",
    "build:web": "vite build",
    "build:core": "cd core && npm run build",
    "build:extensions": "npm run build:core && npm run build:all-extensions",
    "build:all-extensions": "npm run build:legal-ext && npm run build:privacy-ext && npm run build:model-ext",
    "build:legal-ext": "cd extensions/legal-extension && npm run build",
    "build:privacy-ext": "cd extensions/privacy-extension && npm run build",
    "build:model-ext": "cd extensions/model-extension && npm run build",
    "test": "vitest",
    "test:e2e": "playwright test",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "preview": "vite preview",
    "tauri": "tauri"
  },
  "dependencies": {
    "@tauri-apps/api": "^2.7.0",
    "@tauri-apps/plugin-fs": "^2.0.0",
    "@tauri-apps/plugin-shell": "^2.0.0",
    "@tauri-apps/plugin-os": "^2.0.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.1",
    "zustand": "^5.0.0",
    "react-query": "^3.39.3",
    "framer-motion": "^11.5.4",
    "lucide-react": "^0.441.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.5.2"
  },
  "devDependencies": {
    "@tauri-apps/cli": "^2.7.0",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@typescript-eslint/eslint-plugin": "^8.5.0",
    "@typescript-eslint/parser": "^8.5.0",
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.4.20",
    "eslint": "^9.9.0",
    "eslint-plugin-react-hooks": "^5.1.0-rc.0",
    "eslint-plugin-react-refresh": "^0.4.9",
    "postcss": "^8.4.41",
    "tailwindcss": "^3.4.10",
    "typescript": "^5.5.3",
    "vite": "^5.4.1",
    "vitest": "^2.0.5",
    "@playwright/test": "^1.47.0"
  }
}
```

## 2. Vite Configuration

### 2.1 Enhanced Vite Config

```typescript
// vite.config.ts
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import tailwindcss from '@tailwindcss/vite'

const host = process.env.TAURI_DEV_HOST

export default defineConfig(async ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
        '@core': resolve(__dirname, './core/src'),
        '@components': resolve(__dirname, './src/components'),
        '@services': resolve(__dirname, './src/services'),
        '@types': resolve(__dirname, './src/types'),
        '@utils': resolve(__dirname, './src/utils'),
        '@stores': resolve(__dirname, './src/stores'),
        '@hooks': resolve(__dirname, './src/hooks'),
      },
    },
    
    define: {
      // Platform detection
      IS_TAURI: JSON.stringify(true),
      IS_DESKTOP: JSON.stringify(true),
      IS_DEV: JSON.stringify(mode === 'development'),
      
      // BEAR AI specific
      PRIVACY_MODE: JSON.stringify(env.PRIVACY_MODE ?? 'strict'),
      LOCAL_ONLY: JSON.stringify(env.LOCAL_ONLY ?? true),
      AUDIT_LOGGING: JSON.stringify(env.AUDIT_LOGGING ?? true),
      LEGAL_COMPLIANCE: JSON.stringify(env.LEGAL_COMPLIANCE ?? true),
      
      // Versioning
      APP_VERSION: JSON.stringify(process.env.npm_package_version),
      BUILD_TIME: JSON.stringify(new Date().toISOString()),
    },
    
    // Tauri expects a fixed port, fail if that port is not available
    server: {
      port: 1420,
      strictPort: true,
      host: host || false,
      hmr: host
        ? {
            protocol: 'ws',
            host,
            port: 1421,
          }
        : undefined,
      watch: {
        ignored: ['**/src-tauri/**', '**/python-bridge/**'],
      },
    },
    
    build: {
      // Tauri uses Chromium on Windows and WebKit on macOS and Linux
      target: process.env.TAURI_ENV_PLATFORM == 'windows' ? 'chrome105' : 'safari13',
      // Don't minify for debug builds
      minify: !process.env.TAURI_ENV_DEBUG ? 'esbuild' : false,
      // Produce sourcemaps for debug builds
      sourcemap: !!process.env.TAURI_ENV_DEBUG,
      
      rollupOptions: {
        external: ['electron'],
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            ui: ['framer-motion', 'lucide-react'],
            state: ['zustand', 'react-query'],
          },
        },
      },
    },
    
    test: {
      environment: 'happy-dom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
      exclude: ['node_modules', 'dist', 'src-tauri'],
    },
  }
})
```

### 2.2 TypeScript Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "allowJs": true,
    
    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    
    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    
    /* Path mapping */
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@core/*": ["./core/src/*"],
      "@components/*": ["./src/components/*"],
      "@services/*": ["./src/services/*"],
      "@types/*": ["./src/types/*"],
      "@utils/*": ["./src/utils/*"],
      "@stores/*": ["./src/stores/*"],
      "@hooks/*": ["./src/hooks/*"]
    },
    
    /* Additional options for BEAR AI */
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "resolveJsonModule": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    
    /* Type definitions */
    "types": ["vite/client", "vitest/globals", "@types/node"]
  },
  "include": [
    "src",
    "core/src",
    "extensions/*/src",
    "vite.config.ts"
  ],
  "exclude": [
    "node_modules",
    "dist",
    "src-tauri",
    "python-bridge"
  ],
  "references": [
    { "path": "./tsconfig.node.json" }
  ]
}
```

## 3. Tauri Integration

### 3.1 Tauri Configuration

```json
// src-tauri/tauri.conf.json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "BEAR AI",
  "version": "2.0.0",
  "identifier": "ai.bear.legal-assistant",
  "build": {
    "frontendDist": "../dist",
    "devUrl": "http://localhost:1420",
    "beforeDevCommand": "npm run dev:frontend",
    "beforeBuildCommand": "npm run build:frontend"
  },
  "app": {
    "withGlobalTauri": false,
    "macOSPrivateApi": true,
    "windows": [
      {
        "label": "main",
        "title": "BEAR AI - Legal Assistant",
        "width": 1200,
        "height": 800,
        "minWidth": 800,
        "minHeight": 600,
        "center": true,
        "resizable": true,
        "maximizable": true,
        "minimizable": true,
        "closable": true,
        "decorations": true,
        "alwaysOnTop": false,
        "fullscreen": false,
        "transparent": false,
        "shadow": true,
        "focus": true,
        "visible": true,
        "titleBarStyle": "Default"
      }
    ],
    "security": {
      "csp": {
        "default-src": "'self' customprotocol: asset: http://localhost:* http://127.0.0.1:*",
        "connect-src": "'self' http://localhost:* http://127.0.0.1:* ws://localhost:* ws://127.0.0.1:*",
        "font-src": "'self' data:",
        "img-src": "'self' asset: http://asset.localhost blob: data: https:",
        "style-src": "'unsafe-inline' 'self'",
        "script-src": "'self' 'unsafe-inline'"
      },
      "assetProtocol": {
        "enable": true,
        "scope": {
          "allow": ["**/*"],
          "deny": []
        }
      }
    }
  },
  "bundle": {
    "active": true,
    "createUpdaterArtifacts": false,
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ],
    "resources": [
      "resources/models/*",
      "resources/python/*"
    ],
    "externalBin": [
      "python",
      "llamacpp"
    ]
  },
  "plugins": {
    "fs": {
      "scope": {
        "allow": [
          "$APPDATA/bear-ai",
          "$DOCUMENT",
          "$DOWNLOAD",
          "$DESKTOP"
        ],
        "deny": [
          "$APPDATA/bear-ai/private"
        ]
      }
    },
    "shell": {
      "scope": [
        {
          "name": "python",
          "cmd": "python",
          "args": true,
          "sidecar": false
        },
        {
          "name": "llamacpp",
          "cmd": "llamacpp",
          "args": true,
          "sidecar": true
        }
      ]
    },
    "os": {},
    "process": {},
    "notification": {
      "default": "allowed"
    }
  }
}
```

### 3.2 Rust Backend Structure

```rust
// src-tauri/src/main.rs
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{App, Manager, Window, WindowEvent};
use std::collections::HashMap;
use serde::{Deserialize, Serialize};

mod commands;
mod agents;
mod services;
mod models;
mod utils;

use commands::*;
use agents::AgentManager;
use services::ResourceManager;

#[derive(Debug, Serialize, Deserialize)]
pub struct AppState {
    pub agent_manager: AgentManager,
    pub resource_manager: ResourceManager,
    pub config: AppConfig,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AppConfig {
    pub privacy_mode: String,
    pub local_only: bool,
    pub audit_logging: bool,
    pub max_agents: usize,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            privacy_mode: "strict".to_string(),
            local_only: true,
            audit_logging: true,
            max_agents: 10,
        }
    }
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            // Initialize app state
            let state = AppState {
                agent_manager: AgentManager::new(),
                resource_manager: ResourceManager::new(),
                config: AppConfig::default(),
            };
            
            app.manage(state);
            
            // Set up window event handlers
            let window = app.get_webview_window("main").unwrap();
            setup_window_events(&window);
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Agent management
            spawn_agent,
            stop_agent,
            list_agents,
            get_agent_status,
            
            // Model management
            load_model,
            unload_model,
            list_models,
            get_model_info,
            
            // Resource management
            get_system_resources,
            optimize_resources,
            
            // File operations
            read_document,
            write_document,
            process_document,
            
            // Privacy operations
            audit_privacy,
            encrypt_data,
            decrypt_data,
            
            // System operations
            get_system_info,
            update_config,
        ])
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_notification::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn setup_window_events(window: &Window) {
    let window_clone = window.clone();
    window.on_window_event(move |event| {
        match event {
            WindowEvent::CloseRequested { .. } => {
                // Clean up agents and resources before closing
                if let Some(state) = window_clone.state::<AppState>().get() {
                    state.agent_manager.shutdown_all();
                    state.resource_manager.cleanup();
                }
            }
            _ => {}
        }
    });
}
```

### 3.3 Tauri Commands

```rust
// src-tauri/src/commands.rs
use tauri::{AppHandle, State};
use serde::{Deserialize, Serialize};
use crate::{AppState, agents::Agent};

#[derive(Debug, Serialize, Deserialize)]
pub struct SpawnAgentRequest {
    pub agent_type: String,
    pub config: serde_json::Value,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AgentInfo {
    pub id: String,
    pub agent_type: String,
    pub status: String,
    pub capabilities: Vec<String>,
    pub resource_usage: ResourceUsage,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ResourceUsage {
    pub cpu_percent: f64,
    pub memory_mb: u64,
    pub gpu_percent: Option<f64>,
}

#[tauri::command]
pub async fn spawn_agent(
    app_handle: AppHandle,
    state: State<'_, AppState>,
    request: SpawnAgentRequest,
) -> Result<String, String> {
    state
        .agent_manager
        .spawn_agent(&request.agent_type, request.config)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn stop_agent(
    state: State<'_, AppState>,
    agent_id: String,
) -> Result<(), String> {
    state
        .agent_manager
        .stop_agent(&agent_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_agents(
    state: State<'_, AppState>,
) -> Result<Vec<AgentInfo>, String> {
    state
        .agent_manager
        .list_agents()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_system_resources() -> Result<ResourceUsage, String> {
    // Implementation for system resource monitoring
    Ok(ResourceUsage {
        cpu_percent: 25.5,
        memory_mb: 1024,
        gpu_percent: Some(15.0),
    })
}

#[tauri::command]
pub async fn process_document(
    state: State<'_, AppState>,
    document_path: String,
    processor_type: String,
) -> Result<serde_json::Value, String> {
    // Implementation for document processing
    Ok(serde_json::json!({
        "status": "processed",
        "document_path": document_path,
        "processor_type": processor_type,
        "results": []
    }))
}
```

## 4. Python Bridge Integration

### 4.1 Python-Rust Bridge

```python
# python-bridge/src/bridge.py
import json
import sys
from typing import Dict, Any, List
from dataclasses import dataclass, asdict
import asyncio
import subprocess

@dataclass
class BridgeMessage:
    command: str
    data: Dict[str, Any]
    request_id: str

@dataclass
class BridgeResponse:
    success: bool
    data: Any
    error: str = None
    request_id: str = None

class PythonBridge:
    def __init__(self):
        self.handlers = {}
        self.models = {}
        self.agents = {}
    
    def register_handler(self, command: str, handler):
        """Register a command handler"""
        self.handlers[command] = handler
    
    async def handle_message(self, message: BridgeMessage) -> BridgeResponse:
        """Handle incoming message from Rust"""
        try:
            if message.command not in self.handlers:
                return BridgeResponse(
                    success=False,
                    error=f"Unknown command: {message.command}",
                    request_id=message.request_id
                )
            
            handler = self.handlers[message.command]
            result = await handler(message.data)
            
            return BridgeResponse(
                success=True,
                data=result,
                request_id=message.request_id
            )
            
        except Exception as e:
            return BridgeResponse(
                success=False,
                error=str(e),
                request_id=message.request_id
            )
    
    def start_stdio_loop(self):
        """Start the stdio communication loop"""
        while True:
            try:
                line = sys.stdin.readline()
                if not line:
                    break
                
                message_data = json.loads(line.strip())
                message = BridgeMessage(**message_data)
                
                # Handle message asynchronously
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                response = loop.run_until_complete(
                    self.handle_message(message)
                )
                loop.close()
                
                # Send response back to Rust
                print(json.dumps(asdict(response)))
                sys.stdout.flush()
                
            except Exception as e:
                error_response = BridgeResponse(
                    success=False,
                    error=f"Bridge error: {str(e)}"
                )
                print(json.dumps(asdict(error_response)))
                sys.stdout.flush()

# Initialize bridge
bridge = PythonBridge()

# Register handlers
from .models import register_model_handlers
from .agents import register_agent_handlers
from .services import register_service_handlers

register_model_handlers(bridge)
register_agent_handlers(bridge)
register_service_handlers(bridge)

if __name__ == "__main__":
    bridge.start_stdio_loop()
```

### 4.2 Model Integration

```python
# python-bridge/src/models/llama_model.py
import asyncio
from typing import Dict, Any, AsyncGenerator
from llama_cpp import Llama
import json

class LlamaModel:
    def __init__(self, model_path: str, **kwargs):
        self.model_path = model_path
        self.model = None
        self.config = kwargs
    
    async def load(self) -> bool:
        """Load the model asynchronously"""
        try:
            # Run in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            self.model = await loop.run_in_executor(
                None,
                lambda: Llama(
                    model_path=self.model_path,
                    **self.config
                )
            )
            return True
        except Exception as e:
            print(f"Error loading model: {e}")
            return False
    
    async def generate(
        self, 
        prompt: str, 
        max_tokens: int = 256,
        **kwargs
    ) -> AsyncGenerator[str, None]:
        """Generate text from the model"""
        if not self.model:
            raise RuntimeError("Model not loaded")
        
        try:
            # Get generator from model
            stream = self.model(
                prompt,
                max_tokens=max_tokens,
                stream=True,
                **kwargs
            )
            
            # Yield tokens asynchronously
            for token_data in stream:
                token = token_data['choices'][0]['text']
                yield token
                
                # Allow other tasks to run
                await asyncio.sleep(0)
                
        except Exception as e:
            raise RuntimeError(f"Generation error: {e}")
    
    def unload(self):
        """Unload the model and free memory"""
        if self.model:
            del self.model
            self.model = None

# Register model handlers
def register_model_handlers(bridge):
    models = {}
    
    async def load_model(data: Dict[str, Any]) -> Dict[str, Any]:
        model_id = data['model_id']
        model_path = data['model_path']
        config = data.get('config', {})
        
        model = LlamaModel(model_path, **config)
        success = await model.load()
        
        if success:
            models[model_id] = model
            return {"status": "loaded", "model_id": model_id}
        else:
            return {"status": "failed", "model_id": model_id}
    
    async def generate_text(data: Dict[str, Any]) -> Dict[str, Any]:
        model_id = data['model_id']
        prompt = data['prompt']
        config = data.get('config', {})
        
        if model_id not in models:
            raise ValueError(f"Model {model_id} not loaded")
        
        model = models[model_id]
        tokens = []
        
        async for token in model.generate(prompt, **config):
            tokens.append(token)
        
        return {"text": "".join(tokens), "tokens": len(tokens)}
    
    async def unload_model(data: Dict[str, Any]) -> Dict[str, Any]:
        model_id = data['model_id']
        
        if model_id in models:
            models[model_id].unload()
            del models[model_id]
            return {"status": "unloaded", "model_id": model_id}
        else:
            return {"status": "not_found", "model_id": model_id}
    
    bridge.register_handler("load_model", load_model)
    bridge.register_handler("generate_text", generate_text)
    bridge.register_handler("unload_model", unload_model)
```

## 5. Frontend Integration

### 5.1 Agent Service Layer

```typescript
// src/services/agent-orchestrator.ts
import { invoke } from '@tauri-apps/api/core'
import type { Agent, AgentConfig, AgentType } from '@types/agents'

export class AgentOrchestrator {
  private agents: Map<string, Agent> = new Map()
  
  async spawnAgent(type: AgentType, config: AgentConfig): Promise<Agent> {
    try {
      const agentId = await invoke<string>('spawn_agent', {
        request: {
          agent_type: type,
          config
        }
      })
      
      const agent: Agent = {
        id: agentId,
        type,
        status: 'starting',
        capabilities: config.capabilities || [],
        config
      }
      
      this.agents.set(agentId, agent)
      return agent
      
    } catch (error) {
      throw new Error(`Failed to spawn agent: ${error}`)
    }
  }
  
  async stopAgent(agentId: string): Promise<void> {
    try {
      await invoke('stop_agent', { agentId })
      this.agents.delete(agentId)
    } catch (error) {
      throw new Error(`Failed to stop agent: ${error}`)
    }
  }
  
  async listAgents(): Promise<Agent[]> {
    try {
      const agentInfos = await invoke<AgentInfo[]>('list_agents')
      return agentInfos.map(info => ({
        id: info.id,
        type: info.agent_type as AgentType,
        status: info.status as AgentStatus,
        capabilities: info.capabilities,
        resourceUsage: info.resource_usage
      }))
    } catch (error) {
      throw new Error(`Failed to list agents: ${error}`)
    }
  }
  
  async coordinateTask(task: Task): Promise<TaskResult> {
    // Select appropriate agents for task
    const requiredAgents = this.selectAgentsForTask(task)
    
    // Create coordination plan
    const plan = this.createCoordinationPlan(task, requiredAgents)
    
    // Execute coordinated task
    return await this.executeCoordinatedTask(plan)
  }
  
  private selectAgentsForTask(task: Task): Agent[] {
    // Implementation for agent selection based on task requirements
    const availableAgents = Array.from(this.agents.values())
    return availableAgents.filter(agent => 
      agent.status === 'idle' &&
      task.requiredCapabilities.some(cap => 
        agent.capabilities.includes(cap)
      )
    )
  }
}
```

### 5.2 React Components

```typescript
// src/components/agents/AgentDashboard.tsx
import { useState, useEffect } from 'react'
import { AgentOrchestrator } from '@services/agent-orchestrator'
import { useAgentStore } from '@stores/agent-store'
import { AgentCard } from './AgentCard'
import { SpawnAgentDialog } from './SpawnAgentDialog'
import type { Agent } from '@types/agents'

export function AgentDashboard() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showSpawnDialog, setShowSpawnDialog] = useState(false)
  
  const orchestrator = new AgentOrchestrator()
  
  useEffect(() => {
    loadAgents()
    
    // Set up periodic refresh
    const interval = setInterval(loadAgents, 5000)
    return () => clearInterval(interval)
  }, [])
  
  const loadAgents = async () => {
    try {
      const agentList = await orchestrator.listAgents()
      setAgents(agentList)
    } catch (error) {
      console.error('Failed to load agents:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleSpawnAgent = async (type: AgentType, config: AgentConfig) => {
    try {
      await orchestrator.spawnAgent(type, config)
      await loadAgents() // Refresh list
      setShowSpawnDialog(false)
    } catch (error) {
      console.error('Failed to spawn agent:', error)
    }
  }
  
  const handleStopAgent = async (agentId: string) => {
    try {
      await orchestrator.stopAgent(agentId)
      await loadAgents() // Refresh list
    } catch (error) {
      console.error('Failed to stop agent:', error)
    }
  }
  
  if (isLoading) {
    return <div className="flex justify-center p-8">Loading agents...</div>
  }
  
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Agent Dashboard</h1>
        <button
          onClick={() => setShowSpawnDialog(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Spawn Agent
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map(agent => (
          <AgentCard
            key={agent.id}
            agent={agent}
            onStop={() => handleStopAgent(agent.id)}
          />
        ))}
      </div>
      
      {showSpawnDialog && (
        <SpawnAgentDialog
          onSpawn={handleSpawnAgent}
          onClose={() => setShowSpawnDialog(false)}
        />
      )}
    </div>
  )
}
```

## 6. Build and Deployment

### 6.1 Build Scripts

```bash
#!/bin/bash
# scripts/build.sh

set -e

echo "Building BEAR AI v2.0..."

# Clean previous builds
echo "Cleaning previous builds..."
rm -rf dist/
rm -rf src-tauri/target/release/

# Install dependencies
echo "Installing dependencies..."
npm install

# Build core library
echo "Building core library..."
cd core && npm run build && cd ..

# Build extensions
echo "Building extensions..."
npm run build:extensions

# Build frontend
echo "Building frontend..."
npm run build:web

# Build Tauri application
echo "Building Tauri application..."
npm run tauri build

echo "Build completed successfully!"
```

### 6.2 Development Scripts

```bash
#!/bin/bash
# scripts/dev.sh

set -e

echo "Starting BEAR AI development environment..."

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Build core in watch mode
echo "Starting core build watcher..."
cd core && npm run build:watch &
CORE_PID=$!
cd ..

# Build extensions in watch mode
echo "Starting extension build watchers..."
npm run build:extensions:watch &
EXT_PID=$!

# Start Tauri dev server
echo "Starting Tauri dev server..."
npm run tauri dev &
TAURI_PID=$!

# Handle cleanup on exit
cleanup() {
    echo "Cleaning up processes..."
    kill $CORE_PID 2>/dev/null || true
    kill $EXT_PID 2>/dev/null || true
    kill $TAURI_PID 2>/dev/null || true
}

trap cleanup EXIT
wait
```

## 7. Testing Integration

### 7.1 Vitest Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', 'dist', 'src-tauri'],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src-tauri/',
        'python-bridge/',
        'src/test/',
      ],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@core': resolve(__dirname, './core/src'),
      '@components': resolve(__dirname, './src/components'),
      '@services': resolve(__dirname, './src/services'),
      '@types': resolve(__dirname, './src/types'),
    },
  },
})
```

### 7.2 Test Setup

```typescript
// src/test/setup.ts
import { vi } from 'vitest'

// Mock Tauri API
const mockTauri = {
  invoke: vi.fn(),
  listen: vi.fn(),
  emit: vi.fn(),
}

Object.defineProperty(window, '__TAURI__', {
  value: mockTauri,
})

// Mock Tauri modules
vi.mock('@tauri-apps/api/core', () => ({
  invoke: mockTauri.invoke,
}))

vi.mock('@tauri-apps/api/event', () => ({
  listen: mockTauri.listen,
  emit: mockTauri.emit,
}))

// Global test configuration
global.IS_TAURI = true
global.IS_DEV = true
```

This comprehensive technology integration guide provides the foundation for modernizing BEAR AI with jan-dev inspired architecture. The next steps involve implementing the specific agent systems and testing frameworks outlined in the roadmap.