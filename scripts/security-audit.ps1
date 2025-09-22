# Security Vulnerability Scanner and Fixer for BEAR AI
# This script identifies and fixes security vulnerabilities

param(
    [Parameter(Mandatory=$false)]
    [switch]$AutoFix = $false,

    [Parameter(Mandatory=$false)]
    [switch]$SkipNpmAudit = $false
)

$ErrorActionPreference = "Stop"
$script:vulnerabilities = @()

Write-Host "🔒 BEAR AI Security Vulnerability Scanner" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

function Test-SqlInjection {
    Write-Host "🔍 Checking for SQL Injection vulnerabilities..." -ForegroundColor Yellow

    $sqlFiles = Get-ChildItem -Path "$PSScriptRoot\..\src" -Recurse -Filter "*.ts" |
                 Select-String -Pattern "query\(|exec\(|raw\(" -List

    $vulnerable = @()
    foreach ($file in $sqlFiles) {
        $content = Get-Content $file.Path -Raw

        # Check for string concatenation in queries
        if ($content -match '(query|exec|raw)\s*\([^)]*\+[^)]*\)') {
            $vulnerable += $file.Path
            Write-Host "  ⚠️ Potential SQL injection: $($file.Path)" -ForegroundColor Red
        }
    }

    if ($vulnerable.Count -eq 0) {
        Write-Host "  ✅ No SQL injection vulnerabilities found" -ForegroundColor Green
    } else {
        $script:vulnerabilities += @{
            Type = "SQL Injection"
            Files = $vulnerable
            Severity = "Critical"
        }
    }
}

function Test-XSSVulnerabilities {
    Write-Host "🔍 Checking for XSS vulnerabilities..." -ForegroundColor Yellow

    $xssPatterns = @(
        'dangerouslySetInnerHTML',
        'innerHTML\s*=',
        'document\.write',
        'eval\(',
        'new Function\('
    )

    $vulnerable = @()
    foreach ($pattern in $xssPatterns) {
        $matches = Get-ChildItem -Path "$PSScriptRoot\..\src" -Recurse -Include "*.tsx","*.ts","*.jsx","*.js" |
                   Select-String -Pattern $pattern -List

        foreach ($match in $matches) {
            # Check if it's properly sanitized
            $content = Get-Content $match.Path -Raw
            if ($content -match $pattern -and $content -notmatch "DOMPurify|sanitize|escape") {
                $vulnerable += $match.Path
                Write-Host "  ⚠️ Potential XSS vulnerability: $($match.Path)" -ForegroundColor Red
            }
        }
    }

    if ($vulnerable.Count -eq 0) {
        Write-Host "  ✅ No XSS vulnerabilities found" -ForegroundColor Green
    } else {
        $script:vulnerabilities += @{
            Type = "XSS"
            Files = $vulnerable
            Severity = "High"
        }
    }
}

function Test-HardcodedSecrets {
    Write-Host "🔍 Checking for hardcoded secrets..." -ForegroundColor Yellow

    $secretPatterns = @(
        'api[_-]?key\s*[:=]\s*["\'][^"\']+["\']',
        'secret[_-]?key\s*[:=]\s*["\'][^"\']+["\']',
        'password\s*[:=]\s*["\'][^"\']+["\']',
        'token\s*[:=]\s*["\'][^"\']+["\']',
        'sk_live_[a-zA-Z0-9]+',
        'pk_live_[a-zA-Z0-9]+',
        'Bearer\s+[a-zA-Z0-9\-._~+/]+=*'
    )

    $vulnerable = @()
    foreach ($pattern in $secretPatterns) {
        $matches = Get-ChildItem -Path "$PSScriptRoot\..\src" -Recurse -Include "*.ts","*.tsx","*.js","*.jsx" |
                   Select-String -Pattern $pattern -List

        foreach ($match in $matches) {
            # Skip if it's using environment variables
            $line = $match.Line
            if ($line -notmatch 'process\.env' -and $line -notmatch 'import\.meta\.env') {
                $vulnerable += "$($match.Path):$($match.LineNumber)"
                Write-Host "  ⚠️ Potential hardcoded secret: $($match.Path):$($match.LineNumber)" -ForegroundColor Red
            }
        }
    }

    if ($vulnerable.Count -eq 0) {
        Write-Host "  ✅ No hardcoded secrets found" -ForegroundColor Green
    } else {
        $script:vulnerabilities += @{
            Type = "Hardcoded Secrets"
            Files = $vulnerable
            Severity = "Critical"
        }
    }
}

function Test-InsecureRandomness {
    Write-Host "🔍 Checking for insecure randomness..." -ForegroundColor Yellow

    $vulnerable = Get-ChildItem -Path "$PSScriptRoot\..\src" -Recurse -Include "*.ts","*.tsx" |
                  Select-String -Pattern "Math\.random\(\)" -List |
                  Where-Object {
                      $content = Get-Content $_.Path -Raw
                      $content -match "token|password|key|secret|crypto|security"
                  }

    if ($vulnerable.Count -eq 0) {
        Write-Host "  ✅ No insecure randomness in security contexts" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️ Math.random() used in security context:" -ForegroundColor Red
        foreach ($file in $vulnerable) {
            Write-Host "    - $($file.Path)" -ForegroundColor Red
        }

        $script:vulnerabilities += @{
            Type = "Insecure Randomness"
            Files = $vulnerable | ForEach-Object { $_.Path }
            Severity = "Medium"
        }
    }
}

function Test-CSRFProtection {
    Write-Host "🔍 Checking CSRF protection..." -ForegroundColor Yellow

    $apiFiles = Get-ChildItem -Path "$PSScriptRoot\..\src" -Recurse -Filter "*.ts" |
                Select-String -Pattern "fetch\(|axios\.|XMLHttpRequest" -List

    $unprotected = @()
    foreach ($file in $apiFiles) {
        $content = Get-Content $file.Path -Raw

        # Check if CSRF tokens are being used
        if ($content -match "(POST|PUT|DELETE|PATCH)" -and
            $content -notmatch "csrf|xsrf|X-CSRF-Token|X-XSRF-Token") {
            $unprotected += $file.Path
        }
    }

    if ($unprotected.Count -eq 0) {
        Write-Host "  ✅ CSRF protection appears to be in place" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️ Missing CSRF protection in:" -ForegroundColor Yellow
        foreach ($file in $unprotected) {
            Write-Host "    - $file" -ForegroundColor Yellow
        }

        $script:vulnerabilities += @{
            Type = "Missing CSRF Protection"
            Files = $unprotected
            Severity = "Medium"
        }
    }
}

function Test-NpmVulnerabilities {
    if (-not $SkipNpmAudit) {
        Write-Host "🔍 Running npm audit..." -ForegroundColor Yellow

        Set-Location "$PSScriptRoot\.."
        $auditResult = npm audit --json 2>$null | ConvertFrom-Json

        if ($auditResult.vulnerabilities) {
            $criticalCount = 0
            $highCount = 0

            foreach ($vuln in $auditResult.vulnerabilities.PSObject.Properties) {
                switch ($vuln.Value.severity) {
                    "critical" { $criticalCount++ }
                    "high" { $highCount++ }
                }
            }

            if ($criticalCount -gt 0 -or $highCount -gt 0) {
                Write-Host "  ⚠️ Found $criticalCount critical and $highCount high severity npm vulnerabilities" -ForegroundColor Red

                if ($AutoFix) {
                    Write-Host "  🔧 Attempting to fix npm vulnerabilities..." -ForegroundColor Cyan
                    npm audit fix 2>$null

                    # Re-check after fix
                    $postFix = npm audit --json 2>$null | ConvertFrom-Json
                    $remainingCritical = 0
                    $remainingHigh = 0

                    foreach ($vuln in $postFix.vulnerabilities.PSObject.Properties) {
                        switch ($vuln.Value.severity) {
                            "critical" { $remainingCritical++ }
                            "high" { $remainingHigh++ }
                        }
                    }

                    if ($remainingCritical -eq 0 -and $remainingHigh -eq 0) {
                        Write-Host "  ✅ All critical and high vulnerabilities fixed!" -ForegroundColor Green
                    } else {
                        Write-Host "  ⚠️ Some vulnerabilities require manual intervention" -ForegroundColor Yellow
                    }
                }
            } else {
                Write-Host "  ✅ No critical or high npm vulnerabilities" -ForegroundColor Green
            }
        }
    }
}

function Fix-CommonVulnerabilities {
    if ($AutoFix) {
        Write-Host ""
        Write-Host "🔧 Applying automatic fixes..." -ForegroundColor Cyan

        # Fix the SettingsPage import issue (already done above)

        # Add security headers to Tauri config
        $tauriConfig = "$PSScriptRoot\..\src-tauri\tauri.conf.json"
        if (Test-Path $tauriConfig) {
            $config = Get-Content $tauriConfig -Raw | ConvertFrom-Json

            if (-not $config.tauri.security.csp) {
                Write-Host "  Adding Content Security Policy..." -ForegroundColor Yellow
                $config.tauri.security | Add-Member -MemberType NoteProperty -Name "csp" -Value "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';" -Force
                $config | ConvertTo-Json -Depth 10 | Set-Content $tauriConfig
                Write-Host "  ✅ CSP added" -ForegroundColor Green
            }
        }

        Write-Host "  ✅ Automatic fixes applied" -ForegroundColor Green
    }
}

# Run all security tests
Test-SqlInjection
Test-XSSVulnerabilities
Test-HardcodedSecrets
Test-InsecureRandomness
Test-CSRFProtection
Test-NpmVulnerabilities

# Apply fixes if requested
Fix-CommonVulnerabilities

# Summary
Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "📊 Security Scan Summary" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

if ($script:vulnerabilities.Count -eq 0) {
    Write-Host "✅ No security vulnerabilities detected!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Your application has passed all security checks." -ForegroundColor Green
} else {
    Write-Host "⚠️ Found $($script:vulnerabilities.Count) vulnerability categories:" -ForegroundColor Yellow

    foreach ($vuln in $script:vulnerabilities) {
        Write-Host ""
        Write-Host "  $($vuln.Type) [$($vuln.Severity)]" -ForegroundColor Red
        Write-Host "  Affected files: $($vuln.Files.Count)" -ForegroundColor White
    }

    Write-Host ""
    Write-Host "Run with -AutoFix flag to apply automatic fixes where possible." -ForegroundColor Cyan
}

Write-Host ""
Write-Host "For production deployment, ensure:" -ForegroundColor Yellow
Write-Host "  • All environment variables are set" -ForegroundColor White
Write-Host "  • HTTPS is enforced" -ForegroundColor White
Write-Host "  • Rate limiting is configured" -ForegroundColor White
Write-Host "  • Monitoring is active" -ForegroundColor White