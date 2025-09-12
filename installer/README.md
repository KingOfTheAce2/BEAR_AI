# BEAR AI Windows Installation

## 🚀 Native Windows Program Installation

BEAR AI runs as a **native Windows program** - no web browser, no localhost dependency, just direct AI legal assistance.

## 📦 Installation Files

### **For Distribution:**
- **`BEAR_AI_Native_Installer.bat`** - Main installer (run this)
- **`bear_ai_package.zip`** - Complete BEAR AI package
- **`BEAR_AI_Portable/`** - Portable version (no installation required)

## 🛠️ Installation Instructions

### **Method 1: Automated Installation (Recommended)**
1. Download Python 3.8+ from https://python.org
2. Download both files: `BEAR_AI_Native_Installer.bat` and `bear_ai_package.zip`
3. Place both files in the same folder
4. **Run `BEAR_AI_Native_Installer.bat` as Administrator**
5. Follow installation prompts

### **Method 2: Portable Version**
1. Extract `BEAR_AI_Portable` folder anywhere
2. Install dependencies: `pip install -r requirements.txt`
3. Run: `BEAR_AI.bat` (choose GUI or CLI)

## ✅ What You Get After Installation

### **Desktop Shortcut:**
- **"BEAR AI"** - Launches native Windows program

### **Program Interface:**
```
==========================================================
    BEAR AI Legal Assistant
    Privacy-First, Local-Only AI  
==========================================================

Choose how to run BEAR AI:
1) Interactive Chat (recommended)
2) API Server Mode  
3) Command Line Help
4) Exit
```

## 🎯 Key Features

- ✅ **Native Windows Program** - Runs like any .exe
- ✅ **No Web Browser Required** - Direct terminal interface
- ✅ **No localhost:3000** - Completely local
- ✅ **Privacy-First** - All AI processing stays on your machine
- ✅ **Legal Document Analysis** - PII detection, contract review
- ✅ **Interactive Chat** - Direct AI conversation
- ✅ **API Server Mode** - Optional for integrations

## 🆘 Troubleshooting

### **If installation fails:**
- Check Python is installed: `python --version`
- Run installer as Administrator
- Make sure both .bat and .zip files are in same folder

### **If program won't start:**
- Check desktop shortcut points to correct folder
- Try running from installation directory: `%USERPROFILE%\BEAR_AI\BEAR_AI.bat`

## 🗂️ Files Created During Installation

```
%USERPROFILE%\BEAR_AI\
├── BEAR_AI.bat              # Main executable
├── src\                     # BEAR AI source code
├── requirements.txt         # Python dependencies
├── package.json            # Node.js config (optional)
└── examples\               # Usage examples
```

## 🔧 Advanced Usage

### **Command Line Options:**
```bash
# Interactive chat
BEAR_AI.bat

# Show help
python -c "import sys; sys.path.insert(0, 'src'); from bear_ai.__main__ import main; main()" --help

# Discover models
python -c "import sys; sys.path.insert(0, 'src'); from bear_ai.__main__ import main; main()" discover

# Start API server
python -c "import sys; sys.path.insert(0, 'src'); from bear_ai.__main__ import main; main()" serve
```

---

**BEAR AI runs completely offline - your data never leaves your machine!** 🐻⚖️