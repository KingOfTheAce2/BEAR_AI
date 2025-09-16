# Code Signing Configuration

This directory contains all code signing configurations and templates for BEAR AI cross-platform releases.

## Directory Structure

```
config/code-signing/
├── README.md                          # This file
├── windows-signing-config.json        # Windows signing configuration template
├── macos-signing-config.json          # macOS signing configuration template
├── linux-signing-config.json          # Linux signing configuration template
├── entitlements.plist                 # macOS production entitlements
└── entitlements.dev.plist             # macOS development entitlements
```

## Quick Reference

### Environment Variables Required

#### Windows (choose one method)
```bash
# Traditional method (legacy - OV certs before June 2023)
WINDOWS_CERTIFICATE_THUMBPRINT=your-cert-thumbprint
WINDOWS_CERTIFICATE_BASE64=base64-encoded-pfx-file
WINDOWS_CERTIFICATE_PASSWORD=cert-password

# Azure Key Vault method (recommended)
AZURE_KEY_VAULT_URL=https://your-vault.vault.azure.net/
AZURE_CLIENT_ID=your-app-registration-client-id
AZURE_CLIENT_SECRET=your-app-registration-secret
AZURE_TENANT_ID=your-azure-tenant-id
AZURE_CERTIFICATE_NAME=your-certificate-name

# HSM method (required for new certificates)
WINDOWS_HSM_CONTAINER=your-container-name
WINDOWS_HSM_KEY=your-key-name
WINDOWS_HSM_PIN=your-hsm-pin
```

#### macOS
```bash
APPLE_SIGNING_IDENTITY="Developer ID Application: Your Name (TEAM_ID)"
APPLE_CERTIFICATE=base64-encoded-p12-certificate
APPLE_CERTIFICATE_PASSWORD=certificate-password
APPLE_ID=your-apple-id@example.com
APPLE_PASSWORD=app-specific-password
APPLE_TEAM_ID=your-10-character-team-id
```

#### Linux
```bash
GPG_PRIVATE_KEY=base64-encoded-private-key
GPG_PASSPHRASE=private-key-passphrase
GPG_KEY_ID=your-gpg-key-id
```

### GitHub Secrets Setup

Add these secrets to your GitHub repository for automated signing:

1. Go to `Settings > Secrets and variables > Actions`
2. Add the environment variables listed above as repository secrets
3. Ensure the secrets are available to your workflow

### Usage in Tauri Configuration

The main `tauri.conf.json` file has been updated with environment variable placeholders:

```json
{
  "bundle": {
    "windows": {
      "certificateThumbprint": "${WINDOWS_CERTIFICATE_THUMBPRINT}",
      "signCommand": "${WINDOWS_SIGN_COMMAND}"
    },
    "macOS": {
      "signingIdentity": "${APPLE_SIGNING_IDENTITY}",
      "entitlements": "entitlements.plist"
    }
  }
}
```

### Testing Code Signing

1. **Set up environment variables** locally or in CI/CD
2. **Build the application**: `npm run tauri build`
3. **Verify signatures**:
   - **Windows**: `Get-AuthenticodeSignature path\to\executable.exe`
   - **macOS**: `codesign -dv --verbose=4 path/to/app.app`
   - **Linux**: `gpg --verify signature.sig package`

## Configuration Files

### Windows (`windows-signing-config.json`)
Contains templates for:
- Traditional certificate signing (legacy)
- Azure Key Vault signing (recommended)
- HSM signing (required for new certificates)
- Custom signing commands

### macOS (`macos-signing-config.json`)
Contains templates for:
- Developer ID Application certificates
- Mac App Store certificates
- Development certificates
- Ad-hoc signing for testing

### Linux (`linux-signing-config.json`)
Contains templates for:
- AppImage signing with GPG
- DEB package signing with dpkg-sig
- RPM package signing
- Flatpak signing

### Entitlements Files
- `entitlements.plist`: Production entitlements for App Store and notarization
- `entitlements.dev.plist`: Development entitlements for testing

## Scripts

### Linux Package Signing
The `scripts/sign-linux-packages.sh` script automates signing of all Linux packages:

```bash
# Set environment variables
export GPG_KEY_ID="your-key-id"

# Run signing
chmod +x scripts/sign-linux-packages.sh
./scripts/sign-linux-packages.sh
```

## Platform-Specific Notes

### Windows
- EV certificates provide immediate SmartScreen reputation
- OV certificates require reputation building
- New certificates (after June 2023) must be stored on HSM
- Azure Key Vault is recommended for cloud-based signing

### macOS
- Requires Apple Developer Program membership ($99/year)
- Notarization is required for Gatekeeper compatibility
- Different certificates needed for App Store vs. outside distribution
- Hardened Runtime is required for notarization

### Linux
- GPG signing is optional but recommended for trust
- Different methods for different package formats
- Public key distribution is crucial for verification
- No platform-mandated requirements

## Next Steps

1. **Choose signing method** for each platform based on requirements
2. **Obtain certificates** from appropriate authorities
3. **Set up environment variables** in your CI/CD system
4. **Test locally** before deploying to production
5. **Configure automated signing** in GitHub Actions

For detailed instructions, see the complete [Code Signing Guide](../../docs/CODE_SIGNING_GUIDE.md).