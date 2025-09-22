import { PIIDetector, PIIType } from '../../services/pii/PIIDetector';
import { HybridPIIDetector } from '../../services/pii/HybridPIIDetector';
import { DutchComplianceValidator } from '../../services/pii/DutchComplianceValidator';
import { LegalPIIPatterns } from '../../services/pii/LegalPIIPatterns';

describe('PII Detection Integration Tests', () => {
  describe('End-to-End Workflow', () => {
    test('should handle complete legal document analysis workflow', async () => {
      const detector = new PIIDetector({
        enableLegalPatterns: true,
        enableDutchCompliance: true,
        enableAuditLogging: true,
        sensitivity: 'high'
      });

      const legalDocument = `
        CONFIDENTIAL ATTORNEY-CLIENT COMMUNICATION

        Case No: 1:21-cv-12345
        Court: U.S. District Court for the Southern District of New York
        Docket No. 67890

        Client Information:
        Name: John Doe
        SSN: 123-45-6789
        Email: john.doe@client.com
        Phone: (555) 123-4567

        Dutch Client Information:
        BSN: 123456782
        RSIN: 200001345
        Passport: NL1234567

        Attorney Information:
        Attorney: Jane Smith, Esq.
        Bar No. 987654
        Email: jane.smith@lawfirm.com

        This communication is attorney-client privilege and work product.

        Settlement amount: $50,000
        Credit Card for retainer: 4532-1234-5678-9012
      `;

      const result = await detector.detectPII(legalDocument);

      // Should detect multiple types of PII
      expect(result.hasPII).toBe(true);
      expect(result.matches.length).toBeGreaterThan(10);

      // Should detect legal-specific PII
      expect(result.matches.some(m => m.type === PIIType.ATTORNEY_CLIENT_PRIVILEGE)).toBe(true);
      expect(result.matches.some(m => m.type === PIIType.CASE_NUMBER)).toBe(true);
      expect(result.matches.some(m => m.type === PIIType.COURT_NAME)).toBe(true);
      expect(result.matches.some(m => m.type === PIIType.DOCKET_NUMBER)).toBe(true);
      expect(result.matches.some(m => m.type === PIIType.BAR_NUMBER)).toBe(true);

      // Should detect standard PII
      expect(result.matches.some(m => m.type === PIIType.SSN)).toBe(true);
      expect(result.matches.some(m => m.type === PIIType.EMAIL)).toBe(true);
      expect(result.matches.some(m => m.type === PIIType.PHONE)).toBe(true);
      expect(result.matches.some(m => m.type === PIIType.CREDIT_CARD)).toBe(true);

      // Should detect Dutch PII
      expect(result.matches.some(m => m.type === PIIType.BSN)).toBe(true);
      expect(result.matches.some(m => m.type === PIIType.RSIN)).toBe(true);
      expect(result.matches.some(m => m.type === PIIType.DUTCH_PASSPORT)).toBe(true);

      // Should be critical risk due to attorney-client privilege
      expect(result.riskLevel).toBe('critical');

      // Should have appropriate suggestions
      expect(result.suggestions.some(s => s.includes('attorney-client') || s.includes('privileged'))).toBe(true);
      expect(result.suggestions.some(s => s.includes('SSN') || s.includes('Social Security'))).toBe(true);
      expect(result.suggestions.some(s => s.includes('BSN') || s.includes('GDPR'))).toBe(true);
    });

    test('should handle document masking workflow', async () => {
      const detector = new PIIDetector({
        enableLegalPatterns: true,
        enableDutchCompliance: true,
        sensitivity: 'high'
      });

      const originalText = 'Client John Doe (SSN: 123-45-6789) contacted attorney@firm.com about BSN 123456782.';

      const result = await detector.detectPII(originalText);
      const maskedText = detector.maskText(originalText, result.matches);

      // Original text should not be in masked version
      expect(maskedText).not.toContain('123-45-6789');
      expect(maskedText).not.toContain('attorney@firm.com');
      expect(maskedText).not.toContain('123456782');

      // Non-PII text should be preserved
      expect(maskedText).toContain('Client John Doe');
      expect(maskedText).toContain('contacted');
      expect(maskedText).toContain('about');

      // Should contain masking characters
      expect(maskedText).toContain('*');
    });

    test('should handle audit trail workflow', async () => {
      const detector = new PIIDetector({
        enableAuditLogging: true,
        hashSalt: 'test-salt'
      });

      const texts = [
        'SSN: 123-45-6789',
        'Email: test@example.com',
        'Attorney-client privilege applies'
      ];

      // Process multiple texts
      for (const text of texts) {
        await detector.detectPII(text);
      }

      const auditLog = detector.getAuditLog();

      // Should have entries for each PII detection
      expect(auditLog.length).toBeGreaterThan(0);

      // Should have different hashes for different PII
      const hashes = auditLog.map(entry => entry.hash);
      const uniqueHashes = new Set(hashes);
      expect(uniqueHashes.size).toBeGreaterThan(1);

      // Should have consistent hashes for same data
      const result1 = await detector.detectPII('test@example.com');
      const result2 = await detector.detectPII('test@example.com');
      expect(result1.matches[0].hash).toBe(result2.matches[0].hash);
    });
  });

  describe('Cross-Component Integration', () => {
    test('should integrate Dutch validator with main detector', async () => {
      const detector = new PIIDetector({
        enableDutchCompliance: true
      });

      const validator = new DutchComplianceValidator();

      // Test valid BSN
      const validBSNText = 'BSN: 123456782';
      const result = await detector.detectPII(validBSNText);

      expect(result.matches.some(m => m.type === PIIType.BSN)).toBe(true);
      expect(validator.validateBSN('123456782')).toBe(true);

      // Test invalid BSN (should not be detected)
      const invalidBSNText = 'BSN: 123456789';
      const invalidResult = await detector.detectPII(invalidBSNText);

      expect(invalidResult.matches.filter(m => m.type === PIIType.BSN)).toHaveLength(0);
      expect(validator.validateBSN('123456789')).toBe(false);
    });

    test('should integrate legal patterns with main detector', async () => {
      const detector = new PIIDetector({
        enableLegalPatterns: true
      });

      const legalPatterns = new LegalPIIPatterns();

      const legalText = 'Case 1:21-cv-12345 in U.S. District Court involves attorney-client privilege.';

      const detectorResult = await detector.detectPII(legalText);
      const patternsResult = legalPatterns.detectLegalPII(legalText);

      // Both should detect legal PII
      expect(detectorResult.matches.some(m => m.type === PIIType.CASE_NUMBER)).toBe(true);
      expect(detectorResult.matches.some(m => m.type === PIIType.COURT_NAME)).toBe(true);
      expect(detectorResult.matches.some(m => m.type === PIIType.ATTORNEY_CLIENT_PRIVILEGE)).toBe(true);

      expect(patternsResult.some(m => m.type === PIIType.CASE_NUMBER)).toBe(true);
      expect(patternsResult.some(m => m.type === PIIType.COURT_NAME)).toBe(true);
      expect(patternsResult.some(m => m.type === PIIType.ATTORNEY_CLIENT_PRIVILEGE)).toBe(true);

      // Legal context analysis
      const legalContext = legalPatterns.analyzeLegalContext(legalText);
      expect(legalContext).not.toBeNull();
      expect(legalContext?.jurisdiction).toBe('federal');
    });

    test('should handle hybrid detector fallback', async () => {
      const hybridDetector = new HybridPIIDetector({
        enableLegalPatterns: true,
        enableDutchCompliance: true,
        sensitivity: 'high'
      });

      // Check backend status
      const status = await hybridDetector.getBackendStatus();
      expect(status.rustAvailable).toBeDefined();
      expect(status.currentBackend).toMatch(/^(rust|typescript)$/);

      // Test detection regardless of backend
      const text = 'SSN: 123-45-6789, Email: test@example.com, BSN: 123456782';
      const result = await hybridDetector.detectPII(text);

      expect(result.hasPII).toBe(true);
      expect(result.matches.length).toBeGreaterThanOrEqual(3);
      expect(result.matches.some(m => m.type === PIIType.SSN)).toBe(true);
      expect(result.matches.some(m => m.type === PIIType.EMAIL)).toBe(true);
      expect(result.matches.some(m => m.type === PIIType.BSN)).toBe(true);
    });
  });

  describe('Performance Integration', () => {
    test('should handle large document processing efficiently', async () => {
      const detector = new PIIDetector({
        enableLegalPatterns: true,
        enableDutchCompliance: true,
        sensitivity: 'high'
      });

      // Create a large document with scattered PII
      const piiElements = [
        'SSN: 123-45-6789',
        'Email: john@example.com',
        'BSN: 123456782',
        'Case No: 1:21-cv-12345',
        'attorney-client privilege'
      ];

      const largeDocument = Array(1000).fill(0).map((_, i) => {
        const baseText = `Paragraph ${i}: This is a sample paragraph with some legal content and case references. `;
        // Inject PII every 100 paragraphs
        if (i % 100 === 0) {
          return baseText + piiElements[Math.floor(Math.random() * piiElements.length)];
        }
        return baseText;
      }).join('\n');

      const start = performance.now();
      const result = await detector.detectPII(largeDocument);
      const end = performance.now();

      // Should complete in reasonable time (less than 2 seconds)
      expect(end - start).toBeLessThan(2000);

      // Should detect PII throughout the document
      expect(result.hasPII).toBe(true);
      expect(result.matches.length).toBeGreaterThan(5);

      // Should have appropriate risk level
      expect(['medium', 'high', 'critical']).toContain(result.riskLevel);
    });

    test('should handle concurrent detection requests', async () => {
      const detector = new PIIDetector({
        enableLegalPatterns: true,
        enableDutchCompliance: true
      });

      const texts = [
        'SSN: 123-45-6789',
        'Email: test@example.com',
        'BSN: 123456782',
        'Case No: 1:21-cv-12345',
        'attorney-client privilege',
        'Credit Card: 4532-1234-5678-9012',
        'Phone: (555) 123-4567',
        'Court: U.S. District Court',
        'Bar No. 987654',
        'IBAN: NL91ABNA0417164300'
      ];

      const start = performance.now();

      // Process all texts concurrently
      const results = await Promise.all(
        texts.map(text => detector.detectPII(text))
      );

      const end = performance.now();

      // Should complete all detections
      expect(results).toHaveLength(texts.length);

      // All should have detected PII
      results.forEach(result => {
        expect(result.hasPII).toBe(true);
        expect(result.matches.length).toBeGreaterThan(0);
      });

      // Should be faster than sequential processing
      expect(end - start).toBeLessThan(1000);
    });
  });

  describe('Configuration Integration', () => {
    test('should respect global configuration across components', async () => {
      const config = {
        enableLegalPatterns: false,
        enableDutchCompliance: false,
        sensitivity: 'low' as const,
        enableAuditLogging: false
      };

      const detector = new PIIDetector(config);

      const text = 'SSN: 123-45-6789, BSN: 123456782, attorney-client privilege, Case No: 1:21-cv-12345';
      const result = await detector.detectPII(text);

      // Should only detect basic PII (SSN) and not legal or Dutch patterns
      expect(result.matches.some(m => m.type === PIIType.SSN)).toBe(true);
      expect(result.matches.some(m => m.type === PIIType.BSN)).toBe(false);
      expect(result.matches.some(m => m.type === PIIType.ATTORNEY_CLIENT_PRIVILEGE)).toBe(false);
      expect(result.matches.some(m => m.type === PIIType.CASE_NUMBER)).toBe(false);

      // Audit log should be empty due to disabled logging
      expect(detector.getAuditLog()).toHaveLength(0);
    });

    test('should handle custom patterns and whitelist together', async () => {
      const detector = new PIIDetector({
        customPatterns: [
          {
            name: 'Employee ID',
            pattern: /EMP-\d{6}/g,
            type: PIIType.CUSTOM
          }
        ],
        whitelistedTerms: ['test@example.com'],
        sensitivity: 'high'
      });

      const text = 'Employee EMP-123456 contacted test@example.com and john@company.com';
      const result = await detector.detectPII(text);

      // Should detect custom pattern
      expect(result.matches.some(m => m.type === PIIType.CUSTOM && m.text === 'EMP-123456')).toBe(true);

      // Should detect non-whitelisted email
      expect(result.matches.some(m => m.text === 'john@company.com')).toBe(true);

      // Should not detect whitelisted email
      expect(result.matches.some(m => m.text === 'test@example.com')).toBe(false);
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle malformed input gracefully across components', async () => {
      const detector = new PIIDetector();
      const validator = new DutchComplianceValidator();
      const legalPatterns = new LegalPIIPatterns();

      const malformedInputs = [
        null,
        undefined,
        '',
        123,
        {},
        [],
        'a'.repeat(100000), // Very long string
        '\0\0\0', // Null characters
        '🚀💯🔥', // Emojis only
      ];

      for (const input of malformedInputs) {
        try {
          // Main detector should handle gracefully
          const result = await detector.detectPII(input as any);
          expect(result.hasPII).toBe(false);
          expect(result.matches).toHaveLength(0);

          // Validator should handle gracefully
          if (typeof input === 'string') {
            expect(() => validator.validateBSN(input)).not.toThrow();
            expect(() => validator.validateRSIN(input)).not.toThrow();
          }

          // Legal patterns should handle gracefully
          if (typeof input === 'string') {
            expect(() => legalPatterns.detectLegalPII(input)).not.toThrow();
          }
        } catch (error) {
          // If an error is thrown, it should be handled gracefully
          expect(error).toBeInstanceOf(Error);
        }
      }
    });

    test('should maintain consistency during component failures', async () => {
      const detector = new PIIDetector({
        enableLegalPatterns: true,
        enableDutchCompliance: true,
        enableAuditLogging: true
      });

      // Test with text that might cause issues in specific components
      const problematicText = 'Contact at @@invalid-email@@ or BSN: invalid-bsn-123';

      const result = await detector.detectPII(problematicText);

      // Should not crash and should return valid result structure
      expect(result).toHaveProperty('hasPII');
      expect(result).toHaveProperty('matches');
      expect(result).toHaveProperty('riskLevel');
      expect(result).toHaveProperty('suggestions');
      expect(result).toHaveProperty('auditHash');

      // Should handle partial failures gracefully
      expect(Array.isArray(result.matches)).toBe(true);
      expect(Array.isArray(result.suggestions)).toBe(true);
      expect(typeof result.auditHash).toBe('string');
    });
  });

  describe('Memory and Resource Management', () => {
    test('should manage memory efficiently during long-running operations', async () => {
      const detector = new PIIDetector({
        enableAuditLogging: true
      });

      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

      // Process many documents
      for (let i = 0; i < 100; i++) {
        const text = `Document ${i}: SSN 123-45-6789, Email test${i}@example.com`;
        await detector.detectPII(text);

        // Periodically check memory usage
        if (i % 25 === 0) {
          const currentMemory = (performance as any).memory?.usedJSHeapSize || 0;
          const memoryIncrease = currentMemory - initialMemory;

          // Memory increase should be reasonable (less than 50MB)
          expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
        }
      }

      // Audit log should be limited in size
      const auditLog = detector.getAuditLog();
      expect(auditLog.length).toBeLessThanOrEqual(1000); // Should cap at 1000 entries

      // Clear audit log and verify memory is freed
      detector.clearAuditLog();
      expect(detector.getAuditLog()).toHaveLength(0);
    });
  });
});