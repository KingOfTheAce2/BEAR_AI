# BEAR AI GUI Setup Guide

This guide will help you set up the BEAR AI GUI application on your local development environment.

## System Requirements

- **Node.js**: >= 18.0.0
- **npm**: >= 9.0.0
- **Operating System**: Windows 10/11, macOS, or Linux
- **Memory**: At least 4GB RAM recommended
- **Disk Space**: At least 2GB available space

## Step-by-Step Setup

### 1. Verify Node.js Installation

```bash
# Check Node.js version
node --version

# Check npm version
npm --version
```

If Node.js is not installed, download it from [nodejs.org](https://nodejs.org/).

### 2. Navigate to the GUI Directory

```bash
cd GUI
```

### 3. Install Dependencies

```bash
# Install all project dependencies
npm install

# This will install:
# - React 18 and React DOM
# - TypeScript and type definitions
# - Vite build tool
# - Tailwind CSS for styling
# - Zustand for state management
# - React Router for routing
# - Axios for HTTP requests
# - Lucide React for icons
# - Vitest for testing
# - ESLint and Prettier for code quality
```

### 4. Configure Environment Variables

```bash
# Copy the example environment file
cp .env.example .env

# Edit the .env file with your specific configuration
# Use your preferred text editor
```

Example `.env` configuration:

```env
VITE_APP_TITLE="BEAR AI Legal Assistant"
VITE_APP_DESCRIPTION="Advanced Legal AI Assistant for Professional Use"
VITE_API_BASE_URL=http://localhost:8000
VITE_API_TIMEOUT=30000
VITE_AUTH_TOKEN_KEY=bear_ai_token
VITE_ENABLE_DEBUG_MODE=true
```

### 5. Start the Development Server

```bash
# Start the development server
npm run dev

# The application will be available at:
# http://localhost:3000
```

You should see output similar to:

```
  VITE v5.0.8  ready in 1234 ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
  ➜  press h to show help
```

### 6. Verify the Setup

Open your browser and navigate to `http://localhost:3000`. You should see the BEAR AI login page.

**Demo Credentials:**
- Email: `demo@bearai.com`
- Password: `demo123`

## Development Workflow

### Running Tests

```bash
# Run tests once
npm run test

# Run tests in watch mode
npm run test -- --watch

# Run tests with coverage report
npm run coverage

# Open test UI
npm run test:ui
```

### Code Quality

```bash
# Run linting
npm run lint

# Fix linting issues automatically
npm run lint:fix

# Format code
npm run format

# Check if code is formatted correctly
npm run format:check

# Type checking
npm run typecheck
```

### Building for Production

```bash
# Create production build
npm run build

# Preview production build locally
npm run preview
```

The build will be created in the `dist/` directory.

## Troubleshooting

### Common Issues

#### 1. Port 3000 Already in Use

```bash
# Kill process using port 3000
npx kill-port 3000

# Or start on a different port
npm run dev -- --port 3001
```

#### 2. Node Modules Issues

```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### 3. TypeScript Errors

```bash
# Run type checking
npm run typecheck

# Clear TypeScript cache
npx tsc --build --clean
```

#### 4. ESLint/Prettier Conflicts

```bash
# Fix code formatting
npm run format
npm run lint:fix
```

### Memory Issues

If you encounter memory issues during development:

```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"

# Or on Windows
set NODE_OPTIONS=--max-old-space-size=4096
```

### Disk Space Issues

If installation fails due to disk space:

1. Clear npm cache: `npm cache clean --force`
2. Remove unnecessary files from your system
3. Use `npm ci` instead of `npm install` for faster, cleaner installation

## IDE Setup

### VS Code Recommended Extensions

Install these extensions for the best development experience:

- ES7+ React/Redux/React-Native snippets
- TypeScript Importer
- Tailwind CSS IntelliSense
- ESLint
- Prettier - Code formatter
- Auto Rename Tag
- Bracket Pair Colorizer
- GitLens

### VS Code Settings

Add to your VS Code `settings.json`:

```json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "tailwindCSS.experimental.classRegex": [
    ["cn\\(([^)]*)\\)", "(?:'|\"|`)([^']*)(?:'|\"|`)"]
  ]
}
```

## Next Steps

Once you have the development environment set up:

1. **Explore the codebase**: Start with `src/App.tsx` and follow the component hierarchy
2. **Review the documentation**: Check the `docs/` directory for detailed guides
3. **Run the tests**: Ensure all tests pass with `npm run test`
4. **Start developing**: Create new components, pages, or features

## Getting Help

If you encounter issues:

1. Check this troubleshooting guide
2. Review the project README.md
3. Check the GitHub issues for similar problems
4. Contact the development team

Happy coding! 🚀