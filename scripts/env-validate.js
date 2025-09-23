#!/usr/bin/env node
/**
 * Environment Validation Script for BEAR AI
 * Validates environment configuration and reports issues
 */

const { environmentManager } = require('../src/services/environmentManager');
const { environmentValidator } = require('../src/utils/environmentValidator');
const { environmentHealthChecker } = require('../src/utils/environmentHealthCheck');

async function validateEnvironment() {
  console.log('🔍 Validating BEAR AI environment configuration...\n');

  try {
    // Load environment
    const validation = await environmentManager.load();

    // Basic validation results
    console.log('📊 Basic Validation Results:');
    console.log(`   ✅ Valid: ${validation.isValid}`);
    console.log(`   📝 Variables loaded: ${Object.keys(environmentManager.getAll()).length}`);
    console.log(`   ❌ Errors: ${validation.errors.length}`);
    console.log(`   ⚠️  Warnings: ${validation.warnings.length}`);
    console.log(`   🚫 Missing required: ${validation.missingRequired.length}\n`);

    // Show errors if any
    if (validation.errors.length > 0) {
      console.log('❌ Validation Errors:');
      validation.errors.forEach(error => {
        console.log(`   • ${error.key}: ${error.message}`);
      });
      console.log('');
    }

    // Show warnings if any
    if (validation.warnings.length > 0) {
      console.log('⚠️  Validation Warnings:');
      validation.warnings.forEach(warning => {
        console.log(`   • ${warning.key}: ${warning.message}`);
      });
      console.log('');
    }

    // Missing required variables
    if (validation.missingRequired.length > 0) {
      console.log('🚫 Missing Required Variables:');
      validation.missingRequired.forEach(key => {
        console.log(`   • ${key}`);
      });
      console.log('');
    }

    // Security audit
    console.log('🔒 Security Audit:');
    const securityAudit = environmentValidator.performSecurityAudit();
    console.log(`   📈 Security Score: ${securityAudit.score}/100 (${securityAudit.level})`);
    console.log(`   🛡️  Compliant: ${securityAudit.compliant}`);
    console.log(`   🚨 Issues: ${securityAudit.issues.length}`);

    if (securityAudit.issues.length > 0) {
      console.log('\n🚨 Security Issues:');
      securityAudit.issues.forEach(issue => {
        const icon = issue.severity === 'critical' ? '💥' :
                    issue.severity === 'high' ? '🔴' :
                    issue.severity === 'medium' ? '🟡' : '🟢';
        console.log(`   ${icon} [${issue.severity.toUpperCase()}] ${issue.title}`);
        console.log(`      ${issue.description}`);
      });
    }

    console.log('');

    // Health check
    console.log('🏥 Health Check:');
    const healthResult = await environmentHealthChecker.performHealthCheck();
    console.log(`   💓 Status: ${healthResult.status.toUpperCase()}`);
    console.log(`   📊 Score: ${healthResult.summary.score}/100`);
    console.log(`   ✅ Passed: ${healthResult.summary.passed}/${healthResult.summary.totalChecks}`);
    console.log(`   ❌ Failed: ${healthResult.summary.failures}`);
    console.log(`   🚨 Critical: ${healthResult.summary.criticalFailures}`);

    // Recommendations
    if (validation.suggestions.length > 0 || securityAudit.recommendations.length > 0 || healthResult.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');

      const allRecommendations = [
        ...validation.suggestions,
        ...securityAudit.recommendations.map(r => r.description),
        ...healthResult.recommendations
      ];

      [...new Set(allRecommendations)].forEach(rec => {
        console.log(`   • ${rec}`);
      });
    }

    // Exit status
    console.log('\n' + '='.repeat(60));

    if (validation.isValid && securityAudit.score >= 70 && healthResult.status !== 'unhealthy') {
      console.log('✅ Environment validation PASSED');
      process.exit(0);
    } else {
      console.log('❌ Environment validation FAILED');
      console.log('   Fix the issues above before deploying to production.');
      process.exit(1);
    }

  } catch (error) {
    console.error('💥 Environment validation failed with error:');
    console.error(error.message);
    process.exit(1);
  }
}

// Check if running directly
if (require.main === module) {
  validateEnvironment();
}

module.exports = { validateEnvironment };