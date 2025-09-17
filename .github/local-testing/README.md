# Local CI/CD Testing for BEAR AI

This directory contains tools and configurations for testing GitHub Actions workflows locally before deployment.

## Prerequisites

### 1. Install act (GitHub Actions Runner)

**Windows (via Chocolatey):**
```powershell
choco install act-cli
```

**Windows (via Scoop):**
```powershell
scoop install act
```

**macOS:**
```bash
brew install act
```

**Linux:**
```bash
curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash
```

### 2. Install Docker Desktop
- Download and install Docker Desktop for your platform
- Ensure Docker is running before executing tests

### 3. Required Files
- `.actrc` - Configuration file for act
- `workflows/` - Local workflow copies for testing
- `secrets/` - Local secrets configuration (DO NOT COMMIT)
- `platforms/` - Platform-specific configurations

## Quick Start

1. **Setup Environment:**
   ```bash
   cd .github/local-testing
   ./setup-local-testing.sh
   ```

2. **Run All Tests:**
   ```bash
   ./test-all-workflows.sh
   ```

3. **Test Specific Workflow:**
   ```bash
   act -W ../../workflows/ci-cd.yml --job quality-checks
   ```

4. **Test with Specific Platform:**
   ```bash
   act -P ubuntu-latest=ubuntu:22.04 -W ../../workflows/ci-cd.yml
   ```

## Directory Structure

```
.github/local-testing/
├── README.md                    # This file
├── .actrc                      # Act configuration
├── setup-local-testing.sh      # Environment setup script
├── test-all-workflows.sh       # Master test script
├── platforms/                  # Platform configurations
│   ├── .platforms             # Platform matrix
│   ├── ubuntu.json            # Ubuntu specific config
│   ├── windows.json           # Windows specific config
│   └── macos.json             # macOS specific config
├── secrets/                    # Local secrets (GITIGNORED)
│   ├── .secrets               # Secret definitions
│   └── example.env            # Example environment
├── workflows/                  # Test workflow copies
│   ├── ci-cd-local.yml        # Local CI/CD test
│   ├── security-audit-local.yml
│   └── release-local.yml
├── scripts/                    # Helper scripts
│   ├── validate-build.sh      # Build validation
│   ├── test-artifacts.sh      # Artifact testing
│   ├── benchmark-runner.sh    # Performance tests
│   └── cleanup.sh             # Cleanup script
└── docs/                      # Documentation
    ├── troubleshooting.md     # Common issues
    ├── performance.md         # Performance guides
    └── maintenance.md         # Maintenance procedures
```

## Commands Reference

### Testing Commands
```bash
# Test quality checks only
act -j quality-checks

# Test build matrix (single platform)
act -j build-tauri -P ubuntu-latest=ubuntu:22.04

# Test with custom secrets
act --secret-file secrets/.secrets

# Dry run (validate only)
act --dry-run

# List available workflows
act --list

# Verbose output
act --verbose
```

### Platform Testing
```bash
# Test Ubuntu build
act -P ubuntu-latest=ubuntu:22.04 -j build-tauri

# Test Windows build (requires Windows container)
act -P windows-latest=mcr.microsoft.com/windows/servercore:ltsc2022

# Test macOS build (requires macOS runner)
act -P macos-latest=macos-12
```

### Advanced Testing
```bash
# Test with custom environment
act --env-file .env

# Test specific event
act push

# Test pull request
act pull_request

# Test workflow dispatch
act workflow_dispatch
```

## Security Notes

- The `secrets/` directory is gitignored for security
- Never commit real secrets or tokens
- Use example files and local development tokens only
- Rotate any exposed credentials immediately

## Performance Monitoring

Each test run generates performance metrics:
- Build times per platform
- Resource usage statistics
- Artifact size analysis
- Cache effectiveness metrics

Metrics are stored in `metrics/` directory for analysis.