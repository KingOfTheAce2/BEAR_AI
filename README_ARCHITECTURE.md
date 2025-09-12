# BEAR AI Legal Assistant - Application Architecture

## 🚨 CRITICAL: Application Type & Technology Stack

**BEAR AI is a DESKTOP APPLICATION built with:**

- **Frontend**: React 18.2 + TypeScript 4.9 + TailwindCSS
- **Backend**: Rust/Tauri 1.8 (Desktop Framework)
- **Features**: System tray, auto-updater, local SQLite database
- **Platform**: Cross-platform desktop app (Windows, macOS, Linux)

## ❌ What BEAR AI is NOT:

- ~~Python-based CLI tool~~
- ~~Web-only application~~
- ~~Console/terminal application~~
- ~~Script collection~~

## ✅ What BEAR AI IS:

**A professional desktop application** with:
- Native desktop UI powered by React
- Rust backend for performance and security
- Local file system access and document processing
- System tray integration
- Automatic updates
- Professional Windows installer (NSIS)

## 🛠 Development Commands

### Install Dependencies
```bash
npm install                    # Install Node.js dependencies
```

### Development
```bash
npm start                      # Start React development server (localhost:3000)
tauri dev                     # Start Tauri desktop app (development)
npm run dev:full              # Start both frontend and API
```

### Build for Production
```bash
npm run build                 # Build React application
tauri build                   # Build desktop application + Windows installer
```

### Testing
```bash
npm test                      # Run Jest tests
npm run test:e2e             # Run Playwright E2E tests
npm run typecheck            # TypeScript type checking
npm run lint                 # ESLint code quality
```

## 📁 Project Structure

```
BEAR_AI/
├── src/                     # React TypeScript frontend
├── src-tauri/              # Rust/Tauri backend
├── public/                 # Static assets
├── tests/                  # Test suites
├── scripts/                # Installation & build scripts
└── package.json            # Node.js dependencies & scripts
```

## 🚀 Installation & Usage

### For Users
1. Download Windows installer from [GitHub Releases](https://github.com/KingOfTheAce2/BEAR_AI/releases)
2. Run the `.exe` installer
3. Launch from desktop shortcut or Start Menu

### For Developers
1. **Setup**: `npm install` → Install Rust toolchain
2. **Development**: `npm start` (React dev server) + `tauri dev` (desktop app)
3. **Build**: `tauri build` → Creates Windows installer

### MCP/Claude Code Integration
- **Development Server**: `npm start` runs on `http://localhost:3000`
- **MCP Connection**: Claude Code connects to localhost:3000 for development
- **Desktop App**: Production app runs natively (no localhost needed)

## 🔧 Key Configuration Files

- `package.json` - Node.js dependencies and scripts
- `src-tauri/tauri.conf.json` - Desktop app configuration
- `src-tauri/Cargo.toml` - Rust dependencies
- `tailwind.config.js` - UI styling configuration

## ⚠️ Important Notes

- **Never confuse this with Python tooling**
- Uses existing professional installer at `scripts/install-bear-ai.js`
- Desktop app with web frontend, not a web application
- Targets professional legal users with polished UI/UX

---

**Remember: BEAR AI = Professional Desktop App with React UI + Rust Performance**