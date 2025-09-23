# Emergency Cargo Fix for Disk Space Issues
# Fixes critical Rust toolchain installation problems

Write-Host "🚨 Emergency Cargo Fix - Addressing Disk Space Crisis" -ForegroundColor Red

# Stop any running Rust processes
Write-Host "Stopping Rust processes..." -ForegroundColor Yellow
Get-Process | Where-Object { $_.Name -match "rustc|cargo|rust-analyzer" } | Stop-Process -Force -ErrorAction SilentlyContinue

# Clean up corrupted Rust installation
Write-Host "Cleaning corrupted Rust installation..." -ForegroundColor Yellow
$rustupHome = "$env:USERPROFILE\.rustup"
$cargoHome = "$env:USERPROFILE\.cargo"

# Remove downloads and temp files
Remove-Item -Path "$rustupHome\downloads\*" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "$rustupHome\tmp\*" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "$cargoHome\registry\cache\*" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "$cargoHome\git\checkouts\*" -Recurse -Force -ErrorAction SilentlyContinue

# Clean system temp
Remove-Item -Path "$env:TEMP\*" -Recurse -Force -ErrorAction SilentlyContinue

# Try to complete Rust installation with minimal components
Write-Host "Attempting to fix Rust installation..." -ForegroundColor Cyan
rustup self update-no-self-update
rustup toolchain install stable --no-self-update --force
rustup default stable

Write-Host "✅ Emergency fix completed. Try running Cargo commands now." -ForegroundColor Green