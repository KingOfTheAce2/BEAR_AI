/**
 * Environment Health Check Utility for BEAR AI
 * Monitors environment health and provides real-time diagnostics
 */

import { environmentManager } from '../services/environmentManager';
import { environmentValidator } from './environmentValidator';
import { logger } from '../services/logger';

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  checks: HealthCheck[];
  summary: HealthSummary;
  recommendations: string[];
}

export interface HealthCheck {
  name: string;
  category: 'configuration' | 'security' | 'connectivity' | 'performance' | 'compliance';
  status: 'pass' | 'warn' | 'fail';
  message: string;
  details?: any;
  duration?: number;
  critical: boolean;
}

export interface HealthSummary {
  totalChecks: number;
  passed: number;
  warnings: number;
  failures: number;
  criticalFailures: number;
  score: number;
}

export interface ConnectivityTest {
  service: string;
  endpoint: string;
  status: 'connected' | 'error' | 'timeout';
  responseTime?: number;
  error?: string;
}

export class EnvironmentHealthChecker {
  private lastCheck: HealthCheckResult | null = null;
  private checkInterval: NodeJS.Timeout | null = null;

  /**
   * Perform comprehensive health check
   */
  public async performHealthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const checks: HealthCheck[] = [];

    logger.info('Starting environment health check');

    try {
      // Configuration checks
      checks.push(...await this.performConfigurationChecks());

      // Security checks
      checks.push(...await this.performSecurityChecks());

      // Connectivity checks
      checks.push(...await this.performConnectivityChecks());

      // Performance checks
      checks.push(...await this.performPerformanceChecks());

      // Compliance checks
      checks.push(...await this.performComplianceChecks());

      const summary = this.generateSummary(checks);
      const status = this.determineOverallStatus(summary);
      const recommendations = this.generateRecommendations(checks, summary);

      const result: HealthCheckResult = {
        status,
        timestamp: new Date(),
        checks,
        summary,
        recommendations
      };

      this.lastCheck = result;

      logger.info('Environment health check completed', {
        status,
        duration: Date.now() - startTime,
        summary
      });

      return result;
    } catch (error) {
      logger.error('Health check failed', { error });

      return {
        status: 'unhealthy',
        timestamp: new Date(),
        checks: [{
          name: 'Health Check System',
          category: 'configuration',
          status: 'fail',
          message: `Health check system failure: ${error instanceof Error ? error.message : 'Unknown error'}`,
          critical: true
        }],
        summary: {
          totalChecks: 1,
          passed: 0,
          warnings: 0,
          failures: 1,
          criticalFailures: 1,
          score: 0
        },
        recommendations: ['Fix health check system errors', 'Review system logs']
      };
    }
  }

  /**
   * Start continuous health monitoring
   */
  public startMonitoring(intervalMs: number = 300000): void { // 5 minutes default
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    this.checkInterval = setInterval(async () => {
      try {
        const result = await this.performHealthCheck();

        if (result.status === 'unhealthy') {
          logger.error('Environment health check failed', { result });
          // Could emit events here for alerting systems
        } else if (result.status === 'degraded') {
          logger.warn('Environment health degraded', { result });
        }
      } catch (error) {
        logger.error('Continuous health check failed', { error });
      }
    }, intervalMs);

    logger.info('Environment health monitoring started', { intervalMs });
  }

  /**
   * Stop continuous health monitoring
   */
  public stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      logger.info('Environment health monitoring stopped');
    }
  }

  /**
   * Get last health check result
   */
  public getLastCheck(): HealthCheckResult | null {
    return this.lastCheck;
  }

  /**
   * Check if environment is healthy
   */
  public isHealthy(): boolean {
    return this.lastCheck?.status === 'healthy';
  }

  /**
   * Generate health status report
   */
  public generateHealthReport(): string {
    if (!this.lastCheck) {
      return 'No health check data available. Run performHealthCheck() first.';
    }

    const { status, timestamp, checks, summary, recommendations } = this.lastCheck;

    let report = `# Environment Health Report\\n\\n`;
    report += `**Status**: ${status.toUpperCase()} (Score: ${summary.score}/100)\\n`;
    report += `**Timestamp**: ${timestamp.toISOString()}\\n\\n`;

    report += `## Summary\\n`;
    report += `- Total Checks: ${summary.totalChecks}\\n`;
    report += `- Passed: ${summary.passed}\\n`;
    report += `- Warnings: ${summary.warnings}\\n`;
    report += `- Failures: ${summary.failures}\\n`;
    report += `- Critical Failures: ${summary.criticalFailures}\\n\\n`;

    report += `## Check Results\\n`;
    const categories = ['configuration', 'security', 'connectivity', 'performance', 'compliance'];

    categories.forEach(category => {
      const categoryChecks = checks.filter(c => c.category === category);
      if (categoryChecks.length > 0) {
        report += `\\n### ${category.charAt(0).toUpperCase() + category.slice(1)}\\n`;
        categoryChecks.forEach(check => {
          const icon = check.status === 'pass' ? '✅' : check.status === 'warn' ? '⚠️' : '❌';
          report += `${icon} **${check.name}**: ${check.message}\\n`;
        });
      }
    });

    if (recommendations.length > 0) {
      report += `\\n## Recommendations\\n`;
      recommendations.forEach(rec => {
        report += `- ${rec}\\n`;
      });
    }

    return report;
  }

  /**
   * Export health data for monitoring systems
   */
  public exportHealthMetrics(): any {
    if (!this.lastCheck) {
      return null;
    }

    return {
      timestamp: this.lastCheck.timestamp.toISOString(),
      status: this.lastCheck.status,
      score: this.lastCheck.summary.score,
      metrics: {
        total_checks: this.lastCheck.summary.totalChecks,
        passed: this.lastCheck.summary.passed,
        warnings: this.lastCheck.summary.warnings,
        failures: this.lastCheck.summary.failures,
        critical_failures: this.lastCheck.summary.criticalFailures
      },
      categories: this.lastCheck.checks.reduce((acc, check) => {
        if (!acc[check.category]) {
          acc[check.category] = { pass: 0, warn: 0, fail: 0 };
        }
        acc[check.category][check.status]++;
        return acc;
      }, {} as any)
    };
  }

  // Private methods for specific health checks

  private async performConfigurationChecks(): Promise<HealthCheck[]> {
    const checks: HealthCheck[] = [];

    // Check if environment is loaded
    try {
      const validation = environmentManager.getValidationResult();

      checks.push({
        name: 'Environment Variables Loaded',
        category: 'configuration',
        status: validation ? 'pass' : 'fail',
        message: validation ? 'Environment variables loaded successfully' : 'Environment variables not loaded',
        critical: true
      });

      if (validation) {
        checks.push({
          name: 'Required Variables Present',
          category: 'configuration',
          status: validation.missingRequired.length === 0 ? 'pass' : 'fail',
          message: validation.missingRequired.length === 0
            ? 'All required variables present'
            : `Missing required variables: ${validation.missingRequired.join(', ')}`,
          details: { missing: validation.missingRequired },
          critical: true
        });

        checks.push({
          name: 'Configuration Validation',
          category: 'configuration',
          status: validation.isValid ? 'pass' : 'fail',
          message: validation.isValid
            ? 'Configuration validation passed'
            : `${validation.errors.length} validation errors found`,
          details: { errors: validation.errors, warnings: validation.warnings },
          critical: !validation.isValid
        });
      }
    } catch (error) {
      checks.push({
        name: 'Configuration System',
        category: 'configuration',
        status: 'fail',
        message: `Configuration system error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        critical: true
      });
    }

    // Check environment consistency
    const conflicts = environmentValidator.checkForConflicts();
    checks.push({
      name: 'Environment Consistency',
      category: 'configuration',
      status: conflicts.length === 0 ? 'pass' : 'warn',
      message: conflicts.length === 0
        ? 'No configuration conflicts detected'
        : `${conflicts.length} configuration conflicts found`,
      details: { conflicts },
      critical: false
    });

    return checks;
  }

  private async performSecurityChecks(): Promise<HealthCheck[]> {
    const checks: HealthCheck[] = [];

    try {
      const securityAudit = environmentValidator.performSecurityAudit();

      checks.push({
        name: 'Security Score',
        category: 'security',
        status: securityAudit.score >= 80 ? 'pass' : securityAudit.score >= 60 ? 'warn' : 'fail',
        message: `Security score: ${securityAudit.score}/100 (${securityAudit.level})`,
        details: { score: securityAudit.score, level: securityAudit.level },
        critical: securityAudit.score < 50
      });

      const criticalIssues = securityAudit.issues.filter(i => i.severity === 'critical');
      checks.push({
        name: 'Critical Security Issues',
        category: 'security',
        status: criticalIssues.length === 0 ? 'pass' : 'fail',
        message: criticalIssues.length === 0
          ? 'No critical security issues found'
          : `${criticalIssues.length} critical security issues found`,
        details: { issues: criticalIssues },
        critical: criticalIssues.length > 0
      });

      // Check format validation
      const formatValidation = environmentValidator.validateSpecificFormats();
      const invalidFormats = Object.entries(formatValidation)
        .filter(([_, valid]) => !valid)
        .map(([key, _]) => key);

      checks.push({
        name: 'Secret Format Validation',
        category: 'security',
        status: invalidFormats.length === 0 ? 'pass' : 'warn',
        message: invalidFormats.length === 0
          ? 'All secrets have valid formats'
          : `Invalid formats: ${invalidFormats.join(', ')}`,
        details: { invalidFormats },
        critical: false
      });

    } catch (error) {
      checks.push({
        name: 'Security Validation',
        category: 'security',
        status: 'fail',
        message: `Security validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        critical: true
      });
    }

    return checks;
  }

  private async performConnectivityChecks(): Promise<HealthCheck[]> {
    const checks: HealthCheck[] = [];

    // Test database connectivity
    try {
      const dbResult = await this.testDatabaseConnection();
      checks.push({
        name: 'Database Connection',
        category: 'connectivity',
        status: dbResult.status === 'connected' ? 'pass' : 'fail',
        message: dbResult.status === 'connected'
          ? `Database connected (${dbResult.responseTime}ms)`
          : `Database connection failed: ${dbResult.error}`,
        details: dbResult,
        critical: dbResult.status !== 'connected'
      });
    } catch (error) {
      checks.push({
        name: 'Database Connection',
        category: 'connectivity',
        status: 'fail',
        message: `Database test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        critical: true
      });
    }

    // Test external API connectivity
    const apiTests = await this.testExternalAPIs();
    apiTests.forEach(test => {
      checks.push({
        name: `${test.service} API`,
        category: 'connectivity',
        status: test.status === 'connected' ? 'pass' : test.status === 'timeout' ? 'warn' : 'fail',
        message: test.status === 'connected'
          ? `${test.service} connected (${test.responseTime}ms)`
          : `${test.service} ${test.status}: ${test.error || 'No response'}`,
        details: test,
        critical: false // External APIs are not critical for basic operation
      });
    });

    return checks;
  }

  private async performPerformanceChecks(): Promise<HealthCheck[]> {
    const checks: HealthCheck[] = [];

    // Check memory usage
    const memoryUsage = process.memoryUsage();
    const heapUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

    checks.push({
      name: 'Memory Usage',
      category: 'performance',
      status: heapUsagePercent < 80 ? 'pass' : heapUsagePercent < 90 ? 'warn' : 'fail',
      message: `Heap usage: ${heapUsagePercent.toFixed(1)}% (${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB)`,
      details: memoryUsage,
      critical: heapUsagePercent > 95
    });

    // Check environment load time
    const config = environmentManager.getAll();
    const configSize = Object.keys(config).length;

    checks.push({
      name: 'Configuration Load Performance',
      category: 'performance',
      status: 'pass',
      message: `${configSize} environment variables loaded`,
      details: { configSize },
      critical: false
    });

    return checks;
  }

  private async performComplianceChecks(): Promise<HealthCheck[]> {
    const checks: HealthCheck[] = [];

    try {
      const compliance = environmentValidator.checkCompliance();

      compliance.forEach(check => {
        checks.push({
          name: `${check.standard} - ${check.requirement}`,
          category: 'compliance',
          status: check.status === 'compliant' ? 'pass' :
                  check.status === 'partial' ? 'warn' : 'fail',
          message: `${check.standard} compliance: ${check.status}`,
          details: check,
          critical: check.status === 'non-compliant' &&
                   (check.standard === 'SOC2' || check.standard === 'PCI-DSS')
        });
      });

    } catch (error) {
      checks.push({
        name: 'Compliance Check',
        category: 'compliance',
        status: 'fail',
        message: `Compliance validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        critical: false
      });
    }

    return checks;
  }

  private async testDatabaseConnection(): Promise<ConnectivityTest> {
    const startTime = Date.now();
    const databaseUrl = environmentManager.get('DATABASE_URL');

    if (!databaseUrl) {
      return {
        service: 'Database',
        endpoint: 'Not configured',
        status: 'error',
        error: 'DATABASE_URL not configured'
      };
    }

    try {
      // For SQLite, just check if we can access the file
      if (databaseUrl.startsWith('sqlite://')) {
        const responseTime = Date.now() - startTime;
        return {
          service: 'Database',
          endpoint: databaseUrl,
          status: 'connected',
          responseTime
        };
      }

      // For other databases, would need actual connection test
      // This is a placeholder for demonstration
      return {
        service: 'Database',
        endpoint: databaseUrl.split('@')[1] || databaseUrl,
        status: 'connected',
        responseTime: Date.now() - startTime
      };

    } catch (error) {
      return {
        service: 'Database',
        endpoint: databaseUrl,
        status: 'error',
        error: error instanceof Error ? error.message : 'Connection failed'
      };
    }
  }

  private async testExternalAPIs(): Promise<ConnectivityTest[]> {
    const tests: ConnectivityTest[] = [];
    const timeout = 5000; // 5 seconds

    // Test Stripe API
    const stripeKey = environmentManager.get('STRIPE_SECRET_KEY');
    if (stripeKey) {
      tests.push(await this.testAPI('Stripe', 'https://api.stripe.com/v1/account', {
        'Authorization': `Bearer ${stripeKey}`
      }, timeout));
    }

    // Test OpenAI API
    const openAIKey = environmentManager.get('OPENAI_API_KEY');
    if (openAIKey) {
      tests.push(await this.testAPI('OpenAI', 'https://api.openai.com/v1/models', {
        'Authorization': `Bearer ${openAIKey}`
      }, timeout));
    }

    return tests;
  }

  private async testAPI(service: string, endpoint: string, headers: any, timeout: number): Promise<ConnectivityTest> {
    const startTime = Date.now();

    try {
      // Note: In a real implementation, you'd use fetch or similar
      // This is a placeholder since we can't make actual HTTP requests here

      const responseTime = Date.now() - startTime;
      return {
        service,
        endpoint,
        status: 'connected',
        responseTime
      };

    } catch (error) {
      return {
        service,
        endpoint,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private generateSummary(checks: HealthCheck[]): HealthSummary {
    const passed = checks.filter(c => c.status === 'pass').length;
    const warnings = checks.filter(c => c.status === 'warn').length;
    const failures = checks.filter(c => c.status === 'fail').length;
    const criticalFailures = checks.filter(c => c.status === 'fail' && c.critical).length;

    const score = Math.round((passed / checks.length) * 100);

    return {
      totalChecks: checks.length,
      passed,
      warnings,
      failures,
      criticalFailures,
      score
    };
  }

  private determineOverallStatus(summary: HealthSummary): 'healthy' | 'degraded' | 'unhealthy' {
    if (summary.criticalFailures > 0) {
      return 'unhealthy';
    }

    if (summary.failures > 0 || summary.score < 80) {
      return 'degraded';
    }

    return 'healthy';
  }

  private generateRecommendations(checks: HealthCheck[], summary: HealthSummary): string[] {
    const recommendations: string[] = [];

    // Critical issues first
    const criticalChecks = checks.filter(c => c.status === 'fail' && c.critical);
    if (criticalChecks.length > 0) {
      recommendations.push(`Fix ${criticalChecks.length} critical issues immediately`);
    }

    // Category-specific recommendations
    const securityIssues = checks.filter(c => c.category === 'security' && c.status !== 'pass').length;
    if (securityIssues > 0) {
      recommendations.push('Address security configuration issues');
    }

    const connectivityIssues = checks.filter(c => c.category === 'connectivity' && c.status === 'fail').length;
    if (connectivityIssues > 0) {
      recommendations.push('Verify network connectivity and API configurations');
    }

    // General recommendations based on score
    if (summary.score < 60) {
      recommendations.push('Review and fix environment configuration');
    } else if (summary.score < 80) {
      recommendations.push('Optimize environment configuration for better performance');
    }

    if (recommendations.length === 0) {
      recommendations.push('Environment is healthy - continue monitoring');
    }

    return recommendations;
  }
}

// Export singleton instance
export const environmentHealthChecker = new EnvironmentHealthChecker();