// Document analysis routes
import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { analysisValidation } from '../middleware/validation';
import { analysisRateLimit } from '../middleware/rateLimit';
import { 
  successResponse, 
  asyncHandler, 
  NotFoundError 
} from '../middleware/errorHandler';

export const analysisRoutes = Router();

// All analysis routes require authentication
analysisRoutes.use(authenticateToken);
analysisRoutes.use(analysisRateLimit);

// Mock analysis results store
const analysisResults = new Map();

const CLAUSE_TYPES = ['Compensation', 'Termination', 'Non-Compete', 'Confidentiality'] as const;
type ClauseType = typeof CLAUSE_TYPES[number];

interface Clause {
  type: ClauseType;
  content: string;
  section: string;
  importance: 'High' | 'Medium' | 'Low';
}

function isClauseType(value: string): value is ClauseType {
  return (CLAUSE_TYPES as readonly string[]).includes(value);
}

/**
 * @swagger
 * /analysis/documents/{documentId}:
 *   post:
 *     tags: [Analysis]
 *     summary: Analyze document
 *     description: Perform AI analysis on a document
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: documentId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type]
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [summary, risk_assessment, clause_extraction, compliance_check]
 *               options:
 *                 type: object
 *                 properties:
 *                   includeConfidence:
 *                     type: boolean
 *                     default: true
 *                   detailLevel:
 *                     type: string
 *                     enum: [brief, standard, detailed]
 *                     default: standard
 *     responses:
 *       200:
 *         description: Analysis completed successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 */
analysisRoutes.post('/documents/:documentId',
  analysisValidation,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const { documentId } = req.params;
    const { type, options = {} } = req.body;
    
    // In production, verify document exists and user has access
    // For demo, we'll simulate this check
    const documentExists = await checkDocumentAccess(documentId, userId);
    if (!documentExists) {
      throw new NotFoundError('Document');
    }
    
    const startTime = Date.now();
    
    // Perform analysis
    const analysis = await performDocumentAnalysis(documentId, type, options);
    
    const processingTime = Date.now() - startTime;
    
    const result = {
      id: `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      documentId,
      type,
      result: analysis,
      confidence: options.includeConfidence !== false ? analysis.confidence : undefined,
      createdAt: new Date().toISOString(),
      processingTime
    };
    
    // Store analysis result
    analysisResults.set(result.id, result);
    
    successResponse(res, result);
  })
);

/**
 * @swagger
 * /analysis/{analysisId}:
 *   get:
 *     tags: [Analysis]
 *     summary: Get analysis result
 *     description: Retrieve a previously completed analysis
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: analysisId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Analysis result retrieved successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
analysisRoutes.get('/:analysisId',
  asyncHandler(async (req: Request, res: Response) => {
    const { analysisId } = req.params;
    
    const analysis = analysisResults.get(analysisId);
    
    if (!analysis) {
      throw new NotFoundError('Analysis');
    }
    
    successResponse(res, analysis);
  })
);

/**
 * @swagger
 * /analysis/documents/{documentId}/history:
 *   get:
 *     tags: [Analysis]
 *     summary: Get analysis history
 *     description: Get all analyses performed on a document
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: documentId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Analysis history retrieved successfully
 */
analysisRoutes.get('/documents/:documentId/history',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const { documentId } = req.params;
    
    // Verify document access
    const documentExists = await checkDocumentAccess(documentId, userId);
    if (!documentExists) {
      throw new NotFoundError('Document');
    }
    
    // Get all analyses for this document
    const documentAnalyses = Array.from(analysisResults.values())
      .filter(analysis => analysis.documentId === documentId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    successResponse(res, {
      documentId,
      analyses: documentAnalyses,
      total: documentAnalyses.length
    });
  })
);

/**
 * Check if user has access to document
 */
async function checkDocumentAccess(documentId: string, userId: string): Promise<boolean> {
  // In production, check database
  // For demo, return true for valid-looking IDs
  return documentId.startsWith('doc_');
}

/**
 * Perform document analysis based on type
 */
async function performDocumentAnalysis(
  documentId: string,
  analysisType: string,
  options: any
): Promise<any> {
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const detailLevel = options.detailLevel || 'standard';
  
  switch (analysisType) {
    case 'summary':
      return generateSummaryAnalysis(detailLevel);
    
    case 'risk_assessment':
      return generateRiskAssessment(detailLevel);
    
    case 'clause_extraction':
      return generateClauseExtraction(detailLevel);
    
    case 'compliance_check':
      return generateComplianceCheck(detailLevel);
    
    default:
      throw new Error(`Unknown analysis type: ${analysisType}`);
  }
}

function generateSummaryAnalysis(detailLevel: string) {
  const baseAnalysis = {
    summary: 'This employment contract establishes the terms and conditions of employment between the employer and employee.',
    keyPoints: [
      'Employment term: 2 years with possibility of renewal',
      'Compensation: $75,000 annual salary plus benefits',
      'Termination clause: 30-day notice required',
      'Non-compete period: 6 months post-termination'
    ],
    confidence: 0.92
  };
  
  if (detailLevel === 'detailed') {
    return {
      ...baseAnalysis,
      detailedSummary: 'This comprehensive employment agreement outlines the relationship between XYZ Corporation and the employee, including detailed compensation structures, benefit packages, performance expectations, and termination procedures. The contract includes standard clauses for confidentiality, non-disclosure, and limited non-compete restrictions.',
      legalImplications: [
        'Standard employment at-will relationship with notice requirements',
        'Non-compete clause may require jurisdiction-specific review',
        'Intellectual property assignment clauses are comprehensive',
        'Termination procedures comply with state labor laws'
      ],
      recommendations: [
        'Review non-compete clause enforceability in applicable jurisdiction',
        'Consider adding dispute resolution mechanisms',
        'Ensure compliance with local wage and hour laws'
      ]
    };
  }
  
  return baseAnalysis;
}

function generateRiskAssessment(detailLevel: string) {
  const baseAssessment = {
    overallRisk: 'Medium',
    riskScore: 6.2,
    riskFactors: [
      {
        category: 'Compliance',
        risk: 'Medium',
        description: 'Some clauses may not comply with updated labor regulations',
        impact: 'Medium'
      },
      {
        category: 'Enforceability',
        risk: 'Low',
        description: 'Most contract terms are legally enforceable',
        impact: 'Low'
      },
      {
        category: 'Liability',
        risk: 'High',
        description: 'Limited liability protections for certain scenarios',
        impact: 'High'
      }
    ],
    confidence: 0.88
  };
  
  if (detailLevel === 'detailed') {
    return {
      ...baseAssessment,
      detailedAssessment: {
        legalRisks: [
          'Potential enforceability issues with non-compete clause in certain jurisdictions',
          'Intellectual property assignment may be overly broad',
          'Termination clause lacks specific performance improvement procedures'
        ],
        financialRisks: [
          'Unclear expense reimbursement policies',
          'Benefits package may not meet competitive standards',
          'Overtime compensation structure needs clarification'
        ],
        operationalRisks: [
          'Remote work policies are not adequately addressed',
          'Performance evaluation criteria are subjective',
          'Dispute resolution procedures are minimal'
        ]
      },
      mitigation: [
        'Add jurisdiction-specific compliance review',
        'Include detailed performance improvement process',
        'Clarify remote work and expense policies',
        'Consider adding mediation clause for disputes'
      ]
    };
  }
  
  return baseAssessment;
}

function generateClauseExtraction(detailLevel: string) {
  const baseExtraction: { clauses: Clause[]; confidence: number } = {
    clauses: [
      {
        type: 'Compensation',
        content: 'Employee shall receive an annual salary of $75,000, payable in bi-weekly installments.',
        section: 'Section 3',
        importance: 'High'
      },
      {
        type: 'Termination',
        content: 'Either party may terminate this agreement with thirty (30) days written notice.',
        section: 'Section 8',
        importance: 'High'
      },
      {
        type: 'Non-Compete',
        content: 'Employee agrees not to engage in competing business for 6 months post-termination.',
        section: 'Section 10',
        importance: 'Medium'
      },
      {
        type: 'Confidentiality',
        content: 'Employee shall maintain confidentiality of all proprietary information.',
        section: 'Section 12',
        importance: 'High'
      }
    ],
    confidence: 0.95
  };
  
  if (detailLevel === 'detailed') {
    return {
      ...baseExtraction,
      clauseAnalysis: baseExtraction.clauses.map(clause => ({
        ...clause,
        legalEffect: getClauseLegalEffect(clause.type),
        enforceability: getClauseEnforceability(clause.type),
        recommendations: getClauseRecommendations(clause.type)
      }))
    };
  }
  
  return baseExtraction;
}

function generateComplianceCheck(detailLevel: string) {
  const baseCompliance = {
    overallCompliance: 'Mostly Compliant',
    complianceScore: 8.2,
    checks: [
      {
        requirement: 'State Labor Laws',
        status: 'Compliant',
        details: 'Contract meets state minimum wage and overtime requirements'
      },
      {
        requirement: 'Federal Employment Laws',
        status: 'Compliant',
        details: 'No violations of federal employment discrimination laws'
      },
      {
        requirement: 'Industry Regulations',
        status: 'Needs Review',
        details: 'Some industry-specific compliance requirements may apply'
      }
    ],
    confidence: 0.87
  };
  
  if (detailLevel === 'detailed') {
    return {
      ...baseCompliance,
      detailedCompliance: {
        federal: {
          flsa: 'Compliant - proper overtime and wage provisions',
          eeo: 'Compliant - no discriminatory language detected',
          ada: 'Compliant - reasonable accommodation provisions included'
        },
        state: {
          wages: 'Compliant - meets state minimum wage requirements',
          leaves: 'Needs Review - family leave provisions may need updating',
          safety: 'Compliant - basic workplace safety acknowledgments'
        },
        industry: {
          licensing: 'Not Applicable - no professional licensing requirements',
          dataProtection: 'Needs Review - data handling provisions could be strengthened',
          clientRelations: 'Compliant - appropriate client interaction guidelines'
        }
      }
    };
  }
  
  return baseCompliance;
}

const clauseLegalEffects: Record<ClauseType, string> = {
  Compensation: 'Creates binding obligation for employer to pay specified amount',
  Termination: 'Establishes notice requirements and termination procedures',
  'Non-Compete': 'Restricts employee business activities post-employment',
  Confidentiality: 'Creates ongoing obligation to protect proprietary information'
};

function getClauseLegalEffect(clauseType: string): string {
  if (!isClauseType(clauseType)) {
    return 'Standard contractual obligation';
  }

  return clauseLegalEffects[clauseType];
}

const clauseEnforceability: Record<ClauseType, string> = {
  Compensation: 'Highly Enforceable',
  Termination: 'Enforceable',
  'Non-Compete': 'Jurisdiction Dependent',
  Confidentiality: 'Highly Enforceable'
};

function getClauseEnforceability(clauseType: string): string {
  if (!isClauseType(clauseType)) {
    return 'Generally Enforceable';
  }

  return clauseEnforceability[clauseType];
}

const clauseRecommendations: Record<ClauseType, string[]> = {
  Compensation: ['Consider adding performance bonus structure', 'Include benefit package details'],
  Termination: ['Add severance payment provisions', 'Include post-termination benefit continuation'],
  'Non-Compete': ['Review enforceability in applicable jurisdictions', 'Consider geographic limitations'],
  Confidentiality: ['Define proprietary information more specifically', 'Add return of materials clause']
};

function getClauseRecommendations(clauseType: string): string[] {
  if (!isClauseType(clauseType)) {
    return ['No specific recommendations'];
  }

  return clauseRecommendations[clauseType];
}
