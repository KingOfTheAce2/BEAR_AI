# Production Security System

A comprehensive security hardening system implementing OWASP Top 10 protection measures for enterprise applications.

## Features

### 🔐 Core Security Components

- **Certificate Pinning**: Secure API communications with certificate validation
- **Rate Limiting**: Per-IP and per-user adaptive rate limiting
- **Security Headers**: CSP, HSTS, X-Frame-Options, and more
- **Input Sanitization**: XSS and injection prevention
- **SQL Injection Prevention**: Advanced pattern detection and blocking
- **CSRF Protection**: Token-based request validation
- **JWT Security**: Secure token validation and management
- **Encryption**: AES-256-GCM for data at rest and in transit
- **Security Monitoring**: Real-time event logging and alerting

### 🛡️ OWASP Top 10 Protection

| OWASP Category | Protection Measures |
|----------------|-------------------|
| A01: Broken Access Control | JWT validation, role-based authorization, session security |
| A02: Cryptographic Failures | AES-256-GCM encryption, certificate pinning, key rotation |
| A03: Injection | SQL injection prevention, input sanitization, NoSQL protection |
| A04: Insecure Design | Security headers, secure sessions, rate limiting |
| A05: Security Misconfiguration | Environment configs, secure defaults, health checks |
| A06: Vulnerable Components | Component scanning, user agent analysis |
| A07: Authentication Failures | MFA support, secure password hashing, account monitoring |
| A08: Data Integrity Failures | HMAC validation, content hash verification |
| A09: Logging Failures | Comprehensive logging, real-time alerts, SIEM integration |
| A10: SSRF | URL validation, network controls, origin verification |

## Quick Start

### Basic Setup

```typescript
import { SecurityFactory } from './security';
import express from 'express';

const app = express();

// Create security instance for your environment
const security = SecurityFactory.createProductionSecurity('production');

// Initialize all security middleware
security.initializeSecurity(app);

// Start security monitoring
const logger = SecurityFactory.createSecurityLogger('production');
logger.startMonitoring();
```

### Custom Configuration

```typescript
import { ProductionSecurity } from './security';

const customConfig = {
  rateLimit: {
    windowMs: 10 * 60 * 1000, // 10 minutes
    maxRequests: 50
  },
  validation: {
    sanitizeLevel: 'strict',
    maxLength: 500
  },
  headers: {
    csp: {
      directives: {
        'script-src': ["'self'", "'unsafe-inline'"],
        'style-src': ["'self'"]
      }
    }
  }
};

const security = new ProductionSecurity(customConfig);
```

## Component Documentation

### Rate Limiting

```typescript
// Get rate limiting middleware
const globalRateLimit = rateLimitManager.getGlobalRateLimit();
const userRateLimit = rateLimitManager.getPerUserRateLimit();
const slowDown = rateLimitManager.getSlowDownMiddleware();

app.use(globalRateLimit);
app.use(userRateLimit);
app.use(slowDown);
```

### Input Sanitization

```typescript
// Create validation rules for specific routes
const userRegistrationRules = inputSanitizer.createRouteSanitizer({
  email: 'email',
  username: 'alphanumeric',
  bio: 'text'
});

app.post('/register', userRegistrationRules, (req, res) => {
  // Input is automatically sanitized and validated
});
```

### XSS Protection

```typescript
// Apply XSS protection with different levels
app.use('/admin', xssProtection.strictCSP()); // Strict policy for admin
app.use('/public', xssProtection.relaxedCSP()); // Relaxed for public content
```

### CSRF Protection

```typescript
// Enable CSRF protection
app.use(csrfTokenManager.csrfProtection);

// Get token for client-side usage
app.get('/csrf-token', (req, res) => {
  const tokenData = csrfTokenManager.getTokenForClient(req);
  res.json(tokenData);
});
```

### JWT Security

```typescript
// Generate secure tokens
const tokenPair = await jwtManager.generateToken({
  userId: user.id,
  roles: user.roles,
  permissions: user.permissions
});

// Validate tokens
app.use('/api', jwtManager.validateTokenMiddleware);
```

### Encryption

```typescript
// Encrypt sensitive data
const encrypted = encryptionManager.encryptData(sensitiveData, 'user-profile');

// Encrypt for database storage
const encryptedDbData = encryptionManager.encryptAtRest(data, 'users', 'personal_info');

// Create encryption streams for large files
const encryptStream = encryptionManager.createEncryptionStream('file-transfer');
```

## Environment Configuration

### Development
- Relaxed CSP policies
- Disabled certificate pinning
- Debug-level logging
- Basic input sanitization

### Staging
- Moderate security policies
- Enabled certificate pinning
- Info-level logging
- Moderate input sanitization

### Production
- Strict security policies
- Full certificate pinning
- Warning-level logging
- Strict input sanitization
- Real-time security alerts

## Security Monitoring

### Event Logging

```typescript
// Log security events
await securityLogger.logEvent('AUTHENTICATION_FAILURE', {
  ip: req.ip,
  userAgent: req.get('User-Agent'),
  attemptedUsername: req.body.username
});
```

### Real-time Alerts

The system automatically triggers alerts based on configurable thresholds:

- Authentication failures: 5 failures in 5 minutes
- SQL injection attempts: 3 attempts in 10 minutes
- XSS attempts: 3 attempts in 10 minutes
- Rate limit violations: 20 violations in 30 minutes

### Health Monitoring

```typescript
// Check security system health
app.get('/security/health', async (req, res) => {
  const healthReport = await security.performSecurityHealthCheck();
  res.json(healthReport);
});

// Get security statistics
app.get('/security/stats', (req, res) => {
  const stats = {
    rateLimit: rateLimitManager.getStatistics(),
    xss: xssProtection.getStatistics(),
    csrf: csrfTokenManager.getStatistics(),
    jwt: jwtManager.getStatistics(),
    encryption: encryptionManager.getStatistics(),
    logging: securityLogger.getStatistics()
  };
  res.json(stats);
});
```

## Integration Examples

### Express.js Integration

```typescript
import express from 'express';
import { SecurityFactory } from './security';

const app = express();
const security = SecurityFactory.createProductionSecurity('production');

// Apply security middleware
security.initializeSecurity(app);

// Your routes here
app.get('/api/users', (req, res) => {
  // All security measures are automatically applied
  res.json({ users: [] });
});
```

### Database Integration

```typescript
// Encrypt sensitive data before saving
const userData = {
  email: 'user@example.com',
  profile: encryptionManager.encryptAtRest(sensitiveProfile, 'users', 'profile')
};

// Decrypt when retrieving
const decryptedProfile = encryptionManager.decryptAtRest(userData.profile);
```

### File Upload Security

```typescript
app.post('/upload',
  inputSanitizer.sanitizeFileUpload(),
  (req, res) => {
    // Files are automatically validated and sanitized
    // Process secure file upload
  }
);
```

## Security Best Practices

### 1. Environment Variables
```bash
# Required environment variables
JWT_SECRET=your-super-secret-jwt-key
CSRF_SECRET=your-csrf-secret-key
LOG_ENCRYPTION_KEY=your-log-encryption-key
MASTER_ENCRYPTION_KEY=your-master-encryption-key
```

### 2. Regular Security Updates
- Monitor security health endpoints
- Review security logs regularly
- Update certificates and keys periodically
- Rotate encryption keys based on schedule

### 3. Incident Response
```typescript
// Emergency lockdown
await security.emergencyLockdown('Detected coordinated attack');

// Enable high alert mode
await securityLogger.enableHighAlertMode();
```

## Performance Considerations

- **Memory Usage**: Monitor token stores and caches
- **CPU Impact**: Encryption operations are CPU-intensive
- **Network Overhead**: Certificate pinning adds validation time
- **Storage**: Security logs can grow quickly

## Troubleshooting

### Common Issues

1. **Certificate Pinning Failures**
   - Verify certificate pins are current
   - Check network connectivity
   - Review certificate validation logs

2. **Rate Limiting False Positives**
   - Adjust rate limit thresholds
   - Implement user-specific limits
   - Add exemptions for legitimate traffic

3. **XSS Filter Blocking Legitimate Content**
   - Review XSS filter configuration
   - Add content-specific rules
   - Use CSP nonces for inline scripts

### Debug Mode

```typescript
// Enable debug logging
const security = SecurityFactory.createProductionSecurity('development');

// Access component statistics
const debugInfo = {
  rateLimit: rateLimitManager.getStatistics(),
  xss: xssProtection.getStatistics(),
  // ... other components
};
```

## License

This security system is part of the BEAR AI project and follows the project's licensing terms.

## Support

For security-related issues or questions:
1. Check the troubleshooting section
2. Review security logs for specific error details
3. Contact the security team for critical issues

**⚠️ Security Notice**: Never disable security features in production environments. Always test configuration changes in development/staging first.