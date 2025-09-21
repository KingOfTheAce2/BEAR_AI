import { PIIMatch, PIIType } from './PIIDetector';

export interface LegalContext {
  jurisdiction: string;
  courtLevel: 'federal' | 'state' | 'local' | 'international';
  practiceArea: string[];
}

export class LegalPIIPatterns {
  private federalCourtNames: string[] = [
    'Supreme Court', 'Court of Appeals', 'District Court', 'Bankruptcy Court',
    'Tax Court', 'Court of Federal Claims', 'Court of International Trade'
  ];

  private stateCourtIndicators: string[] = [
    'Superior Court', 'Municipal Court', 'Family Court', 'Probate Court',
    'Circuit Court', 'County Court', 'Justice Court', 'Magistrate Court'
  ];

  private privilegeIndicators: string[] = [
    'attorney-client privilege', 'attorney client privilege', 'confidential communication',
    'privileged and confidential', 'attorney work product', 'work product privilege',
    'litigation privilege', 'common interest privilege', 'joint defense privilege'
  ];

  private legalTitlePatterns: string[] = [
    'Esq\\.?', 'Attorney at Law', 'Counselor at Law', 'Of Counsel',
    'Partner', 'Associate', 'Legal Counsel', 'General Counsel'
  ];

  /**
   * Detect legal industry specific PII
   */
  public detectLegalPII(text: string): PIIMatch[] {
    const matches: PIIMatch[] = [];

    // Detect case numbers
    matches.push(...this.detectCaseNumbers(text));

    // Detect court names
    matches.push(...this.detectCourtNames(text));

    // Detect attorney names and credentials
    matches.push(...this.detectAttorneyCredentials(text));

    // Detect attorney-client privilege markers
    matches.push(...this.detectPrivilegeMarkers(text));

    // Detect docket numbers
    matches.push(...this.detectDocketNumbers(text));

    // Detect bar numbers
    matches.push(...this.detectBarNumbers(text));

    // Detect legal document citations
    matches.push(...this.detectLegalCitations(text));

    return matches;
  }

  /**
   * Detect case numbers (various formats)
   */
  private detectCaseNumbers(text: string): PIIMatch[] {
    const matches: PIIMatch[] = [];

    // Federal case number patterns
    const federalPatterns = [
      // District Court: 1:21-cv-12345
      /\b\d{1,2}:\d{2}-[a-z]{2}-\d{4,6}\b/gi,
      // Appeals: 21-1234
      /\b\d{2}-\d{4}\b/g,
      // Supreme Court: 21-123
      /\b\d{2}-\d{3}\b/g
    ];

    federalPatterns.forEach(pattern => {
      matches.push(...this.findMatches(text, pattern, PIIType.CASE_NUMBER, 0.9));
    });

    // State case number patterns (more varied)
    const statePatterns = [
      // General: CV-2021-12345, CR-2021-67890
      /\b[A-Z]{2}-\d{4}-\d{4,6}\b/g,
      // Some states: 21CV12345
      /\b\d{2}[A-Z]{2}\d{4,6}\b/g,
      // Others: A-12345-21
      /\b[A-Z]-\d{4,6}-\d{2}\b/g
    ];

    statePatterns.forEach(pattern => {
      matches.push(...this.findMatches(text, pattern, PIIType.CASE_NUMBER, 0.8));
    });

    return matches;
  }

  /**
   * Detect court names
   */
  private detectCourtNames(text: string): PIIMatch[] {
    const matches: PIIMatch[] = [];

    // Federal courts
    this.federalCourtNames.forEach(courtName => {
      const pattern = new RegExp(`\\b${courtName}\\b`, 'gi');
      matches.push(...this.findMatches(text, pattern, PIIType.COURT_NAME, 0.95));
    });

    // State court indicators
    this.stateCourtIndicators.forEach(indicator => {
      const pattern = new RegExp(`\\b[A-Za-z\\s]+\\s${indicator}\\b`, 'gi');
      matches.push(...this.findMatches(text, pattern, PIIType.COURT_NAME, 0.85));
    });

    // Specific court name patterns
    const courtPatterns = [
      // U.S. District Court for [District]
      /\bU\.?S\.?\s+District\s+Court\s+for\s+the\s+[A-Za-z\s]+District\b/gi,
      // [State] Supreme Court
      /\b[A-Za-z\s]+\s+Supreme\s+Court\b/gi,
      // International Court of Justice, etc.
      /\bInternational\s+Court\s+of\s+[A-Za-z\s]+\b/gi
    ];

    courtPatterns.forEach(pattern => {
      matches.push(...this.findMatches(text, pattern, PIIType.COURT_NAME, 0.9));
    });

    return matches;
  }

  /**
   * Detect attorney credentials and names
   */
  private detectAttorneyCredentials(text: string): PIIMatch[] {
    const matches: PIIMatch[] = [];

    // Attorney names with titles
    this.legalTitlePatterns.forEach(title => {
      const patterns = [
        // Name followed by title: John Doe, Esq.
        new RegExp(`\\b[A-Z][a-z]+\\s+[A-Z][a-z]+,?\\s*${title}`, 'g'),
        // Title followed by name: Attorney John Doe
        new RegExp(`\\b${title}\\s+[A-Z][a-z]+\\s+[A-Z][a-z]+`, 'g')
      ];

      patterns.forEach(pattern => {
        matches.push(...this.findMatches(text, pattern, PIIType.ATTORNEY_NAME, 0.8));
      });
    });

    // Law firm patterns
    const firmPatterns = [
      /\b[A-Z][a-z]+,?\s+[A-Z][a-z]+\s*&\s*[A-Z][a-z]+\s*(LLP|LLC|P\.?C\.?|P\.?A\.?)\b/g,
      /\b[A-Z][a-z]+\s+Law\s+(Firm|Group|Office|Offices)\b/gi,
      /\b[A-Z][a-z]+,?\s+[A-Z][a-z]+,?\s+and\s+[A-Z][a-z]+\b/g
    ];

    firmPatterns.forEach(pattern => {
      matches.push(...this.findMatches(text, pattern, PIIType.ATTORNEY_NAME, 0.7));
    });

    return matches;
  }

  /**
   * Detect attorney-client privilege markers
   */
  private detectPrivilegeMarkers(text: string): PIIMatch[] {
    const matches: PIIMatch[] = [];

    this.privilegeIndicators.forEach(indicator => {
      const pattern = new RegExp(`\\b${indicator}\\b`, 'gi');
      const privilegeMatches = this.findMatches(text, pattern, PIIType.ATTORNEY_CLIENT_PRIVILEGE, 0.95);

      // Mark these as legally privileged
      privilegeMatches.forEach(match => {
        match.isLegalPrivileged = true;
      });

      matches.push(...privilegeMatches);
    });

    // Additional privilege patterns
    const privilegePatterns = [
      /\bThis\s+communication\s+is\s+privileged\b/gi,
      /\bConfidential\s+Attorney[\s-]Client\s+Communication\b/gi,
      /\bPrivileged\s+and\s+Confidential\b/gi,
      /\bWork\s+Product\s+Protection\b/gi
    ];

    privilegePatterns.forEach(pattern => {
      const privilegeMatches = this.findMatches(text, pattern, PIIType.ATTORNEY_CLIENT_PRIVILEGE, 0.9);
      privilegeMatches.forEach(match => {
        match.isLegalPrivileged = true;
      });
      matches.push(...privilegeMatches);
    });

    return matches;
  }

  /**
   * Detect docket numbers
   */
  private detectDocketNumbers(text: string): PIIMatch[] {
    const matches: PIIMatch[] = [];

    const docketPatterns = [
      // Docket No. 12345
      /\bDocket\s+No\.?\s*\d{4,6}\b/gi,
      // Dkt. 12345
      /\bDkt\.?\s*\d{4,6}\b/gi,
      // Document 123
      /\bDocument\s+\d{1,4}\b/gi,
      // ECF No. 123
      /\bECF\s+No\.?\s*\d{1,4}\b/gi
    ];

    docketPatterns.forEach(pattern => {
      matches.push(...this.findMatches(text, pattern, PIIType.DOCKET_NUMBER, 0.85));
    });

    return matches;
  }

  /**
   * Detect attorney bar numbers
   */
  private detectBarNumbers(text: string): PIIMatch[] {
    const matches: PIIMatch[] = [];

    const barPatterns = [
      // State Bar No. 123456
      /\b(?:State\s+)?Bar\s+No\.?\s*\d{4,8}\b/gi,
      // Attorney ID: 123456
      /\bAttorney\s+ID:?\s*\d{4,8}\b/gi,
      // License No. 123456
      /\bLicense\s+No\.?\s*\d{4,8}\b/gi,
      // Admission No. 123456
      /\bAdmission\s+No\.?\s*\d{4,8}\b/gi
    ];

    barPatterns.forEach(pattern => {
      matches.push(...this.findMatches(text, pattern, PIIType.BAR_NUMBER, 0.9));
    });

    return matches;
  }

  /**
   * Detect legal citations
   */
  private detectLegalCitations(text: string): PIIMatch[] {
    const matches: PIIMatch[] = [];

    const citationPatterns = [
      // Federal Reporter: 123 F.3d 456
      /\b\d{1,3}\s+F\.?\d*d\s+\d{1,4}\b/g,
      // Supreme Court: 123 U.S. 456
      /\b\d{1,3}\s+U\.?S\.?\s+\d{1,4}\b/g,
      // Federal Supplement: 123 F.Supp.2d 456
      /\b\d{1,3}\s+F\.?\s?Supp\.?\d*d?\s+\d{1,4}\b/g,
      // State reporters: 123 Cal.App.4th 456
      /\b\d{1,3}\s+[A-Z][a-z]+\.?(?:App\.?)?\d*(?:th|d)?\s+\d{1,4}\b/g
    ];

    citationPatterns.forEach(pattern => {
      matches.push(...this.findMatches(text, pattern, PIIType.CASE_NUMBER, 0.8));
    });

    return matches;
  }

  /**
   * Find pattern matches with specific type
   */
  private findMatches(text: string, pattern: RegExp, type: PIIType, confidence: number): PIIMatch[] {
    const matches: PIIMatch[] = [];
    let match;

    while ((match = pattern.exec(text)) !== null) {
      matches.push({
        type,
        text: match[0],
        start: match.index,
        end: match.index + match[0].length,
        confidence,
        hash: '' // Will be filled by PIIDetector
      });
    }

    return matches;
  }

  /**
   * Analyze legal context from text
   */
  public analyzeLegalContext(text: string): LegalContext | null {
    const federalIndicators = this.federalCourtNames.some(court =>
      text.toLowerCase().includes(court.toLowerCase())
    );

    const stateIndicators = this.stateCourtIndicators.some(court =>
      text.toLowerCase().includes(court.toLowerCase())
    );

    if (!federalIndicators && !stateIndicators) {
      return null;
    }

    // Determine practice areas based on keywords
    const practiceAreas: string[] = [];

    const practiceKeywords = {
      'criminal': ['criminal', 'prosecution', 'defendant', 'indictment', 'plea'],
      'civil': ['plaintiff', 'damages', 'complaint', 'discovery'],
      'corporate': ['merger', 'acquisition', 'securities', 'compliance'],
      'family': ['custody', 'divorce', 'alimony', 'adoption'],
      'bankruptcy': ['bankruptcy', 'debtor', 'creditor', 'discharge'],
      'intellectual_property': ['patent', 'trademark', 'copyright', 'infringement'],
      'employment': ['discrimination', 'wrongful termination', 'harassment'],
      'real_estate': ['property', 'deed', 'mortgage', 'lease']
    };

    Object.entries(practiceKeywords).forEach(([area, keywords]) => {
      if (keywords.some(keyword => text.toLowerCase().includes(keyword))) {
        practiceAreas.push(area);
      }
    });

    return {
      jurisdiction: federalIndicators ? 'federal' : 'state',
      courtLevel: federalIndicators ? 'federal' : 'state',
      practiceArea: practiceAreas
    };
  }

  /**
   * Get privilege risk assessment
   */
  public assessPrivilegeRisk(text: string): {
    hasPrivilegeMarkers: boolean;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    recommendations: string[];
  } {
    const privilegeMatches = this.detectPrivilegeMarkers(text);
    const hasPrivilegeMarkers = privilegeMatches.length > 0;

    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    const recommendations: string[] = [];

    if (hasPrivilegeMarkers) {
      riskLevel = 'critical';
      recommendations.push('Document contains attorney-client privileged content');
      recommendations.push('Restrict access to authorized personnel only');
      recommendations.push('Consider redaction before sharing');
      recommendations.push('Ensure secure storage and transmission');
    }

    const legalMatches = this.detectLegalPII(text);
    if (legalMatches.length > 3) {
      riskLevel = riskLevel === 'critical' ? 'critical' : 'high';
      recommendations.push('Multiple legal identifiers detected');
      recommendations.push('Review for sensitive case information');
    }

    return {
      hasPrivilegeMarkers,
      riskLevel,
      recommendations
    };
  }
}

export default LegalPIIPatterns;