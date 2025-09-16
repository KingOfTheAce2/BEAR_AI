use std::env;

fn main() {
    // Enable additional optimizations for release builds
    if env::var("PROFILE").unwrap_or_default() == "release" {
        // Link-time optimization hints
        if cfg!(target_os = "linux") {
            println!("cargo:rustc-link-arg=-Wl,--gc-sections");
            println!("cargo:rustc-link-arg=-Wl,--as-needed");
            println!("cargo:rustc-link-arg=-Wl,--compress-debug-sections=zlib");
        }

        // Platform-specific optimizations
        if cfg!(target_os = "windows") {
            // Windows-specific optimizations
            println!("cargo:rustc-link-arg=/OPT:REF");
            println!("cargo:rustc-link-arg=/OPT:ICF");
            println!("cargo:rustc-link-arg=/SUBSYSTEM:WINDOWS");

            // Set version info
            println!("cargo:rustc-env=CARGO_PKG_VERSION={}", env!("CARGO_PKG_VERSION"));
        }

        if cfg!(target_os = "macos") {
            // macOS-specific optimizations
            println!("cargo:rustc-link-arg=-Wl,-dead_strip");
            println!("cargo:rustc-link-arg=-mmacosx-version-min=10.13");
        }
    }

    // Set build metadata
    println!("cargo:rustc-env=BUILD_TIMESTAMP={}", std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_secs());

    // Set Git information if available
    if let Ok(output) = std::process::Command::new("git")
        .args(&["rev-parse", "HEAD"])
        .output()
    {
        if output.status.success() {
            let git_hash = String::from_utf8_lossy(&output.stdout);
            println!("cargo:rustc-env=GIT_HASH={}", git_hash.trim());
        }
    }

    tauri_build::build()
}