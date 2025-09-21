import { PIIDetector, PIIType, PIIDetectorConfig } from '../../services/pii/PIIDetector';

describe('PIIDetector', () => {
  let detector: PIIDetector;

  beforeEach(() => {
    detector = new PIIDetector({
      enableRealTime: true,
      sensitivity: 'high',
      enableLegalPatterns: true,
      enableDutchCompliance: true,
      enableAuditLogging: true,
      hashSalt: 'test-salt'
    });
  });

  describe('Core PII Detection', () => {
    test('should detect SSN patterns', async () => {
      const text = 'My SSN is 123-45-6789 for verification.';
      const result = await detector.detectPII(text);

      expect(result.hasPII).toBe(true);
      expect(result.matches).toHaveLength(1);
      expect(result.matches[0].type).toBe(PIIType.SSN);
      expect(result.matches[0].text).toBe('123-45-6789');
      expect(result.matches[0].confidence).toBeGreaterThan(0.8);
    });

    test('should detect email addresses', async () => {
      const text = 'Contact me at john.doe@example.com for more info.';
      const result = await detector.detectPII(text);

      expect(result.hasPII).toBe(true);
      expect(result.matches).toHaveLength(1);
      expect(result.matches[0].type).toBe(PIIType.EMAIL);
      expect(result.matches[0].text).toBe('john.doe@example.com');
      expect(result.matches[0].confidence).toBeGreaterThan(0.9);
    });

    test('should detect credit card numbers', async () => {
      const text = 'Card number: 4532-1234-5678-9012';
      const result = await detector.detectPII(text);

      expect(result.hasPII).toBe(true);
      expect(result.matches).toHaveLength(1);
      expect(result.matches[0].type).toBe(PIIType.CREDIT_CARD);
      expect(result.matches[0].text).toBe('4532-1234-5678-9012');
    });

    test('should detect phone numbers', async () => {
      const text = 'Call me at (555) 123-4567 tomorrow.';
      const result = await detector.detectPII(text);

      expect(result.hasPII).toBe(true);
      expect(result.matches.some(m => m.type === PIIType.PHONE)).toBe(true);
    });

    test('should detect IBAN numbers', async () => {
      const text = 'IBAN: NL91ABNA0417164300';
      const result = await detector.detectPII(text);

      expect(result.hasPII).toBe(true);
      expect(result.matches.some(m => m.type === PIIType.IBAN)).toBe(true);
    });

    test('should handle text with no PII', async () => {
      const text = 'This is a normal message with no sensitive information.';
      const result = await detector.detectPII(text);

      expect(result.hasPII).toBe(false);
      expect(result.matches).toHaveLength(0);
      expect(result.riskLevel).toBe('low');
    });

    test('should detect multiple PII types', async () => {
      const text = 'SSN: 123-45-6789, Email: test@example.com, Phone: 555-123-4567';
      const result = await detector.detectPII(text);

      expect(result.hasPII).toBe(true);
      expect(result.matches.length).toBeGreaterThanOrEqual(3);

      const types = result.matches.map(m => m.type);
      expect(types).toContain(PIIType.SSN);
      expect(types).toContain(PIIType.EMAIL);
      expect(types).toContain(PIIType.PHONE);
    });
  });

  describe('Legal PII Detection', () => {
    test('should detect attorney-client privilege markers', async () => {
      const text = 'This communication is attorney-client privilege and confidential.';
      const result = await detector.detectPII(text);

      expect(result.hasPII).toBe(true);
      expect(result.riskLevel).toBe('critical');
      expect(result.matches.some(m => m.type === PIIType.ATTORNEY_CLIENT_PRIVILEGE)).toBe(true);
      expect(result.matches.some(m => m.isLegalPrivileged === true)).toBe(true);
    });

    test('should detect case numbers', async () => {
      const text = 'Case No: 1:21-cv-12345 is being reviewed.';
      const result = await detector.detectPII(text);

      expect(result.hasPII).toBe(true);
      expect(result.matches.some(m => m.type === PIIType.CASE_NUMBER)).toBe(true);
    });

    test('should detect court names', async () => {
      const text = 'Filed in the U.S. District Court for the Southern District of New York.';
      const result = await detector.detectPII(text);

      expect(result.hasPII).toBe(true);
      expect(result.matches.some(m => m.type === PIIType.COURT_NAME)).toBe(true);
    });

    test('should detect docket numbers', async () => {
      const text = 'Docket No. 12345 contains the filing.';
      const result = await detector.detectPII(text);

      expect(result.hasPII).toBe(true);
      expect(result.matches.some(m => m.type === PIIType.DOCKET_NUMBER)).toBe(true);
    });

    test('should detect bar numbers', async () => {
      const text = 'Attorney Bar No. 123456 is handling the case.';
      const result = await detector.detectPII(text);

      expect(result.hasPII).toBe(true);
      expect(result.matches.some(m => m.type === PIIType.BAR_NUMBER)).toBe(true);
    });
  });

  describe('Dutch Compliance Detection', () => {
    test('should detect and validate Dutch BSN', async () => {
      const text = 'BSN: 123456782'; // Valid test BSN
      const result = await detector.detectPII(text);

      expect(result.hasPII).toBe(true);
      expect(result.matches.some(m => m.type === PIIType.BSN)).toBe(true);
      expect(result.matches.some(m => m.country === 'NL')).toBe(true);
    });

    test('should reject invalid BSN', async () => {
      const text = 'BSN: 123456789'; // Invalid BSN
      const result = await detector.detectPII(text);

      // Should not detect invalid BSN
      expect(result.matches.filter(m => m.type === PIIType.BSN)).toHaveLength(0);
    });

    test('should detect and validate Dutch RSIN', async () => {
      const text = 'KvK: 123456782'; // Valid RSIN
      const result = await detector.detectPII(text);

      expect(result.hasPII).toBe(true);
      expect(result.matches.some(m => m.type === PIIType.RSIN)).toBe(true);
    });

    test('should detect Dutch passport numbers', async () => {
      const text = 'Passport: AB1234567';
      const result = await detector.detectPII(text);

      expect(result.hasPII).toBe(true);
      expect(result.matches.some(m => m.type === PIIType.DUTCH_PASSPORT)).toBe(true);
    });

    test('should detect Dutch ID cards', async () => {
      const text = 'ID card: AB1234567';
      const result = await detector.detectPII(text);

      expect(result.hasPII).toBe(true);
      expect(result.matches.some(m => m.type === PIIType.DUTCH_ID)).toBe(true);
    });
  });

  describe('Risk Level Assessment', () => {
    test('should assign critical risk for attorney-client privilege', async () => {
      const text = 'Attorney-client privilege applies to this communication.';
      const result = await detector.detectPII(text);

      expect(result.riskLevel).toBe('critical');
    });

    test('should assign high risk for multiple high-confidence matches', async () => {
      const text = 'SSN: 123-45-6789, Email: test@example.com, Credit Card: 4532-1234-5678-9012';
      const result = await detector.detectPII(text);

      expect(result.riskLevel).toBe('high');
    });

    test('should assign medium risk for moderate PII', async () => {
      const text = 'Email: test@example.com and phone: 555-123-4567';
      const result = await detector.detectPII(text);

      expect(result.riskLevel).toBe('medium');
    });

    test('should assign low risk for minimal PII', async () => {
      const text = 'Email: test@example.com';
      const result = await detector.detectPII(text);

      expect(result.riskLevel).toBe('low');
    });
  });

  describe('Real-time Detection', () => {
    test('should perform real-time detection', () => {
      const text = 'My email is test@example.com';
      const matches = detector.detectPIIRealTime(text);

      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].type).toBe(PIIType.EMAIL);
    });

    test('should handle short text inputs', () => {
      const text = 'Hi';
      const matches = detector.detectPIIRealTime(text);

      expect(matches).toHaveLength(0);
    });

    test('should be fast for real-time use', () => {
      const text = 'Contact me at john@example.com or call 555-123-4567';
      const start = performance.now();

      for (let i = 0; i < 100; i++) {
        detector.detectPIIRealTime(text);
      }

      const end = performance.now();
      const avgTime = (end - start) / 100;

      // Should be faster than 10ms per detection for real-time use
      expect(avgTime).toBeLessThan(10);
    });
  });

  describe('Text Masking', () => {
    test('should mask detected PII', async () => {
      const text = 'SSN: 123-45-6789, Email: test@example.com';
      const result = await detector.detectPII(text);
      const masked = detector.maskText(text, result.matches);

      expect(masked).not.toContain('123-45-6789');
      expect(masked).not.toContain('test@example.com');
      expect(masked).toContain('*');
    });

    test('should preserve non-PII text when masking', async () => {
      const text = 'Contact John at john@example.com for details';
      const result = await detector.detectPII(text);
      const masked = detector.maskText(text, result.matches);

      expect(masked).toContain('Contact John at');
      expect(masked).toContain('for details');
      expect(masked).not.toContain('john@example.com');
    });

    test('should handle empty matches array', () => {
      const text = 'No PII in this text';
      const masked = detector.maskText(text, []);

      expect(masked).toBe(text);
    });
  });

  describe('Configuration', () => {
    test('should respect sensitivity settings', () => {
      const lowSensitivityDetector = new PIIDetector({
        sensitivity: 'low',
        enableRealTime: true,
        enableLegalPatterns: true,
        enableDutchCompliance: true,
        enableAuditLogging: false,
        hashSalt: 'test'
      });

      const highSensitivityDetector = new PIIDetector({
        sensitivity: 'high',
        enableRealTime: true,
        enableLegalPatterns: true,
        enableDutchCompliance: true,
        enableAuditLogging: false,
        hashSalt: 'test'
      });

      // Both should detect clear PII
      const clearPII = 'SSN: 123-45-6789';
      expect(lowSensitivityDetector.detectPIIRealTime(clearPII).length).toBeGreaterThan(0);
      expect(highSensitivityDetector.detectPIIRealTime(clearPII).length).toBeGreaterThan(0);
    });

    test('should enable/disable legal patterns', async () => {
      const noLegalDetector = new PIIDetector({
        enableLegalPatterns: false,
        enableRealTime: true,
        enableDutchCompliance: true,
        enableAuditLogging: false,
        hashSalt: 'test',
        sensitivity: 'high'
      });

      const text = 'Attorney-client privilege applies here.';
      const result = await noLegalDetector.detectPII(text);

      expect(result.matches.filter(m => m.type === PIIType.ATTORNEY_CLIENT_PRIVILEGE)).toHaveLength(0);
    });

    test('should enable/disable Dutch compliance', async () => {
      const noDutchDetector = new PIIDetector({
        enableDutchCompliance: false,
        enableRealTime: true,
        enableLegalPatterns: true,
        enableAuditLogging: false,
        hashSalt: 'test',
        sensitivity: 'high'
      });

      const text = 'BSN: 123456782';
      const result = await noDutchDetector.detectPII(text);

      expect(result.matches.filter(m => m.type === PIIType.BSN)).toHaveLength(0);
    });

    test('should update configuration', () => {
      const newConfig: Partial&lt;PIIDetectorConfig&gt; = {
        sensitivity: 'low',
        enableRealTime: false
      };

      detector.updateConfig(newConfig);
      const currentConfig = detector.getConfig();

      expect(currentConfig.sensitivity).toBe('low');
      expect(currentConfig.enableRealTime).toBe(false);
    });
  });

  describe('Whitelist Functionality', () => {
    test('should respect whitelisted terms', async () => {
      const whitelistDetector = new PIIDetector({
        whitelistedTerms: ['test@example.com'],
        enableRealTime: true,
        enableLegalPatterns: true,
        enableDutchCompliance: true,
        enableAuditLogging: false,
        hashSalt: 'test',
        sensitivity: 'high'
      });

      const text = 'Contact test@example.com for support';
      const result = await whitelistDetector.detectPII(text);

      expect(result.matches.filter(m => m.text === 'test@example.com')).toHaveLength(0);
    });

    test('should still detect non-whitelisted PII', async () => {
      const whitelistDetector = new PIIDetector({
        whitelistedTerms: ['test@example.com'],
        enableRealTime: true,
        enableLegalPatterns: true,
        enableDutchCompliance: true,
        enableAuditLogging: false,
        hashSalt: 'test',
        sensitivity: 'high'
      });

      const text = 'Contact test@example.com or john@company.com';
      const result = await whitelistDetector.detectPII(text);

      expect(result.hasPII).toBe(true);
      expect(result.matches.some(m => m.text === 'john@company.com')).toBe(true);
      expect(result.matches.some(m => m.text === 'test@example.com')).toBe(false);
    });
  });

  describe('Custom Patterns', () => {
    test('should detect custom patterns', async () => {
      const customDetector = new PIIDetector({
        customPatterns: [
          {
            name: 'Employee ID',
            pattern: /EMP-\d{6}/g,
            type: PIIType.CUSTOM
          }
        ],
        enableRealTime: true,
        enableLegalPatterns: true,
        enableDutchCompliance: true,
        enableAuditLogging: false,
        hashSalt: 'test',
        sensitivity: 'high'
      });

      const text = 'Employee ID: EMP-123456 needs review';
      const result = await customDetector.detectPII(text);

      expect(result.hasPII).toBe(true);
      expect(result.matches.some(m => m.type === PIIType.CUSTOM)).toBe(true);
      expect(result.matches.some(m => m.text === 'EMP-123456')).toBe(true);
    });
  });

  describe('Audit Logging', () => {
    test('should log detected PII when enabled', async () => {
      const text = 'SSN: 123-45-6789';
      await detector.detectPII(text);

      const auditLog = detector.getAuditLog();
      expect(auditLog.length).toBeGreaterThan(0);
      expect(auditLog.some(entry => entry.type === PIIType.SSN)).toBe(true);
    });

    test('should create consistent hash for same data', async () => {
      const text = 'test@example.com';
      const result1 = await detector.detectPII(text);
      const result2 = await detector.detectPII(text);

      expect(result1.matches[0].hash).toBe(result2.matches[0].hash);
    });

    test('should create different hashes for different data', async () => {
      const result1 = await detector.detectPII('test1@example.com');
      const result2 = await detector.detectPII('test2@example.com');

      expect(result1.matches[0].hash).not.toBe(result2.matches[0].hash);
    });

    test('should create audit hash for results', async () => {
      const text = 'SSN: 123-45-6789';
      const result = await detector.detectPII(text);

      expect(result.auditHash).toBeDefined();
      expect(result.auditHash).toHaveLength(64); // SHA256 hex length
    });

    test('should clear audit log', async () => {
      await detector.detectPII('test@example.com');
      expect(detector.getAuditLog().length).toBeGreaterThan(0);

      detector.clearAuditLog();
      expect(detector.getAuditLog()).toHaveLength(0);
    });
  });

  describe('Suggestions', () => {
    test('should provide relevant suggestions', async () => {
      const text = 'SSN: 123-45-6789, Credit Card: 4532-1234-5678-9012, Attorney-client privilege';
      const result = await detector.detectPII(text);

      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.suggestions.some(s => s.includes('SSN') || s.includes('Social Security'))).toBe(true);
      expect(result.suggestions.some(s => s.includes('credit card'))).toBe(true);
      expect(result.suggestions.some(s => s.includes('attorney-client') || s.includes('privileged'))).toBe(true);
    });

    test('should suggest anonymization for multiple PII', async () => {
      const text = 'Name: John, SSN: 123-45-6789, Email: john@example.com, Phone: 555-123-4567, Address: 123 Main St';
      const result = await detector.detectPII(text);

      expect(result.suggestions.some(s => s.includes('anonymization') || s.includes('pseudonymization'))).toBe(true);
    });
  });

  describe('Performance', () => {
    test('should handle large text efficiently', async () => {
      const largeText = 'Contact information: john@example.com, phone: 555-123-4567. '.repeat(1000);
      const start = performance.now();

      await detector.detectPII(largeText);

      const end = performance.now();
      const executionTime = end - start;

      // Should complete within reasonable time (less than 1 second for 1000 repetitions)
      expect(executionTime).toBeLessThan(1000);
    });

    test('should be memory efficient', async () => {
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

      // Process many texts
      for (let i = 0; i < 100; i++) {
        await detector.detectPII(`Test email ${i}: test${i}@example.com`);
      }

      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty string', async () => {
      const result = await detector.detectPII('');
      expect(result.hasPII).toBe(false);
      expect(result.matches).toHaveLength(0);
    });

    test('should handle null and undefined gracefully', async () => {
      const result1 = await detector.detectPII(null as any);
      const result2 = await detector.detectPII(undefined as any);

      expect(result1.hasPII).toBe(false);
      expect(result2.hasPII).toBe(false);
    });

    test('should handle very long strings', async () => {
      const longText = 'a'.repeat(100000) + ' test@example.com ' + 'b'.repeat(100000);
      const result = await detector.detectPII(longText);

      expect(result.hasPII).toBe(true);
      expect(result.matches.some(m => m.type === PIIType.EMAIL)).toBe(true);
    });

    test('should handle special characters', async () => {
      const text = 'Email: test@example.com, Special chars: àáâãäåæçèéêë, SSN: 123-45-6789';
      const result = await detector.detectPII(text);

      expect(result.hasPII).toBe(true);
      expect(result.matches.length).toBeGreaterThanOrEqual(2);
    });

    test('should handle mixed languages', async () => {
      const text = 'English email: test@example.com, Nederlandse BSN: 123456782, Français téléphone: 555-123-4567';
      const result = await detector.detectPII(text);

      expect(result.hasPII).toBe(true);
      expect(result.matches.length).toBeGreaterThanOrEqual(2);
    });
  });
});