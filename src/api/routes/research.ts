// Legal research routes
import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { searchValidation } from '../middleware/validation';
import { searchRateLimit } from '../middleware/rateLimit';
import { successResponse, asyncHandler } from '../middleware/errorHandler';

export const researchRoutes = Router();

// All research routes require authentication
researchRoutes.use(authenticateToken);
researchRoutes.use(searchRateLimit);

/**
 * @swagger
 * /research/search:
 *   post:
 *     tags: [Research]
 *     summary: Search legal resources
 *     description: Search case law, statutes, and regulations
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [query]
 *             properties:
 *               query:
 *                 type: string
 *                 maxLength: 500
 *               filters:
 *                 type: object
 *                 properties:
 *                   type:
 *                     type: array
 *                     items:
 *                       type: string
 *                       enum: [document, case, statute, regulation]
 *                   jurisdiction:
 *                     type: string
 *                   dateRange:
 *                     type: object
 *                     properties:
 *                       from:
 *                         type: string
 *                         format: date
 *                       to:
 *                         type: string
 *                         format: date
 *               limit:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 100
 *                 default: 20
 *     responses:
 *       200:
 *         description: Search results retrieved successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 */
researchRoutes.post('/search',
  searchValidation,
  asyncHandler(async (req, res) => {
    const { query, filters = {}, limit = 20, offset = 0 } = req.body;
    
    // Simulate search with mock data
    const mockResults = await performLegalSearch(query, filters, limit, offset);
    
    successResponse(res, {
      results: mockResults.results,
      total: mockResults.total,
      query,
      filters,
      processingTime: mockResults.processingTime
    });
  })
);

/**
 * @swagger
 * /research/suggestions:
 *   get:
 *     tags: [Research]
 *     summary: Get search suggestions
 *     description: Get suggested search terms and topics
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: q
 *         in: query
 *         schema:
 *           type: string
 *         description: Partial search term
 *     responses:
 *       200:
 *         description: Search suggestions retrieved successfully
 */
researchRoutes.get('/suggestions',
  asyncHandler(async (req, res) => {
    const { q } = req.query;
    
    const suggestions = generateSearchSuggestions(q as string);
    
    successResponse(res, { suggestions });
  })
);

/**
 * Simulate legal research search
 */
async function performLegalSearch(
  query: string,
  filters: any,
  limit: number,
  offset: number
): Promise<{ results: any[]; total: number; processingTime: number }> {
  const startTime = Date.now();
  
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const mockCases = [
    {
      id: 'case_001',
      type: 'case',
      title: 'Smith v. Jones Employment Contract Dispute',
      content: 'This case involves a dispute over employment contract terms and non-compete clauses...',
      relevance: 0.95,
      source: 'Federal Court - 9th Circuit',
      date: '2023-08-15T00:00:00Z',
      preview: 'Key holding: Non-compete clauses must be reasonable in scope and duration to be enforceable.',
      category: 'Employment Law',
      citation: '123 F.3d 456 (9th Cir. 2023)',
      jurisdiction: 'Federal'
    },
    {
      id: 'statute_001',
      type: 'statute',
      title: 'Employment At-Will Doctrine - State Code §123.45',
      content: 'The employment at-will doctrine allows either party to terminate employment without cause...',
      relevance: 0.88,
      source: 'State Labor Code',
      date: '2022-01-01T00:00:00Z',
      preview: 'Establishes the legal framework for employment termination and exceptions.',
      category: 'Employment Law',
      jurisdiction: 'State'
    },
    {
      id: 'case_002',
      type: 'case',
      title: 'ABC Corp v. Worker Union Contract Negotiation',
      content: 'This case establishes precedent for collective bargaining agreements...',
      relevance: 0.82,
      source: 'State Supreme Court',
      date: '2023-06-20T00:00:00Z',
      preview: 'Court ruled on the enforceability of collective bargaining provisions.',
      category: 'Labor Law',
      citation: '456 State 789 (2023)',
      jurisdiction: 'State'
    },
    {
      id: 'regulation_001',
      type: 'regulation',
      title: 'OSHA Workplace Safety Regulations - 29 CFR 1910',
      content: 'Comprehensive workplace safety standards and employer obligations...',
      relevance: 0.75,
      source: 'Code of Federal Regulations',
      date: '2023-03-10T00:00:00Z',
      preview: 'Outlines mandatory safety protocols and compliance requirements.',
      category: 'Workplace Safety',
      jurisdiction: 'Federal'
    },
    {
      id: 'case_003',
      type: 'case',
      title: 'Tech Innovations Inc. v. Former Employee Trade Secrets',
      content: 'Case involving misappropriation of trade secrets by a former employee...',
      relevance: 0.70,
      source: 'Federal District Court',
      date: '2023-11-05T00:00:00Z',
      preview: 'Established standards for proving trade secret misappropriation.',
      category: 'Intellectual Property',
      citation: '789 F.Supp.3d 123 (N.D. Cal. 2023)',
      jurisdiction: 'Federal'
    }
  ];
  
  // Filter results based on query relevance
  let results = mockCases.filter(item => {
    const searchTerms = query.toLowerCase().split(' ');
    const searchableText = `${item.title} ${item.content} ${item.category}`.toLowerCase();
    
    return searchTerms.some(term => searchableText.includes(term));
  });
  
  // Apply filters
  if (filters.type && filters.type.length > 0) {
    results = results.filter(item => filters.type.includes(item.type));
  }
  
  if (filters.jurisdiction) {
    results = results.filter(item => 
      item.jurisdiction.toLowerCase() === filters.jurisdiction.toLowerCase()
    );
  }
  
  if (filters.dateRange) {
    const { from, to } = filters.dateRange;
    if (from || to) {
      results = results.filter(item => {
        const itemDate = new Date(item.date);
        const fromDate = from ? new Date(from) : new Date('1900-01-01');
        const toDate = to ? new Date(to) : new Date();
        
        return itemDate >= fromDate && itemDate <= toDate;
      });
    }
  }
  
  // Sort by relevance
  results.sort((a, b) => b.relevance - a.relevance);
  
  // Apply pagination
  const total = results.length;
  const paginatedResults = results.slice(offset, offset + limit);
  
  const processingTime = Date.now() - startTime;
  
  return {
    results: paginatedResults,
    total,
    processingTime
  };
}

/**
 * Generate search suggestions
 */
function generateSearchSuggestions(partialQuery?: string): string[] {
  const commonLegalTerms = [
    'employment contract',
    'non-disclosure agreement',
    'intellectual property',
    'trade secrets',
    'wrongful termination',
    'discrimination lawsuit',
    'breach of contract',
    'liability issues',
    'compliance requirements',
    'regulatory framework',
    'court precedent',
    'legal standards',
    'due process',
    'constitutional rights',
    'statutory interpretation'
  ];
  
  if (!partialQuery) {
    return commonLegalTerms.slice(0, 10);
  }
  
  const query = partialQuery.toLowerCase();
  const filtered = commonLegalTerms.filter(term => 
    term.toLowerCase().includes(query)
  );
  
  return filtered.slice(0, 10);
}