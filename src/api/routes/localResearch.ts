// Local research routes - Tauri-only implementation
// This replaces HTTP-based research routes with local Tauri commands

import { localApiClient, LocalSearchQuery } from '../localClient';

/**
 * Local research service using Tauri commands instead of HTTP endpoints
 * All research operations happen locally without external server dependencies
 */
export class LocalResearchService {
  private static instance: LocalResearchService;
  private localLegalDatabase: LocalLegalDatabase;

  private constructor() {
    this.localLegalDatabase = new LocalLegalDatabase();
  }

  static getInstance(): LocalResearchService {
    if (!LocalResearchService.instance) {
      LocalResearchService.instance = new LocalResearchService();
    }
    return LocalResearchService.instance;
  }

  /**
   * Perform legal research using local databases
   */
  async search(query: LocalSearchQuery): Promise<{
    results: Array<{
      id: string;
      title: string;
      type: 'case' | 'statute' | 'regulation' | 'secondary';
      jurisdiction: string;
      date: string;
      relevance: number;
      summary: string;
      citation: string;
      url?: string;
    }>;
    total: number;
    processing_time_ms: number;
    local_search: boolean;
  }> {
    if (!localApiClient.isAuthenticated()) {
      throw new Error('User not authenticated');
    }

    const startTime = Date.now();

    try {
      // Use Tauri command for backend search
      const tauriResult = await localApiClient.searchResearch(query);
      
      // Enhance with local database search
      const localResults = await this.localLegalDatabase.search(query.query, query.filters);
      
      const processingTime = Date.now() - startTime;

      return {
        results: localResults,
        total: localResults.length,
        processing_time_ms: processingTime,
        local_search: true
      };
    } catch (error) {
      console.error('Failed to perform research search:', error);
      throw error;
    }
  }

  /**
   * Get case law suggestions based on query
   */
  async getCaseLawSuggestions(query: string, jurisdiction?: string): Promise<Array<{
    citation: string;
    title: string;
    court: string;
    date: string;
    relevance: number;
  }>> {
    return this.localLegalDatabase.getCaseLaw(query, jurisdiction);
  }

  /**
   * Get statute suggestions based on query
   */
  async getStatuteSuggestions(query: string, jurisdiction?: string): Promise<Array<{
    citation: string;
    title: string;
    section: string;
    jurisdiction: string;
    relevance: number;
  }>> {
    return this.localLegalDatabase.getStatutes(query, jurisdiction);
  }

  /**
   * Get legal citations and formatting
   */
  async formatCitation(
    type: 'case' | 'statute' | 'regulation' | 'secondary',
    data: Record<string, string>
  ): Promise<{
    bluebook: string;
    alwd: string;
    chicago: string;
  }> {
    return this.localLegalDatabase.formatCitation(type, data);
  }

  /**
   * Get legal research templates
   */
  async getResearchTemplates(): Promise<Array<{
    id: string;
    name: string;
    description: string;
    category: string;
    template: string;
  }>> {
    return [
      {
        id: 'case_brief_template',
        name: 'Case Brief Template',
        description: 'Standard template for case analysis and briefing',
        category: 'litigation',
        template: `# Case Brief: [Case Name]

## Citation
[Full citation in proper format]

## Facts
[Key facts of the case]

## Issues
[Legal issues presented]

## Holding
[Court's decision]

## Reasoning
[Court's rationale]

## Significance
[Legal precedent and implications]`
      },
      {
        id: 'statute_analysis',
        name: 'Statute Analysis Template',
        description: 'Framework for statutory research and analysis',
        category: 'regulatory',
        template: `# Statutory Analysis: [Statute Name]

## Citation
[Statutory citation]

## Purpose
[Legislative intent and purpose]

## Key Provisions
[Important sections and subsections]

## Elements
[Required elements for application]

## Exceptions
[Statutory exceptions and limitations]

## Related Authorities
[Cross-references and related statutes]

## Case Law
[Relevant interpretive cases]`
      },
      {
        id: 'legal_memo',
        name: 'Legal Memorandum Template',
        description: 'Standard legal memo format for research presentation',
        category: 'writing',
        template: `# Legal Memorandum

**TO:** [Client/Recipient]
**FROM:** [Attorney Name]
**DATE:** [Date]
**RE:** [Subject Matter]

## Question Presented
[Legal question in issue format]

## Brief Answer
[Concise answer to the legal question]

## Facts
[Relevant facts for legal analysis]

## Discussion
[Legal analysis with authorities]

## Conclusion
[Summary of legal conclusions]`
      }
    ];
  }
}

/**
 * Local legal database for offline research
 */
class LocalLegalDatabase {
  private caseLawDb: Array<any> = [];
  private statutesDb: Array<any> = [];
  private regulationsDb: Array<any> = [];
  private secondaryDb: Array<any> = [];

  constructor() {
    this.initializeSampleDatabase();
  }

  /**
   * Initialize with sample legal data
   */
  private initializeSampleDatabase(): void {
    // Sample case law data
    this.caseLawDb = [
      {
        id: 'marbury_v_madison',
        title: 'Marbury v. Madison',
        citation: '5 U.S. 137 (1803)',
        court: 'United States Supreme Court',
        date: '1803-02-24',
        jurisdiction: 'Federal',
        type: 'case',
        summary: 'Established the principle of judicial review and the Supreme Court\'s authority to declare laws unconstitutional.',
        keywords: ['judicial review', 'constitutional law', 'separation of powers']
      },
      {
        id: 'miranda_v_arizona',
        title: 'Miranda v. Arizona',
        citation: '384 U.S. 436 (1966)',
        court: 'United States Supreme Court',
        date: '1966-06-13',
        jurisdiction: 'Federal',
        type: 'case',
        summary: 'Required law enforcement to inform suspects of their constitutional rights before interrogation.',
        keywords: ['criminal procedure', 'fifth amendment', 'sixth amendment', 'police interrogation']
      },
      {
        id: 'brown_v_board',
        title: 'Brown v. Board of Education',
        citation: '347 U.S. 483 (1954)',
        court: 'United States Supreme Court',
        date: '1954-05-17',
        jurisdiction: 'Federal',
        type: 'case',
        summary: 'Declared racial segregation in public schools unconstitutional.',
        keywords: ['civil rights', 'education', 'equal protection', 'fourteenth amendment']
      }
    ];

    // Sample statute data
    this.statutesDb = [
      {
        id: 'title_vii',
        title: 'Civil Rights Act - Title VII',
        citation: '42 U.S.C. § 2000e',
        section: 'Title VII',
        jurisdiction: 'Federal',
        type: 'statute',
        summary: 'Prohibits employment discrimination based on race, color, religion, sex, or national origin.',
        keywords: ['employment discrimination', 'civil rights', 'equal opportunity']
      },
      {
        id: 'ada',
        title: 'Americans with Disabilities Act',
        citation: '42 U.S.C. § 12101',
        section: 'Full Act',
        jurisdiction: 'Federal',
        type: 'statute',
        summary: 'Prohibits discrimination against individuals with disabilities in employment, public accommodations, and other areas.',
        keywords: ['disability rights', 'accommodation', 'accessibility']
      }
    ];

    // Sample secondary sources
    this.secondaryDb = [
      {
        id: 'blackstone_commentaries',
        title: 'Commentaries on the Laws of England',
        citation: 'William Blackstone, Commentaries on the Laws of England (1765-1769)',
        type: 'secondary',
        summary: 'Foundational treatise on English common law and legal principles.',
        keywords: ['common law', 'legal history', 'jurisprudence']
      }
    ];
  }

  /**
   * Search across all local legal databases
   */
  async search(query: string, filters?: Record<string, string>): Promise<Array<{
    id: string;
    title: string;
    type: 'case' | 'statute' | 'regulation' | 'secondary';
    jurisdiction: string;
    date: string;
    relevance: number;
    summary: string;
    citation: string;
  }>> {
    const allSources = [
      ...this.caseLawDb,
      ...this.statutesDb,
      ...this.regulationsDb,
      ...this.secondaryDb
    ];

    const queryLower = query.toLowerCase();
    const results = allSources
      .map(source => {
        // Calculate relevance score
        let relevance = 0;
        
        if (source.title.toLowerCase().includes(queryLower)) relevance += 5;
        if (source.summary.toLowerCase().includes(queryLower)) relevance += 3;
        if (source.keywords?.some((keyword: string) => keyword.toLowerCase().includes(queryLower))) relevance += 2;
        if (source.citation.toLowerCase().includes(queryLower)) relevance += 1;
        
        return {
          ...source,
          relevance
        };
      })
      .filter(source => source.relevance > 0)
      .sort((a, b) => b.relevance - a.relevance);

    // Apply filters
    let filteredResults = results;
    
    if (filters?.type) {
      filteredResults = results.filter(r => r.type === filters.type);
    }
    
    if (filters?.jurisdiction) {
      filteredResults = results.filter(r => r.jurisdiction === filters.jurisdiction);
    }

    return filteredResults.map(result => ({
      id: result.id,
      title: result.title,
      type: result.type,
      jurisdiction: result.jurisdiction || 'Unknown',
      date: result.date || '1900-01-01',
      relevance: result.relevance,
      summary: result.summary,
      citation: result.citation
    }));
  }

  /**
   * Get case law specific results
   */
  async getCaseLaw(query: string, jurisdiction?: string): Promise<Array<{
    citation: string;
    title: string;
    court: string;
    date: string;
    relevance: number;
  }>> {
    const results = await this.search(query, { type: 'case', jurisdiction: jurisdiction || 'all' });
    
    return results
      .filter(r => r.type === 'case')
      .map(r => {
        const caseData = this.caseLawDb.find(c => c.id === r.id);
        return {
          citation: r.citation,
          title: r.title,
          court: caseData?.court || 'Unknown Court',
          date: r.date ?? 'Unknown Date',
          relevance: r.relevance
        };
      });
  }

  /**
   * Get statute specific results
   */
  async getStatutes(query: string, jurisdiction?: string): Promise<Array<{
    citation: string;
    title: string;
    section: string;
    jurisdiction: string;
    relevance: number;
  }>> {
    const results = await this.search(query, { type: 'statute', jurisdiction: jurisdiction || 'all' });
    
    return results
      .filter(r => r.type === 'statute')
      .map(r => {
        const statuteData = this.statutesDb.find(s => s.id === r.id);
        return {
          citation: r.citation,
          title: r.title,
          section: statuteData?.section || 'Unknown Section',
          jurisdiction: r.jurisdiction ?? 'Unknown Jurisdiction',
          relevance: r.relevance
        };
      });
  }

  /**
   * Format legal citations
   */
  async formatCitation(
    type: 'case' | 'statute' | 'regulation' | 'secondary',
    data: Record<string, string>
  ): Promise<{
    bluebook: string;
    alwd: string;
    chicago: string;
  }> {
    // Basic citation formatting - in production, use proper citation libraries
    switch (type) {
      case 'case':
        return {
          bluebook: `${data.plaintiff} v. ${data.defendant}, ${data.volume} ${data.reporter} ${data.page} (${data.court} ${data.year}).`,
          alwd: `${data.plaintiff} v. ${data.defendant}, ${data.volume} ${data.reporter} ${data.page} (${data.court} ${data.year}).`,
          chicago: `${data.plaintiff} v. ${data.defendant}, ${data.volume} ${data.reporter} ${data.page} (${data.court} ${data.year}).`
        };
        
      case 'statute':
        return {
          bluebook: `${data.title} § ${data.section} (${data.year}).`,
          alwd: `${data.title} § ${data.section} (${data.year}).`,
          chicago: `${data.title} § ${data.section} (${data.year}).`
        };
        
      default:
        return {
          bluebook: 'Citation format not available',
          alwd: 'Citation format not available',
          chicago: 'Citation format not available'
        };
    }
  }
}

// Export singleton instance
export const localResearchService = LocalResearchService.getInstance();

// Export convenience methods that match the original HTTP API interface
export const research = {
  /**
   * Search legal authorities - replaces POST /research/search
   */
  search: async (query: LocalSearchQuery): Promise<{
    data: {
      results: Array<any>;
      total: number;
      processing_time_ms: number;
      local_search: boolean;
    };
  }> => {
    const result = await localResearchService.search(query);
    return { data: result };
  },

  /**
   * Get case law suggestions
   */
  getCaseLaw: async (query: string, jurisdiction?: string): Promise<{
    data: Array<{
      citation: string;
      title: string;
      court: string;
      date: string;
      relevance: number;
    }>;
  }> => {
    const results = await localResearchService.getCaseLawSuggestions(query, jurisdiction);
    return { data: results };
  },

  /**
   * Get statute suggestions
   */
  getStatutes: async (query: string, jurisdiction?: string): Promise<{
    data: Array<{
      citation: string;
      title: string;
      section: string;
      jurisdiction: string;
      relevance: number;
    }>;
  }> => {
    const results = await localResearchService.getStatuteSuggestions(query, jurisdiction);
    return { data: results };
  },

  /**
   * Format legal citation
   */
  formatCitation: async (
    type: 'case' | 'statute' | 'regulation' | 'secondary',
    data: Record<string, string>
  ): Promise<{
    data: {
      bluebook: string;
      alwd: string;
      chicago: string;
    };
  }> => {
    const result = await localResearchService.formatCitation(type, data);
    return { data: result };
  },

  /**
   * Get research templates
   */
  getTemplates: async (): Promise<{
    data: Array<{
      id: string;
      name: string;
      description: string;
      category: string;
      template: string;
    }>;
  }> => {
    const templates = await localResearchService.getResearchTemplates();
    return { data: templates };
  }
};

export default localResearchService;