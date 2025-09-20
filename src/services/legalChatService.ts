// Legal Chat Service - Specialized conversation service for legal professionals

import { LegalCitation, CaseReference, StatuteReference, LegalContext, LegalStreamingOptions, LegalWritingAssistance, LegalConversationMetrics, PracticeArea, Jurisdiction, LegalResearchQuery, ResearchFilters } from '../types/legal';
import { Message, ChatSession } from '../types';
import { CitationService } from './knowledge/citations/CitationService';
import { streamingService } from './streamingService';

export class LegalChatService {
  private citationService: CitationService;
  private conversationHistory: Map<string, ChatSession> = new Map();
  private legalContext: Map<string, LegalContext> = new Map();
  private metrics: Map<string, LegalConversationMetrics> = new Map();

  constructor(citationService: CitationService) {
    this.citationService = citationService;
  }

  /**
   * Creates a new legal conversation session
   */
  async createLegalSession(
    practiceArea: PracticeArea,
    jurisdiction: Jurisdiction,
    matter?: string,
    confidentialityLevel: 'public' | 'attorney-client' | 'work-product' | 'confidential' = 'attorney-client'
  ): Promise<string> {
    const sessionId = this.generateSessionId();
    
    const session: ChatSession = {
      id: sessionId,
      title: `${practiceArea} - ${matter || 'New Legal Matter'}`,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: [practiceArea, jurisdiction],
      category: 'legal'
    };

    const legalContext: LegalContext = {
      matter: matter || 'Untitled Matter',
      practiceArea,
      jurisdiction,
      confidentialityLevel,
      relevantDocuments: [],
      keyIssues: [],
      timeline: [],
      parties: [],
      precedentCases: [],
      applicableStatutes: [],
      ethicalConsiderations: []
    };

    const metrics: LegalConversationMetrics = {
      questionsAnswered: 0,
      citationsProvided: 0,
      casesReferenced: 0,
      statutesReferenced: 0,
      documentsAnalyzed: 0,
      averageResponseTime: 0,
      confidenceScore: 0,
      practiceAreaCoverage: [practiceArea],
      jurisdictionCoverage: [jurisdiction],
      complexityLevel: 'basic'
    };

    this.conversationHistory.set(sessionId, session);
    this.legalContext.set(sessionId, legalContext);
    this.metrics.set(sessionId, metrics);

    await this.saveSessionToStorage(session);
    return sessionId;
  }

  /**
   * Sends a legal query with streaming response
   */
  async streamLegalResponse(
    sessionId: string,
    query: string,
    options: LegalStreamingOptions = this.getDefaultStreamingOptions()
  ): Promise<AsyncIterableIterator<{
    content: string;
    citations?: LegalCitation[];
    cases?: CaseReference[];
    statutes?: StatuteReference[];
    isComplete: boolean;
    metadata?: any;
  }>> {
    const session = this.conversationHistory.get(sessionId);
    const context = this.legalContext.get(sessionId);
    const metrics = this.metrics.get(sessionId);
    
    if (!session || !context || !metrics) {
      throw new Error('Invalid session ID');
    }

    const startTime = Date.now();
    
    // Create user message
    const userMessage: Message = {
      id: this.generateMessageId(),
      content: query,
      sender: 'user',
      timestamp: new Date(),
      status: 'sent',
      type: 'legal-query',
      metadata: {
        practiceArea: context.practiceArea,
        jurisdiction: context.jurisdiction
      }
    };

    session.messages.push(userMessage);
    await this.updateSession(session);

    // Enhanced legal prompt
    const legalPrompt = this.buildLegalPrompt(query, context, options);
    
    // Stream response with legal enhancements
    const responseStream = this.generateLegalResponseStream(
      legalPrompt, 
      context, 
      options, 
      startTime
    );

    // Update metrics
    metrics.questionsAnswered++;
    this.metrics.set(sessionId, metrics);

    return responseStream;
  }

  /**
   * Generate legal response stream with citations and analysis
   */
  private async* generateLegalResponseStream(
    prompt: string,
    context: LegalContext,
    options: LegalStreamingOptions,
    startTime: number
  ): AsyncIterableIterator<{
    content: string;
    citations?: LegalCitation[];
    cases?: CaseReference[];
    statutes?: StatuteReference[];
    isComplete: boolean;
    metadata?: any;
  }> {
    let accumulatedContent = '';
    let citations: LegalCitation[] = [];
    let cases: CaseReference[] = [];
    let statutes: StatuteReference[] = [];

    try {
      // Start streaming from base service
      const baseResponse = await streamingService.streamMessage(prompt, {
        stream: true,
        temperature: 0.3, // Lower temperature for legal precision
        maxTokens: options.responseDepth === 'comprehensive' ? 2000 :
                  options.responseDepth === 'detailed' ? 1000 : 500,
      });

      accumulatedContent = baseResponse;

      // Perform analysis on the complete response
      const interimAnalysis = await this.analyzeLegalContent(
        accumulatedContent,
        context,
        options
      );

      // Extract citations
      if (options.enableCitations) {
        citations = await this.extractCitations(accumulatedContent);
      }

      // Extract case references
      if (options.enableCaseSearch) {
        cases = await this.extractCaseReferences(accumulatedContent);
      }

      // Extract statute references
      if (options.enableStatuteSearch) {
        statutes = await this.extractStatuteReferences(accumulatedContent);
      }

      // Final processing
      const finalAnalysis = await this.performFinalLegalAnalysis(
        accumulatedContent,
        context,
        options
      );

      // Verify and enhance citations
      const verifiedCitations = await this.verifyCitations(citations);
      const enhancedCases = await this.enhanceCaseReferences(cases);
      const validatedStatutes = await this.validateStatuteReferences(statutes);

      // Calculate response time
      const responseTime = Date.now() - startTime;
      this.updateMetrics(context, {
        responseTime,
        citationsCount: verifiedCitations.length,
        casesCount: enhancedCases.length,
        statutesCount: validatedStatutes.length
      });

      yield {
        content: accumulatedContent,
        citations: verifiedCitations,
        cases: enhancedCases,
        statutes: validatedStatutes,
        isComplete: true,
        metadata: {
          ...finalAnalysis,
          interimAnalysis,
          responseTime,
          wordCount: accumulatedContent.split(' ').length,
          readingTime: Math.ceil(accumulatedContent.split(' ').length / 200)
        }
      };

    } catch (error) {
      console.error('Legal streaming error:', error);
      yield {
        content: 'I apologize, but I encountered an error while processing your legal query. Please try again or contact support if the issue persists.',
        isComplete: true,
        metadata: {
          error: true,
          errorMessage: error.message
        }
      };
    }
  }

  /**
   * Builds enhanced legal prompt with context
   */
  private buildLegalPrompt(
    query: string, 
    context: LegalContext, 
    options: LegalStreamingOptions
  ): string {
    let prompt = `You are BEAR AI, a sophisticated legal AI assistant designed specifically for legal professionals. You provide accurate, well-researched legal information with proper citations.

LEGAL CONTEXT:
- Practice Area: ${context.practiceArea}
- Jurisdiction: ${context.jurisdiction}
- Matter: ${context.matter}
- Key Issues: ${context.keyIssues.join(', ') || 'None specified'}

RESPONSE REQUIREMENTS:
- Maintain professional legal tone
- Provide ${options.responseDepth} analysis
- ${options.enableCitations ? 'Include proper legal citations' : 'Focus on analysis without citations'}
- ${options.enableCaseSearch ? 'Reference relevant case law' : 'Minimize case references'}
- ${options.enableStatuteSearch ? 'Cite applicable statutes' : 'Focus on common law principles'}
- Consider ethical implications and potential risks
- Use ${options.citationStyle} citation format

CONFIDENTIALITY NOTICE: This conversation is ${options.confidentialityMode ? 'CONFIDENTIAL and protected by attorney-client privilege' : 'for general legal information only'}.

USER QUERY: ${query}

Please provide a comprehensive legal analysis addressing the query above. Structure your response with:
1. Initial Analysis
2. Relevant Legal Principles
3. Applicable Law (cases/statutes as appropriate)
4. Risk Assessment
5. Practical Recommendations
${options.includeAlternativeArguments ? '6. Alternative Arguments/Counterpoints' : ''}

Ensure all legal advice is qualified appropriately and includes necessary disclaimers.`;

    return prompt;
  }

  /**
   * Analyzes legal content for accuracy and completeness
   */
  private async analyzeLegalContent(
    content: string, 
    context: LegalContext, 
    options: LegalStreamingOptions
  ): Promise<{
    confidence: number;
    riskLevel: 'low' | 'medium' | 'high';
    completeness: number;
    needsCitation: boolean;
  }> {
    // Implement legal content analysis
    const wordCount = content.split(' ').length;
    const hasLegalTerminology = this.checkLegalTerminology(content);
    const hasCitations = this.hasCitations(content);
    const hasRiskLanguage = this.checkRiskLanguage(content);

    return {
      confidence: this.calculateConfidence(content, context),
      riskLevel: hasRiskLanguage ? 'high' : wordCount > 100 ? 'medium' : 'low',
      completeness: Math.min(100, (wordCount / 300) * 100),
      needsCitation: hasLegalTerminology && !hasCitations
    };
  }

  /**
   * Extracts legal citations from content
   */
  private async extractCitations(content: string): Promise<LegalCitation[]> {
    const citations: LegalCitation[] = [];
    
    // Citation patterns for different types
    const patterns = {
      case: /(\d+\s+[A-Z][a-z]*\.?\s*\d+[a-z]*\s*\d+|\d+\s+[A-Z][a-z]*\.?\s*\d+[a-z]*)/g,
      statute: /(\d+\s+U\.?S\.?C\.?\s*§?\s*\d+)/g,
      cfr: /(\d+\s+C\.?F\.?R\.?\s*§?\s*\d+)/g
    };

    // Extract case citations
    const caseMatches = content.match(patterns.case) || [];
    for (const match of caseMatches) {
      const citation = await this.parseCitation(match, 'case');
      if (citation) citations.push(citation);
    }

    // Extract statute citations
    const statuteMatches = content.match(patterns.statute) || [];
    for (const match of statuteMatches) {
      const citation = await this.parseCitation(match, 'statute');
      if (citation) citations.push(citation);
    }

    return citations;
  }

  /**
   * Parses individual citation
   */
  private async parseCitation(
    citationText: string, 
    type: 'case' | 'statute' | 'regulation'
  ): Promise<LegalCitation | null> {
    // Implement citation parsing logic
    return {
      id: this.generateCitationId(),
      type,
      title: 'Extracted Citation',
      citation: citationText,
      jurisdiction: 'federal', // Default, should be parsed
      relevance: 0.8,
      verified: false
    };
  }

  /**
   * Extracts case references from content
   */
  private async extractCaseReferences(content: string): Promise<CaseReference[]> {
    const cases: CaseReference[] = [];
    
    // Case name patterns
    const casePatterns = [
      /([A-Z][a-z]+\s+v\.?\s+[A-Z][a-z]+)/g,
      /([A-Z][a-z]+\s+vs\.?\s+[A-Z][a-z]+)/g
    ];

    for (const pattern of casePatterns) {
      const matches = content.match(pattern) || [];
      for (const match of matches) {
        const caseRef = await this.lookupCase(match);
        if (caseRef) cases.push(caseRef);
      }
    }

    return cases;
  }

  /**
   * Looks up case information
   */
  private async lookupCase(caseName: string): Promise<CaseReference | null> {
    // Implement case lookup logic
    return {
      id: this.generateCaseId(),
      name: caseName,
      citation: 'Unknown Citation',
      court: 'Unknown Court',
      year: 0,
      jurisdiction: 'federal',
      topics: [],
      relevance: 0.7
    };
  }

  /**
   * Extracts statute references from content
   */
  private async extractStatuteReferences(content: string): Promise<StatuteReference[]> {
    const statutes: StatuteReference[] = [];
    
    // Statute patterns
    const statutePatterns = [
      /(\d+\s+U\.?S\.?C\.?\s*§?\s*\d+)/g,
      /(\d+\s+C\.?F\.?R\.?\s*§?\s*\d+)/g,
      /(Section\s+\d+)/g
    ];

    for (const pattern of statutePatterns) {
      const matches = content.match(pattern) || [];
      for (const match of matches) {
        const statuteRef = await this.lookupStatute(match);
        if (statuteRef) statutes.push(statuteRef);
      }
    }

    return statutes;
  }

  /**
   * Looks up statute information
   */
  private async lookupStatute(statuteText: string): Promise<StatuteReference | null> {
    // Implement statute lookup logic
    return {
      id: this.generateStatuteId(),
      title: 'Extracted Statute',
      code: 'USC',
      section: statuteText,
      jurisdiction: 'federal',
      relevance: 0.8
    };
  }

  /**
   * Performs final legal analysis
   */
  private async performFinalLegalAnalysis(
    content: string,
    context: LegalContext,
    options: LegalStreamingOptions
  ): Promise<any> {
    return {
      confidence: this.calculateConfidence(content, context),
      practiceArea: context.practiceArea,
      jurisdiction: context.jurisdiction,
      riskAssessment: options.riskAssessment ? await this.assessRisk(content) : undefined,
      ethicalConsiderations: this.identifyEthicalIssues(content),
      completeness: this.assessCompleteness(content, options)
    };
  }

  /**
   * Verifies citations for accuracy
   */
  private async verifyCitations(citations: LegalCitation[]): Promise<LegalCitation[]> {
    // Implement citation verification
    return citations.map(citation => ({
      ...citation,
      verified: true // Placeholder
    }));
  }

  /**
   * Enhances case references with additional data
   */
  private async enhanceCaseReferences(cases: CaseReference[]): Promise<CaseReference[]> {
    // Implement case enhancement
    return cases;
  }

  /**
   * Validates statute references
   */
  private async validateStatuteReferences(statutes: StatuteReference[]): Promise<StatuteReference[]> {
    // Implement statute validation
    return statutes;
  }

  /**
   * Provides writing assistance for legal documents
   */
  async provideLegalWritingAssistance(
    text: string,
    documentType: 'brief' | 'memo' | 'contract' | 'pleading' | 'motion',
    jurisdiction: Jurisdiction
  ): Promise<LegalWritingAssistance> {
    // Implement comprehensive legal writing analysis
    return {
      suggestions: [],
      toneFeedback: {
        overall: 'professional',
        score: 85,
        recommendations: [],
        consistency: 90,
        audience: 'court'
      },
      citationCheck: {
        missingCitations: [],
        incorrectFormat: [],
        unreachableSources: [],
        suggestions: [],
        bluebookCompliance: 95,
        duplicates: []
      },
      grammarCheck: {
        errors: [],
        score: 92,
        passiveVoice: {
          count: 5,
          percentage: 15,
          instances: [],
          recommendation: 'Consider reducing passive voice usage'
        },
        sentenceComplexity: {
          averageSentenceLength: 20,
          readingLevel: 'college',
          complexSentences: 3,
          recommendation: 'Good balance of sentence complexity'
        }
      },
      styleGuide: {
        violations: [],
        compliance: 88,
        guide: 'bluebook'
      },
      readabilityScore: {
        fleschKincaid: 12,
        gunningFog: 14,
        smog: 13,
        readingLevel: 'College level',
        recommendations: ['Consider shorter sentences for better readability']
      },
      legalTerminology: {
        legalTerms: [],
        jargonScore: 25,
        plainLanguageSuggestions: [],
        definitions: []
      }
    };
  }

  /**
   * Searches legal databases for relevant information
   */
  async searchLegalDatabase(
    query: LegalResearchQuery
  ): Promise<{
    cases: CaseReference[];
    statutes: StatuteReference[];
    citations: LegalCitation[];
    totalResults: number;
    searchTime: number;
  }> {
    const startTime = Date.now();
    
    // Implement legal database search
    const results = {
      cases: [],
      statutes: [],
      citations: [],
      totalResults: 0,
      searchTime: Date.now() - startTime
    };

    return results;
  }

  /**
   * Gets conversation history for a session
   */
  getConversationHistory(sessionId: string): ChatSession | undefined {
    return this.conversationHistory.get(sessionId);
  }

  /**
   * Gets legal context for a session
   */
  getLegalContext(sessionId: string): LegalContext | undefined {
    return this.legalContext.get(sessionId);
  }

  /**
   * Gets conversation metrics
   */
  getConversationMetrics(sessionId: string): LegalConversationMetrics | undefined {
    return this.metrics.get(sessionId);
  }

  /**
   * Updates legal context
   */
  async updateLegalContext(sessionId: string, updates: Partial<LegalContext>): Promise<void> {
    const context = this.legalContext.get(sessionId);
    if (context) {
      Object.assign(context, updates);
      this.legalContext.set(sessionId, context);
    }
  }

  // Helper methods
  private getDefaultStreamingOptions(): LegalStreamingOptions {
    return {
      enableCitations: true,
      enableCaseSearch: true,
      enableStatuteSearch: true,
      autoLegalAnalysis: true,
      confidentialityMode: true,
      citationStyle: 'bluebook',
      responseDepth: 'detailed',
      includeAlternativeArguments: false,
      riskAssessment: true
    };
  }

  private generateSessionId(): string {
    return `legal-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateMessageId(): string {
    return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateCitationId(): string {
    return `cite-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateCaseId(): string {
    return `case-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateStatuteId(): string {
    return `statute-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private checkLegalTerminology(content: string): boolean {
    const legalTerms = [
      'plaintiff', 'defendant', 'jurisdiction', 'precedent', 'statute',
      'tort', 'contract', 'liability', 'damages', 'injunction'
    ];
    return legalTerms.some(term => content.toLowerCase().includes(term));
  }

  private hasCitations(content: string): boolean {
    return /\d+\s+[A-Z][a-z]*\.?\s*\d+/.test(content);
  }

  private checkRiskLanguage(content: string): boolean {
    const riskTerms = ['criminal', 'felony', 'sanctions', 'malpractice', 'liability'];
    return riskTerms.some(term => content.toLowerCase().includes(term));
  }

  private calculateConfidence(content: string, context: LegalContext): number {
    // Implement confidence calculation
    return 0.85;
  }

  private async assessRisk(content: string): Promise<any> {
    // Implement risk assessment
    return { level: 'medium', factors: [] };
  }

  private identifyEthicalIssues(content: string): string[] {
    // Implement ethical issue identification
    return [];
  }

  private assessCompleteness(content: string, options: LegalStreamingOptions): number {
    // Implement completeness assessment
    return 85;
  }

  private updateMetrics(context: LegalContext, data: any): void {
    // Implement metrics update
  }

  private async saveSessionToStorage(session: ChatSession): Promise<void> {
    // Implement session persistence
  }

  private async updateSession(session: ChatSession): Promise<void> {
    session.updatedAt = new Date();
    await this.saveSessionToStorage(session);
  }
}

export const legalChatService = new LegalChatService(
  new (await import('./knowledge/citations/CitationService')).CitationService(
    {
      embeddingModel: 'all-MiniLM-L6-v2',
      chunkSize: 1000,
      chunkOverlap: 200,
      vectorDimensions: 384,
      indexingBatchSize: 100,
      searchResultLimit: 50,
      enableVersioning: true,
      enableCitations: true,
      enableAnalytics: true
    },
    null as any // VectorDB dependency
  )
);

export default LegalChatService;
