#!/usr/bin/env node
/**
 * Environment Security Report Script for BEAR AI
 * Generates detailed security audit report
 */

const { environmentValidator } = require('../src/utils/environmentValidator');
const { environmentManager } = require('../src/services/environmentManager');

async function generateSecurityReport() {
  console.log('🔒 Generating BEAR AI environment security report...\n');

  try {
    // Initialize environment
    await environmentManager.load();

    // Generate security report
    const report = environmentValidator.generateSecurityReport();
    console.log(report);

    // Perform full validation for additional context
    const fullValidation = await environmentValidator.performFullValidation();

    // Compliance summary
    console.log('\n📋 Compliance Summary:');
    fullValidation.compliance.forEach(check => {
      const icon = check.status === 'compliant' ? '✅' :
                  check.status === 'partial' ? '⚠️' : '❌';
      console.log(`   ${icon} ${check.standard} - ${check.requirement}: ${check.status.toUpperCase()}`);
    });

    // Format validation results
    console.log('\n🔍 Format Validation:');
    const formatValidation = environmentValidator.validateSpecificFormats();
    Object.entries(formatValidation).forEach(([key, valid]) => {
      const icon = valid ? '✅' : '❌';
      console.log(`   ${icon} ${key}: ${valid ? 'Valid' : 'Invalid'} format`);
    });

    // Check for conflicts
    console.log('\n⚔️  Configuration Conflicts:');
    const conflicts = environmentValidator.checkForConflicts();
    if (conflicts.length === 0) {
      console.log('   ✅ No configuration conflicts detected');
    } else {
      conflicts.forEach(conflict => {
        console.log(`   ⚠️  ${conflict}`);
      });
    }

    // Final recommendations
    console.log('\n💡 Security Recommendations:');
    fullValidation.recommendations.forEach(rec => {
      console.log(`   • ${rec}`);
    });

    console.log('\n' + '='.repeat(60));

    // Determine exit status
    const audit = fullValidation.security;
    if (audit.score >= 80 && audit.issues.filter(i => i.severity === 'critical').length === 0) {
      console.log('✅ Security audit PASSED');
      process.exit(0);
    } else if (audit.score >= 60) {
      console.log('⚠️  Security audit shows WARNINGS');
      process.exit(process.argv.includes('--strict') ? 1 : 0);
    } else {
      console.log('❌ Security audit FAILED');
      process.exit(1);
    }

  } catch (error) {
    console.error('💥 Security report generation failed:');
    console.error(error.message);
    process.exit(1);
  }
}

// Check if running directly
if (require.main === module) {
  generateSecurityReport();
}

module.exports = { generateSecurityReport };