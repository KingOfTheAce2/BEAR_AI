#!/bin/bash

# BEAR AI Linux Package Signing Script
# This script signs all generated Linux packages (AppImage, DEB, RPM)

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BUILD_DIR="$PROJECT_ROOT/src-tauri/target/release/bundle"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if GPG is available
check_gpg() {
    if ! command -v gpg &> /dev/null; then
        log_error "GPG is not installed or not in PATH"
        exit 1
    fi

    # Check if we have a signing key
    if [ -z "$GPG_KEY_ID" ]; then
        log_error "GPG_KEY_ID environment variable is not set"
        exit 1
    fi

    # Verify the key exists
    if ! gpg --list-secret-keys "$GPG_KEY_ID" &> /dev/null; then
        log_error "GPG key $GPG_KEY_ID not found in keyring"
        exit 1
    fi

    log_info "GPG configuration verified"
}

# Sign AppImage files
sign_appimages() {
    local appimage_dir="$BUILD_DIR/appimage"

    if [ ! -d "$appimage_dir" ]; then
        log_warn "No AppImage directory found at $appimage_dir"
        return 0
    fi

    local signed_count=0

    for appimage in "$appimage_dir"/*.AppImage; do
        if [ -f "$appimage" ]; then
            log_info "Signing AppImage: $(basename "$appimage")"

            # Create detached signature
            gpg --batch --yes --detach-sign --armor \
                --local-user "$GPG_KEY_ID" \
                --output "$appimage.sig" \
                "$appimage"

            # Verify signature
            if gpg --verify "$appimage.sig" "$appimage" 2>/dev/null; then
                log_info "✓ AppImage signed successfully: $(basename "$appimage")"
                ((signed_count++))
            else
                log_error "✗ Failed to verify signature for: $(basename "$appimage")"
                exit 1
            fi
        fi
    done

    log_info "Signed $signed_count AppImage files"
}

# Sign DEB packages
sign_debs() {
    local deb_dir="$BUILD_DIR/deb"

    if [ ! -d "$deb_dir" ]; then
        log_warn "No DEB directory found at $deb_dir"
        return 0
    fi

    # Check if dpkg-sig is available
    if ! command -v dpkg-sig &> /dev/null; then
        log_warn "dpkg-sig not available, skipping DEB signing"
        return 0
    fi

    local signed_count=0

    for deb in "$deb_dir"/*.deb; do
        if [ -f "$deb" ]; then
            log_info "Signing DEB package: $(basename "$deb")"

            # Sign with dpkg-sig
            dpkg-sig --sign builder \
                --gpg-options="--local-user $GPG_KEY_ID" \
                "$deb"

            # Verify signature
            if dpkg-sig --verify "$deb" 2>/dev/null; then
                log_info "✓ DEB package signed successfully: $(basename "$deb")"
                ((signed_count++))
            else
                log_error "✗ Failed to verify signature for: $(basename "$deb")"
                exit 1
            fi
        fi
    done

    log_info "Signed $signed_count DEB packages"
}

# Sign RPM packages
sign_rpms() {
    local rpm_dir="$BUILD_DIR/rpm"

    if [ ! -d "$rpm_dir" ]; then
        log_warn "No RPM directory found at $rpm_dir"
        return 0
    fi

    # Check if rpm command is available
    if ! command -v rpm &> /dev/null; then
        log_warn "rpm command not available, skipping RPM signing"
        return 0
    fi

    local signed_count=0

    for rpm in "$rpm_dir"/*.rpm; do
        if [ -f "$rpm" ]; then
            log_info "Signing RPM package: $(basename "$rpm")"

            # Sign with rpm
            rpm --addsign \
                --define "_gpg_name $GPG_KEY_ID" \
                "$rpm"

            # Verify signature
            if rpm --checksig "$rpm" | grep -q "gpg OK"; then
                log_info "✓ RPM package signed successfully: $(basename "$rpm")"
                ((signed_count++))
            else
                log_error "✗ Failed to verify signature for: $(basename "$rpm")"
                exit 1
            fi
        fi
    done

    log_info "Signed $signed_count RPM packages"
}

# Generate checksums for all signed packages
generate_checksums() {
    local checksum_file="$BUILD_DIR/CHECKSUMS.txt"

    log_info "Generating checksums..."

    # Create checksums file
    cat > "$checksum_file" << EOF
# BEAR AI Linux Package Checksums
# Generated on: $(date -u '+%Y-%m-%d %H:%M:%S UTC')
# GPG Key ID: $GPG_KEY_ID

EOF

    # Add checksums for all package types
    for dir in appimage deb rpm; do
        local package_dir="$BUILD_DIR/$dir"
        if [ -d "$package_dir" ]; then
            echo "# $dir packages" >> "$checksum_file"
            find "$package_dir" -name "*.AppImage" -o -name "*.deb" -o -name "*.rpm" | while read -r file; do
                if [ -f "$file" ]; then
                    sha256sum "$file" >> "$checksum_file"
                fi
            done
            echo "" >> "$checksum_file"
        fi
    done

    # Sign the checksums file
    gpg --batch --yes --detach-sign --armor \
        --local-user "$GPG_KEY_ID" \
        --output "$checksum_file.sig" \
        "$checksum_file"

    log_info "Checksums generated and signed: $(basename "$checksum_file")"
}

# Export public key for distribution
export_public_key() {
    local key_file="$BUILD_DIR/public.key"

    log_info "Exporting public key..."

    gpg --armor --export "$GPG_KEY_ID" > "$key_file"

    log_info "Public key exported: $(basename "$key_file")"
}

# Main signing process
main() {
    log_info "Starting Linux package signing process..."
    log_info "Build directory: $BUILD_DIR"
    log_info "GPG Key ID: $GPG_KEY_ID"

    # Verify prerequisites
    check_gpg

    # Sign packages
    sign_appimages
    sign_debs
    sign_rpms

    # Generate checksums and export public key
    generate_checksums
    export_public_key

    log_info "Linux package signing completed successfully!"
    log_info "Signed packages are available in: $BUILD_DIR"
    log_info "Public key for verification: $BUILD_DIR/public.key"
}

# Run main function
main "$@"