#!/bin/bash
# BEAR AI Build Cleanup Script (Linux/macOS)
# Addresses critical disk space issues preventing Rust compilation

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Default values
DRY_RUN=false
AGGRESSIVE=false
FORCE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --aggressive)
            AGGRESSIVE=true
            shift
            ;;
        --force)
            FORCE=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--dry-run] [--aggressive] [--force]"
            exit 1
            ;;
    esac
done

echo -e "${CYAN}🧹 BEAR AI Build Cleanup Script v1.0.0${NC}"
echo -e "${YELLOW}Addressing critical disk space issues...${NC}"

# Function to get folder size in MB
get_folder_size() {
    local path="$1"
    if [[ -d "$path" ]]; then
        du -sm "$path" 2>/dev/null | cut -f1 || echo "0"
    else
        echo "0"
    fi
}

# Function to safely remove directory
remove_safe_directory() {
    local path="$1"
    local description="$2"

    if [[ -d "$path" ]]; then
        local size=$(get_folder_size "$path")
        echo -e "${YELLOW}📁 Found $description: ${size} MB${NC}"

        if [[ "$DRY_RUN" == "false" ]]; then
            if rm -rf "$path" 2>/dev/null; then
                echo -e "${GREEN}✅ Cleaned $description: ${size} MB freed${NC}"
                echo "$size"
            else
                echo -e "${RED}❌ Failed to clean $description${NC}"
                echo "0"
            fi
        else
            echo -e "${CYAN}🔍 [DRY RUN] Would clean $description: ${size} MB${NC}"
            echo "$size"
        fi
    else
        echo "0"
    fi
}

total_freed=0
project_root="$(pwd)"

echo -e "\n${GREEN}🎯 Starting cleanup process...${NC}"

# 1. Clean Rust/Cargo artifacts
echo -e "\n${CYAN}📦 Cleaning Rust/Cargo artifacts...${NC}"
freed=$(remove_safe_directory "$project_root/src-tauri/target" "Rust target directory")
total_freed=$((total_freed + freed))

freed=$(remove_safe_directory "$HOME/.cargo/registry/cache" "Cargo registry cache")
total_freed=$((total_freed + freed))

freed=$(remove_safe_directory "$HOME/.cargo/git/checkouts" "Cargo git checkouts")
total_freed=$((total_freed + freed))

if [[ "$AGGRESSIVE" == "true" ]]; then
    freed=$(remove_safe_directory "$HOME/.cargo/registry/src" "Cargo registry sources")
    total_freed=$((total_freed + freed))
fi

# 2. Clean Node.js artifacts
echo -e "\n${CYAN}📦 Cleaning Node.js artifacts...${NC}"
freed=$(remove_safe_directory "$project_root/node_modules/.cache" "Node modules cache")
total_freed=$((total_freed + freed))

freed=$(remove_safe_directory "$project_root/build" "Build output")
total_freed=$((total_freed + freed))

freed=$(remove_safe_directory "$HOME/.npm" "NPM cache")
total_freed=$((total_freed + freed))

# 3. Clean system temp files
echo -e "\n${CYAN}🗑️ Cleaning system temp files...${NC}"
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    freed=$(remove_safe_directory "$TMPDIR" "macOS temp files")
    total_freed=$((total_freed + freed))
else
    # Linux
    freed=$(remove_safe_directory "/tmp/*" "System temp files")
    total_freed=$((total_freed + freed))
fi

# 4. Clean Tauri-specific caches
echo -e "\n${CYAN}🦀 Cleaning Tauri caches...${NC}"
freed=$(remove_safe_directory "$HOME/.tauri" "Tauri cache")
total_freed=$((total_freed + freed))

if [[ "$OSTYPE" == "darwin"* ]]; then
    freed=$(remove_safe_directory "$HOME/Library/Caches/tauri" "Tauri macOS cache")
    total_freed=$((total_freed + freed))
else
    freed=$(remove_safe_directory "$HOME/.cache/tauri" "Tauri Linux cache")
    total_freed=$((total_freed + freed))
fi

# 5. Clean Rust toolchain cache (if aggressive)
if [[ "$AGGRESSIVE" == "true" ]]; then
    echo -e "\n${YELLOW}⚠️ Aggressive mode: Cleaning Rust toolchain cache...${NC}"
    freed=$(remove_safe_directory "$HOME/.rustup/downloads" "Rust downloads")
    total_freed=$((total_freed + freed))

    freed=$(remove_safe_directory "$HOME/.rustup/toolchains/stable-*/share/doc" "Rust documentation")
    total_freed=$((total_freed + freed))
fi

# 6. Check disk space
echo -e "\n${CYAN}💾 Disk space analysis...${NC}"
df -h | grep -E '^/dev/' | while read line; do
    usage=$(echo "$line" | awk '{print $5}' | sed 's/%//')
    if [[ $usage -gt 90 ]]; then
        echo -e "${RED}$line${NC}"
    elif [[ $usage -gt 80 ]]; then
        echo -e "${YELLOW}$line${NC}"
    else
        echo -e "${GREEN}$line${NC}"
    fi
done

# Summary
echo -e "\n${GREEN}📊 Cleanup Summary:${NC}"
echo -e "${GREEN}Total space freed: ${total_freed} MB${NC}"

if [[ "$DRY_RUN" == "true" ]]; then
    echo -e "${CYAN}This was a DRY RUN - no files were actually deleted.${NC}"
    echo -e "${CYAN}Run without --dry-run to perform actual cleanup.${NC}"
fi

# Recommendations
echo -e "\n${CYAN}💡 Recommendations:${NC}"
echo -e "${NC}1. Run 'cargo clean' in src-tauri directory before builds${NC}"
echo -e "${NC}2. Use 'npm run clean' to clean Node.js artifacts${NC}"
echo -e "${NC}3. Consider moving project to a drive with more space${NC}"
echo -e "${NC}4. Run this script with --aggressive for deeper cleanup${NC}"
echo -e "${NC}5. Set up automatic cleanup in CI/CD pipelines${NC}"

echo -e "\n${GREEN}✅ Cleanup completed!${NC}"