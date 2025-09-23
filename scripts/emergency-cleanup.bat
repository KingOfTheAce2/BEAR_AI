@echo off
echo 🚨 Emergency Disk Space Cleanup for BEAR AI Build
echo.

echo Cleaning Rust artifacts...
rmdir /s /q "D:\GitHub\BEAR_AI\src-tauri\target" 2>nul
rmdir /s /q "%USERPROFILE%\.cargo\registry\cache" 2>nul
rmdir /s /q "%USERPROFILE%\.cargo\git\checkouts" 2>nul
rmdir /s /q "%USERPROFILE%\.rustup\downloads" 2>nul
rmdir /s /q "%USERPROFILE%\.rustup\tmp" 2>nul

echo Cleaning Node.js artifacts...
rmdir /s /q "D:\GitHub\BEAR_AI\node_modules\.cache" 2>nul
rmdir /s /q "D:\GitHub\BEAR_AI\build" 2>nul
rmdir /s /q "%USERPROFILE%\AppData\Local\npm-cache" 2>nul

echo Cleaning system temp...
del /s /q "%TEMP%\*" 2>nul
for /d %%p in ("%TEMP%\*") do rmdir "%%p" /s /q 2>nul

echo Cleaning Tauri cache...
rmdir /s /q "%USERPROFILE%\.tauri" 2>nul
rmdir /s /q "%USERPROFILE%\AppData\Local\tauri" 2>nul

echo ✅ Emergency cleanup completed!
echo Try running: cd src-tauri && cargo check
pause