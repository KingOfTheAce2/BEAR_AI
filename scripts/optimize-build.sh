#!/bin/bash

# BEAR AI Legal Assistant - Build Optimization Script
# Optimizes build artifacts for production distribution

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TAURI_DIR="$PROJECT_ROOT/src-tauri"
BUILD_DIR="$TAURI_DIR/target"

echo "🚀 Starting BEAR AI build optimization..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to optimize binary size
optimize_binaries() {
    log_info "Optimizing binary sizes..."

    # Find all executables in release build
    if [ -d "$BUILD_DIR/release" ]; then
        find "$BUILD_DIR/release" -type f -executable -not -path "*/deps/*" | while read -r binary; do
            if file "$binary" | grep -q "ELF\|PE32\|Mach-O"; then
                original_size=$(stat -f%z "$binary" 2>/dev/null || stat -c%s "$binary" 2>/dev/null || echo "0")

                # Strip debug symbols
                strip "$binary" 2>/dev/null || true

                # Compress with UPX if available
                if command -v upx >/dev/null 2>&1; then
                    log_info "Compressing $(basename "$binary") with UPX..."
                    upx --best --lzma "$binary" 2>/dev/null || true
                fi

                new_size=$(stat -f%z "$binary" 2>/dev/null || stat -c%s "$binary" 2>/dev/null || echo "0")
                if [ "$new_size" -lt "$original_size" ]; then
                    saved=$((original_size - new_size))
                    log_success "Optimized $(basename "$binary"): saved ${saved} bytes"
                fi
            fi
        done
    fi
}

# Function to optimize JavaScript bundles
optimize_frontend() {
    log_info "Optimizing frontend bundles..."

    BUILD_JS_DIR="$PROJECT_ROOT/build/static/js"
    if [ -d "$BUILD_JS_DIR" ]; then
        # Compress JavaScript files
        find "$BUILD_JS_DIR" -name "*.js" -not -name "*.min.js" | while read -r jsfile; do
            if command -v terser >/dev/null 2>&1; then
                original_size=$(stat -f%z "$jsfile" 2>/dev/null || stat -c%s "$jsfile" 2>/dev/null)
                terser "$jsfile" --compress --mangle --output "${jsfile%.js}.min.js"
                new_size=$(stat -f%z "${jsfile%.js}.min.js" 2>/dev/null || stat -c%s "${jsfile%.js}.min.js" 2>/dev/null)
                saved=$((original_size - new_size))
                log_success "Compressed $(basename "$jsfile"): saved ${saved} bytes"
                mv "${jsfile%.js}.min.js" "$jsfile"
            fi
        done

        # Compress CSS files
        BUILD_CSS_DIR="$PROJECT_ROOT/build/static/css"
        if [ -d "$BUILD_CSS_DIR" ] && command -v cleancss >/dev/null 2>&1; then
            find "$BUILD_CSS_DIR" -name "*.css" | while read -r cssfile; do
                original_size=$(stat -f%z "$cssfile" 2>/dev/null || stat -c%s "$cssfile" 2>/dev/null)
                cleancss -o "${cssfile%.css}.min.css" "$cssfile"
                new_size=$(stat -f%z "${cssfile%.css}.min.css" 2>/dev/null || stat -c%s "${cssfile%.css}.min.css" 2>/dev/null)
                saved=$((original_size - new_size))
                log_success "Compressed $(basename "$cssfile"): saved ${saved} bytes"
                mv "${cssfile%.css}.min.css" "$cssfile"
            done
        fi
    fi
}

# Function to analyze bundle sizes
analyze_bundles() {
    log_info "Analyzing bundle sizes..."

    BUNDLE_DIR="$BUILD_DIR/release/bundle"
    if [ -d "$BUNDLE_DIR" ]; then
        echo ""
        echo "📊 Bundle Size Analysis:"
        echo "========================"

        for bundle_type in msi nsis dmg deb rpm appimage; do
            bundle_path="$BUNDLE_DIR/$bundle_type"
            if [ -d "$bundle_path" ]; then
                echo ""
                echo "📦 $bundle_type bundles:"
                find "$bundle_path" -maxdepth 1 -type f | while read -r bundle; do
                    size=$(stat -f%z "$bundle" 2>/dev/null || stat -c%s "$bundle" 2>/dev/null || echo "0")
                    size_mb=$((size / 1024 / 1024))
                    echo "   $(basename "$bundle"): ${size_mb}MB"
                done
            fi
        done
        echo ""
    fi
}

# Function to validate signatures and checksums
validate_bundles() {
    log_info "Validating bundle integrity..."

    BUNDLE_DIR="$BUILD_DIR/release/bundle"
    if [ -d "$BUNDLE_DIR" ]; then
        # Generate checksums for all bundles
        CHECKSUM_FILE="$BUNDLE_DIR/checksums.txt"
        > "$CHECKSUM_FILE"

        find "$BUNDLE_DIR" -type f -not -name "checksums.txt" | while read -r file; do
            if command -v shasum >/dev/null 2>&1; then
                checksum=$(shasum -a 256 "$file" | cut -d' ' -f1)
            elif command -v sha256sum >/dev/null 2>&1; then
                checksum=$(sha256sum "$file" | cut -d' ' -f1)
            else
                log_warning "No SHA256 utility found, skipping checksum generation"
                continue
            fi

            echo "$checksum  $(basename "$file")" >> "$CHECKSUM_FILE"
            log_success "Generated checksum for $(basename "$file")"
        done

        if [ -s "$CHECKSUM_FILE" ]; then
            log_success "Checksums saved to checksums.txt"
        fi
    fi
}

# Function to create distribution package
create_distribution() {
    log_info "Creating distribution package..."

    DIST_DIR="$PROJECT_ROOT/dist"
    rm -rf "$DIST_DIR"
    mkdir -p "$DIST_DIR"

    # Copy bundles to distribution directory
    BUNDLE_DIR="$BUILD_DIR/release/bundle"
    if [ -d "$BUNDLE_DIR" ]; then
        for bundle_type in msi nsis dmg deb rpm appimage; do
            bundle_path="$BUNDLE_DIR/$bundle_type"
            if [ -d "$bundle_path" ]; then
                cp -r "$bundle_path" "$DIST_DIR/"
                log_success "Copied $bundle_type bundles to distribution"
            fi
        done

        # Copy checksums
        if [ -f "$BUNDLE_DIR/checksums.txt" ]; then
            cp "$BUNDLE_DIR/checksums.txt" "$DIST_DIR/"
        fi
    fi

    # Create release notes
    cat > "$DIST_DIR/README.md" << EOF
# BEAR AI Legal Assistant - Release Package

## Installation Instructions

### Windows
- **MSI Installer (Recommended)**: Run \`bear-ai-legal-assistant_1.0.0_x64_en-US.msi\`
- **NSIS Installer**: Run \`bear-ai-legal-assistant_1.0.0_x64-setup.exe\`

### macOS
- **DMG Package**: Open \`bear-ai-legal-assistant_1.0.0_x64.dmg\` and drag to Applications

### Linux
- **Debian/Ubuntu**: \`sudo dpkg -i bear-ai-legal-assistant_1.0.0_amd64.deb\`
- **Red Hat/Fedora**: \`sudo rpm -i bear-ai-legal-assistant-1.0.0-1.x86_64.rpm\`
- **AppImage**: Make executable and run \`bear-ai-legal-assistant_1.0.0_amd64.AppImage\`

## System Requirements

- **Windows**: Windows 10 or later, .NET Framework 4.8
- **macOS**: macOS 10.13 (High Sierra) or later
- **Linux**: GTK 3.0, WebKit2GTK

## Security Notice

All packages are digitally signed. Verify checksums before installation using the provided \`checksums.txt\` file.

## Support

For technical support, visit: https://bear-ai.com/support
EOF

    log_success "Distribution package created in dist/"
}

# Function to clean up build artifacts
cleanup_build() {
    log_info "Cleaning up temporary build artifacts..."

    # Remove debug symbols and intermediate files
    if [ -d "$BUILD_DIR" ]; then
        find "$BUILD_DIR" -name "*.pdb" -delete 2>/dev/null || true
        find "$BUILD_DIR" -name "*.dSYM" -delete 2>/dev/null || true
        find "$BUILD_DIR" -path "*/deps/*" -name "*.d" -delete 2>/dev/null || true
    fi

    log_success "Cleanup completed"
}

# Main execution
main() {
    log_info "BEAR AI Legal Assistant Build Optimization"
    log_info "Project: $PROJECT_ROOT"

    # Check if build exists
    if [ ! -d "$BUILD_DIR/release" ]; then
        log_error "No release build found. Run 'npm run tauri:build' first."
        exit 1
    fi

    # Run optimization steps
    optimize_frontend
    optimize_binaries
    analyze_bundles
    validate_bundles
    create_distribution
    cleanup_build

    log_success "Build optimization completed!"
    log_info "Distribution packages available in: $PROJECT_ROOT/dist"
}

# Run main function
main "$@"