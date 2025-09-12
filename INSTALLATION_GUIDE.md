# BEAR AI Legal Assistant - Installation Guide

## Quick Start (Recommended)

### One-Command Installation
```bash
# For all platforms:
npm run setup

# Or directly:
node scripts/install-bear-ai.js
```

## Manual Installation

### Prerequisites
- Node.js 16.0.0 or higher
- npm 8.0.0 or higher  
- Python 3.8+ (optional, for AI features)
- Git (for cloning repository)

### Step-by-Step Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/KingOfTheAce2/BEAR_AI.git
   cd BEAR_AI
   ```

2. **Install Node.js dependencies**
   ```bash
   npm install
   ```

3. **Fix Python dependencies (if needed)**
   ```bash
   node scripts/fix-python-deps.js
   ```

4. **Start the application**
   ```bash
   npm start
   ```

## Platform-Specific Notes

### Windows
- Use `scripts/start-bear-ai.js` for proper launcher
- Desktop shortcut will be created automatically
- If Python dependencies fail, fallback requirements will be created

### macOS
- May require Xcode command line tools for some dependencies
- Application bundle will be created in Applications folder

### Linux
- Desktop entry will be created automatically
- May require additional system packages for PyQt6

## Troubleshooting

### Common Issues

1. **llama-cpp-python build failure**
   - Run: `node scripts/fix-python-deps.js`
   - Use fallback requirements if build fails

2. **Desktop shortcut not working**
   - Use: `node scripts/start-bear-ai.js`
   - Or run: `npm start` from project directory

3. **Permission errors**
   - On Windows: Run as Administrator
   - On Unix: Check file permissions with `chmod +x`

### Getting Help
- Check the [Issues](https://github.com/KingOfTheAce2/BEAR_AI/issues) page
- Review the installation report generated after setup

## Development

### Development Installation
```bash
node scripts/install-bear-ai.js --dev --verbose
```

### Available Commands
- `npm start` - Start the application
- `npm run dev` - Development mode with hot reload
- `npm run build` - Build for production
- `npm test` - Run tests
- `npm run typecheck` - TypeScript type checking

## Features
- ✅ Web interface (React + TypeScript)
- ✅ API server (Express.js)
- ✅ Desktop integration (cross-platform)
- ✅ AI-powered legal document analysis
- ✅ Automated testing and validation
