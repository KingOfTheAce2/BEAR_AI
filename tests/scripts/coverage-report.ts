#!/usr/bin/env node

import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface CoverageThreshold {
  statements: number;
  branches: number;
  functions: number;
  lines: number;
}

interface CoverageReport {
  total: CoverageThreshold;
  [key: string]: any;
}

class CoverageReporter {
  private coverageDir = path.join(process.cwd(), 'coverage');
  private thresholds: CoverageThreshold = {
    statements: 80,
    branches: 80,
    functions: 80,
    lines: 80
  };

  async generateReport(): Promise<void> {
    console.log('📊 Generating coverage report...\n');

    try {
      // Run Jest with coverage
      await this.runCoverageTests();

      // Parse coverage results
      const coverageData = await this.parseCoverageResults();

      // Generate detailed report
      await this.generateDetailedReport(coverageData);

      // Check thresholds
      this.checkThresholds(coverageData);

      // Generate badges
      await this.generateCoverageBadges(coverageData);

      console.log('✅ Coverage report generation complete!');
    } catch (error) {
      console.error('❌ Failed to generate coverage report:', error);
      process.exit(1);
    }
  }

  private runCoverageTests(): Promise<void> {
    return new Promise((resolve, reject) => {
      const process = spawn('npm', ['run', 'test:coverage'], {
        stdio: 'inherit',
        shell: true
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Coverage tests failed with code ${code}`));
        }
      });

      process.on('error', reject);
    });
  }

  private async parseCoverageResults(): Promise<CoverageReport> {
    const summaryPath = path.join(this.coverageDir, 'coverage-summary.json');
    
    if (!fs.existsSync(summaryPath)) {
      throw new Error('Coverage summary file not found');
    }

    const summaryData = fs.readFileSync(summaryPath, 'utf8');
    return JSON.parse(summaryData);
  }

  private async generateDetailedReport(coverageData: CoverageReport): Promise<void> {
    const reportPath = path.join(this.coverageDir, 'detailed-report.md');
    const { total } = coverageData;

    const report = `# Test Coverage Report

## Overall Coverage

| Metric | Coverage | Threshold | Status |
|--------|----------|-----------|--------|
| Statements | ${total.statements.pct}% | ${this.thresholds.statements}% | ${this.getStatusIcon(total.statements.pct, this.thresholds.statements)} |
| Branches | ${total.branches.pct}% | ${this.thresholds.branches}% | ${this.getStatusIcon(total.branches.pct, this.thresholds.branches)} |
| Functions | ${total.functions.pct}% | ${this.thresholds.functions}% | ${this.getStatusIcon(total.functions.pct, this.thresholds.functions)} |
| Lines | ${total.lines.pct}% | ${this.thresholds.lines}% | ${this.getStatusIcon(total.lines.pct, this.thresholds.lines)} |

## Coverage by File

${this.generateFileCoverageTable(coverageData)}

## Recommendations

${this.generateRecommendations(coverageData)}

---
*Report generated on ${new Date().toISOString()}*
`;

    fs.writeFileSync(reportPath, report);
    console.log(`📄 Detailed report saved to: ${reportPath}`);
  }

  private generateFileCoverageTable(coverageData: CoverageReport): string {
    const files = Object.keys(coverageData).filter(key => 
      key !== 'total' && key.startsWith('src/')
    );

    if (files.length === 0) {
      return '*No file-specific coverage data available*';
    }

    let table = '| File | Statements | Branches | Functions | Lines |\n';
    table += '|------|------------|----------|-----------|-------|\n';

    files.forEach(file => {
      const data = coverageData[file];
      table += `| ${file} | ${data.statements.pct}% | ${data.branches.pct}% | ${data.functions.pct}% | ${data.lines.pct}% |\n`;
    });

    return table;
  }

  private generateRecommendations(coverageData: CoverageReport): string {
    const { total } = coverageData;
    const recommendations: string[] = [];

    if (total.statements.pct < this.thresholds.statements) {
      recommendations.push(`- 📝 **Improve statement coverage**: Currently at ${total.statements.pct}%, target is ${this.thresholds.statements}%`);
    }

    if (total.branches.pct < this.thresholds.branches) {
      recommendations.push(`- 🌿 **Add branch testing**: Currently at ${total.branches.pct}%, target is ${this.thresholds.branches}%`);
    }

    if (total.functions.pct < this.thresholds.functions) {
      recommendations.push(`- 🔧 **Test more functions**: Currently at ${total.functions.pct}%, target is ${this.thresholds.functions}%`);
    }

    if (total.lines.pct < this.thresholds.lines) {
      recommendations.push(`- 📊 **Increase line coverage**: Currently at ${total.lines.pct}%, target is ${this.thresholds.lines}%`);
    }

    if (recommendations.length === 0) {
      recommendations.push('🎉 **Great job!** All coverage thresholds are met.');
    }

    return recommendations.join('\n');
  }

  private getStatusIcon(actual: number, threshold: number): string {
    if (actual >= threshold) {
      return '✅';
    } else if (actual >= threshold - 5) {
      return '⚠️';
    } else {
      return '❌';
    }
  }

  private checkThresholds(coverageData: CoverageReport): void {
    const { total } = coverageData;
    const failures: string[] = [];

    if (total.statements.pct < this.thresholds.statements) {
      failures.push(`Statements: ${total.statements.pct}% < ${this.thresholds.statements}%`);
    }

    if (total.branches.pct < this.thresholds.branches) {
      failures.push(`Branches: ${total.branches.pct}% < ${this.thresholds.branches}%`);
    }

    if (total.functions.pct < this.thresholds.functions) {
      failures.push(`Functions: ${total.functions.pct}% < ${this.thresholds.functions}%`);
    }

    if (total.lines.pct < this.thresholds.lines) {
      failures.push(`Lines: ${total.lines.pct}% < ${this.thresholds.lines}%`);
    }

    if (failures.length > 0) {
      console.log('\n❌ Coverage thresholds not met:');
      failures.forEach(failure => console.log(`  - ${failure}`));
      console.log('\nPlease add more tests to meet the coverage requirements.');
      
      if (process.env.CI) {
        process.exit(1);
      }
    } else {
      console.log('\n✅ All coverage thresholds met!');
    }
  }

  private async generateCoverageBadges(coverageData: CoverageReport): Promise<void> {
    const { total } = coverageData;
    const badgesDir = path.join(this.coverageDir, 'badges');

    if (!fs.existsSync(badgesDir)) {
      fs.mkdirSync(badgesDir, { recursive: true });
    }

    // Generate badge data
    const badges = {
      statements: this.generateBadgeData('statements', total.statements.pct),
      branches: this.generateBadgeData('branches', total.branches.pct),
      functions: this.generateBadgeData('functions', total.functions.pct),
      lines: this.generateBadgeData('lines', total.lines.pct)
    };

    // Save badge data
    Object.entries(badges).forEach(([type, data]) => {
      const badgePath = path.join(badgesDir, `${type}.json`);
      fs.writeFileSync(badgePath, JSON.stringify(data, null, 2));
    });

    console.log(`🏆 Coverage badges generated in: ${badgesDir}`);
  }

  private generateBadgeData(label: string, percentage: number): any {
    let color = 'red';
    if (percentage >= 90) color = 'brightgreen';
    else if (percentage >= 80) color = 'green';
    else if (percentage >= 70) color = 'yellowgreen';
    else if (percentage >= 60) color = 'yellow';
    else if (percentage >= 50) color = 'orange';

    return {
      schemaVersion: 1,
      label: label,
      message: `${percentage}%`,
      color: color
    };
  }
}

// CLI execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Coverage Report Generator');
    console.log('');
    console.log('Usage:');
    console.log('  npm run coverage-report    # Generate full coverage report');
    console.log('  npm run coverage-report -- --badges-only    # Generate only badges');
    console.log('');
    return;
  }

  const reporter = new CoverageReporter();
  await reporter.generateReport();
}

if (require.main === module) {
  main().catch(console.error);
}

export { CoverageReporter };