# Environment Variable Management Guide

## Overview

BEAR AI uses a comprehensive environment variable management system to handle configuration across different deployment environments (development, staging, production). This guide covers setup, validation, and best practices.

## Quick Start

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Fill in the required values in `.env`

3. Validate your configuration:
   ```bash
   npm run env:validate
   ```

4. Start the application:
   ```bash
   npm run dev
   ```

## Environment Files

### File Structure
- `.env.example` - Template with all variables and documentation
- `.env` - Local development environment (never commit)
- `.env.production.example` - Production template
- `.env.staging` - Staging environment (never commit)
- `.env.test` - Testing environment (never commit)

### File Priority
Environment variables are loaded in this order (last wins):
1. `.env.example` defaults
2. `.env` (local)
3. `.env.local` (local overrides)
4. `.env.[environment]` (environment-specific)
5. Process environment variables

## Required Environment Variables

### Critical Production Variables
These MUST be set for production deployment:

```bash
# Application Environment
NODE_ENV=production
APP_URL=https://your-domain.com
API_BASE_URL=https://api.your-domain.com

# Security (CRITICAL)
JWT_SECRET=your_super_secure_jwt_secret_32_chars_minimum
SESSION_SECRET=your_super_secure_session_secret_32_chars
ENCRYPTION_KEY=your_exactly_32_character_key_here

# Database
DATABASE_URL=postgresql://username:password@host:port/database
DATABASE_ENCRYPTION_KEY=your_32_character_database_key

# Stripe Payment Processing
STRIPE_PUBLISHABLE_KEY=pk_live_your_live_key
STRIPE_SECRET_KEY=sk_live_your_live_key
STRIPE_WEBHOOK_SECRET=whsec_your_live_webhook_secret
STRIPE_ENVIRONMENT=live

# Admin Account
ADMIN_EMAIL=admin@yourcompany.com
ADMIN_PASSWORD_HASH=your_bcrypt_hashed_password
```

### Development Variables
Additional variables for development:

```bash
# Development Settings
TAURI_DEBUG=true
DEV_ENABLE_CORS=true
DEV_ENABLE_DEBUG_LOGS=true
LOG_LEVEL=debug

# Testing
TEST_DATABASE_URL=sqlite://./data/test_bear_ai.db
TEST_MOCK_PAYMENT_PROCESSING=true
```

## Environment Setup by Deployment Type

### Development Environment

1. **Copy template:**
   ```bash
   cp .env.example .env
   ```

2. **Set development values:**
   ```bash
   NODE_ENV=development
   TAURI_DEBUG=true
   LOG_LEVEL=debug
   DEV_ENABLE_CORS=true

   # Use Stripe test keys
   STRIPE_ENVIRONMENT=test
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_SECRET_KEY=sk_test_...

   # Local database
   DATABASE_URL=sqlite://./data/bear_ai.db
   ```

3. **Generate secrets:**
   ```bash
   # Generate secure random secrets
   openssl rand -hex 32  # For JWT_SECRET
   openssl rand -hex 32  # For SESSION_SECRET
   openssl rand -base64 32 | head -c 32  # For ENCRYPTION_KEY
   ```

### Staging Environment

1. **Create staging file:**
   ```bash
   cp .env.example .env.staging
   ```

2. **Configure for staging:**
   ```bash
   NODE_ENV=staging
   APP_URL=https://staging.yourcompany.com

   # Use staging database
   DATABASE_URL=postgresql://staging_user:password@staging-db:5432/bear_ai_staging

   # Use Stripe test keys but staging webhook
   STRIPE_ENVIRONMENT=test
   STRIPE_WEBHOOK_URL=https://staging.yourcompany.com/stripe/webhook

   # Staging-specific monitoring
   SENTRY_ENVIRONMENT=staging
   LOG_LEVEL=info
   ```

### Production Environment

1. **Create production file:**
   ```bash
   cp .env.production.example .env.production
   ```

2. **Configure for production:**
   ```bash
   NODE_ENV=production
   APP_URL=https://yourcompany.com
   API_BASE_URL=https://api.yourcompany.com

   # Production database with SSL
   DATABASE_URL=postgresql://prod_user:secure_password@prod-db:5432/bear_ai_prod?sslmode=require

   # Live Stripe keys
   STRIPE_ENVIRONMENT=live
   STRIPE_PUBLISHABLE_KEY=pk_live_...
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_live_...

   # Production security settings
   SESSION_SECURE=true
   TAURI_DEBUG=false
   LOG_LEVEL=warn

   # Enterprise features
   ENTERPRISE_MODE=true
   ENABLE_AI_LEGAL_ADVICE=true
   ```

## Security Best Practices

### Secret Generation
Generate cryptographically secure secrets:

```bash
# JWT Secret (32+ characters)
openssl rand -hex 32

# Session Secret (32+ characters)
openssl rand -hex 32

# Encryption Key (exactly 32 characters)
openssl rand -base64 32 | head -c 32

# Database Encryption Key (32 characters)
openssl rand -hex 16
```

### Secret Rotation
Regularly rotate secrets, especially:
- JWT secrets (monthly in production)
- Database encryption keys (quarterly)
- API keys (when compromised or quarterly)
- Session secrets (monthly)

### Production Security Checklist

- [ ] All secrets are cryptographically random and 32+ characters
- [ ] `NODE_ENV=production`
- [ ] `TAURI_DEBUG=false`
- [ ] `SESSION_SECURE=true`
- [ ] Database uses SSL (`sslmode=require`)
- [ ] HTTPS URLs only
- [ ] No development-only features enabled
- [ ] Monitoring and logging configured
- [ ] Backup and recovery configured

## Validation and Health Checks

### Manual Validation
```bash
# Validate environment configuration
npm run env:validate

# Check environment health
npm run env:health

# Generate security report
npm run env:security-report
```

### Programmatic Validation
```typescript
import { environmentManager, environmentValidator } from '@/services/environment';

// Load and validate environment
const validation = await environmentManager.load();
if (!validation.isValid) {
  console.error('Environment validation failed:', validation.errors);
  process.exit(1);
}

// Perform security audit
const security = environmentValidator.performSecurityAudit();
if (security.level === 'critical') {
  console.error('Critical security issues found');
  process.exit(1);
}
```

### Continuous Health Monitoring
```typescript
import { environmentHealthChecker } from '@/utils/environmentHealthCheck';

// Start continuous monitoring
environmentHealthChecker.startMonitoring(300000); // 5 minutes

// Get health status
const health = await environmentHealthChecker.performHealthCheck();
console.log('Environment health:', health.status);
```

## Integration with CI/CD

### GitHub Actions Example
```yaml
name: Environment Validation

on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install

      - name: Validate environment template
        run: |
          cp .env.example .env
          npm run env:validate

      - name: Security audit
        run: npm run env:security-report
```

### Docker Environment
```dockerfile
# Production Dockerfile
FROM node:18-alpine

# Copy environment template
COPY .env.production.example /app/.env.example

# Validate environment at build time
RUN npm run env:validate

# Runtime environment validation
HEALTHCHECK --interval=5m --timeout=30s --start-period=5s --retries=3 \
  CMD npm run env:health || exit 1
```

## Environment Variable Reference

### Application Configuration
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | Yes | `development` | Environment type |
| `APP_NAME` | Yes | `BEAR AI Legal Assistant` | Application name |
| `APP_VERSION` | Yes | `1.0.0` | Application version |
| `APP_URL` | Yes | `http://localhost:3000` | Application URL |
| `API_BASE_URL` | Yes | `http://localhost:1420` | API base URL |

### Authentication & Security
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_SECRET` | Yes | - | JWT signing secret (32+ chars) |
| `JWT_EXPIRATION` | No | `7d` | JWT expiration time |
| `SESSION_SECRET` | Yes | - | Session secret (32+ chars) |
| `ENCRYPTION_KEY` | Yes | - | Data encryption key (32 chars) |
| `HASH_ROUNDS` | No | `12` | Password hash rounds |

### Stripe Payment Processing
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `STRIPE_PUBLISHABLE_KEY` | Yes | - | Stripe publishable key |
| `STRIPE_SECRET_KEY` | Yes | - | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Yes | - | Stripe webhook secret |
| `STRIPE_ENVIRONMENT` | Yes | `test` | `test` or `live` |

### Database Configuration
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | `sqlite://./data/bear_ai.db` | Database connection |
| `DATABASE_ENCRYPTION_KEY` | Yes | - | Database encryption key |
| `DATABASE_TIMEOUT` | No | `30000` | Connection timeout (ms) |

### Third-Party APIs
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | No | - | OpenAI API key |
| `ANTHROPIC_API_KEY` | No | - | Anthropic Claude API key |
| `GOOGLE_AI_API_KEY` | No | - | Google AI API key |
| `HUGGINGFACE_API_TOKEN` | No | - | Hugging Face API token |

### Logging & Monitoring
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `LOG_LEVEL` | No | `info` | Logging level |
| `LOG_FILE_PATH` | No | `./logs/bear_ai.log` | Log file path |
| `SENTRY_DSN` | No | - | Sentry error reporting |

### Feature Flags
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ENABLE_USER_REGISTRATION` | No | `true` | Enable user registration |
| `ENABLE_BILLING_INTEGRATION` | No | `true` | Enable billing features |
| `ENTERPRISE_MODE` | No | `false` | Enable enterprise features |

## Troubleshooting

### Common Issues

1. **Environment not loading**
   ```bash
   # Check file exists and has correct permissions
   ls -la .env

   # Validate syntax
   npm run env:validate
   ```

2. **Validation errors**
   ```bash
   # Get detailed validation report
   npm run env:validate --verbose

   # Check for missing required variables
   npm run env:health
   ```

3. **Security warnings**
   ```bash
   # Generate security report
   npm run env:security-report

   # Check for weak secrets
   npm run env:audit
   ```

4. **Connection issues**
   ```bash
   # Test external connections
   npm run env:connectivity-test

   # Check API endpoints
   npm run env:health --category=connectivity
   ```

### Debug Mode
Enable debug logging for environment issues:

```bash
# Enable debug logging
export DEBUG=bear-ai:environment
npm run dev

# Or set in .env
LOG_LEVEL=debug
DEV_ENABLE_DEBUG_LOGS=true
```

### Environment Migration
When updating environment variables:

1. **Update .env.example** with new variables
2. **Update validation schema** in `environmentManager.ts`
3. **Update documentation** in this file
4. **Create migration script** if needed:
   ```bash
   npm run env:migrate --from=1.0.0 --to=1.1.0
   ```

## Support

For environment configuration issues:

1. Check this documentation
2. Run validation tools (`npm run env:validate`)
3. Check application logs
4. Review security audit (`npm run env:security-report`)
5. Contact development team

## Version History

- **v1.0.0** - Initial environment management system
- **v1.1.0** - Added security validation and health checks
- **v1.2.0** - Enhanced compliance checking
- **v1.3.0** - Added continuous monitoring support