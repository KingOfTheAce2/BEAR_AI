#!/usr/bin/env node
/**
 * Environment Health Check Script for BEAR AI
 * Performs comprehensive health checks on environment configuration
 */

const { environmentHealthChecker } = require('../src/utils/environmentHealthCheck');
const { environmentManager } = require('../src/services/environmentManager');

async function performHealthCheck() {
  console.log('🏥 Performing BEAR AI environment health check...\n');

  try {
    // Initialize environment
    await environmentManager.load();

    // Perform health check
    const healthResult = await environmentHealthChecker.performHealthCheck();

    // Display overall status
    const statusIcon = healthResult.status === 'healthy' ? '💚' :
                      healthResult.status === 'degraded' ? '💛' : '💔';

    console.log(`${statusIcon} Overall Status: ${healthResult.status.toUpperCase()}`);
    console.log(`📊 Health Score: ${healthResult.summary.score}/100`);
    console.log(`⏱️  Timestamp: ${healthResult.timestamp.toISOString()}\n`);

    // Summary
    console.log('📈 Check Summary:');
    console.log(`   Total Checks: ${healthResult.summary.totalChecks}`);
    console.log(`   ✅ Passed: ${healthResult.summary.passed}`);
    console.log(`   ⚠️  Warnings: ${healthResult.summary.warnings}`);
    console.log(`   ❌ Failures: ${healthResult.summary.failures}`);
    console.log(`   🚨 Critical Failures: ${healthResult.summary.criticalFailures}\n`);

    // Detailed results by category
    const categories = ['configuration', 'security', 'connectivity', 'performance', 'compliance'];

    categories.forEach(category => {
      const categoryChecks = healthResult.checks.filter(c => c.category === category);
      if (categoryChecks.length > 0) {
        console.log(`🔍 ${category.charAt(0).toUpperCase() + category.slice(1)} Checks:`);

        categoryChecks.forEach(check => {
          const icon = check.status === 'pass' ? '✅' :
                      check.status === 'warn' ? '⚠️' : '❌';
          const critical = check.critical ? ' [CRITICAL]' : '';
          console.log(`   ${icon} ${check.name}${critical}: ${check.message}`);
        });
        console.log('');
      }
    });

    // Recommendations
    if (healthResult.recommendations.length > 0) {
      console.log('💡 Recommendations:');
      healthResult.recommendations.forEach(rec => {
        console.log(`   • ${rec}`);
      });
      console.log('');
    }

    // Export metrics for monitoring systems
    if (process.argv.includes('--export-metrics')) {
      const metrics = environmentHealthChecker.exportHealthMetrics();
      console.log('📊 Health Metrics (JSON):');
      console.log(JSON.stringify(metrics, null, 2));
    }

    // Generate report
    if (process.argv.includes('--report')) {
      const report = environmentHealthChecker.generateHealthReport();
      console.log('📄 Detailed Health Report:');
      console.log(report);
    }

    console.log('='.repeat(60));

    // Exit status
    if (healthResult.status === 'healthy') {
      console.log('✅ Environment health check PASSED');
      process.exit(0);
    } else if (healthResult.status === 'degraded') {
      console.log('⚠️  Environment health check shows DEGRADED status');
      process.exit(process.argv.includes('--strict') ? 1 : 0);
    } else {
      console.log('❌ Environment health check FAILED');
      process.exit(1);
    }

  } catch (error) {
    console.error('💥 Health check failed with error:');
    console.error(error.message);
    process.exit(1);
  }
}

// Check if running directly
if (require.main === module) {
  performHealthCheck();
}

module.exports = { performHealthCheck };