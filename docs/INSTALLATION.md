# BEAR AI Legal Assistant - Installation Guide

## 🚀 Quick Installation

### Prerequisites
- **Node.js 16.0.0+** - [Download from nodejs.org](https://nodejs.org)
- **npm 8.0.0+** (comes with Node.js)
- **Git** - [Download from git-scm.com](https://git-scm.com)

### One-Command Installation

```bash
# 1. Clone the repository
git clone https://github.com/KingOfTheAce2/BEAR_AI.git
cd BEAR_AI

# 2. Run the installer
npm run setup
```

That's it! The installer will:
- ✅ Install all dependencies
- ✅ Set up the development environment  
- ✅ Create platform-specific shortcuts
- ✅ Verify the installation
- ✅ Generate a detailed report

## 📦 Installation Options

### Standard Installation
```bash
npm run install:bear-ai
```

### Verbose Installation (with detailed output)
```bash
npm run install:bear-ai:verbose
```

### Development Installation (includes dev tools)
```bash
npm run install:bear-ai:dev
```

## 🚀 Starting BEAR AI

After installation, start BEAR AI with:

```bash
npm start
```

The web interface will open at: **http://localhost:3000**

## 🔧 Platform-Specific Notes

### Windows
- The installer creates desktop and Start Menu shortcuts
- Windows Defender might require permission for batch files

### macOS
- The installer creates an application in your Applications folder
- You might need to allow the application in Security & Privacy settings

### Linux
- The installer creates a desktop entry in your applications menu
- Ensure you have proper permissions in your home directory

## ✅ Verification

Check if everything is working:

```bash
# Test the build process
npm run build

# Run type checking
npm run typecheck

# Run tests
npm test
```

## 🆘 Troubleshooting

### Common Issues

**Installation fails:**
```bash
# Clean and retry
rm -rf node_modules package-lock.json
npm install
npm run setup
```

**Node.js version too old:**
- Update Node.js to 16.0.0 or newer from [nodejs.org](https://nodejs.org)

**Permission errors:**
- On Windows: Run Command Prompt as Administrator
- On macOS/Linux: Check file permissions in your home directory

**Network issues:**
- Check internet connection
- Try using `npm install --registry https://registry.npmjs.org/`

### Getting Help

- **Installation Report:** Check `installation-report.txt` for detailed information
- **Issues:** [GitHub Issues](https://github.com/KingOfTheAce2/BEAR_AI/issues)
- **Discussions:** [GitHub Discussions](https://github.com/KingOfTheAce2/BEAR_AI/discussions)

## 🎯 What Gets Installed

The installation includes:
- **React Frontend:** Modern web interface with TypeScript
- **API Server:** Express.js backend with authentication
- **Desktop Integration:** Platform-specific shortcuts and launchers
- **Documentation:** Complete guides and API references
- **Development Tools:** Testing, linting, and build tools (if requested)

---

**BEAR AI runs completely locally on your device - 100% private! 🛡️**