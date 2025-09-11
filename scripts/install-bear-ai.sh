#!/bin/bash

# BEAR AI Legal Assistant - Unified Installation Script
# Apple-style simple installation for macOS and Linux
# Usage: bash scripts/install-bear-ai.sh

# Configuration
readonly SCRIPT_NAME="BEAR AI Legal Assistant Installer"
readonly VERSION="2.0.0"
readonly MIN_NODE_VERSION="16.0.0"
readonly MIN_NPM_VERSION="8.0.0"
readonly REQUIREMENTS_URL="https://github.com/KingOfTheAce2/BEAR_AI#system-requirements"
readonly SUPPORT_URL="https://github.com/KingOfTheAce2/BEAR_AI/issues"

# Global variables
CURRENT_STEP=0
TOTAL_STEPS=7
START_TIME=$(date +%s)
ERRORS=()
WARNINGS=()
PROJECT_ROOT="$(pwd)"
VERBOSE=false
DEV=false
SKIP_SHORTCUTS=false

# Colors
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly CYAN='\033[0;36m'
readonly WHITE='\033[1;37m'
readonly GRAY='\033[0;37m'
readonly BOLD='\033[1m'
readonly RESET='\033[0m'

# Platform detection
if [[ "$(uname)" == "Darwin" ]]; then
    PLATFORM="macOS"
    IS_MACOS=true
    IS_LINUX=false
elif [[ "$(uname)" == "Linux" ]]; then
    PLATFORM="Linux"
    IS_MACOS=false
    IS_LINUX=true
else
    echo -e "${RED}Unsupported platform: $(uname)${RESET}"
    exit 1
fi

# Logging functions
log_message() {
    local message="$1"
    local level="${2:-INFO}"
    local color="${3:-$WHITE}"
    
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    printf "${color}[%s] [%s] %s${RESET}\n" "$timestamp" "$level" "$message"
    
    # Log to file if possible
    echo "[$timestamp] [$level] $message" >> "$PROJECT_ROOT/installation.log" 2>/dev/null || true
}

success() {
    log_message "✅ $1" "SUCCESS" "$GREEN"
}

error() {
    log_message "❌ $1" "ERROR" "$RED"
    ERRORS+=("$1")
    
    if [[ "$2" == "fatal" ]]; then
        show_fatal_error
        exit 1
    fi
}

warn() {
    log_message "⚠️  $1" "WARNING" "$YELLOW"
    WARNINGS+=("$1")
}

info() {
    log_message "ℹ️  $1" "INFO" "$CYAN"
}

verbose() {
    if [[ "$VERBOSE" == "true" ]]; then
        log_message "🔍 $1" "VERBOSE" "$GRAY"
    fi
}

show_progress() {
    local step=$1
    local message="$2"
    
    CURRENT_STEP=$step
    local percentage=$(( (step * 100) / TOTAL_STEPS ))
    local filled=$(( percentage / 5 ))
    local empty=$(( 20 - filled ))
    
    local progress_bar=""
    for ((i=0; i<filled; i++)); do progress_bar+="█"; done
    for ((i=0; i<empty; i++)); do progress_bar+="░"; done
    
    printf "\n${BOLD}[%d/%d] %s %d%%${RESET}\n" "$step" "$TOTAL_STEPS" "$progress_bar" "$percentage"
    info "$message"
}

# Utility functions
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

version_compare() {
    local version1="$1"
    local version2="$2"
    
    printf '%s\n%s\n' "$version1" "$version2" | sort -V | head -n1 | grep -q "^$version1$"
    if [[ $? -eq 0 && "$version1" != "$version2" ]]; then
        return 1  # version1 < version2
    else
        return 0  # version1 >= version2
    fi
}

run_command() {
    local command="$1"
    local working_dir="${2:-$PROJECT_ROOT}"
    local timeout="${3:-300}"
    
    verbose "Executing: $command"
    
    local output_file=$(mktemp)
    local error_file=$(mktemp)
    
    cd "$working_dir" || return 1
    
    if [[ "$VERBOSE" == "true" ]]; then
        timeout "$timeout" bash -c "$command" 2>&1
        local exit_code=$?
    else
        timeout "$timeout" bash -c "$command" >"$output_file" 2>"$error_file"
        local exit_code=$?
    fi
    
    local output=""
    local error_msg=""
    
    if [[ -f "$output_file" ]]; then
        output=$(cat "$output_file")
        rm -f "$output_file"
    fi
    
    if [[ -f "$error_file" ]]; then
        error_msg=$(cat "$error_file")
        rm -f "$error_file"
    fi
    
    cd "$PROJECT_ROOT" || return 1
    
    verbose "Command completed with exit code: $exit_code"
    
    if [[ $exit_code -eq 0 ]]; then
        return 0
    else
        verbose "Command failed: $error_msg"
        return 1
    fi
}

# Installation steps
show_welcome() {
    clear
    
    cat << 'EOF'

╔═══════════════════════════════════════════════════╗
║                                                   ║
║   🐻  BEAR AI Legal Assistant Installer  ⚖️      ║
║                                                   ║
║   Bridge for Expertise, Audit and Research       ║
║   Version 2.0.0 - Professional Edition           ║
║                                                   ║
╚═══════════════════════════════════════════════════╝

EOF

    info "Welcome to the BEAR AI installation wizard"
    info "This installer will set up everything you need automatically"
    
    if [[ "$VERBOSE" != "true" ]]; then
        echo -e "${GRAY}💡 Add --verbose for detailed output${RESET}"
    fi
    
    sleep 2
}

check_system_requirements() {
    show_progress 1 "Checking system requirements..."
    
    # Check Node.js
    if ! command_exists node; then
        error "Node.js not found. Please install Node.js $MIN_NODE_VERSION or later" "fatal"
    fi
    
    local node_version
    node_version=$(node --version | sed 's/v//')
    
    if ! version_compare "$node_version" "$MIN_NODE_VERSION"; then
        error "Node.js $MIN_NODE_VERSION+ required. Current: $node_version" "fatal"
    fi
    success "Node.js $node_version - Compatible"
    
    # Check npm
    if ! command_exists npm; then
        error "npm not found. Please ensure npm is installed with Node.js" "fatal"
    fi
    
    local npm_version
    npm_version=$(npm --version)
    
    if ! version_compare "$npm_version" "$MIN_NPM_VERSION"; then
        warn "npm $MIN_NPM_VERSION+ recommended. Current: $npm_version"
    else
        success "npm $npm_version - Compatible"
    fi
    
    # Check architecture
    local arch
    arch=$(uname -m)
    if [[ "$arch" != "x86_64" && "$arch" != "arm64" ]]; then
        error "64-bit architecture required. Current: $arch" "fatal"
    fi
    success "$PLATFORM $arch - Compatible"
    
    # Check disk space
    local available_space
    if [[ "$IS_MACOS" == "true" ]]; then
        available_space=$(df -H "$PROJECT_ROOT" | awk 'NR==2 {print $4}' | sed 's/G.*//')
    else
        available_space=$(df -BG "$PROJECT_ROOT" | awk 'NR==2 {print $4}' | sed 's/G.*//')
    fi
    
    if [[ "$available_space" -lt 5 ]]; then
        warn "Low disk space: ${available_space}GB available. 5GB+ recommended"
    else
        success "Disk space: ${available_space}GB available"
    fi
    
    # Check memory
    local total_mem
    if [[ "$IS_MACOS" == "true" ]]; then
        total_mem=$(( $(sysctl -n hw.memsize) / 1024 / 1024 / 1024 ))
    else
        total_mem=$(grep MemTotal /proc/meminfo | awk '{print int($2/1024/1024)}')
    fi
    
    if [[ "$total_mem" -lt 8 ]]; then
        warn "RAM: ${total_mem}GB. 8GB+ recommended for optimal performance"
    else
        success "RAM: ${total_mem}GB - Sufficient"
    fi
    
    # Check permissions
    if ! touch "$PROJECT_ROOT/.test_write" 2>/dev/null; then
        error "Insufficient write permissions in project directory" "fatal"
    else
        rm -f "$PROJECT_ROOT/.test_write"
        success "Write permissions - OK"
    fi
    
    verbose "System requirements check completed"
}

setup_project() {
    show_progress 2 "Setting up project structure..."
    
    # Verify project root
    if [[ ! -f "$PROJECT_ROOT/package.json" ]]; then
        error "package.json not found. Please run from the BEAR AI project root directory." "fatal"
    fi
    
    # Validate package.json
    if ! python3 -c "import json; json.load(open('package.json'))" 2>/dev/null && \
       ! node -e "require('./package.json')" 2>/dev/null; then
        error "Invalid package.json format" "fatal"
    fi
    
    # Check package name
    local package_name
    package_name=$(node -e "console.log(require('./package.json').name)" 2>/dev/null || echo "unknown")
    if [[ "$package_name" != "bear-ai-gui" ]]; then
        warn "Package name mismatch - proceeding anyway"
    fi
    
    success "Project structure validated"
    
    # Create necessary directories
    local directories=("logs" "temp" "models" "config")
    for dir in "${directories[@]}"; do
        mkdir -p "$PROJECT_ROOT/$dir"
        verbose "Ensured directory exists: $dir"
    done
    
    success "Project structure ready"
}

install_dependencies() {
    show_progress 3 "Installing dependencies..."
    
    # Determine install command
    local install_cmd="npm install"
    if [[ -f "$PROJECT_ROOT/package-lock.json" ]]; then
        install_cmd="npm ci"
    fi
    install_cmd="$install_cmd --prefer-offline --no-audit --no-fund"
    
    info "Installing Node.js dependencies..."
    if ! run_command "$install_cmd"; then
        error "Failed to install dependencies" "fatal"
    fi
    
    success "Dependencies installed successfully"
    
    # Install development dependencies if requested
    if [[ "$DEV" == "true" ]]; then
        info "Installing development dependencies..."
        if run_command "npm install --only=dev"; then
            success "Development dependencies installed"
        else
            warn "Some development dependencies failed to install"
        fi
    fi
}

setup_tauri() {
    show_progress 4 "Setting up Tauri desktop integration..."
    
    # Check Rust installation
    if ! command_exists rustc; then
        warn "Rust not found - desktop features will be limited"
        info "To install Rust: https://rustup.rs/"
        return 0
    fi
    
    local rust_version
    rust_version=$(rustc --version)
    success "Rust detected: $rust_version"
    
    # Check Tauri CLI
    if ! run_command "cargo tauri --version" "" 10; then
        info "Installing Tauri CLI..."
        if ! run_command "cargo install tauri-cli --version '^2.0'" "" 600; then
            warn "Failed to install Tauri CLI - desktop features may be limited"
            return 0
        fi
    fi
    
    # Verify Tauri configuration
    if [[ -f "$PROJECT_ROOT/src-tauri/tauri.conf.json" ]]; then
        success "Tauri configuration found"
        
        # Build Tauri dependencies (debug mode for faster installation)
        info "Building Tauri dependencies..."
        if run_command "npm run tauri build -- --debug" "" 600; then
            success "Tauri desktop integration ready"
        else
            warn "Tauri build failed - web interface will still work"
        fi
    else
        info "Tauri not configured - web-only installation"
    fi
}

run_tests() {
    show_progress 5 "Running installation verification tests..."
    
    local tests=(
        "Package structure:node -e \"require('./package.json'); console.log('Package structure valid')\""
        "TypeScript compilation:npm run typecheck"
        "Build process:npm run build"
    )
    
    local tests_passed=0
    local tests_total=${#tests[@]}
    
    for test_entry in "${tests[@]}"; do
        local test_name="${test_entry%%:*}"
        local test_command="${test_entry#*:}"
        
        verbose "Running test: $test_name"
        
        if run_command "$test_command"; then
            success "Test passed: $test_name"
            ((tests_passed++))
        else
            warn "Test failed: $test_name"
        fi
        
        sleep 0.5
    done
    
    if [[ $tests_passed -eq $tests_total ]]; then
        success "All $tests_total tests passed"
    else
        warn "$tests_passed/$tests_total tests passed - installation may have issues"
    fi
}

create_shortcuts() {
    if [[ "$SKIP_SHORTCUTS" == "true" ]]; then
        info "Skipping shortcut creation"
        return 0
    fi
    
    show_progress 6 "Creating shortcuts and launchers..."
    
    if [[ "$IS_MACOS" == "true" ]]; then
        create_macos_shortcuts
    elif [[ "$IS_LINUX" == "true" ]]; then
        create_linux_shortcuts
    fi
    
    # Create universal launch script
    create_launch_script
    success "Launch scripts created"
}

create_macos_shortcuts() {
    local applications_dir="$HOME/Applications"
    local app_dir="$applications_dir/BEAR AI Legal Assistant.app"
    local contents_dir="$app_dir/Contents"
    local macos_dir="$contents_dir/MacOS"
    
    # Create app bundle structure
    mkdir -p "$macos_dir"
    
    # Create Info.plist
    cat > "$contents_dir/Info.plist" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleDisplayName</key>
    <string>BEAR AI Legal Assistant</string>
    <key>CFBundleIdentifier</key>
    <string>com.bearai.legal-assistant</string>
    <key>CFBundleVersion</key>
    <string>$VERSION</string>
    <key>CFBundleExecutable</key>
    <string>bear-ai</string>
</dict>
</plist>
EOF
    
    # Create executable script
    cat > "$macos_dir/bear-ai" << EOF
#!/bin/bash
cd "$PROJECT_ROOT"
npm start
EOF
    
    chmod +x "$macos_dir/bear-ai"
    success "macOS application bundle created"
}

create_linux_shortcuts() {
    local desktop_dir="$HOME/.local/share/applications"
    mkdir -p "$desktop_dir"
    
    # Create desktop entry
    cat > "$desktop_dir/bear-ai-legal-assistant.desktop" << EOF
[Desktop Entry]
Name=BEAR AI Legal Assistant
Comment=AI-powered legal document analysis
Exec=bash -c "cd '$PROJECT_ROOT' && npm start"
Icon=$PROJECT_ROOT/public/logo512.png
Terminal=false
Type=Application
Categories=Office;Legal;
EOF
    
    chmod +x "$desktop_dir/bear-ai-legal-assistant.desktop"
    success "Linux desktop entry created"
}

create_launch_script() {
    cat > "$PROJECT_ROOT/start-bear-ai.sh" << 'EOF'
#!/bin/bash
cd "$(dirname "$0")"
echo "Starting BEAR AI Legal Assistant..."
npm start
EOF
    
    chmod +x "$PROJECT_ROOT/start-bear-ai.sh"
    verbose "Universal launch script created"
}

finalize_installation() {
    show_progress 7 "Finalizing installation..."
    
    # Create configuration file
    local config_path="$PROJECT_ROOT/config/bear-ai.json"
    local has_tauri="false"
    
    if [[ -d "$PROJECT_ROOT/src-tauri" ]]; then
        has_tauri="true"
    fi
    
    cat > "$config_path" << EOF
{
  "version": "$VERSION",
  "installDate": "$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")",
  "platform": "$PLATFORM",
  "features": {
    "desktop": $has_tauri,
    "webInterface": true,
    "api": true
  }
}
EOF
    
    success "Configuration saved"
    
    # Generate installation report
    local install_time=$(( $(date +%s) - START_TIME ))
    local report_path="$PROJECT_ROOT/installation-report.txt"
    
    cat > "$report_path" << EOF
BEAR AI Legal Assistant - Installation Report
============================================

Installation Date: $(date '+%Y-%m-%d %H:%M:%S')
Installation Time: ${install_time} seconds
Platform: $PLATFORM ($(uname -m))
Shell: $SHELL

Features Installed:
- Web Interface: ✓
- Desktop App: $(if [[ "$has_tauri" == "true" ]]; then echo "✓"; else echo "✗"; fi)
- API Server: ✓
- Shortcuts: $(if [[ "$SKIP_SHORTCUTS" == "true" ]]; then echo "✗ (Skipped)"; else echo "✓"; fi)

Warnings: ${#WARNINGS[@]}
$(printf '%s\n' "${WARNINGS[@]}" | sed 's/^/- /')

Errors: ${#ERRORS[@]}
$(printf '%s\n' "${ERRORS[@]}" | sed 's/^/- /')

Installation Status: $(if [[ ${#ERRORS[@]} -eq 0 ]]; then echo "SUCCESS"; else echo "COMPLETED WITH ISSUES"; fi)
EOF
    
    success "Installation report saved"
}

show_success() {
    local install_time=$(( $(date +%s) - START_TIME ))
    
    cat << EOF

╔══════════════════════════════════════════════════════════════╗
║                   INSTALLATION COMPLETE                     ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  🎉 BEAR AI Legal Assistant has been successfully installed! ║
║                                                              ║
║  Installation completed in ${install_time} seconds                      ║
║  ${#WARNINGS[@]} warnings, ${#ERRORS[@]} errors                                  ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝

EOF

    echo -e "${CYAN}Quick Start:${RESET}"
    echo -e "  • Run: ${BOLD}npm start${RESET} (or use application shortcut)"
    echo -e "  • Web Interface: ${BOLD}http://localhost:3000${RESET}"
    echo -e "  • Documentation: ${BOLD}docs/README.md${RESET}"
    echo ""
    
    echo -e "${CYAN}Available Commands:${RESET}"
    echo -e "  • ${BOLD}npm run dev${RESET}     - Development mode"
    echo -e "  • ${BOLD}npm run build${RESET}   - Production build"
    echo -e "  • ${BOLD}npm test${RESET}        - Run tests"
    echo ""
    
    echo -e "${YELLOW}Support:${RESET} $SUPPORT_URL"
    
    if [[ ${#WARNINGS[@]} -gt 0 ]]; then
        echo -e "\n${YELLOW}⚠️  Warnings during installation:${RESET}"
        printf '   • %s\n' "${WARNINGS[@]}"
    fi
}

show_fatal_error() {
    cat << EOF

╔══════════════════════════════════════════════════════════════╗
║                     INSTALLATION FAILED                     ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  The installation could not be completed due to a critical  ║
║  error. Please check the requirements and try again.        ║
║                                                              ║
║  Requirements: ${REQUIREMENTS_URL:0:40}...
║  Support:      ${SUPPORT_URL:0:40}...
║                                                              ║
╚══════════════════════════════════════════════════════════════╝

EOF
}

# Parse command line arguments
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --verbose|-v)
                VERBOSE=true
                shift
                ;;
            --dev)
                DEV=true
                shift
                ;;
            --skip-shortcuts)
                SKIP_SHORTCUTS=true
                shift
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                warn "Unknown argument: $1"
                shift
                ;;
        esac
    done
}

show_help() {
    cat << EOF
BEAR AI Legal Assistant - Unified Installer

Usage:
  bash scripts/install-bear-ai.sh [options]

Options:
  --verbose, -v      Show detailed output
  --dev             Install development dependencies
  --skip-shortcuts  Skip creating application shortcuts
  --help, -h        Show this help message

Examples:
  bash scripts/install-bear-ai.sh
  bash scripts/install-bear-ai.sh --verbose --dev
EOF
}

# Main installation flow
main() {
    parse_arguments "$@"
    
    show_welcome
    check_system_requirements
    setup_project
    install_dependencies
    setup_tauri
    run_tests
    create_shortcuts
    finalize_installation
    show_success
}

# Execute main function if script is run directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi