# BEAR AI - Windows Installation Guide

## 🐻⚖️ Three Easy Ways to Install BEAR AI on Windows

The original `install.js` file was designed for Node.js, not Windows Script Host. I've created three Windows-compatible installers for you:

---

## Method 1: Windows Batch File (Easiest) ✅

**Recommended for most users**

1. **Double-click** `install-windows.bat`
2. Follow the on-screen prompts
3. The installer will automatically:
   - Download BEAR AI from GitHub
   - Extract files to your home directory
   - Create desktop shortcut
   - Set up basic configuration

**Features:**
- ✅ No additional software required
- ✅ Works on all Windows versions
- ✅ Automatic error handling
- ✅ Progress indicators
- ✅ Desktop shortcut creation

---

## Method 2: PowerShell Script (Advanced) 🔧

**For users comfortable with PowerShell**

1. **Right-click** `install-simple.ps1`
2. Select "Run with PowerShell"
   - Or open PowerShell and run:
   ```powershell
   powershell -ExecutionPolicy Bypass -File install-simple.ps1
   ```

**Features:**
- ✅ Advanced error handling
- ✅ Backup existing installations
- ✅ Detailed system checks
- ✅ Progress tracking with BITS
- ✅ Configurable installation path

---

## Method 3: Windows Script Host (Legacy) 📄

**For older systems or specific requirements**

1. **Right-click** `install-windows.js`
2. Select "Open with" → "Microsoft Windows Based Script Host"
   - Or run from command prompt:
   ```cmd
   cscript install-windows.js
   ```

**Features:**
- ✅ Compatible with older Windows versions
- ✅ Minimal system requirements
- ✅ Pure Windows scripting
- ✅ No PowerShell required

---

## 🚀 After Installation

Once any installer completes successfully:

### 1. Install Node.js (if not already installed)
- Download from: https://nodejs.org
- Choose LTS (Long Term Support) version
- Run installer with default settings

### 2. Install BEAR AI Dependencies
Open Command Prompt or PowerShell and run:
```cmd
cd %USERPROFILE%\BEAR_AI
npm install
```

### 3. Start BEAR AI
```cmd
npm start
```

### 4. Open in Browser
Navigate to: http://localhost:3000

---

## 🔧 Troubleshooting

### Issue: Script execution error 800A03F6
**Solution:** Use `install-windows.bat` or `install-simple.ps1` instead of the original `install.js`

### Issue: PowerShell execution policy error
**Solution:** Run PowerShell as Administrator and execute:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Issue: Download fails
**Solutions:**
- Check your internet connection
- Temporarily disable antivirus/firewall
- Run installer as Administrator
- Try a different installation method

### Issue: Permission denied
**Solutions:**
- Right-click installer and "Run as Administrator"
- Check if folder is write-protected
- Choose a different installation directory

### Issue: Node.js not found
**Solution:** Install Node.js from https://nodejs.org and restart your command prompt

---

## 📁 Installation Locations

**Default installation directory:** `%USERPROFILE%\BEAR_AI`
- Windows 10/11: `C:\Users\YourUsername\BEAR_AI`
- Older versions: Similar pattern

**What's installed:**
- ✅ Complete BEAR AI source code
- ✅ Documentation and guides
- ✅ Configuration files
- ✅ Desktop shortcut
- ✅ Basic setup files

---

## 🆘 Need Help?

**If you encounter issues:**

1. **Check the installation log** - Each installer provides detailed output
2. **Try a different installation method** - If one fails, try another
3. **Run as Administrator** - Fixes most permission issues
4. **Check system requirements:**
   - Windows 7 or newer
   - Internet connection for download
   - 1GB+ free disk space
   - Administrator privileges (recommended)

**Get Support:**
- 📚 Documentation: `BEAR_AI\docs\`
- 🐛 Report Issues: https://github.com/KingOfTheAce2/BEAR_AI/issues
- 💬 Discussions: https://github.com/KingOfTheAce2/BEAR_AI/discussions

---

## ✅ Success Indicators

**Installation was successful if you see:**
- ✅ All progress steps completed without errors
- ✅ Desktop shortcut created
- ✅ Installation verification passed
- ✅ BEAR_AI folder contains source files
- ✅ Configuration files created

**After `npm install` and `npm start`:**
- ✅ Command prompt shows "Starting development server..."
- ✅ Browser opens automatically to http://localhost:3000
- ✅ BEAR AI interface loads successfully

---

**Welcome to BEAR AI Legal Assistant! 🐻⚖️**

Your privacy-first, offline-capable legal AI assistant is now ready to help with professional legal tasks.