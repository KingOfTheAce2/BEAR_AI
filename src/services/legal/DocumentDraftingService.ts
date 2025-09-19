import type { LegalDocumentType, LegalCategory, RiskLevel } from '../../types/legal';

export interface TemplateVariable {
  name: string;
  type: 'text' | 'textarea' | 'date' | 'number' | 'select' | 'boolean';
  required: boolean;
  defaultValue?: string | number | boolean;
  options?: string[];
  description?: string;
}

export interface TemplateClause {
  id: string;
  title: string;
  content: string;
  riskLevel: RiskLevel;
}

export interface DraftingTemplate {
  id: string;
  name: string;
  type: LegalDocumentType;
  category: LegalCategory;
  description: string;
  jurisdiction: string[];
  usageCount: number;
  variables: TemplateVariable[];
  clauses: TemplateClause[];
  isActive: boolean;
}

export interface DocumentAssemblyRequest {
  templateId: string;
  variables: Record<string, unknown>;
  selectedClauses: string[];
  customizations: Array<{ clauseId: string; content: string }>;
  outputFormat: 'html' | 'markdown' | 'text';
  jurisdiction: string[];
  practiceArea: LegalCategory;
}

export interface DraftingResult {
  documentId: string;
  content: string;
  metadata: {
    type: LegalDocumentType;
    category: LegalCategory;
    createdAt: Date;
    variables: Record<string, unknown>;
    templateId?: string;
  };
  suggestions: string[];
  warnings: string[];
  revisions: number;
}

interface TemplateFilters {
  type?: LegalDocumentType[];
  category?: LegalCategory[];
  isActive?: boolean;
}

const TEMPLATES: DraftingTemplate[] = [
  {
    id: 'contract_standard',
    name: 'Standard Services Agreement',
    type: 'contract',
    category: 'corporate',
    description: 'Comprehensive services agreement with indemnification and confidentiality provisions.',
    jurisdiction: ['US', 'Federal'],
    usageCount: 184,
    variables: [
      { name: 'client_name', type: 'text', required: true, description: 'Legal name of the client' },
      { name: 'service_description', type: 'textarea', required: true, description: 'Description of services provided' },
      { name: 'effective_date', type: 'date', required: true },
      { name: 'term_months', type: 'number', required: true, defaultValue: 12 },
      { name: 'governing_law', type: 'text', required: true, defaultValue: 'Delaware' }
    ],
    clauses: [
      { id: 'scope', title: 'Scope of Services', content: 'Service provider shall perform the services outlined in Schedule A.', riskLevel: 'medium' },
      { id: 'payment', title: 'Compensation', content: 'Client shall pay service provider in accordance with the payment schedule.', riskLevel: 'medium' },
      { id: 'confidentiality', title: 'Confidentiality', content: 'Both parties agree to maintain confidentiality of proprietary information.', riskLevel: 'low' }
    ],
    isActive: true
  },
  {
    id: 'brief_litigation',
    name: 'Litigation Brief Template',
    type: 'brief',
    category: 'litigation',
    description: 'Structured litigation brief with argument, fact summary, and precedent sections.',
    jurisdiction: ['US', 'Federal'],
    usageCount: 96,
    variables: [
      { name: 'case_name', type: 'text', required: true },
      { name: 'court', type: 'text', required: true },
      { name: 'issue_presented', type: 'textarea', required: true },
      { name: 'requested_relief', type: 'textarea', required: false }
    ],
    clauses: [
      { id: 'facts', title: 'Statement of Facts', content: 'Summary of relevant facts.', riskLevel: 'low' },
      { id: 'argument', title: 'Argument', content: 'Detailed legal argument with citations.', riskLevel: 'medium' },
      { id: 'conclusion', title: 'Conclusion', content: 'Requested relief and conclusion.', riskLevel: 'low' }
    ],
    isActive: true
  }
];

function renderClause(clause: TemplateClause, variables: Record<string, unknown>): string {
  let content = clause.content;
  for (const [key, value] of Object.entries(variables)) {
    content = content.replace(new RegExp(`{{${key}}}`, 'g'), String(value ?? ''));
  }
  return content;
}

function renderDocumentBody(template: DraftingTemplate, variables: Record<string, unknown>, selectedClauses: string[]): string {
  const heading = `# ${template.name}\n\n`;
  const metadata = `*Type:* ${template.type}\n*Category:* ${template.category}\n*Jurisdiction:* ${template.jurisdiction.join(', ')}\n\n`;

  const body = template.clauses
    .filter(clause => selectedClauses.includes(clause.id))
    .map(clause => `## ${clause.title}\n${renderClause(clause, variables)}\n`)
    .join('\n');

  return heading + metadata + body;
}

function inferSuggestions(template: DraftingTemplate, variables: Record<string, unknown>): string[] {
  const suggestions: string[] = [];
  if (!variables.client_name && template.type === 'contract') {
    suggestions.push('Add client name to ensure contract parties are identified.');
  }
  if (template.clauses.some(clause => clause.riskLevel === 'high')) {
    suggestions.push('Review high risk clauses for negotiation opportunities.');
  }
  return suggestions;
}

export default class DocumentDraftingService {
  private readonly templates = TEMPLATES;

  async getTemplates(filters: TemplateFilters = {}): Promise<DraftingTemplate[]> {
    return this.templates.filter(template => {
      if (filters.isActive !== undefined && template.isActive !== filters.isActive) {
        return false;
      }
      if (filters.type && !filters.type.includes(template.type)) {
        return false;
      }
      if (filters.category && !filters.category.includes(template.category)) {
        return false;
      }
      return true;
    });
  }

  async assembleDocument(request: DocumentAssemblyRequest): Promise<DraftingResult> {
    const template = this.templates.find(item => item.id === request.templateId);
    if (!template) {
      throw new Error(`Template ${request.templateId} not found`);
    }

    const variables = { ...request.variables };
    const body = renderDocumentBody(template, variables, request.selectedClauses);

    const content =
      request.outputFormat === 'html'
        ? `<article>${body.replace(/\n/g, '<br/>')}</article>`
        : request.outputFormat === 'markdown'
          ? body
          : body.replace(/#+\s/g, '').replace(/\*/g, '');

    return {
      documentId: `doc_${Date.now()}`,
      content,
      metadata: {
        type: template.type,
        category: template.category,
        createdAt: new Date(),
        variables,
        templateId: template.id
      },
      suggestions: inferSuggestions(template, variables),
      warnings: [],
      revisions: 0
    };
  }

  async generateFromPrompt(prompt: string, type: LegalDocumentType, jurisdiction: string[]): Promise<DraftingResult> {
    const summary = prompt.trim().slice(0, 120) || 'Legal document';
    const content = `# ${type.toUpperCase()} Draft\n\nJurisdiction: ${jurisdiction.join(', ')}\n\n${prompt}\n\n## Key Considerations\n- Ensure compliance with local regulations.\n- Validate party authority.\n- Review risk allocation.`;

    return {
      documentId: `prompt_${Date.now()}`,
      content,
      metadata: {
        type,
        category: 'corporate',
        createdAt: new Date(),
        variables: { prompt: summary }
      },
      suggestions: ['Review generated content for accuracy before delivery.'],
      warnings: [],
      revisions: 0
    };
  }

  async exportDocument(documentId: string, format: 'docx' | 'pdf' | 'html'): Promise<Blob> {
    const mimeType =
      format === 'pdf'
        ? 'application/pdf'
        : format === 'docx'
          ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          : 'text/html';

    const content = `Generated document ${documentId} in ${format.toUpperCase()} format.`;
    return new Blob([content], { type: mimeType });
  }
}

export type { DraftingTemplate, DraftingResult, DocumentAssemblyRequest };
