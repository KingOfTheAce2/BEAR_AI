# BEAR AI Troubleshooting Guide

## Platform-Specific Guides

### Windows Users
For comprehensive Windows troubleshooting, see: [Windows Troubleshooting Guide](WINDOWS_TROUBLESHOOTING.md)

## Quick Fixes

### Installation Issues

#### Windows Installer Error
```powershell
# Run as Administrator
# Right-click installer → Run as Administrator

# Or clear installer cache:
msiexec /unregister
msiexec /regserver
```

### Build Issues

#### Cargo Build Failures
```powershell
# Clean and rebuild
cd src-tauri
cargo clean
cargo build --release
```

#### NPM Issues
```powershell
# Clear cache and reinstall
npm cache clean --force
Remove-Item -Recurse node_modules
npm install --legacy-peer-deps
```

### Runtime Issues

#### Application Won't Start
1. Check for missing dependencies (Visual C++ Redistributables)
2. Install WebView2 Runtime from Microsoft
3. Run in compatibility mode if needed

#### White Screen
1. Update graphics drivers
2. Clear WebView2 cache
3. Disable hardware acceleration in config

### Performance Issues

#### High Memory Usage
- Limit AI model size in settings
- Close unused documents
- Restart application periodically

#### Slow Startup
- Add to Windows Defender exclusions
- Disable unnecessary startup programs
- Ensure adequate free disk space (>10GB)

## Common Solutions

### Reset Application
```powershell
# Backup and reset configuration
Move-Item "$env:APPDATA\BEAR AI Legal Assistant" "$env:APPDATA\BEAR_AI_backup"
```

### Check Logs
```powershell
# View application logs
type "%APPDATA%\BEAR AI Legal Assistant\logs\*.log"
```

### Verify System Requirements
- Windows 10 (1903+) or Windows 11
- 4GB RAM minimum (8GB recommended)
- 500MB free disk space
- x64 processor architecture

## Getting Help

1. Check [Windows Troubleshooting Guide](WINDOWS_TROUBLESHOOTING.md) for detailed solutions
2. Search [GitHub Issues](https://github.com/KingOfTheAce2/BEAR_AI/issues)
3. Create new issue with diagnostic information
4. Join community discussions

## Diagnostic Information to Include

When reporting issues, include:
- Windows version (`winver`)
- Error messages/screenshots
- Log files from `%APPDATA%\BEAR AI Legal Assistant\logs`
- Steps to reproduce the issue

---

*For detailed Windows troubleshooting, see [WINDOWS_TROUBLESHOOTING.md](WINDOWS_TROUBLESHOOTING.md)*