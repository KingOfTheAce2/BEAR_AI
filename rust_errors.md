
Skip to content
Navigation Menu
KingOfTheAce2
BEAR_AI

Code
Issues
Pull requests
Actions
Projects
Wiki
Security 6
Insights

    Settings

BEAR AI - Build & Deploy
🚀 Alpha Release Configuration: Bypass TypeScript/ESLint for v1.0.0-alpha #34

Jobs

Run details

Annotations
1 error and 1 warning
Code Quality & Security
failed 1 hour ago in 1m 27s
1s
1s
1s
1s
0s
0s
10s
10s
0s
0s
1m 12s
1m 12s
0s
0s
0s
0s
1s
Run cargo fmt --all -- --check
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/build.rs:18:
             println!("cargo:rustc-link-arg=/SUBSYSTEM:WINDOWS");
 
             // Set version info
-            println!("cargo:rustc-env=CARGO_PKG_VERSION={}", env!("CARGO_PKG_VERSION"));
+            println!(
+                "cargo:rustc-env=CARGO_PKG_VERSION={}",
+                env!("CARGO_PKG_VERSION")
+            );
         }
 
         if cfg!(target_os = "macos") {
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/build.rs:29:
     }
 
     // Set build metadata
-    println!("cargo:rustc-env=BUILD_TIMESTAMP={}", std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_secs());
+    println!(
+        "cargo:rustc-env=BUILD_TIMESTAMP={}",
+        std::time::SystemTime::now()
+            .duration_since(std::time::UNIX_EPOCH)
+            .unwrap()
+            .as_secs()
+    );
 
     // Set Git information if available
     if let Ok(output) = std::process::Command::new("git")
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/build.rs:44:
 
     tauri_build::build()
 }
+
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/chat_export.rs:1:
 use anyhow::{Context, Result};
-use serde::{Deserialize, Serialize};
-use std::collections::HashMap;
-use std::path::{Path, PathBuf};
 use chrono::{DateTime, Utc};
 use printpdf::*;
+use serde::{Deserialize, Serialize};
+use std::collections::HashMap;
 use std::fs;
+use std::path::{Path, PathBuf};
 
 /// Chat Export Engine for BEAR AI
 /// Provides export functionality for chat conversations in multiple formats
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/chat_export.rs:82:
         if options.include_metadata {
             content.push_str("## Session Information\n\n");
             content.push_str(&format!("- **Session ID**: {}\n", session.id));
-            content.push_str(&format!("- **Created**: {}\n", session.created_at.format("%Y-%m-%d %H:%M:%S UTC")));
-            content.push_str(&format!("- **Last Updated**: {}\n", session.updated_at.format("%Y-%m-%d %H:%M:%S UTC")));
-            content.push_str(&format!("- **Total Messages**: {}\n\n", session.messages.len()));
+            content.push_str(&format!(
+                "- **Created**: {}\n",
+                session.created_at.format("%Y-%m-%d %H:%M:%S UTC")
+            ));
+            content.push_str(&format!(
+                "- **Last Updated**: {}\n",
+                session.updated_at.format("%Y-%m-%d %H:%M:%S UTC")
+            ));
+            content.push_str(&format!(
+                "- **Total Messages**: {}\n\n",
+                session.messages.len()
+            ));
 
             // Add custom metadata
             if !session.metadata.is_empty() {
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/chat_export.rs:150:
         if options.include_metadata {
             content.push_str("\nSESSION INFORMATION:\n");
             content.push_str(&format!("Session ID: {}\n", session.id));
-            content.push_str(&format!("Created: {}\n", session.created_at.format("%Y-%m-%d %H:%M:%S UTC")));
-            content.push_str(&format!("Last Updated: {}\n", session.updated_at.format("%Y-%m-%d %H:%M:%S UTC")));
+            content.push_str(&format!(
+                "Created: {}\n",
+                session.created_at.format("%Y-%m-%d %H:%M:%S UTC")
+            ));
+            content.push_str(&format!(
+                "Last Updated: {}\n",
+                session.updated_at.format("%Y-%m-%d %H:%M:%S UTC")
+            ));
             content.push_str(&format!("Total Messages: {}\n", session.messages.len()));
         }
 
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/chat_export.rs:206:
         let file_path = self.export_path.join(&filename);
 
         // Create PDF document
-        let (doc, page1, layer1) = PdfDocument::new(&session.title, Mm(210.0), Mm(297.0), "Layer 1");
1s
Run cargo fmt --all -- --check
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/build.rs:18:
             println!("cargo:rustc-link-arg=/SUBSYSTEM:WINDOWS");
 
             // Set version info
-            println!("cargo:rustc-env=CARGO_PKG_VERSION={}", env!("CARGO_PKG_VERSION"));
+            println!(
+                "cargo:rustc-env=CARGO_PKG_VERSION={}",
+                env!("CARGO_PKG_VERSION")
+            );
         }
 
         if cfg!(target_os = "macos") {
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/build.rs:29:
     }
 
     // Set build metadata
-    println!("cargo:rustc-env=BUILD_TIMESTAMP={}", std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_secs());
+    println!(
+        "cargo:rustc-env=BUILD_TIMESTAMP={}",
+        std::time::SystemTime::now()
+            .duration_since(std::time::UNIX_EPOCH)
+            .unwrap()
+            .as_secs()
+    );
 
     // Set Git information if available
     if let Ok(output) = std::process::Command::new("git")
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/build.rs:44:
 
     tauri_build::build()
 }
+
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/chat_export.rs:1:
 use anyhow::{Context, Result};
-use serde::{Deserialize, Serialize};
-use std::collections::HashMap;
-use std::path::{Path, PathBuf};
 use chrono::{DateTime, Utc};
 use printpdf::*;
+use serde::{Deserialize, Serialize};
+use std::collections::HashMap;
 use std::fs;
+use std::path::{Path, PathBuf};
 
 /// Chat Export Engine for BEAR AI
 /// Provides export functionality for chat conversations in multiple formats
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/chat_export.rs:82:
         if options.include_metadata {
             content.push_str("## Session Information\n\n");
             content.push_str(&format!("- **Session ID**: {}\n", session.id));
-            content.push_str(&format!("- **Created**: {}\n", session.created_at.format("%Y-%m-%d %H:%M:%S UTC")));
-            content.push_str(&format!("- **Last Updated**: {}\n", session.updated_at.format("%Y-%m-%d %H:%M:%S UTC")));
-            content.push_str(&format!("- **Total Messages**: {}\n\n", session.messages.len()));
+            content.push_str(&format!(
+                "- **Created**: {}\n",
+                session.created_at.format("%Y-%m-%d %H:%M:%S UTC")
+            ));
+            content.push_str(&format!(
+                "- **Last Updated**: {}\n",
+                session.updated_at.format("%Y-%m-%d %H:%M:%S UTC")
+            ));
+            content.push_str(&format!(
+                "- **Total Messages**: {}\n\n",
+                session.messages.len()
+            ));
 
             // Add custom metadata
             if !session.metadata.is_empty() {
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/chat_export.rs:150:
         if options.include_metadata {
             content.push_str("\nSESSION INFORMATION:\n");
             content.push_str(&format!("Session ID: {}\n", session.id));
-            content.push_str(&format!("Created: {}\n", session.created_at.format("%Y-%m-%d %H:%M:%S UTC")));
-            content.push_str(&format!("Last Updated: {}\n", session.updated_at.format("%Y-%m-%d %H:%M:%S UTC")));
+            content.push_str(&format!(
+                "Created: {}\n",
+                session.created_at.format("%Y-%m-%d %H:%M:%S UTC")
+            ));
+            content.push_str(&format!(
+                "Last Updated: {}\n",
+                session.updated_at.format("%Y-%m-%d %H:%M:%S UTC")
+            ));
             content.push_str(&format!("Total Messages: {}\n", session.messages.len()));
         }
 
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/chat_export.rs:206:
         let file_path = self.export_path.join(&filename);
 
         // Create PDF document
-        let (doc, page1, layer1) = PdfDocument::new(&session.title, Mm(210.0), Mm(297.0), "Layer 1");
Run cargo fmt --all -- --check
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/build.rs:18:
             println!("cargo:rustc-link-arg=/SUBSYSTEM:WINDOWS");
 
             // Set version info
-            println!("cargo:rustc-env=CARGO_PKG_VERSION={}", env!("CARGO_PKG_VERSION"));
+            println!(
+                "cargo:rustc-env=CARGO_PKG_VERSION={}",
+                env!("CARGO_PKG_VERSION")
+            );
         }
 
         if cfg!(target_os = "macos") {
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/build.rs:29:
     }
 
     // Set build metadata
-    println!("cargo:rustc-env=BUILD_TIMESTAMP={}", std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_secs());
+    println!(
+        "cargo:rustc-env=BUILD_TIMESTAMP={}",
+        std::time::SystemTime::now()
+            .duration_since(std::time::UNIX_EPOCH)
+            .unwrap()
+            .as_secs()
+    );
 
     // Set Git information if available
     if let Ok(output) = std::process::Command::new("git")
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/build.rs:44:
 
     tauri_build::build()
 }
+
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/chat_export.rs:1:
 use anyhow::{Context, Result};
-use serde::{Deserialize, Serialize};
-use std::collections::HashMap;
-use std::path::{Path, PathBuf};
 use chrono::{DateTime, Utc};
 use printpdf::*;
+use serde::{Deserialize, Serialize};
+use std::collections::HashMap;
 use std::fs;
+use std::path::{Path, PathBuf};
 
 /// Chat Export Engine for BEAR AI
 /// Provides export functionality for chat conversations in multiple formats
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/chat_export.rs:82:
         if options.include_metadata {
             content.push_str("## Session Information\n\n");
             content.push_str(&format!("- **Session ID**: {}\n", session.id));
-            content.push_str(&format!("- **Created**: {}\n", session.created_at.format("%Y-%m-%d %H:%M:%S UTC")));
-            content.push_str(&format!("- **Last Updated**: {}\n", session.updated_at.format("%Y-%m-%d %H:%M:%S UTC")));
-            content.push_str(&format!("- **Total Messages**: {}\n\n", session.messages.len()));
+            content.push_str(&format!(
+                "- **Created**: {}\n",
+                session.created_at.format("%Y-%m-%d %H:%M:%S UTC")
+            ));
+            content.push_str(&format!(
+                "- **Last Updated**: {}\n",
+                session.updated_at.format("%Y-%m-%d %H:%M:%S UTC")
+            ));
+            content.push_str(&format!(
+                "- **Total Messages**: {}\n\n",
+                session.messages.len()
+            ));
 
             // Add custom metadata
             if !session.metadata.is_empty() {
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/chat_export.rs:150:
         if options.include_metadata {
             content.push_str("\nSESSION INFORMATION:\n");
             content.push_str(&format!("Session ID: {}\n", session.id));
-            content.push_str(&format!("Created: {}\n", session.created_at.format("%Y-%m-%d %H:%M:%S UTC")));
-            content.push_str(&format!("Last Updated: {}\n", session.updated_at.format("%Y-%m-%d %H:%M:%S UTC")));
+            content.push_str(&format!(
+                "Created: {}\n",
+                session.created_at.format("%Y-%m-%d %H:%M:%S UTC")
+            ));
+            content.push_str(&format!(
+                "Last Updated: {}\n",
+                session.updated_at.format("%Y-%m-%d %H:%M:%S UTC")
+            ));
             content.push_str(&format!("Total Messages: {}\n", session.messages.len()));
         }
 
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/chat_export.rs:206:
         let file_path = self.export_path.join(&filename);
 
         // Create PDF document
1s
Run cargo fmt --all -- --check
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/build.rs:18:
             println!("cargo:rustc-link-arg=/SUBSYSTEM:WINDOWS");
 
             // Set version info
-            println!("cargo:rustc-env=CARGO_PKG_VERSION={}", env!("CARGO_PKG_VERSION"));
+            println!(
+                "cargo:rustc-env=CARGO_PKG_VERSION={}",
+                env!("CARGO_PKG_VERSION")
+            );
         }
 
         if cfg!(target_os = "macos") {
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/build.rs:29:
     }
 
     // Set build metadata
-    println!("cargo:rustc-env=BUILD_TIMESTAMP={}", std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_secs());
+    println!(
+        "cargo:rustc-env=BUILD_TIMESTAMP={}",
+        std::time::SystemTime::now()
+            .duration_since(std::time::UNIX_EPOCH)
+            .unwrap()
+            .as_secs()
+    );
 
     // Set Git information if available
     if let Ok(output) = std::process::Command::new("git")
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/build.rs:44:
 
     tauri_build::build()
 }
+
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/chat_export.rs:1:
 use anyhow::{Context, Result};
-use serde::{Deserialize, Serialize};
-use std::collections::HashMap;
-use std::path::{Path, PathBuf};
 use chrono::{DateTime, Utc};
 use printpdf::*;
+use serde::{Deserialize, Serialize};
+use std::collections::HashMap;
 use std::fs;
+use std::path::{Path, PathBuf};
 
 /// Chat Export Engine for BEAR AI
 /// Provides export functionality for chat conversations in multiple formats
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/chat_export.rs:82:
         if options.include_metadata {
             content.push_str("## Session Information\n\n");
             content.push_str(&format!("- **Session ID**: {}\n", session.id));
-            content.push_str(&format!("- **Created**: {}\n", session.created_at.format("%Y-%m-%d %H:%M:%S UTC")));
-            content.push_str(&format!("- **Last Updated**: {}\n", session.updated_at.format("%Y-%m-%d %H:%M:%S UTC")));
-            content.push_str(&format!("- **Total Messages**: {}\n\n", session.messages.len()));
+            content.push_str(&format!(
+                "- **Created**: {}\n",
+                session.created_at.format("%Y-%m-%d %H:%M:%S UTC")
+            ));
+            content.push_str(&format!(
+                "- **Last Updated**: {}\n",
+                session.updated_at.format("%Y-%m-%d %H:%M:%S UTC")
+            ));
+            content.push_str(&format!(
+                "- **Total Messages**: {}\n\n",
+                session.messages.len()
+            ));
 
             // Add custom metadata
             if !session.metadata.is_empty() {
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/chat_export.rs:150:
         if options.include_metadata {
             content.push_str("\nSESSION INFORMATION:\n");
             content.push_str(&format!("Session ID: {}\n", session.id));
-            content.push_str(&format!("Created: {}\n", session.created_at.format("%Y-%m-%d %H:%M:%S UTC")));
-            content.push_str(&format!("Last Updated: {}\n", session.updated_at.format("%Y-%m-%d %H:%M:%S UTC")));
+            content.push_str(&format!(
+                "Created: {}\n",
+                session.created_at.format("%Y-%m-%d %H:%M:%S UTC")
+            ));
+            content.push_str(&format!(
+                "Last Updated: {}\n",
+                session.updated_at.format("%Y-%m-%d %H:%M:%S UTC")
+            ));
             content.push_str(&format!("Total Messages: {}\n", session.messages.len()));
         }
 
Diff in /home/runner/work/BEAR_AI/BEAR_AI/src-tauri/src/chat_export.rs:206:
         let file_path = self.export_path.join(&filename);
 
         // Create PDF document
-        let (doc, page1, layer1) = PdfDocument::new(&session.title, Mm(210.0), Mm(297.0), "Layer 1");
0s
0s
0s
0s
0s
0s
0s
0s
0s
0s
0s
0s
0s
0s
