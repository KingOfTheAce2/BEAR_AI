#!/usr/bin/env bash
# BEAR AI GUI Launcher - Unix Shell Script
# Standardized cross-platform launcher for BEAR AI GUI

set -euo pipefail

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"

# Default values
DEBUG=0
HELP=0
VENV_PATH=""

# Logging function
log() {
    local level="${1:-INFO}"
    local message="${2:-}"
    local timestamp="$(date '+%Y-%m-%d %H:%M:%S')"
    echo "[$timestamp] [$level] $message" >&2
}

# Show help
show_help() {
    cat << 'EOF'
BEAR AI GUI Launcher - Unix Shell Script

Usage: bear-ai-gui.sh [OPTIONS]

Options:
  -d, --debug         Enable debug output
  -h, --help          Show this help message
  -v, --venv PATH     Path to Python virtual environment (optional)

Examples:
  ./bear-ai-gui.sh                      # Launch GUI with auto-detection
  ./bear-ai-gui.sh --venv ~/venv        # Use specific virtual environment
  ./bear-ai-gui.sh --debug              # Launch with debug output

This launcher:
1. Detects Python virtual environments
2. Activates appropriate environment
3. Checks and installs dependencies if needed
4. Launches BEAR AI GUI using proper entry points

Console Script Entry Point: bear-gui (after pip install -e .)
Module Entry Point: python -m bear_ai.gui
Direct Script: python src/bear_ai/gui.py
EOF
    exit 0
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -d|--debug)
                DEBUG=1
                shift
                ;;
            -h|--help)
                HELP=1
                shift
                ;;
            -v|--venv)
                VENV_PATH="$2"
                shift 2
                ;;
            *)
                log "ERROR" "Unknown option: $1"
                show_help
                ;;
        esac
    done
    
    if [[ $HELP -eq 1 ]]; then
        show_help
    fi
}

# Test Python installation
test_python_installation() {
    if ! command -v python3 &> /dev/null && ! command -v python &> /dev/null; then
        log "ERROR" "Python not found in PATH"
        return 1
    fi
    
    # Prefer python3 if available
    local python_cmd="python3"
    if ! command -v python3 &> /dev/null; then
        python_cmd="python"
    fi
    
    local python_version
    if ! python_version=$($python_cmd --version 2>&1); then
        log "ERROR" "Failed to get Python version"
        return 1
    fi
    
    log "INFO" "Found Python: $python_version"
    
    # Check if version is 3.9+
    local version_check
    version_check=$($python_cmd -c "import sys; print(sys.version_info >= (3, 9))")
    if [[ "$version_check" != "True" ]]; then
        log "ERROR" "Python 3.9+ required, found $python_version"
        return 1
    fi
    
    # Export the python command for use in other functions
    export PYTHON_CMD="$python_cmd"
    return 0
}

# Find virtual environment
find_virtual_environment() {
    local start_path="${1:-$REPO_ROOT}"
    local venv_names=("venv" ".venv" "env" ".env" "bear-ai-env")
    
    # Check for virtual environments
    for name in "${venv_names[@]}"; do
        local venv_path="$start_path/$name"
        local activate_script="$venv_path/bin/activate"
        
        if [[ -f "$activate_script" ]]; then
            log "INFO" "Found virtual environment: $venv_path"
            echo "$venv_path"
            return 0
        fi
    done
    
    # Check if we're already in a virtual environment
    if [[ -n "${VIRTUAL_ENV:-}" ]]; then
        log "INFO" "Already in virtual environment: $VIRTUAL_ENV"
        echo "$VIRTUAL_ENV"
        return 0
    fi
    
    return 1
}

# Activate virtual environment
activate_virtual_environment() {
    local venv_path="$1"
    
    if [[ -z "$venv_path" ]]; then
        log "INFO" "No virtual environment specified, using system Python"
        return 0
    fi
    
    local activate_script="$venv_path/bin/activate"
    
    if [[ ! -f "$activate_script" ]]; then
        log "ERROR" "Virtual environment activation script not found: $activate_script"
        return 1
    fi
    
    log "INFO" "Activating virtual environment: $venv_path"
    
    # shellcheck source=/dev/null
    if ! source "$activate_script"; then
        log "ERROR" "Failed to activate virtual environment"
        return 1
    fi
    
    log "INFO" "Virtual environment activated successfully"
    return 0
}

# Test BEAR AI installation
test_bear_ai_installation() {
    # Method 1: Check if console script is available
    if command -v bear-gui &> /dev/null; then
        if bear-gui --help &> /dev/null; then
            log "INFO" "Found bear-gui console script"
            echo "console_script:bear-gui"
            return 0
        fi
    fi
    
    # Method 2: Check if module import works
    if $PYTHON_CMD -c "import bear_ai.gui" &> /dev/null; then
        log "INFO" "Found bear_ai.gui module"
        echo "module:$PYTHON_CMD -m bear_ai.gui"
        return 0
    fi
    
    # Method 3: Check if direct script exists
    local script_path="$REPO_ROOT/src/bear_ai/gui.py"
    if [[ -f "$script_path" ]]; then
        log "INFO" "Found direct script: $script_path"
        echo "script:$PYTHON_CMD \"$script_path\""
        return 0
    fi
    
    # Method 4: Check for legacy GUI scripts
    local legacy_scripts=(
        "gui_launcher.py"
        "simple_gui.py"
        "modern_gui.py"
        "src/bear_ai/professional_gui.py"
    )
    
    for script in "${legacy_scripts[@]}"; do
        local full_path="$REPO_ROOT/$script"
        if [[ -f "$full_path" ]]; then
            log "INFO" "Found legacy GUI script: $full_path"
            echo "legacy:$PYTHON_CMD \"$full_path\""
            return 0
        fi
    done
    
    return 1
}

# Install dependencies
install_dependencies() {
    log "INFO" "Checking and installing dependencies..."
    
    # Check if setup.py exists for development install
    local setup_path="$REPO_ROOT/setup.py"
    if [[ -f "$setup_path" ]]; then
        log "INFO" "Installing BEAR AI in development mode..."
        cd "$REPO_ROOT"
        
        if $PYTHON_CMD -m pip install -e ".[gui]"; then
            log "INFO" "Development installation completed"
            return 0
        else
            log "ERROR" "Development installation failed"
        fi
    fi
    
    # Try installing basic requirements
    log "INFO" "Installing basic GUI requirements..."
    if $PYTHON_CMD -m pip install tkinter customtkinter Pillow; then
        return 0
    else
        log "ERROR" "Failed to install basic requirements"
        return 1
    fi
}

# Launch BEAR AI GUI
launch_bear_ai_gui() {
    local launch_info="$1"
    
    if [[ -z "$launch_info" ]]; then
        log "WARNING" "No launch method available - attempting dependency installation"
        
        if install_dependencies; then
            # Retry detection after installation
            if launch_info=$(test_bear_ai_installation); then
                log "INFO" "Found launch method after installation"
            fi
        fi
        
        if [[ -z "$launch_info" ]]; then
            log "ERROR" "Failed to find or install BEAR AI GUI"
            cat << 'EOF'

ERROR: Cannot launch BEAR AI GUI

Troubleshooting steps:
1. Install BEAR AI: pip install -e .
2. Check Python version: python --version (needs 3.9+)
3. Try manual launch: python -m bear_ai.gui
4. Run from repo root: cd $REPO_ROOT

EOF
            exit 1
        fi
    fi
    
    local method="${launch_info%%:*}"
    local command="${launch_info#*:}"
    
    log "INFO" "Launching BEAR AI GUI using method: $method"
    log "INFO" "Command: $command"
    
    # Set working directory to repo root
    cd "$REPO_ROOT"
    
    case "$method" in
        console_script)
            bear-gui
            ;;
        module)
            $PYTHON_CMD -m bear_ai.gui
            ;;
        script|legacy)
            eval "$command"
            ;;
        *)
            log "ERROR" "Unknown launch method: $method"
            exit 1
            ;;
    esac
}

# Main execution
main() {
    parse_args "$@"
    
    log "INFO" "BEAR AI GUI Launcher Starting..."
    
    if [[ $DEBUG -eq 1 ]]; then
        log "INFO" "Debug mode enabled"
        log "INFO" "Script directory: $SCRIPT_DIR"
        log "INFO" "Repository root: $REPO_ROOT"
    fi
    
    # Check Python installation
    if ! test_python_installation; then
        cat << 'EOF'

ERROR: Python 3.9+ is required but not found or not working.

Please install Python 3.9 or later:
1. Use your system package manager (apt, yum, brew, etc.)
2. Download from https://python.org
3. Make sure python3 is in your PATH
4. Run: python3 --version

EOF
        exit 1
    fi
    
    # Handle virtual environment
    local venv_path="$VENV_PATH"
    if [[ -z "$venv_path" ]]; then
        if venv_path=$(find_virtual_environment); then
            log "INFO" "Auto-detected virtual environment"
        fi
    fi
    
    if [[ -n "$venv_path" ]] && ! activate_virtual_environment "$venv_path"; then
        log "WARNING" "Continuing without virtual environment"
    fi
    
    # Test BEAR AI installation
    local launch_info
    if launch_info=$(test_bear_ai_installation); then
        if [[ $DEBUG -eq 1 ]]; then
            log "INFO" "Launch method: ${launch_info%%:*}, Command: ${launch_info#*:}"
        fi
    fi
    
    # Launch GUI
    launch_bear_ai_gui "$launch_info"
}

# Execute main function with all arguments
main "$@"