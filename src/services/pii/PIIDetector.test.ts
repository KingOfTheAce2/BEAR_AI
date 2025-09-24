import { PIIDetector, PIIType } from './PIIDetector';
import { LegalPIIPatterns } from './LegalPIIPatterns';
import { DutchComplianceValidator } from './DutchComplianceValidator';

describe('PIIDetector', () => {
  let detector: PIIDetector;

  beforeEach(() => {
    detector = new PIIDetector();
  });

  describe('Core PII Detection', () => {
    test('should detect SSN patterns', async () => {
      const text = 'My SSN is 123-45-6789 for identification.';
      const result = await detector.detectPII(text);

      expect(result.hasPII).toBe(true);
      expect(result.matches).toHaveLength(1);
      expect(result.matches[0].type).toBe(PIIType.SSN);
      expect(result.matches[0].text).toBe('123-45-6789');
      expect(result.riskLevel).toBe('medium');
    });

    test('should detect email patterns', async () => {
      const text = 'Contact me at john.doe@example.com for more info.';
      const result = await detector.detectPII(text);

      expect(result.hasPII).toBe(true);
      expect(result.matches).toHaveLength(1);
      expect(result.matches[0].type).toBe(PIIType.EMAIL);
      expect(result.matches[0].text).toBe('john.doe@example.com');
    });

    test('should detect phone patterns', async () => {
      const text = 'Call me at (555) 123-4567 or +1-555-123-4567.';
      const result = await detector.detectPII(text);

      expect(result.hasPII).toBe(true);
      expect(result.matches.length).toBeGreaterThan(0);
      expect(result.matches[0].type).toBe(PIIType.PHONE);
    });

    test('should detect credit card patterns', async () => {
      const text = 'My card number is 4111 1111 1111 1111.';
      const result = await detector.detectPII(text);

      expect(result.hasPII).toBe(true);
      expect(result.matches).toHaveLength(1);
      expect(result.matches[0].type).toBe(PIIType.CREDIT_CARD);
      expect(result.matches[0].text).toBe('4111 1111 1111 1111');
    });

    test('should detect IBAN patterns', async () => {
      const text = 'Transfer to GB33BUKB20201555555555.';
      const result = await detector.detectPII(text);

      expect(result.hasPII).toBe(true);
      expect(result.matches).toHaveLength(1);
      expect(result.matches[0].type).toBe(PIIType.IBAN);
      expect(result.matches[0].text).toBe('GB33BUKB20201555555555');
    });
  });

  describe('Legal PII Detection', () => {
    test('should detect case numbers', async () => {
      const text = 'Case No. 21-CV-123456 is scheduled for hearing.';
      const result = await detector.detectPII(text);

      const caseMatches = result.matches.filter(m => m.type === PIIType.CASE_NUMBER);
      expect(caseMatches.length).toBeGreaterThan(0);
      expect(caseMatches[0].confidence).toBeGreaterThan(0.7);
    });

    test('should detect attorney-client privilege', async () => {
      const text = 'This communication is subject to attorney-client privilege.';
      const result = await detector.detectPII(text);

      const privilegeMatches = result.matches.filter(m => m.type === PIIType.ATTORNEY_CLIENT_PRIVILEGE);
      expect(privilegeMatches.length).toBeGreaterThan(0);
      expect(privilegeMatches[0].isLegalPrivileged).toBe(true);
      expect(result.riskLevel).toBe('critical');
    });

    test('should detect court names', async () => {
      const text = 'Filed in the U.S. District Court for the Southern District of New York.';
      const result = await detector.detectPII(text);

      const courtMatches = result.matches.filter(m => m.type === PIIType.COURT_NAME);
      expect(courtMatches.length).toBeGreaterThan(0);
    });

    test('should detect attorney credentials', async () => {
      const text = 'John Smith, Esq. represents the plaintiff.';
      const result = await detector.detectPII(text);

      const attorneyMatches = result.matches.filter(m => m.type === PIIType.ATTORNEY_NAME);
      expect(attorneyMatches.length).toBeGreaterThan(0);
    });

    test('should detect bar numbers', async () => {
      const text = 'Attorney Bar No. 123456 filed the motion.';
      const result = await detector.detectPII(text);

      const barMatches = result.matches.filter(m => m.type === PIIType.BAR_NUMBER);
      expect(barMatches.length).toBeGreaterThan(0);
    });
  });

  describe('Dutch Compliance Detection', () => {
    test('should detect BSN patterns', async () => {
      const text = 'BSN: 123456782 is a valid test number.';
      const result = await detector.detectPII(text);

      const bsnMatches = result.matches.filter(m => m.type === PIIType.BSN);
      expect(bsnMatches.length).toBeGreaterThan(0);
      expect(bsnMatches[0].country).toBe('NL');
    });

    test('should detect Dutch passport patterns', async () => {
      const text = 'Dutch passport NL1234567 issued in 2023.';
      const result = await detector.detectPII(text);

      const passportMatches = result.matches.filter(m => m.type === PIIType.DUTCH_PASSPORT);
      expect(passportMatches.length).toBeGreaterThan(0);
      expect(passportMatches[0].country).toBe('NL');
    });

    test('should detect RSIN patterns', async () => {
      const text = 'Company RSIN: 123456782 for tax purposes.';
      const result = await detector.detectPII(text);

      const rsinMatches = result.matches.filter(m => m.type === PIIType.RSIN);
      expect(rsinMatches.length).toBeGreaterThan(0);
      expect(rsinMatches[0].country).toBe('NL');
    });
  });

  describe('Risk Level Assessment', () => {
    test('should return critical risk for privileged content', async () => {
      const text = 'Attorney-client privilege applies to this confidential communication.';
      const result = await detector.detectPII(text);

      expect(result.riskLevel).toBe('critical');
    });

    test('should return high risk for multiple PII types', async () => {
      const text = 'Contact John at john@example.com or 555-123-4567, SSN: 123-45-6789';
      const result = await detector.detectPII(text);

      expect(result.riskLevel).toBeOneOf(['high', 'critical']);
    });

    test('should return low risk for no PII', async () => {
      const text = 'This is just a normal text without any sensitive information.';
      const result = await detector.detectPII(text);

      expect(result.hasPII).toBe(false);
      expect(result.riskLevel).toBe('low');
    });
  });

  describe('Whitelisting', () => {
    test('should filter whitelisted terms', async () => {
      const detector = new PIIDetector({
        whitelistedTerms: ['example.com']
      });

      const text = 'Email: test@example.com and john@company.com';
      const result = await detector.detectPII(text);

      // Should only detect john@company.com, not test@example.com
      expect(result.matches.length).toBe(1);
      expect(result.matches[0].text).toBe('john@company.com');
    });
  });

  describe('Real-time Detection', () => {
    test('should detect PII in real-time mode', () => {
      const text = 'My email is john@example.com';
      const matches = detector.detectPIIRealTime(text);

      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].type).toBe(PIIType.EMAIL);
    });

    test('should return empty for short text', () => {
      const text = 'Hi';
      const matches = detector.detectPIIRealTime(text);

      expect(matches).toHaveLength(0);
    });
  });

  describe('Text Masking', () => {
    test('should mask detected PII', async () => {
      const text = 'My SSN is 123-45-6789 and email is john@example.com';
      const result = await detector.detectPII(text);
      const maskedText = detector.maskText(text, result.matches);

      expect(maskedText).not.toContain('123-45-6789');
      expect(maskedText).not.toContain('john@example.com');
      expect(maskedText).toContain('*');
    });

    test('should return original text when no matches', async () => {
      const text = 'This is clean text';
      const result = await detector.detectPII(text);
      const maskedText = detector.maskText(text, result.matches);

      expect(maskedText).toBe(text);
    });
  });

  describe('Configuration Management', () => {
    test('should update configuration', () => {
      const newConfig = {
        sensitivity: 'high' as const,
        enableLegalPatterns: false
      };

      detector.updateConfig(newConfig);
      const currentConfig = detector.getConfig();

      expect(currentConfig.sensitivity).toBe('high');
      expect(currentConfig.enableLegalPatterns).toBe(false);
    });
  });

  describe('Audit Logging', () => {
    test('should log matches when enabled', async () => {
      const detector = new PIIDetector({ enableAuditLogging: true });
      const text = 'Email: test@example.com';

      await detector.detectPII(text, { source: 'test' });
      const auditLog = detector.getAuditLog();

      expect(auditLog.length).toBeGreaterThan(0);
    });

    test('should clear audit log', async () => {
      const detector = new PIIDetector({ enableAuditLogging: true });
      const text = 'Email: test@example.com';

      await detector.detectPII(text);
      expect(detector.getAuditLog().length).toBeGreaterThan(0);

      detector.clearAuditLog();
      expect(detector.getAuditLog()).toHaveLength(0);
    });
  });

  describe('Edge Cases', () => {
    test('should handle null/undefined input', async () => {
      const result1 = await detector.detectPII(null);
      const result2 = await detector.detectPII(undefined);
      const result3 = await detector.detectPII('');

      expect(result1.hasPII).toBe(false);
      expect(result2.hasPII).toBe(false);
      expect(result3.hasPII).toBe(false);
    });

    test('should handle very long text', async () => {
      const longText = 'Email: test@example.com '.repeat(1000);
      const result = await detector.detectPII(longText);

      expect(result.hasPII).toBe(true);
      expect(result.matches.length).toBeGreaterThan(0);
    });

    test('should handle special characters', async () => {
      const text = 'Email: test@例え.com with unicode characters';
      const result = await detector.detectPII(text);

      // Should still detect email pattern despite unicode domain
      expect(result.hasPII).toBe(true);
    });
  });

  describe('Custom Patterns', () => {
    test('should support custom patterns', async () => {
      const detector = new PIIDetector({
        customPatterns: [
          {
            name: 'Employee ID',
            pattern: /EMP\d{6}/g,
            type: PIIType.CUSTOM
          }
        ]
      });

      const text = 'Employee ID EMP123456 was assigned.';
      const result = await detector.detectPII(text);

      const customMatches = result.matches.filter(m => m.type === PIIType.CUSTOM);
      expect(customMatches.length).toBeGreaterThan(0);
      expect(customMatches[0].text).toBe('EMP123456');
    });
  });

  describe('Performance', () => {
    test('should handle large text efficiently', async () => {
      const largeText = 'This is a large document. '.repeat(10000) + 'Email: test@example.com';

      const startTime = Date.now();
      const result = await detector.detectPII(largeText);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(5000); // Should complete in under 5 seconds
      expect(result.hasPII).toBe(true);
    });
  });
});

// Helper function for Jest
expect.extend({
  toBeOneOf(received: any, array: any[]) {
    const pass = array.includes(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be one of ${array}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be one of ${array}`,
        pass: false,
      };
    }
  },
});

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeOneOf(array: any[]): R;
    }
  }
}