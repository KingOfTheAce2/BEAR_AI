// Legal Research Service for case law, statutes, and legal analysis
import { 
  CaseLaw, 
  Statute, 
  Citation, 
  LegalPrecedent, 
  LegalSearchQuery, 
  LegalSearchResult,
  ShepardStatus,
  CitationType 
} from '../../types/legal';

export class LegalResearchService {
  private apiBaseUrl: string;
  private apiKey: string;

  constructor(apiBaseUrl = '/api/legal', apiKey = '') {
    this.apiBaseUrl = apiBaseUrl;
    this.apiKey = apiKey;
  }

  // Case Law Research
  async searchCaseLaw(query: string, jurisdiction?: string[], limit = 20): Promise<CaseLaw[]> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/research/cases/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          query,
          jurisdiction,
          limit,
          includeSummary: true,
          includeShepardization: true
        })
      });

      if (!response.ok) {
        throw new Error(`Case law search failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.cases || [];
    } catch (error) {
      console.error('Error searching case law:', error);
      throw error;
    }
  }

  async getCaseById(caseId: string): Promise<CaseLaw | null> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/research/cases/${caseId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`Failed to fetch case: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching case:', error);
      throw error;
    }
  }

  async getShepardization(citation: string): Promise<ShepardStatus> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/research/shepardize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({ citation })
      });

      if (!response.ok) {
        throw new Error(`Shepardization failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.status || 'good_law';
    } catch (error) {
      console.error('Error getting shepardization:', error);
      return 'good_law'; // Default to good law if verification fails
    }
  }

  // Statute Research
  async searchStatutes(query: string, jurisdiction?: string[]): Promise<Statute[]> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/research/statutes/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          query,
          jurisdiction,
          includeAmendments: true,
          includeAnnotations: true
        })
      });

      if (!response.ok) {
        throw new Error(`Statute search failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.statutes || [];
    } catch (error) {
      console.error('Error searching statutes:', error);
      throw error;
    }
  }

  async getStatuteById(statuteId: string): Promise<Statute | null> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/research/statutes/${statuteId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`Failed to fetch statute: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching statute:', error);
      throw error;
    }
  }

  // Legal Precedent Analysis
  async analyzePrecedents(factPattern: string, legalIssue: string): Promise<LegalPrecedent[]> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/research/precedents/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          factPattern,
          legalIssue,
          includeDistinguishingFactors: true,
          includeSimilarCases: true
        })
      });

      if (!response.ok) {
        throw new Error(`Precedent analysis failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.precedents || [];
    } catch (error) {
      console.error('Error analyzing precedents:', error);
      throw error;
    }
  }

  async findSimilarCases(caseId: string, threshold = 0.7): Promise<CaseLaw[]> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/research/cases/${caseId}/similar`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) {
        throw new Error(`Similar cases search failed: ${response.statusText}`);
      }

      const data = await response.json();
      return (data.cases || []).filter((c: any) => c.similarityScore >= threshold);
    } catch (error) {
      console.error('Error finding similar cases:', error);
      throw error;
    }
  }

  // Citation Management
  async verifyCitation(citation: Citation): Promise<{ verified: boolean; corrections?: string[] }> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/research/citations/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(citation)
      });

      if (!response.ok) {
        throw new Error(`Citation verification failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error verifying citation:', error);
      return { verified: false, corrections: ['Unable to verify citation'] };
    }
  }

  async formatCitation(citation: Citation, format: 'bluebook' | 'alwd' | 'apa'): Promise<string> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/research/citations/format`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({ citation, format })
      });

      if (!response.ok) {
        throw new Error(`Citation formatting failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.formattedCitation || citation.fullCitation;
    } catch (error) {
      console.error('Error formatting citation:', error);
      return citation.fullCitation;
    }
  }

  async extractCitations(text: string): Promise<Citation[]> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/research/citations/extract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({ text })
      });

      if (!response.ok) {
        throw new Error(`Citation extraction failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.citations || [];
    } catch (error) {
      console.error('Error extracting citations:', error);
      return [];
    }
  }

  // Advanced Search
  async performAdvancedSearch(searchQuery: LegalSearchQuery): Promise<LegalSearchResult[]> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/research/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(searchQuery)
      });

      if (!response.ok) {
        throw new Error(`Advanced search failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error('Error performing advanced search:', error);
      throw error;
    }
  }

  // Legal Research Templates
  async getResearchTemplate(type: 'case_brief' | 'memo' | 'issue_spotting'): Promise<string> {
    const templates = {
      case_brief: `
CASE BRIEF TEMPLATE

Case Name: [Case Name]
Citation: [Full Citation]
Court: [Court Name]
Date: [Decision Date]

FACTS:
[Relevant facts that led to the legal dispute]

PROCEDURAL HISTORY:
[How the case progressed through the courts]

ISSUE(S):
[Legal question(s) the court had to decide]

HOLDING:
[Court's answer to the legal question(s)]

REASONING:
[Court's legal reasoning and analysis]

RULE/PRECEDENT:
[Legal rule or precedent established]

SIGNIFICANCE:
[Why this case is important/how it affects the law]
      `,
      memo: `
LEGAL MEMORANDUM TEMPLATE

TO: [Client/Supervisor]
FROM: [Attorney Name]
DATE: [Date]
RE: [Brief description of legal issue]

EXECUTIVE SUMMARY
[Brief overview of the issue and conclusion]

QUESTION PRESENTED
[Concise statement of the legal question]

SHORT ANSWER
[Direct answer to the question presented]

STATEMENT OF FACTS
[Relevant facts in chronological order]

DISCUSSION
[Detailed legal analysis with citations]

CONCLUSION
[Summary of analysis and recommendations]
      `,
      issue_spotting: `
ISSUE SPOTTING ANALYSIS

FACT PATTERN REVIEW:
[Identify all relevant facts]

POTENTIAL LEGAL ISSUES:
1. [Issue 1 - with brief explanation]
2. [Issue 2 - with brief explanation]
3. [Issue 3 - with brief explanation]

APPLICABLE LAW:
[Relevant statutes, regulations, case law]

ANALYSIS:
[Apply law to facts for each issue]

RISK ASSESSMENT:
[Evaluate likelihood and impact of each issue]

RECOMMENDATIONS:
[Suggested actions or further research needed]
      `
    };

    return templates[type] || '';
  }

  // AI-Powered Research Assistance
  async generateResearchStrategy(legalIssue: string, jurisdiction: string): Promise<string[]> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/research/ai/strategy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({ legalIssue, jurisdiction })
      });

      if (!response.ok) {
        throw new Error(`Research strategy generation failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.strategy || [];
    } catch (error) {
      console.error('Error generating research strategy:', error);
      return [
        'Identify primary legal issue and applicable jurisdiction',
        'Search for controlling statutes and regulations',
        'Find relevant case law in the jurisdiction',
        'Look for recent developments or amendments',
        'Check secondary sources for analysis',
        'Verify currency of all sources'
      ];
    }
  }

  async summarizeCase(caseId: string): Promise<string> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/research/ai/summarize/${caseId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) {
        throw new Error(`Case summarization failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.summary || 'Summary not available';
    } catch (error) {
      console.error('Error summarizing case:', error);
      throw error;
    }
  }
}

export default LegalResearchService;