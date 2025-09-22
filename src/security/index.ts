/**
 * Security Module Index
 * Central export for all security components
 */

// Core Security
export { ProductionSecurity, SecurityConfig, SecurityHealthReport, defaultSecurityConfig } from './ProductionSecurity';
export { SecurityFactory } from './SecurityFactory';

// Certificate Management
export { CertificatePinning } from './certificates/CertificatePinning';

// Rate Limiting
export { RateLimitManager } from './rate-limiting/RateLimitManager';

// Security Headers
export { SecurityHeaders } from './middleware/SecurityHeaders';

// Input Validation and Sanitization
export { InputSanitizer } from './validation/InputSanitizer';
export { SqlInjectionPrevention, SQLInjectionDetectionResult } from './validation/SqlInjectionPrevention';

// XSS Protection
export { XSSProtection } from './middleware/XSSProtection';

// CSRF Protection
export { CSRFTokenManager } from './csrf/CSRFTokenManager';

// JWT Security
export { JWTSecurityManager, TokenPair } from './jwt/JWTSecurityManager';

// Encryption
export { EncryptionManager, EncryptedData } from './encryption/EncryptionManager';

// Security Monitoring
export { SecurityEventLogger, SecurityLogEntry, SecurityAlert } from './monitoring/SecurityEventLogger';

/**
 * OWASP Top 10 Protection Summary
 *
 * A01: Broken Access Control
 * - JWT validation and authentication middleware
 * - Role-based authorization checks
 * - Session security management
 *
 * A02: Cryptographic Failures
 * - AES-256-GCM encryption for data at rest and in transit
 * - Certificate pinning for API communications
 * - Secure key derivation and rotation
 *
 * A03: Injection
 * - SQL injection prevention with parameterized queries
 * - Input sanitization and validation
 * - NoSQL injection protection
 *
 * A04: Insecure Design
 * - Comprehensive security headers (CSP, HSTS, X-Frame-Options)
 * - Secure session configuration
 * - Rate limiting and DDoS protection
 *
 * A05: Security Misconfiguration
 * - Environment-specific security configurations
 * - Secure defaults and hardened settings
 * - Regular security health checks
 *
 * A06: Vulnerable and Outdated Components
 * - Component security scanning
 * - User agent analysis for known attack tools
 * - Dependency validation
 *
 * A07: Identification and Authentication Failures
 * - Multi-factor authentication support
 * - Secure password hashing with bcrypt
 * - Account lockout and monitoring
 *
 * A08: Software and Data Integrity Failures
 * - HMAC validation for data integrity
 * - Request content hash verification
 * - Secure software update mechanisms
 *
 * A09: Security Logging and Monitoring Failures
 * - Comprehensive security event logging
 * - Real-time threat detection and alerting
 * - SIEM integration capabilities
 *
 * A10: Server-Side Request Forgery (SSRF)
 * - URL validation and filtering
 * - Network-based access controls
 * - Request origin verification
 */

/**
 * Quick Setup Example:
 *
 * ```typescript
 * import { SecurityFactory } from './security';
 * import express from 'express';
 *
 * const app = express();
 *
 * // Create production security instance
 * const security = SecurityFactory.createProductionSecurity('production');
 *
 * // Initialize security middleware
 * security.initializeSecurity(app);
 *
 * // Start security monitoring
 * const logger = SecurityFactory.createSecurityLogger('production');
 * logger.startMonitoring();
 *
 * // Health check endpoint
 * app.get('/security/health', async (req, res) => {
 *   const report = await security.performSecurityHealthCheck();
 *   res.json(report);
 * });
 * ```
 */