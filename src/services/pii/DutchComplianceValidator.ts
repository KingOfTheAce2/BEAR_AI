import { PIIMatch, PIIType } from './PIIDetector';

export interface DutchValidationResult {
  isValid: boolean;
  type: 'BSN' | 'RSIN' | 'PASSPORT' | 'ID_CARD';
  confidence: number;
  region?: string;
}

export class DutchComplianceValidator {
  private bsnTestNumbers: string[] = [
    '123456782', // Valid test BSN
    '111222333', // Valid synthetic BSN for testing
  ];

  private sanitizeDutchNumber(value: string | null | undefined): string | null {
    if (typeof value !== 'string') {
      return null;
    }

    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return null;
    }

    // Allow spaces, periods and dashes as formatting characters only
    if (/[^0-9\s.-]/.test(trimmed)) {
      return null;
    }

    const digitsOnly = trimmed.replace(/[\s.-]/g, '');
    return /^\d{9}$/.test(digitsOnly) ? digitsOnly : null;
  }

  private hasInvalidRepetition(value: string): boolean {
    return /^(\d)\1{8}$/.test(value);
  }

  /**
   * Validate Dutch BSN (Burgerservicenummer) using the 11-test algorithm
   */
  public validateBSN(bsn: string | null | undefined): boolean {
    const cleanBSN = this.sanitizeDutchNumber(bsn);

    if (!cleanBSN || this.hasInvalidRepetition(cleanBSN) || cleanBSN === '000000000') {
      return false;
    }

    if (this.bsnTestNumbers.includes(cleanBSN)) {
      return true;
    }

    return this.apply11Test(cleanBSN);
  }

  /**
   * Validate Dutch RSIN (Rechtspersonen Samenwerkingsverbanden Informatie Nummer)
   */
  public validateRSIN(rsin: string | null | undefined): boolean {
    if (!rsin || typeof rsin !== 'string') {
      return false;
    }

    const cleanRSIN = rsin.replace(/[\s\-.]/g, '');

    if (!/^\d{9}$/.test(cleanRSIN) || this.hasInvalidRepetition(cleanRSIN)) {
      return false;
    }

    return this.validateRSINChecksum(cleanRSIN);
  }

  private validateRSINChecksum(rsin: string): boolean {
    const digits = rsin.split('').map(Number);
    let sum = 0;

    for (let i = 0; i < 8; i++) {
      sum += digits[i] * (9 - i);
    }

    const remainder = sum % 11;

    if (remainder === 1) {
      return false;
    }

    const checkDigit = remainder === 0 ? 0 : 11 - remainder;
    return checkDigit === digits[8];
  }

  /**
   * Apply the Dutch 11-test algorithm
   */
  private apply11Test(number: string): boolean {
    if (!/^\d{9}$/.test(number)) {
      return false;
    }

    const digits = number.split('').map(Number);

    // Calculate weighted sum
    let sum = 0;
    for (let i = 0; i < 8; i++) {
      sum += digits[i] * (9 - i);
    }

    // Add the last digit multiplied by -1
    sum += digits[8] * -1;

    // The sum must be divisible by 11
    return sum % 11 === 0;
  }

  /**
   * Validate Dutch passport number
   */
  public validateDutchPassport(passport: string | null | undefined): DutchValidationResult {
    if (!passport || typeof passport !== 'string') {
      return {
        isValid: false,
        type: 'PASSPORT',
        confidence: 0.1,
        region: 'Netherlands',
      };
    }

    const cleanPassport = passport.replace(/\s/g, '').toUpperCase();

    if (!/^[A-Z]{2}\d{7}$/.test(cleanPassport)) {
      return {
        isValid: false,
        type: 'PASSPORT',
        confidence: 0.1,
        region: 'Netherlands',
      };
    }

    const countryCode = cleanPassport.substring(0, 2);
    if (countryCode !== 'NL') {
      return {
        isValid: false,
        type: 'PASSPORT',
        confidence: 0.1,
        region: 'Netherlands',
      };
    }

    return {
      isValid: true,
      type: 'PASSPORT',
      confidence: 0.95,
      region: 'Netherlands'
    };
  }

  /**
   * Validate Dutch ID card number
   */
  public validateDutchIDCard(idCard: string | null | undefined): DutchValidationResult {
    if (typeof idCard !== 'string') {
      return {
        isValid: false,
        type: 'ID_CARD',
        confidence: 0.1,
        region: 'Netherlands',
      };
    }

    const trimmed = idCard.trim();
    const hasInvalidCharacters = /[^A-Za-z0-9\s-]/.test(trimmed);
    const normalized = trimmed.replace(/[\s-]/g, '').toUpperCase();
    const idPattern = /^[A-Z]{2}\d{7}$/;
    const isValid = !hasInvalidCharacters && idPattern.test(normalized);

    return {
      isValid,
      type: 'ID_CARD',
      confidence: isValid ? 0.95 : 0.1,
      region: 'Netherlands'
    };
  }

  /**
   * Detect Dutch PII patterns with validation
   */
  public detectDutchPII(text: string | null | undefined): PIIMatch[] {
    if (typeof text !== 'string' || text.trim().length === 0) {
      return [];
    }

    const matches: PIIMatch[] = [];

    // Detect BSN candidates
    matches.push(...this.detectBSNPatterns(text));

    // Detect RSIN candidates
    matches.push(...this.detectRSINPatterns(text));

    // Detect passport patterns
    matches.push(...this.detectPassportPatterns(text));

    // Detect ID card patterns
    matches.push(...this.detectIDCardPatterns(text));

    return matches;
  }

  /**
   * Detect BSN patterns in text
   */
  private detectBSNPatterns(text: string): PIIMatch[] {
    const matches: PIIMatch[] = [];

    // Various BSN formats
    const bsnPatterns = [
      // 123456789
      /\b\d{9}\b/g,
      // 123 456 789
      /\b\d{3}\s+\d{3}\s+\d{3}\b/g,
      // 123-456-789
      /\b\d{3}-\d{3}-\d{3}\b/g,
      // BSN: 123456789
      /\bBSN:?\s*\d{9}\b/gi,
      // Burgerservicenummer: 123456789
      /\bBurgerservicenummer:?\s*\d{9}\b/gi
    ];

    bsnPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const cleanBSN = match[0].replace(/\D/g, '');

        if (cleanBSN.length === 9 && this.validateBSN(cleanBSN)) {
          matches.push({
            type: PIIType.BSN,
            text: match[0],
            start: match.index,
            end: match.index + match[0].length,
            confidence: 0.95,
            hash: '', // Will be filled by PIIDetector
            country: 'NL'
          });
        }
      }
    });

    return matches;
  }

  /**
   * Detect RSIN patterns in text
   */
  private detectRSINPatterns(text: string): PIIMatch[] {
    const matches: PIIMatch[] = [];

    const rsinPatterns = [
      // RSIN: 123456789
      /\bRSIN:?\s*\d{9}\b/gi,
      // KvK: 123456789 (Kamer van Koophandel)
      /\bKvK:?\s*\d{9}\b/gi,
      // Chamber of Commerce: 123456789
      /\bChamber\s+of\s+Commerce:?\s*\d{9}\b/gi
    ];

    rsinPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const cleanRSIN = match[0].replace(/\D/g, '');

        if (cleanRSIN.length === 9 && this.validateRSIN(cleanRSIN)) {
          matches.push({
            type: PIIType.RSIN,
            text: match[0],
            start: match.index,
            end: match.index + match[0].length,
            confidence: 0.95,
            hash: '', // Will be filled by PIIDetector
            country: 'NL'
          });
        }
      }
    });

    return matches;
  }

  /**
   * Detect Dutch passport patterns
   */
  private detectPassportPatterns(text: string): PIIMatch[] {
    const matches: PIIMatch[] = [];

    const passportPatterns = [
      // Dutch passport: AB1234567
      /\b[A-Z]{2}\d{7}\b/g,
      // Passport: AB1234567
      /\bPassport:?\s*[A-Z]{2}\d{7}\b/gi,
      // Nederlandse paspoort: AB1234567
      /\b(?:Nederlandse\s+)?paspoort:?\s*[A-Z]{2}\d{7}\b/gi
    ];

    passportPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const fullMatch = match[0];
        const passportNumber = fullMatch.match(/[A-Z]{2}\d{7}/i)?.[0] ?? fullMatch;
        const validation = this.validateDutchPassport(passportNumber);

        if (validation.isValid) {
          matches.push({
            type: PIIType.DUTCH_PASSPORT,
            text: match[0],
            start: match.index,
            end: match.index + match[0].length,
            confidence: validation.confidence,
            hash: '', // Will be filled by PIIDetector
            country: 'NL'
          });
        }
      }
    });

    return matches;
  }

  /**
   * Detect Dutch ID card patterns
   */
  private detectIDCardPatterns(text: string): PIIMatch[] {
    const matches: PIIMatch[] = [];

    const idPatterns = [
      // ID card: AB1234567
      /\bID(?:\s+card)?:?\s*[A-Z]{2}\d{7}\b/gi,
      // Nederlandse identiteitskaart: AB1234567
      /\b(?:Nederlandse\s+)?identiteitskaart:?\s*[A-Z]{2}\d{7}\b/gi,
      // NIK: AB1234567
      /\bNIK:?\s*[A-Z]{2}\d{7}\b/gi
    ];

    idPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const fullMatch = match[0];
        const idNumber = fullMatch.match(/[A-Z]{2}\d{7}/i)?.[0] ?? fullMatch;
        const validation = this.validateDutchIDCard(idNumber);

        if (validation.isValid) {
          matches.push({
            type: PIIType.DUTCH_ID,
            text: match[0],
            start: match.index,
            end: match.index + match[0].length,
            confidence: validation.confidence,
            hash: '', // Will be filled by PIIDetector
            country: 'NL'
          });
        }
      }
    });

    return matches;
  }

  /**
   * Generate GDPR compliance report for Dutch PII
   */
  public generateGDPRComplianceReport(matches: PIIMatch[]): {
    requiresConsent: boolean;
    dataTypes: string[];
    processingBasis: string[];
    retentionPeriod: string;
    recommendations: string[];
  } {
    const dutchMatches = matches.filter(m => m.country === 'NL');
    const dataTypes = [...new Set(dutchMatches.map(m => m.type))];

    const requiresConsent = dataTypes.some(type =>
      [PIIType.BSN, PIIType.DUTCH_PASSPORT, PIIType.DUTCH_ID].includes(type as PIIType)
    );

    const processingBasis: string[] = [];
    const recommendations: string[] = [];

    if (dataTypes.includes(PIIType.BSN)) {
      processingBasis.push('Legal obligation (BSN processing requires specific legal basis)');
      recommendations.push('Ensure BSN processing is legally justified');
      recommendations.push('Implement additional security measures for BSN data');
    }

    if (dataTypes.includes(PIIType.RSIN)) {
      processingBasis.push('Legitimate interest (Business registration information)');
      recommendations.push('Document legitimate interest for RSIN processing');
    }

    if (dataTypes.includes(PIIType.DUTCH_PASSPORT) || dataTypes.includes(PIIType.DUTCH_ID)) {
      processingBasis.push('Consent or contract performance');
      recommendations.push('Obtain explicit consent for identity document processing');
      recommendations.push('Implement secure storage for identity documents');
    }

    if (requiresConsent) {
      recommendations.push('Implement data subject rights procedures (access, rectification, erasure)');
      recommendations.push('Conduct Data Protection Impact Assessment (DPIA)');
      recommendations.push('Ensure data minimization and purpose limitation');
    }

    return {
      requiresConsent,
      dataTypes: dataTypes.map(type => type.toString()),
      processingBasis,
      retentionPeriod: requiresConsent ? 'As per legal requirements or consent duration' : 'Standard business retention',
      recommendations
    };
  }

  /**
   * Check if BSN is a test number
   */
  public isBSNTestNumber(bsn: string | null | undefined): boolean {
    const cleanBSN = this.sanitizeDutchNumber(bsn);
    return cleanBSN ? this.bsnTestNumbers.includes(cleanBSN) : false;
  }

  /**
   * Format BSN for display (with masking)
   */
  public formatBSNMasked(bsn: string | null | undefined): string {
    const cleanBSN = this.sanitizeDutchNumber(bsn);
    if (!cleanBSN) return '***-***-***';

    return `${cleanBSN.substring(0, 3)}-***-${cleanBSN.substring(6)}`;
  }

  /**
   * Format RSIN for display (with masking)
   */
  public formatRSINMasked(rsin: string | null | undefined): string {
    const cleanRSIN = this.sanitizeDutchNumber(rsin);
    if (!cleanRSIN) return '***-***-***';

    return `${cleanRSIN.substring(0, 2)}***${cleanRSIN.substring(cleanRSIN.length - 3)}`;
  }

  /**
   * Get Dutch privacy authority contact information
   */
  public getPrivacyAuthorityInfo(): {
    name: string;
    website: string;
    contact: string;
    reportingRequired: boolean;
  } {
    return {
      name: 'Autoriteit Persoonsgegevens (AP)',
      website: 'https://autoriteitpersoonsgegevens.nl',
      contact: 'info@autoriteitpersoonsgegevens.nl',
      reportingRequired: true
    };
  }
}

export default DutchComplianceValidator;