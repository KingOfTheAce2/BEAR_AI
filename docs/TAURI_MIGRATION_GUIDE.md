# BEAR AI Tauri Migration Guide

## Overview

This guide provides step-by-step instructions for migrating BEAR AI from its current multi-GUI Python/React setup to a unified Tauri-based desktop application.

## Prerequisites

Before starting the migration, ensure you have:
- Node.js 18+ installed
- Rust 1.70+ installed
- Visual Studio Build Tools (Windows)
- Existing BEAR AI React codebase

## Phase 1: Tauri Initialization

### Step 1: Install Tauri CLI

```bash
# Navigate to BEAR AI project root
cd D:\GitHub\BEAR_AI

# Install Tauri CLI as dev dependency
npm install --save-dev @tauri-apps/cli

# Install Tauri API for frontend
npm install @tauri-apps/api
```

### Step 2: Initialize Tauri

```bash
# Initialize Tauri in the existing React project
npm run tauri init
```

**Configuration Prompts:**
- App name: `BEAR AI`
- Window title: `BEAR AI Legal Assistant`
- Web assets location: `../build` (React build output)
- Development server URL: `http://localhost:3000`
- Frontend dev command: `npm start`
- Frontend build command: `npm run build`

### Step 3: Update package.json Scripts

Add Tauri scripts to `package.json`:

```json
{
  "scripts": {
    "tauri": "tauri",
    "tauri:dev": "tauri dev",
    "tauri:build": "tauri build",
    "tauri:build:debug": "tauri build --debug"
  }
}
```

### Step 4: Configure Tauri

Edit `src-tauri/tauri.conf.json`:

```json
{
  "package": {
    "productName": "BEAR AI Legal Assistant",
    "version": "1.0.0"
  },
  "build": {
    "distDir": "../build",
    "devPath": "http://localhost:3000",
    "beforeDevCommand": "npm start",
    "beforeBuildCommand": "npm run build"
  },
  "tauri": {
    "allowlist": {
      "all": false,
      "fs": {
        "all": false,
        "readFile": true,
        "writeFile": true,
        "createDir": true,
        "removeFile": true,
        "scope": ["$APPDATA/bear-ai/*", "$DOCUMENT/*"]
      },
      "path": {
        "all": true
      },
      "dialog": {
        "open": true,
        "save": true
      },
      "shell": {
        "open": true
      },
      "http": {
        "request": true,
        "scope": ["https://*"]
      }
    },
    "bundle": {
      "active": true,
      "category": "Productivity",
      "copyright": "Copyright © 2025 BEAR AI Team",
      "description": "Privacy-first legal AI assistant",
      "icon": [
        "icons/32x32.png",
        "icons/128x128.png",
        "icons/icon.icns",
        "icons/icon.ico"
      ],
      "identifier": "com.bearai.legalassistant",
      "longDescription": "BEAR AI is a privacy-first legal assistant that provides AI-powered document analysis and research capabilities. All processing happens locally on your device.",
      "macOS": {
        "entitlements": null,
        "exceptionDomain": "",
        "frameworks": [],
        "providerShortName": null,
        "signingIdentity": null
      },
      "resources": [],
      "shortDescription": "Privacy-first legal AI assistant",
      "targets": "all",
      "windows": {
        "certificateThumbprint": null,
        "digestAlgorithm": "sha256",
        "timestampUrl": ""
      }
    },
    "security": {
      "csp": null
    },
    "windows": [
      {
        "fullscreen": false,
        "height": 800,
        "resizable": true,
        "title": "BEAR AI Legal Assistant",
        "width": 1200,
        "minWidth": 800,
        "minHeight": 600,
        "center": true
      }
    ]
  }
}
```

## Phase 2: Frontend Integration

### Step 1: Update React App for Tauri

Update `src/App.tsx` to detect Tauri environment:

```typescript
import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { appWindow } from '@tauri-apps/api/window';
import { AppLayout } from './components/layout/AppLayout';
import { User } from './types';
import './styles/globals.css';

// Check if running in Tauri
const isTauri = window.__TAURI__ !== undefined;

const mockUser: User = {
  id: '1',
  name: 'Sarah Johnson',
  email: 'sarah.johnson@lawfirm.com',
  role: 'attorney',
  firm: 'Johnson & Associates Law Firm',
  avatar: undefined
};

function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (isTauri) {
      // Initialize Tauri-specific functionality
      appWindow.setTitle('BEAR AI Legal Assistant');
      
      // Set up window event listeners
      appWindow.listen('tauri://close-requested', () => {
        // Handle app shutdown
        appWindow.close();
      });
    }
    
    setIsReady(true);
  }, []);

  if (!isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-legal">
        <div className="text-white text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold">Loading BEAR AI...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <AppLayout initialUser={mockUser} />
    </div>
  );
}

export default App;
```

### Step 2: Create Tauri Utilities

Create `src/utils/tauri.ts`:

```typescript
import { invoke } from '@tauri-apps/api/tauri';
import { save, open } from '@tauri-apps/api/dialog';
import { readTextFile, writeTextFile, createDir, BaseDirectory } from '@tauri-apps/api/fs';
import { appDataDir, documentDir } from '@tauri-apps/api/path';

export const isTauri = window.__TAURI__ !== undefined;

// File operations
export async function selectFile(filters?: { name: string; extensions: string[] }[]): Promise<string | null> {
  if (!isTauri) return null;
  
  return await open({
    multiple: false,
    filters: filters || [
      { name: 'Documents', extensions: ['pdf', 'docx', 'txt'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  }) as string | null;
}

export async function saveFile(content: string, defaultName?: string): Promise<string | null> {
  if (!isTauri) return null;
  
  const filePath = await save({
    defaultPath: defaultName,
    filters: [
      { name: 'Text Files', extensions: ['txt'] },
      { name: 'JSON Files', extensions: ['json'] }
    ]
  });
  
  if (filePath) {
    await writeTextFile(filePath, content);
  }
  
  return filePath;
}

export async function readFile(filePath: string): Promise<string> {
  if (!isTauri) throw new Error('File operations not available in web mode');
  return await readTextFile(filePath);
}

export async function writeFile(filePath: string, content: string): Promise<void> {
  if (!isTauri) throw new Error('File operations not available in web mode');
  await writeTextFile(filePath, content);
}

// Directory operations
export async function ensureAppDataDir(): Promise<string> {
  const appDataPath = await appDataDir();
  const bearAiPath = `${appDataPath}bear-ai`;
  
  try {
    await createDir(bearAiPath, { recursive: true });
  } catch (e) {
    // Directory might already exist
  }
  
  return bearAiPath;
}

// Configuration management
export async function loadConfig(): Promise<any> {
  try {
    const configPath = `${await ensureAppDataDir()}/config.json`;
    const configContent = await readTextFile(configPath);
    return JSON.parse(configContent);
  } catch (e) {
    // Return default config if file doesn't exist
    return {
      theme: 'light',
      language: 'en',
      privacy: {
        enablePiiDetection: true,
        scrubSensitiveData: true
      }
    };
  }
}

export async function saveConfig(config: any): Promise<void> {
  const configPath = `${await ensureAppDataDir()}/config.json`;
  await writeTextFile(configPath, JSON.stringify(config, null, 2));
}
```

## Phase 3: Backend Migration

### Step 1: Create Rust Backend Structure

Create backend commands in `src-tauri/src/main.rs`:

```rust
#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use std::fs;
use std::path::Path;
use serde::{Deserialize, Serialize};
use tauri::{Manager, State};
use regex::Regex;

#[derive(Debug, Serialize, Deserialize)]
struct DocumentInfo {
    name: String,
    size: u64,
    file_type: String,
    content: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct PiiReport {
    found_pii: bool,
    pii_types: Vec<String>,
    cleaned_content: String,
    warnings: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct ModelInfo {
    id: String,
    name: String,
    size: String,
    status: String,
}

// Document processing command
#[tauri::command]
async fn process_document(file_path: String) -> Result<DocumentInfo, String> {
    let path = Path::new(&file_path);
    
    if !path.exists() {
        return Err("File does not exist".to_string());
    }
    
    let metadata = fs::metadata(&path)
        .map_err(|e| format!("Failed to read file metadata: {}", e))?;
    
    let content = match path.extension().and_then(|s| s.to_str()) {
        Some("txt") => {
            fs::read_to_string(&path)
                .map_err(|e| format!("Failed to read text file: {}", e))?
        },
        Some("pdf") => {
            // TODO: Implement PDF processing
            "PDF content extraction not yet implemented".to_string()
        },
        Some("docx") => {
            // TODO: Implement DOCX processing  
            "DOCX content extraction not yet implemented".to_string()
        },
        _ => return Err("Unsupported file type".to_string()),
    };
    
    Ok(DocumentInfo {
        name: path.file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string(),
        size: metadata.len(),
        file_type: path.extension()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string(),
        content,
    })
}

// PII detection command
#[tauri::command]
async fn scan_pii(content: String) -> Result<PiiReport, String> {
    let mut pii_types = Vec::new();
    let mut warnings = Vec::new();
    let mut cleaned_content = content.clone();
    
    // SSN detection
    let ssn_regex = Regex::new(r"\b\d{3}-\d{2}-\d{4}\b|\b\d{9}\b")
        .map_err(|e| format!("Regex error: {}", e))?;
    if ssn_regex.is_match(&content) {
        pii_types.push("SSN".to_string());
        warnings.push("Social Security Numbers detected".to_string());
        cleaned_content = ssn_regex.replace_all(&cleaned_content, "[SSN REDACTED]").to_string();
    }
    
    // Email detection
    let email_regex = Regex::new(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b")
        .map_err(|e| format!("Regex error: {}", e))?;
    if email_regex.is_match(&content) {
        pii_types.push("Email".to_string());
        warnings.push("Email addresses detected".to_string());
        cleaned_content = email_regex.replace_all(&cleaned_content, "[EMAIL REDACTED]").to_string();
    }
    
    // Phone number detection
    let phone_regex = Regex::new(r"\b(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b")
        .map_err(|e| format!("Regex error: {}", e))?;
    if phone_regex.is_match(&content) {
        pii_types.push("Phone".to_string());
        warnings.push("Phone numbers detected".to_string());
        cleaned_content = phone_regex.replace_all(&cleaned_content, "[PHONE REDACTED]").to_string();
    }
    
    Ok(PiiReport {
        found_pii: !pii_types.is_empty(),
        pii_types,
        cleaned_content,
        warnings,
    })
}

// Model management command
#[tauri::command]
async fn get_available_models() -> Result<Vec<ModelInfo>, String> {
    // TODO: Implement model discovery
    Ok(vec![
        ModelInfo {
            id: "llama-3.2-3b".to_string(),
            name: "Llama 3.2 3B".to_string(),
            size: "1.6GB".to_string(),
            status: "Available".to_string(),
        },
        ModelInfo {
            id: "mistral-7b".to_string(),
            name: "Mistral 7B".to_string(),
            size: "4.1GB".to_string(),
            status: "Available".to_string(),
        },
    ])
}

#[tauri::command]
async fn download_model(model_id: String) -> Result<String, String> {
    // TODO: Implement model download with progress
    Ok(format!("Model {} download started", model_id))
}

// System info command
#[tauri::command]
async fn get_system_info() -> Result<serde_json::Value, String> {
    let info = serde_json::json!({
        "platform": std::env::consts::OS,
        "arch": std::env::consts::ARCH,
        "version": "1.0.0",
        "rust_version": env!("RUSTC_VERSION"),
    });
    
    Ok(info)
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            process_document,
            scan_pii,
            get_available_models,
            download_model,
            get_system_info
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### Step 2: Update Cargo.toml Dependencies

Edit `src-tauri/Cargo.toml`:

```toml
[package]
name = "bear-ai"
version = "1.0.0"
description = "BEAR AI Legal Assistant"
authors = ["BEAR AI Team"]
license = "PROPRIETARY"
repository = ""
edition = "2021"
rust-version = "1.70"

[build-dependencies]
tauri-build = { version = "1.0", features = [] }

[dependencies]
serde_json = "1.0"
serde = { version = "1.0", features = ["derive"] }
tauri = { version = "1.0", features = ["api-all", "system-tray"] }
regex = "1.10"
tokio = { version = "1.0", features = ["full"] }
reqwest = { version = "0.11", features = ["json", "stream"] }
pdf-extract = "0.7"
zip = "0.6"
```

## Phase 4: Integration Testing

### Step 1: Test Development Build

```bash
# Start development server
npm run tauri:dev
```

This should:
1. Build the React frontend
2. Start the Rust backend
3. Open the Tauri application window
4. Enable hot reload for both frontend and backend

### Step 2: Test Production Build

```bash
# Build production executable
npm run tauri:build
```

The output will be in `src-tauri/target/release/`:
- `bear-ai.exe` - The main executable
- Bundle files (MSI installer) in `src-tauri/target/release/bundle/`

### Step 3: Test Core Functionality

Create test scripts to verify:

1. **File Operations**:
```typescript
// Test file selection and processing
const testFileOperations = async () => {
  const filePath = await selectFile();
  if (filePath) {
    const docInfo = await invoke('process_document', { filePath });
    console.log('Document processed:', docInfo);
  }
};
```

2. **PII Detection**:
```typescript
// Test PII scanning
const testPiiScanning = async () => {
  const testText = "Contact John at john@example.com or 555-123-4567";
  const piiReport = await invoke('scan_pii', { content: testText });
  console.log('PII Report:', piiReport);
};
```

3. **System Integration**:
```typescript
// Test system info
const testSystemInfo = async () => {
  const sysInfo = await invoke('get_system_info');
  console.log('System Info:', sysInfo);
};
```

## Phase 5: Deployment Configuration

### Step 1: Create Icons

Generate application icons:
1. Create source PNG (512x512)
2. Use online icon generators or tools to create:
   - `icons/32x32.png`
   - `icons/128x128.png`
   - `icons/icon.ico` (Windows)
   - `icons/icon.icns` (macOS)

### Step 2: Configure Windows Installer

Update `tauri.conf.json` for Windows deployment:

```json
{
  "tauri": {
    "bundle": {
      "windows": {
        "certificateThumbprint": null,
        "digestAlgorithm": "sha256",
        "timestampUrl": "",
        "wix": {
          "language": "en-US",
          "template": null,
          "fragmentPaths": [],
          "componentRefs": [],
          "featureRefs": [],
          "mergeRefs": [],
          "skipWebviewInstall": false,
          "license": "LICENSE.txt",
          "enableElevatedUpdateTask": false,
          "bannerPath": null,
          "dialogImagePath": null
        },
        "nsis": {
          "license": "LICENSE.txt",
          "headerImage": null,
          "sidebarImage": null,
          "installerIcon": "icons/icon.ico",
          "installMode": "perMachine",
          "languages": ["English"],
          "displayLanguageSelector": false,
          "customLanguageFiles": {},
          "template": null
        }
      }
    }
  }
}
```

### Step 3: Build Final Executable

```bash
# Build optimized release
npm run tauri:build

# The installer will be created in:
# src-tauri/target/release/bundle/msi/BEAR AI Legal Assistant_1.0.0_x64_en-US.msi
# src-tauri/target/release/bundle/nsis/BEAR AI Legal Assistant_1.0.0_x64-setup.exe
```

## Migration Validation Checklist

- [ ] **Basic Functionality**
  - [ ] Application starts without errors
  - [ ] Main UI renders correctly
  - [ ] File operations work (open, save, read)
  - [ ] PII detection functions properly
  - [ ] Configuration saves and loads

- [ ] **Performance**
  - [ ] Startup time < 2 seconds
  - [ ] Memory usage < 100MB
  - [ ] File processing responsive
  - [ ] No memory leaks during extended use

- [ ] **Windows Integration**
  - [ ] Executable runs on Windows 10/11
  - [ ] Installer works without admin rights
  - [ ] Desktop shortcuts created
  - [ ] File associations work
  - [ ] Uninstaller removes all components

- [ ] **Security**
  - [ ] File system access properly scoped
  - [ ] PII detection working
  - [ ] No network requests without user consent
  - [ ] Data stays local

## Troubleshooting

### Common Build Issues

1. **Rust Build Fails**:
```bash
# Update Rust toolchain
rustup update
rustup target add x86_64-pc-windows-msvc
```

2. **WebView2 Missing**:
```bash
# Download WebView2 installer
# https://developer.microsoft.com/en-us/microsoft-edge/webview2/
```

3. **Icon Generation Issues**:
```bash
# Install tauri-icon utility
cargo install tauri-icon
# Generate icons from PNG
tauri-icon path/to/icon.png
```

### Development Tips

1. **Debug Rust Backend**:
```rust
// Add debug prints
println!("Debug: {:#?}", variable);
// Or use proper logging
log::info!("Processing file: {}", file_path);
```

2. **Frontend-Backend Communication**:
```typescript
// Always handle errors
try {
  const result = await invoke('command_name', { param: value });
} catch (error) {
  console.error('Backend error:', error);
}
```

3. **Hot Reload Issues**:
```bash
# Clear cache and restart
rm -rf node_modules/.cache
npm run tauri:dev
```

## Next Steps

After successful migration:

1. **Feature Enhancement**:
   - Add auto-update capability
   - Implement advanced document processing
   - Add model management UI

2. **Distribution**:
   - Code signing for Windows
   - Create update server
   - Package for Microsoft Store

3. **Cross-Platform**:
   - Test macOS build
   - Prepare Linux distribution

4. **Monitoring**:
   - Add telemetry (privacy-compliant)
   - Error reporting system
   - Performance monitoring

This migration guide provides a comprehensive path from the current multi-GUI architecture to a unified Tauri-based application that solves BEAR AI's Windows deployment challenges while maintaining its privacy-first principles.