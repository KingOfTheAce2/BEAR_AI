# BEAR AI Windows Troubleshooting Guide

## Table of Contents
- [Installation Issues](#installation-issues)
- [Build Issues](#build-issues)
- [Runtime Errors](#runtime-errors)
- [Performance Problems](#performance-problems)
- [Security & Permissions](#security--permissions)
- [Quick Fixes](#quick-fixes)
- [Contact Support](#contact-support)

## Installation Issues

### MSI Installer Fails

**Problem**: Windows Installer error during setup
**Solutions**:
1. Run as Administrator:
   ```powershell
   # Right-click installer → Run as Administrator
   ```

2. Clear Windows Installer cache:
   ```powershell
   msiexec /unregister
   msiexec /regserver
   ```

3. Check Windows version:
   ```powershell
   winver
   # Requires Windows 10 1903+ or Windows 11
   ```

### "Windows protected your PC" Warning

**Problem**: SmartScreen blocks unsigned installer
**Solution**:
1. Click "More info"
2. Click "Run anyway"
3. Or disable SmartScreen temporarily:
   - Windows Security → App & browser control
   - Check apps and files → Warn/Off

### Missing Dependencies

**Problem**: Application won't start - missing DLLs
**Solutions**:

1. Install Visual C++ Redistributables:
   ```powershell
   # Download and install from Microsoft
   https://aka.ms/vs/17/release/vc_redist.x64.exe
   ```

2. Install WebView2 Runtime:
   ```powershell
   # Download from Microsoft
   https://developer.microsoft.com/en-us/microsoft-edge/webview2/
   ```

## Build Issues

### Cargo Build Failures

**Problem**: Rust compilation errors
**Solutions**:

1. Clean build:
   ```powershell
   cd src-tauri
   cargo clean
   Remove-Item -Recurse -Force target
   cargo build --release
   ```

2. Update Rust:
   ```powershell
   rustup update stable
   rustup target add x86_64-pc-windows-msvc
   ```

3. Fix disk space:
   ```powershell
   # Clean cargo cache
   cargo cache -a

   # Clean npm cache
   npm cache clean --force
   ```

### Node/NPM Issues

**Problem**: npm install or build fails
**Solutions**:

1. Clear npm cache:
   ```powershell
   npm cache clean --force
   Remove-Item -Recurse node_modules
   Remove-Item package-lock.json
   npm install
   ```

2. Increase memory:
   ```powershell
   $env:NODE_OPTIONS="--max-old-space-size=8192"
   npm run build
   ```

3. Use legacy deps resolution:
   ```powershell
   npm install --legacy-peer-deps
   ```

## Runtime Errors

### Application Won't Start

**Problem**: BEAR AI crashes on launch
**Solutions**:

1. Check logs:
   ```powershell
   # Check application logs
   type "%APPDATA%\BEAR AI Legal Assistant\logs\*.log"
   ```

2. Reset configuration:
   ```powershell
   # Backup and reset config
   Move-Item "%APPDATA%\BEAR AI Legal Assistant" "%APPDATA%\BEAR_AI_backup"
   ```

3. Run compatibility mode:
   - Right-click BEAR AI.exe
   - Properties → Compatibility
   - Run in Windows 8 compatibility mode

### White Screen/Blank Window

**Problem**: UI doesn't load
**Solutions**:

1. Update graphics drivers
2. Disable hardware acceleration:
   ```json
   // In %APPDATA%\BEAR AI Legal Assistant\config.json
   {
     "hardwareAcceleration": false
   }
   ```

3. Clear WebView2 cache:
   ```powershell
   Remove-Item -Recurse "%LOCALAPPDATA%\Microsoft\Edge\User Data\Default\Cache"
   ```

## Performance Problems

### High Memory Usage

**Problem**: Application uses excessive RAM
**Solutions**:

1. Limit model size in settings
2. Close unused documents
3. Restart application periodically

### Slow Startup

**Problem**: Application takes long to start
**Solutions**:

1. Disable Windows Defender scan:
   - Add BEAR AI to exclusions
   - Path: `%ProgramFiles%\BEAR AI Legal Assistant`

2. Disable startup items:
   ```powershell
   # Check startup impact
   Get-CimInstance Win32_StartupCommand
   ```

## Security & Permissions

### Firewall Blocking

**Problem**: Features not working due to firewall
**Solutions**:

1. Add firewall exception:
   ```powershell
   netsh advfirewall firewall add rule name="BEAR AI" dir=in action=allow program="%ProgramFiles%\BEAR AI Legal Assistant\BEAR AI.exe" enable=yes
   ```

### Antivirus False Positive

**Problem**: Antivirus quarantines application
**Solutions**:

1. Add to exclusions:
   - Windows Security → Virus & threat protection
   - Exclusions → Add folder
   - Select BEAR AI installation directory

2. Submit for analysis:
   - Report false positive to antivirus vendor

## Quick Fixes

### Emergency Reset Script

Create `reset-bear-ai.ps1`:
```powershell
# BEAR AI Emergency Reset Script
Write-Host "Resetting BEAR AI..." -ForegroundColor Yellow

# Stop process
Stop-Process -Name "BEAR AI" -Force -ErrorAction SilentlyContinue

# Clear cache
Remove-Item -Recurse -Force "$env:APPDATA\BEAR AI Legal Assistant\cache" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$env:LOCALAPPDATA\BEAR AI Legal Assistant" -ErrorAction SilentlyContinue

# Reset config
$configPath = "$env:APPDATA\BEAR AI Legal Assistant\config.json"
if (Test-Path $configPath) {
    Move-Item $configPath "$configPath.backup"
}

Write-Host "Reset complete! Please restart BEAR AI." -ForegroundColor Green
```

### Performance Optimization Script

Create `optimize-bear-ai.ps1`:
```powershell
# BEAR AI Performance Optimizer
Write-Host "Optimizing BEAR AI performance..." -ForegroundColor Yellow

# Set high priority
$process = Get-Process "BEAR AI" -ErrorAction SilentlyContinue
if ($process) {
    $process.PriorityClass = [System.Diagnostics.ProcessPriorityClass]::High
}

# Clear temp files
Remove-Item -Recurse -Force "$env:TEMP\bear-ai-*" -ErrorAction SilentlyContinue

# Optimize Windows
Optimize-Volume -DriveLetter C -ReTrim -Verbose

Write-Host "Optimization complete!" -ForegroundColor Green
```

## Common Error Codes

| Code | Description | Solution |
|------|------------|----------|
| 0x80070005 | Access denied | Run as Administrator |
| 0x80070057 | Invalid parameter | Reinstall application |
| 0x80004005 | Unspecified error | Check Windows Event Viewer |
| 0xc000007b | Architecture mismatch | Install x64 version |
| 0x80070643 | Installation failure | Clear installer cache |

## Diagnostic Commands

### System Information
```powershell
# Check system specs
systeminfo | findstr /B /C:"OS Name" /C:"OS Version" /C:"System Type"

# Check available memory
wmic OS get TotalVisibleMemorySize,FreePhysicalMemory

# Check disk space
fsutil volume diskfree c:
```

### Application Diagnostics
```powershell
# Check if running
tasklist | findstr "BEAR AI"

# Check port usage
netstat -an | findstr "3000"

# View event logs
eventvwr.msc
# Navigate to: Applications and Services Logs
```

## Environment Variables

Set these for troubleshooting:
```powershell
# Enable debug logging
$env:BEAR_AI_DEBUG="true"
$env:RUST_LOG="debug"
$env:NODE_ENV="development"

# Increase memory limits
$env:NODE_OPTIONS="--max-old-space-size=8192"
```

## Contact Support

If issues persist after trying these solutions:

1. **Gather Information**:
   - Windows version: `winver`
   - Error messages/screenshots
   - Log files from `%APPDATA%\BEAR AI Legal Assistant\logs`

2. **Report Issue**:
   - GitHub Issues: https://github.com/KingOfTheAce2/BEAR_AI/issues
   - Include diagnostic information
   - Describe steps to reproduce

3. **Emergency Support**:
   - Check GitHub Releases for patches
   - Review closed issues for solutions
   - Join community discussions

## Prevention Tips

1. **Regular Maintenance**:
   - Update Windows regularly
   - Keep graphics drivers current
   - Clear cache monthly

2. **Best Practices**:
   - Close other applications during heavy processing
   - Restart BEAR AI weekly
   - Keep 10GB free disk space

3. **Backup**:
   - Export settings regularly
   - Backup `%APPDATA%\BEAR AI Legal Assistant`
   - Document custom configurations

---

*Last Updated: December 2024*
*Version: 1.0.1*
*Platform: Windows x64*