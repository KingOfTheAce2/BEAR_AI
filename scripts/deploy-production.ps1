# Production Deployment Script for BEAR AI
# This script automates the complete production deployment process

param(
    [Parameter(Mandatory=$false)]
    [string]$Environment = "production",

    [Parameter(Mandatory=$false)]
    [string]$Version = "",

    [Parameter(Mandatory=$false)]
    [switch]$SkipTests = $false,

    [Parameter(Mandatory=$false)]
    [switch]$Emergency = $false
)

$ErrorActionPreference = "Stop"
$script:startTime = Get-Date

Write-Host "🚀 BEAR AI Production Deployment Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Configuration
$script:projectRoot = Split-Path -Parent $PSScriptRoot
$script:logFile = "$projectRoot\logs\deployment_$(Get-Date -Format 'yyyyMMdd_HHmmss').log"

# Create log directory if it doesn't exist
New-Item -ItemType Directory -Path "$projectRoot\logs" -Force | Out-Null

function Write-Log {
    param(
        [string]$Message,
        [string]$Level = "INFO"
    )

    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"

    # Write to console with color
    switch ($Level) {
        "ERROR" { Write-Host $Message -ForegroundColor Red }
        "WARNING" { Write-Host $Message -ForegroundColor Yellow }
        "SUCCESS" { Write-Host $Message -ForegroundColor Green }
        default { Write-Host $Message }
    }

    # Write to log file
    Add-Content -Path $script:logFile -Value $logMessage
}

function Test-Prerequisites {
    Write-Log "Checking prerequisites..." "INFO"

    # Check Node.js
    try {
        $nodeVersion = node --version
        Write-Log "✓ Node.js found: $nodeVersion" "SUCCESS"
    } catch {
        Write-Log "✗ Node.js not found. Please install Node.js 18+" "ERROR"
        exit 1
    }

    # Check npm
    try {
        $npmVersion = npm --version
        Write-Log "✓ npm found: $npmVersion" "SUCCESS"
    } catch {
        Write-Log "✗ npm not found" "ERROR"
        exit 1
    }

    # Check Rust (for Tauri)
    try {
        $rustVersion = rustc --version
        Write-Log "✓ Rust found: $rustVersion" "SUCCESS"
    } catch {
        Write-Log "⚠ Rust not found. Tauri builds will fail" "WARNING"
    }

    # Check Git
    try {
        $gitVersion = git --version
        Write-Log "✓ Git found: $gitVersion" "SUCCESS"
    } catch {
        Write-Log "✗ Git not found" "ERROR"
        exit 1
    }
}

function Test-Environment {
    Write-Log "Validating environment configuration..." "INFO"

    # Check for required environment variables
    $requiredVars = @(
        "STRIPE_PUBLISHABLE_KEY",
        "STRIPE_SECRET_KEY",
        "JWT_SECRET",
        "ENCRYPTION_KEY"
    )

    $missingVars = @()
    foreach ($var in $requiredVars) {
        if (-not [Environment]::GetEnvironmentVariable($var)) {
            $missingVars += $var
        }
    }

    if ($missingVars.Count -gt 0) {
        Write-Log "⚠ Missing environment variables: $($missingVars -join ', ')" "WARNING"

        if (-not $Emergency) {
            Write-Log "✗ Cannot proceed without required environment variables" "ERROR"
            exit 1
        } else {
            Write-Log "⚠ Emergency mode: Proceeding despite missing variables" "WARNING"
        }
    } else {
        Write-Log "✓ All required environment variables present" "SUCCESS"
    }
}

function Install-Dependencies {
    Write-Log "Installing dependencies..." "INFO"

    Set-Location $projectRoot

    # Clean install
    if (Test-Path "node_modules") {
        Write-Log "Cleaning existing node_modules..." "INFO"
        Remove-Item -Path "node_modules" -Recurse -Force
    }

    # Install dependencies
    Write-Log "Running npm ci..." "INFO"
    npm ci --prefer-offline --no-audit

    if ($LASTEXITCODE -ne 0) {
        Write-Log "✗ Failed to install dependencies" "ERROR"
        exit 1
    }

    Write-Log "✓ Dependencies installed successfully" "SUCCESS"
}

function Run-Tests {
    if ($SkipTests) {
        Write-Log "⚠ Skipping tests (--SkipTests flag set)" "WARNING"
        return
    }

    Write-Log "Running tests..." "INFO"

    # Run TypeScript checks
    Write-Log "Running TypeScript checks..." "INFO"
    npm run typecheck

    if ($LASTEXITCODE -ne 0) {
        Write-Log "✗ TypeScript checks failed" "ERROR"
        if (-not $Emergency) {
            exit 1
        }
    } else {
        Write-Log "✓ TypeScript checks passed" "SUCCESS"
    }

    # Run linting
    Write-Log "Running linting..." "INFO"
    npm run lint

    if ($LASTEXITCODE -ne 0) {
        Write-Log "⚠ Linting warnings found" "WARNING"
    } else {
        Write-Log "✓ Linting passed" "SUCCESS"
    }

    # Run unit tests
    Write-Log "Running unit tests..." "INFO"
    npm test -- --run

    if ($LASTEXITCODE -ne 0) {
        Write-Log "✗ Unit tests failed" "ERROR"
        if (-not $Emergency) {
            exit 1
        }
    } else {
        Write-Log "✓ Unit tests passed" "SUCCESS"
    }
}

function Build-Application {
    Write-Log "Building application..." "INFO"

    # Build frontend
    Write-Log "Building frontend..." "INFO"
    npm run build

    if ($LASTEXITCODE -ne 0) {
        Write-Log "✗ Frontend build failed" "ERROR"
        exit 1
    }

    Write-Log "✓ Frontend built successfully" "SUCCESS"

    # Build Tauri application
    if (Get-Command cargo -ErrorAction SilentlyContinue) {
        Write-Log "Building Tauri application..." "INFO"
        npm run tauri:build

        if ($LASTEXITCODE -ne 0) {
            Write-Log "⚠ Tauri build failed" "WARNING"
        } else {
            Write-Log "✓ Tauri application built successfully" "SUCCESS"
        }
    }
}

function Deploy-Application {
    Write-Log "Deploying to $Environment..." "INFO"

    # Create deployment tag
    if (-not $Version) {
        $Version = "v$(Get-Date -Format 'yyyy.MM.dd.HHmm')"
    }

    Write-Log "Creating deployment tag: $Version" "INFO"
    git tag -a $Version -m "Production deployment $Version"
    git push origin $Version

    # Trigger GitHub Actions workflow
    Write-Log "Triggering production deployment workflow..." "INFO"

    # The workflow will be triggered automatically by the tag push
    Write-Log "✓ Deployment workflow triggered" "SUCCESS"
    Write-Log "Monitor progress at: https://github.com/KingOfTheAce2/BEAR_AI/actions" "INFO"
}

function Update-Roadmap {
    Write-Log "Updating ROADMAP.md with deployment status..." "INFO"

    $roadmapPath = "$projectRoot\ROADMAP.md"
    if (Test-Path $roadmapPath) {
        $content = Get-Content $roadmapPath -Raw
        $date = Get-Date -Format "MMMM dd, yyyy"

        # Update deployment status
        $content = $content -replace "Last Updated: .*", "Last Updated: $date"
        $content = $content -replace "Version: .*", "Version: $Version"

        Set-Content -Path $roadmapPath -Value $content

        # Commit the update
        git add ROADMAP.md
        git commit -m "docs: Update ROADMAP.md - Production deployment $Version"
        git push origin main

        Write-Log "✓ ROADMAP.md updated" "SUCCESS"
    }
}

function Show-Summary {
    $endTime = Get-Date
    $duration = $endTime - $script:startTime

    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "📊 Deployment Summary" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan

    Write-Log "Environment: $Environment" "INFO"
    Write-Log "Version: $Version" "INFO"
    Write-Log "Duration: $($duration.ToString('mm\:ss'))" "INFO"
    Write-Log "Log file: $script:logFile" "INFO"

    Write-Host "`n✅ Production deployment completed successfully!" -ForegroundColor Green

    Write-Host "`n📝 Next Steps:" -ForegroundColor Yellow
    Write-Host "1. Monitor deployment: https://github.com/KingOfTheAce2/BEAR_AI/actions" -ForegroundColor White
    Write-Host "2. Check production logs: npm run logs:production" -ForegroundColor White
    Write-Host "3. Verify health: curl https://bear-ai.com/health" -ForegroundColor White
    Write-Host "4. Monitor metrics: https://bear-ai.com/monitoring" -ForegroundColor White
}

# Main execution
try {
    Test-Prerequisites
    Test-Environment
    Install-Dependencies
    Run-Tests
    Build-Application
    Deploy-Application
    Update-Roadmap
    Show-Summary
} catch {
    Write-Log "✗ Deployment failed: $_" "ERROR"
    Write-Log "Stack trace: $($_.ScriptStackTrace)" "ERROR"
    exit 1
}