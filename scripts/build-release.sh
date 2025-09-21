#!/bin/bash

# BEAR AI Legal Assistant - Production Release Build Script
# Cross-platform build automation with signing and packaging

set -euo pipefail

# Configuration
PROJECT_NAME="BEAR AI Legal Assistant"
REPO_NAME="BEAR_AI"
GITHUB_REPO="KingOfTheAce2/BEAR_AI"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Parse command line arguments
VERBOSE=false
SKIP_TESTS=false
SKIP_SIGNING=false
BUILD_TYPE="release"
TARGET_PLATFORM=""
VERSION=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --skip-signing)
            SKIP_SIGNING=true
            shift
            ;;
        --build-type)
            BUILD_TYPE="$2"
            shift 2
            ;;
        --platform)
            TARGET_PLATFORM="$2"
            shift 2
            ;;
        --version)
            VERSION="$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  -v, --verbose         Enable verbose output"
            echo "  --skip-tests         Skip running tests"
            echo "  --skip-signing       Skip code signing"
            echo "  --build-type TYPE    Build type (release, debug, alpha)"
            echo "  --platform PLATFORM  Target platform (windows, macos, linux)"
            echo "  --version VERSION    Version to build"
            echo "  -h, --help           Show this help message"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Set verbose mode
if [[ "$VERBOSE" == "true" ]]; then
    set -x
fi

# Detect platform if not specified
if [[ -z "$TARGET_PLATFORM" ]]; then
    case "$(uname -s)" in
        Darwin*)
            TARGET_PLATFORM="macos"
            ;;
        Linux*)
            TARGET_PLATFORM="linux"
            ;;
        CYGWIN*|MINGW*|MSYS*)
            TARGET_PLATFORM="windows"
            ;;
        *)
            log_error "Unsupported platform: $(uname -s)"
            exit 1
            ;;
    esac
fi

log_info "Building for platform: $TARGET_PLATFORM"

# Detect version if not specified
if [[ -z "$VERSION" ]]; then
    if [[ -n "${GITHUB_REF:-}" ]] && [[ "$GITHUB_REF" =~ refs/tags/ ]]; then
        VERSION="${GITHUB_REF#refs/tags/}"
    else
        VERSION=$(grep '"version"' package.json | head -1 | sed 's/.*"version": "\(.*\)".*/\1/')
        if [[ -z "$VERSION" ]]; then
            VERSION="1.0.0"
        fi
    fi
fi

log_info "Building version: $VERSION"

# Validate environment
validate_environment() {
    log_info "Validating build environment..."

    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi

    # Check npm
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed"
        exit 1
    fi

    # Check Rust
    if ! command -v cargo &> /dev/null; then
        log_error "Rust/Cargo is not installed"
        exit 1
    fi

    # Check Tauri CLI
    if ! command -v cargo &> /dev/null || ! cargo tauri --version &> /dev/null; then
        log_info "Installing Tauri CLI..."
        cargo install tauri-cli
    fi

    # Platform-specific checks
    case "$TARGET_PLATFORM" in
        windows)
            if ! command -v powershell &> /dev/null; then
                log_error "PowerShell is required for Windows builds"
                exit 1
            fi
            ;;
        macos)
            if ! command -v xcodebuild &> /dev/null; then
                log_error "Xcode is required for macOS builds"
                exit 1
            fi
            ;;
        linux)
            # Check for required libraries
            if ! pkg-config --exists webkit2gtk-4.0; then
                log_error "webkit2gtk-4.0 is required for Linux builds"
                log_info "Install with: sudo apt-get install libwebkit2gtk-4.0-dev"
                exit 1
            fi
            ;;
    esac

    log_success "Environment validation complete"
}

# Install dependencies
install_dependencies() {
    log_info "Installing dependencies..."

    # Install Node.js dependencies
    npm ci

    # Update Rust dependencies
    cd src-tauri
    cargo update
    cd ..

    log_success "Dependencies installed"
}

# Run tests
run_tests() {
    if [[ "$SKIP_TESTS" == "true" ]]; then
        log_warning "Skipping tests"
        return
    fi

    log_info "Running tests..."

    # Frontend tests
    npm run test:ci

    # Backend tests
    cd src-tauri
    cargo test
    cd ..

    log_success "All tests passed"
}

# Build frontend
build_frontend() {
    log_info "Building frontend..."

    case "$BUILD_TYPE" in
        alpha)
            npm run build:alpha
            ;;
        debug)
            npm run build
            ;;
        *)
            npm run build
            ;;
    esac

    log_success "Frontend build complete"
}

# Build Tauri application
build_tauri() {
    log_info "Building Tauri application..."

    cd src-tauri

    # Set build arguments based on platform and build type
    local BUILD_ARGS=""

    case "$BUILD_TYPE" in
        alpha)
            BUILD_ARGS="--config tauri.conf.alpha.json"
            ;;
        debug)
            BUILD_ARGS="--debug"
            ;;
        release)
            BUILD_ARGS=""
            ;;
    esac

    # Add platform-specific targets
    case "$TARGET_PLATFORM" in
        macos)
            if [[ "$(uname -m)" == "arm64" ]]; then
                BUILD_ARGS="$BUILD_ARGS --target aarch64-apple-darwin"
            else
                BUILD_ARGS="$BUILD_ARGS --target x86_64-apple-darwin"
            fi
            ;;
        windows)
            BUILD_ARGS="$BUILD_ARGS --target x86_64-pc-windows-msvc"
            ;;
        linux)
            BUILD_ARGS="$BUILD_ARGS --target x86_64-unknown-linux-gnu"
            ;;
    esac

    # Execute build
    if [[ "$VERBOSE" == "true" ]]; then
        cargo tauri build $BUILD_ARGS --verbose
    else
        cargo tauri build $BUILD_ARGS
    fi

    cd ..

    log_success "Tauri build complete"
}

# Sign application
sign_application() {
    if [[ "$SKIP_SIGNING" == "true" ]]; then
        log_warning "Skipping code signing"
        return
    fi

    log_info "Signing application..."

    # Determine build output directory
    local BUILD_DIR=""
    case "$TARGET_PLATFORM" in
        macos)
            if [[ "$(uname -m)" == "arm64" ]]; then
                BUILD_DIR="src-tauri/target/aarch64-apple-darwin/release/bundle"
            else
                BUILD_DIR="src-tauri/target/x86_64-apple-darwin/release/bundle"
            fi
            ;;
        windows)
            BUILD_DIR="src-tauri/target/x86_64-pc-windows-msvc/release/bundle"
            ;;
        linux)
            BUILD_DIR="src-tauri/target/x86_64-unknown-linux-gnu/release/bundle"
            ;;
    esac

    if [[ -d "$BUILD_DIR" ]]; then
        node scripts/sign-app.js "$BUILD_DIR" --verbose
        log_success "Application signing complete"
    else
        log_warning "Build directory not found: $BUILD_DIR"
    fi
}

# Package application
package_application() {
    log_info "Packaging application..."

    # Create release directory
    local RELEASE_DIR="release"
    mkdir -p "$RELEASE_DIR"

    # Copy built artifacts
    case "$TARGET_PLATFORM" in
        macos)
            if [[ "$(uname -m)" == "arm64" ]]; then
                cp -r src-tauri/target/aarch64-apple-darwin/release/bundle/* "$RELEASE_DIR/"
            else
                cp -r src-tauri/target/x86_64-apple-darwin/release/bundle/* "$RELEASE_DIR/"
            fi
            ;;
        windows)
            cp -r src-tauri/target/x86_64-pc-windows-msvc/release/bundle/* "$RELEASE_DIR/"
            ;;
        linux)
            cp -r src-tauri/target/x86_64-unknown-linux-gnu/release/bundle/* "$RELEASE_DIR/"
            ;;
    esac

    # Generate release metadata
    cat > "$RELEASE_DIR/release-info.json" << EOF
{
  "version": "$VERSION",
  "platform": "$TARGET_PLATFORM",
  "buildType": "$BUILD_TYPE",
  "buildDate": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "commit": "${GITHUB_SHA:-$(git rev-parse HEAD)}",
  "repository": "$GITHUB_REPO"
}
EOF

    log_success "Application packaging complete"
}

# Generate update manifest
generate_update_manifest() {
    log_info "Generating update manifest..."

    local MANIFEST_FILE="updater/latest.json"

    # Update the manifest with current version and URLs
    cat > "$MANIFEST_FILE" << EOF
{
  "version": "$VERSION",
  "notes": "Release build generated on $(date -u +%Y-%m-%d) with latest features and improvements.",
  "pub_date": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "platforms": {
    "darwin-x86_64": {
      "signature": "",
      "url": "https://github.com/$GITHUB_REPO/releases/download/$VERSION/BEAR.AI.Legal.Assistant_${VERSION#v}_x64.dmg"
    },
    "darwin-aarch64": {
      "signature": "",
      "url": "https://github.com/$GITHUB_REPO/releases/download/$VERSION/BEAR.AI.Legal.Assistant_${VERSION#v}_aarch64.dmg"
    },
    "linux-x86_64": {
      "signature": "",
      "url": "https://github.com/$GITHUB_REPO/releases/download/$VERSION/bear-ai-legal-assistant_${VERSION#v}_amd64.AppImage"
    },
    "windows-x86_64": {
      "signature": "",
      "url": "https://github.com/$GITHUB_REPO/releases/download/$VERSION/BEAR.AI.Legal.Assistant_${VERSION#v}_x64_en-US.msi"
    }
  }
}
EOF

    log_success "Update manifest generated"
}

# Cleanup
cleanup() {
    log_info "Cleaning up temporary files..."

    # Remove temporary build files
    rm -rf .tmp
    rm -f certificate.p12

    log_success "Cleanup complete"
}

# Main execution
main() {
    log_info "Starting build process for $PROJECT_NAME"
    log_info "Platform: $TARGET_PLATFORM, Version: $VERSION, Build Type: $BUILD_TYPE"

    validate_environment
    install_dependencies
    run_tests
    build_frontend
    build_tauri
    sign_application
    package_application
    generate_update_manifest
    cleanup

    log_success "Build process completed successfully!"
    log_info "Artifacts are available in the 'release' directory"

    # Display build summary
    echo ""
    echo "=== Build Summary ==="
    echo "Version: $VERSION"
    echo "Platform: $TARGET_PLATFORM"
    echo "Build Type: $BUILD_TYPE"
    echo "Artifacts: $(find release -type f | wc -l) files"
    echo "===================="
}

# Handle interruption
trap cleanup EXIT

# Execute main function
main "$@"