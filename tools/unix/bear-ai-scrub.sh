#!/usr/bin/env bash
# BEAR AI Scrub Launcher - Unix Shell Script
# Standardized cross-platform launcher for BEAR AI PII Scrubber

set -euo pipefail

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"

# Default values
DEBUG=0
HELP=0
VENV_PATH=""
INPUT_FILE=""
OUTPUT_FILE=""

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
BEAR AI PII Scrub Launcher - Unix Shell Script

Usage: bear-ai-scrub.sh [OPTIONS]

Options:
  -d, --debug         Enable debug output
  -h, --help          Show this help message
  -v, --venv PATH     Path to Python virtual environment (optional)
  -i, --input FILE    Input file to scrub (optional, will prompt if not provided)
  -o, --output FILE   Output file for scrubbed text (optional)

Examples:
  ./bear-ai-scrub.sh                                      # Interactive mode
  ./bear-ai-scrub.sh --input input.txt                    # Scrub specific file
  ./bear-ai-scrub.sh --input in.txt --output out.txt     # Specify output
  ./bear-ai-scrub.sh --venv ~/venv --debug               # Use specific venv with debug

This launcher:
1. Detects Python virtual environments
2. Activates appropriate environment
3. Checks and installs PII scrubbing dependencies
4. Launches BEAR AI PII Scrubber using proper entry points

Console Script Entry Point: bear-scrub (after pip install -e .)
Module Entry Point: python -m bear_ai.scrub
Direct Script: python src/bear_ai/scrub.py
Legacy Script: python bin/scrub_text.py
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
            -i|--input)
                INPUT_FILE="$2"
                shift 2
                ;;
            -o|--output)
                OUTPUT_FILE="$2"
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
    if command -v bear-scrub &> /dev/null; then
        if bear-scrub --help &> /dev/null; then
            log "INFO" "Found bear-scrub console script"
            echo "console_script:bear-scrub"
            return 0
        fi
    fi
    
    # Method 2: Check if module import works
    if $PYTHON_CMD -c "import bear_ai.scrub" &> /dev/null; then
        log "INFO" "Found bear_ai.scrub module"
        echo "module:$PYTHON_CMD -m bear_ai.scrub"
        return 0
    fi
    
    # Method 3: Check if direct script exists
    local script_path="$REPO_ROOT/src/bear_ai/scrub.py"
    if [[ -f "$script_path" ]]; then
        log "INFO" "Found direct script: $script_path"
        echo "script:$PYTHON_CMD \"$script_path\""
        return 0
    fi
    
    # Method 4: Check for legacy scrub script
    local legacy_script="$REPO_ROOT/bin/scrub_text.py"
    if [[ -f "$legacy_script" ]]; then
        log "INFO" "Found legacy scrub script: $legacy_script"
        echo "legacy:$PYTHON_CMD \"$legacy_script\""
        return 0
    fi
    
    return 1
}

# Install dependencies
install_dependencies() {
    log "INFO" "Checking and installing PII scrubbing dependencies..."
    
    # Check if setup.py exists for development install
    local setup_path="$REPO_ROOT/setup.py"
    if [[ -f "$setup_path" ]]; then
        log "INFO" "Installing BEAR AI in development mode with privacy features..."
        cd "$REPO_ROOT"
        
        if $PYTHON_CMD -m pip install -e ".[privacy]"; then
            log "INFO" "Development installation completed"
            
            # Download spacy model if needed
            log "INFO" "Installing spaCy language model..."
            if ! $PYTHON_CMD -m spacy download en_core_web_sm; then
                log "WARNING" "Failed to download spaCy model, continuing anyway"
            fi
            
            return 0
        else
            log "ERROR" "Development installation failed"
        fi
    fi
    
    # Try installing basic scrubbing requirements
    log "INFO" "Installing basic PII scrubbing requirements..."
    if $PYTHON_CMD -m pip install presidio-analyzer presidio-anonymizer spacy click rich; then
        # Download spacy model if needed
        log "INFO" "Installing spaCy language model..."
        if ! $PYTHON_CMD -m spacy download en_core_web_sm; then
            log "WARNING" "Failed to download spaCy model, continuing anyway"
        fi
        return 0
    else
        log "ERROR" "Failed to install basic requirements"
        return 1
    fi
}

# Launch BEAR AI Scrub
launch_bear_ai_scrub() {
    local launch_info="$1"
    local input_file="$2"
    local output_file="$3"
    
    if [[ -z "$launch_info" ]]; then
        log "WARNING" "No launch method available - attempting dependency installation"
        
        if install_dependencies; then
            # Retry detection after installation
            if launch_info=$(test_bear_ai_installation); then
                log "INFO" "Found launch method after installation"
            fi
        fi
        
        if [[ -z "$launch_info" ]]; then
            log "ERROR" "Failed to find or install BEAR AI Scrub"
            cat << 'EOF'

ERROR: Cannot launch BEAR AI PII Scrubber

Troubleshooting steps:
1. Install BEAR AI: pip install -e ".[privacy]"
2. Check Python version: python --version (needs 3.9+)
3. Try manual launch: python -m bear_ai.scrub
4. Run from repo root: cd $REPO_ROOT
5. Install spaCy model: python -m spacy download en_core_web_sm

EOF
            exit 1
        fi
    fi
    
    local method="${launch_info%%:*}"
    local command="${launch_info#*:}"
    
    log "INFO" "Launching BEAR AI PII Scrubber using method: $method"
    
    # Build arguments
    local args=()
    if [[ -n "$input_file" ]]; then
        args+=("$input_file")
    fi
    
    if [[ -n "$output_file" ]]; then
        args+=("--output" "$output_file")
    fi
    
    log "INFO" "Command: $command $(printf '%s ' "${args[@]}")"
    
    # Set working directory to repo root
    cd "$REPO_ROOT"
    
    case "$method" in
        console_script)
            if [[ ${#args[@]} -gt 0 ]]; then
                bear-scrub "${args[@]}"
            else
                bear-scrub
            fi
            ;;
        module)
            if [[ ${#args[@]} -gt 0 ]]; then
                $PYTHON_CMD -m bear_ai.scrub "${args[@]}"
            else
                $PYTHON_CMD -m bear_ai.scrub
            fi
            ;;
        script|legacy)
            if [[ ${#args[@]} -gt 0 ]]; then
                eval "$command" "${args[@]}"
            else
                eval "$command"
            fi
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
    
    log "INFO" "BEAR AI PII Scrub Launcher Starting..."
    
    if [[ $DEBUG -eq 1 ]]; then
        log "INFO" "Debug mode enabled"
        log "INFO" "Script directory: $SCRIPT_DIR"
        log "INFO" "Repository root: $REPO_ROOT"
        if [[ -n "$INPUT_FILE" ]]; then
            log "INFO" "Input file: $INPUT_FILE"
        fi
        if [[ -n "$OUTPUT_FILE" ]]; then
            log "INFO" "Output file: $OUTPUT_FILE"
        fi
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
    
    # Launch Scrub
    launch_bear_ai_scrub "$launch_info" "$INPUT_FILE" "$OUTPUT_FILE"
}

# Execute main function with all arguments
main "$@"