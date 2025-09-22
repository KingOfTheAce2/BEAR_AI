import { DutchComplianceValidator } from '../../services/pii/DutchComplianceValidator';

describe('DutchComplianceValidator', () => {
  let validator: DutchComplianceValidator;

  beforeEach(() => {
    validator = new DutchComplianceValidator();
  });

  describe('BSN Validation', () => {
    test('should validate correct BSN numbers', () => {
      // Valid test BSN numbers
      const validBSNs = [
        '123456782',  // Standard test BSN
        '111222333',  // Another test BSN format
      ];

      validBSNs.forEach(bsn => {
        expect(validator.validateBSN(bsn)).toBe(true);
      });
    });

    test('should reject invalid BSN numbers', () => {
      const invalidBSNs = [
        '123456789',  // Fails 11-test
        '000000000',  // All zeros
        '111111111',  // All same digit
        '12345678',   // Too short
        '1234567890', // Too long
        'abcdefghi',  // Non-numeric
        '123-456-789', // With separators (should be cleaned first)
        '',           // Empty string
      ];

      invalidBSNs.forEach(bsn => {
        expect(validator.validateBSN(bsn)).toBe(false);
      });
    });

    test('should handle BSN with formatting', () => {
      // Should handle cleaning of formatted input
      expect(validator.validateBSN('123 456 782')).toBe(true);
      expect(validator.validateBSN('123-456-782')).toBe(true);
      expect(validator.validateBSN('123.456.782')).toBe(true);
    });

    test('should validate against 11-test algorithm', () => {
      // Manual verification of 11-test
      const bsn = '123456782';
      const digits = bsn.split('').map(Number);

      // Calculate weighted sum: 1*9 + 2*8 + 3*7 + 4*6 + 5*5 + 6*4 + 7*3 + 8*2 + 2*(-1)
      const sum = digits[0] * 9 + digits[1] * 8 + digits[2] * 7 + digits[3] * 6 +
                  digits[4] * 5 + digits[5] * 4 + digits[6] * 3 + digits[7] * 2 +
                  digits[8] * (-1);

      expect(sum % 11).toBe(0);
      expect(validator.validateBSN(bsn)).toBe(true);
    });

    test('should identify test numbers', () => {
      expect(validator.isBSNTestNumber('123456782')).toBe(true);
      expect(validator.isBSNTestNumber('111222333')).toBe(true);
      expect(validator.isBSNTestNumber('987654321')).toBe(false);
    });
  });

  describe('RSIN Validation', () => {
    test('should validate correct RSIN numbers', () => {
      // RSIN uses same 11-test as BSN
      const validRSINs = [
        '200001345',
        '200001396',
        '200001493',
      ];

      validRSINs.forEach(rsin => {
        expect(validator.validateRSIN(rsin)).toBe(true);
      });
    });

    test('should reject invalid RSIN numbers', () => {
      const invalidRSINs = [
        '123456789',  // Invalid check digit
        '000000000',  // All zeros
        '12345678',   // Too short
        'abcdefghi',  // Non-numeric
      ];

      invalidRSINs.forEach(rsin => {
        expect(validator.validateRSIN(rsin)).toBe(false);
      });
    });

    test('should handle RSIN formatting', () => {
      expect(validator.validateRSIN('200 001 345')).toBe(true);
      expect(validator.validateRSIN('200-001-345')).toBe(true);
    });
  });

  describe('Dutch Passport Validation', () => {
    test('should validate correct passport formats', () => {
      const validPassports = [
        'NL1234567',
        'NL9876543',
      ];

      validPassports.forEach(passport => {
        const result = validator.validateDutchPassport(passport);
        expect(result.isValid).toBe(true);
        expect(result.type).toBe('PASSPORT');
        expect(result.region).toBe('Netherlands');
        expect(result.confidence).toBe(0.95);
      });
    });

    test('should reject invalid passport formats', () => {
      const invalidPassports = [
        'A1234567',   // Only one letter
        'ABC123456',  // Three letters
        '1234567AB',  // Numbers first
        'AB123456',   // Too short
        'AB12345678', // Too long
        'ab1234567',  // Lowercase
        'AB1234567',  // Invalid country code
      ];

      invalidPassports.forEach(passport => {
        const result = validator.validateDutchPassport(passport);
        expect(result.isValid).toBe(false);
      });
    });

    test('should handle passport formatting', () => {
      const result = validator.validateDutchPassport('nl 9876543');
      expect(result.isValid).toBe(true);
    });
  });

  describe('Dutch ID Card Validation', () => {
    test('should validate correct ID card formats', () => {
      const validIDs = [
        'AB1234567',
        'XY9876543',
      ];

      validIDs.forEach(id => {
        const result = validator.validateDutchIDCard(id);
        expect(result.isValid).toBe(true);
        expect(result.type).toBe('ID_CARD');
        expect(result.region).toBe('Netherlands');
      });
    });

    test('should reject invalid ID card formats', () => {
      const invalidIDs = [
        'A1234567',   // Only one letter
        'ABC123456',  // Three letters
        '1234567AB',  // Numbers first
        'AB123456',   // Too short
      ];

      invalidIDs.forEach(id => {
        const result = validator.validateDutchIDCard(id);
        expect(result.isValid).toBe(false);
      });
    });
  });

  describe('Dutch PII Detection', () => {
    test('should detect valid BSN patterns', () => {
      const texts = [
        'BSN: 123456782',
        'Burgerservicenummer: 123456782',
        'BSN 123456782',
        'My BSN is 123456782',
      ];

      texts.forEach(text => {
        const matches = validator.detectDutchPII(text);
        expect(matches.length).toBeGreaterThan(0);
        expect(matches.some(m => m.type === 'bsn')).toBe(true);
      });
    });

    test('should detect valid RSIN patterns', () => {
      const texts = [
        'RSIN: 200001345',
        'KvK: 200001345',
        'Chamber of Commerce: 200001345',
      ];

      texts.forEach(text => {
        const matches = validator.detectDutchPII(text);
        expect(matches.length).toBeGreaterThan(0);
        expect(matches.some(m => m.type === 'rsin')).toBe(true);
      });
    });

    test('should detect passport patterns', () => {
      const texts = [
        'Passport: NL1234567',
        'Nederlandse paspoort: NL1234567',
        'paspoort NL1234567',
      ];

      texts.forEach(text => {
        const matches = validator.detectDutchPII(text);
        expect(matches.length).toBeGreaterThan(0);
        expect(matches.some(m => m.type === 'dutch_passport')).toBe(true);
      });
    });

    test('should detect ID card patterns', () => {
      const texts = [
        'ID card: AB1234567',
        'Nederlandse identiteitskaart: AB1234567',
        'NIK: AB1234567',
      ];

      texts.forEach(text => {
        const matches = validator.detectDutchPII(text);
        expect(matches.length).toBeGreaterThan(0);
        expect(matches.some(m => m.type === 'dutch_id')).toBe(true);
      });
    });

    test('should not detect invalid patterns', () => {
      const text = 'BSN: 123456789, RSIN: 000000000, Passport: A1234567';
      const matches = validator.detectDutchPII(text);

      // Should not detect any valid patterns
      expect(matches).toHaveLength(0);
    });
  });

  describe('GDPR Compliance Report', () => {
    test('should generate compliance report for BSN', () => {
      const matches = [
          {
            type: 'bsn' as any,
            text: '123456782',
          start: 0,
          end: 9,
          confidence: 0.95,
          hash: 'hash123',
          country: 'NL'
        }
      ];

      const report = validator.generateGDPRComplianceReport(matches);

      expect(report.requiresConsent).toBe(true);
      expect(report.dataTypes).toContain('bsn');
      expect(report.processingBasis.some(basis => basis.includes('BSN'))).toBe(true);
      expect(report.recommendations.some(rec => rec.includes('BSN'))).toBe(true);
    });

    test('should generate compliance report for RSIN', () => {
      const matches = [
          {
            type: 'rsin' as any,
            text: '200001345',
          start: 0,
          end: 9,
          confidence: 0.95,
          hash: 'hash123',
          country: 'NL'
        }
      ];

      const report = validator.generateGDPRComplianceReport(matches);

      expect(report.dataTypes).toContain('rsin');
      expect(report.processingBasis.some(basis => basis.includes('Legitimate interest'))).toBe(true);
    });

    test('should generate compliance report for identity documents', () => {
      const matches = [
        {
          type: 'dutch_passport' as any,
          text: 'NL1234567',
          start: 0,
          end: 9,
          confidence: 0.95,
          hash: 'hash123',
          country: 'NL'
        }
      ];

      const report = validator.generateGDPRComplianceReport(matches);

      expect(report.requiresConsent).toBe(true);
      expect(report.dataTypes).toContain('dutch_passport');
      expect(report.recommendations.some(rec => rec.includes('identity document'))).toBe(true);
    });

    test('should require consent for high-risk data', () => {
      const matches = [
        {
          type: 'bsn' as any,
          text: '123456782',
          start: 0,
          end: 9,
          confidence: 0.95,
          hash: 'hash123',
          country: 'NL'
        },
        {
          type: 'dutch_passport' as any,
          text: 'NL1234567',
          start: 10,
          end: 19,
          confidence: 0.95,
          hash: 'hash456',
          country: 'NL'
        }
      ];

      const report = validator.generateGDPRComplianceReport(matches);

      expect(report.requiresConsent).toBe(true);
      expect(report.recommendations).toContain('Implement data subject rights procedures (access, rectification, erasure)');
      expect(report.recommendations).toContain('Conduct Data Protection Impact Assessment (DPIA)');
    });

    test('should handle empty matches', () => {
      const report = validator.generateGDPRComplianceReport([]);

      expect(report.requiresConsent).toBe(false);
      expect(report.dataTypes).toHaveLength(0);
      expect(report.processingBasis).toHaveLength(0);
    });
  });

  describe('Formatting and Display', () => {
    test('should mask BSN for display', () => {
      const masked = validator.formatBSNMasked('123456782');
      expect(masked).toBe('123-***-782');
      expect(masked).not.toContain('456');
    });

    test('should mask RSIN for display', () => {
      const masked = validator.formatRSINMasked('123456782');
      expect(masked).toBe('12***782');
      expect(masked).not.toContain('3456');
    });

    test('should handle invalid input for masking', () => {
      expect(validator.formatBSNMasked('12345')).toBe('***-***-***');
      expect(validator.formatRSINMasked('abc')).toBe('***-***-***');
    });
  });

  describe('Privacy Authority Information', () => {
    test('should provide Dutch privacy authority info', () => {
      const info = validator.getPrivacyAuthorityInfo();

      expect(info.name).toBe('Autoriteit Persoonsgegevens (AP)');
      expect(info.website).toBe('https://autoriteitpersoonsgegevens.nl');
      expect(info.contact).toBe('info@autoriteitpersoonsgegevens.nl');
      expect(info.reportingRequired).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    test('should handle null and undefined input', () => {
      expect(validator.validateBSN(null as any)).toBe(false);
      expect(validator.validateBSN(undefined as any)).toBe(false);
      expect(validator.validateRSIN('')).toBe(false);
    });

    test('should handle non-string input', () => {
      expect(validator.validateBSN(123456782 as any)).toBe(false);
      expect(validator.validateRSIN({} as any)).toBe(false);
    });

    test('should handle very long input', () => {
      const longInput = '1'.repeat(1000);
      expect(validator.validateBSN(longInput)).toBe(false);
      expect(validator.validateRSIN(longInput)).toBe(false);
    });

    test('should handle special characters', () => {
      expect(validator.validateBSN('123-456-782')).toBe(true); // Should clean
      expect(validator.validateBSN('123@456#782')).toBe(false); // Invalid chars
    });
  });

  describe('Performance', () => {
    test('should validate BSN quickly', () => {
      const start = performance.now();

      for (let i = 0; i < 1000; i++) {
        validator.validateBSN('123456782');
      }

      const end = performance.now();
      const avgTime = (end - start) / 1000;

      // Should be very fast (less than 1ms per validation)
      expect(avgTime).toBeLessThan(1);
    });

    test('should detect patterns efficiently in large text', () => {
      const largeText = 'Some text with BSN: 123456782 and more content. '.repeat(1000);
      const start = performance.now();

      const matches = validator.detectDutchPII(largeText);

      const end = performance.now();
      const executionTime = end - start;

      expect(matches.length).toBeGreaterThan(0);
      expect(executionTime).toBeLessThan(100); // Should complete in less than 100ms
    });
  });
});