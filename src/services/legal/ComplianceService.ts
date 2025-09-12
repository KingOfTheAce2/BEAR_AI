// Compliance Service for legal compliance checking and risk assessment
import { 
  ComplianceFlag, 
  ComplianceType, 
  ComplianceStatus, 
  RiskAssessment,
  RiskFactor,
  RiskLevel,
  LegalDocument 
} from '../../types/legal';

export interface ComplianceCheck {
  id: string;
  documentId: string;
  regulations: ComplianceRegulation[];
  results: ComplianceResult[];
  overallStatus: ComplianceStatus;
  riskLevel: RiskLevel;
  lastChecked: Date;
  nextReview: Date;
  recommendations: ComplianceRecommendation[];
}

export interface ComplianceRegulation {
  id: string;
  name: string;
  type: ComplianceType;
  jurisdiction: string;
  version: string;
  effectiveDate: Date;
  requirements: RegulationRequirement[];
  penalties: CompliancePenalty[];
  updateFrequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';
}

export interface RegulationRequirement {
  id: string;
  section: string;
  title: string;
  description: string;
  mandatory: boolean;
  applicability: RequirementApplicability;
  checkMethod: 'automated' | 'manual' | 'hybrid';
  evidence: string[];
}

export interface RequirementApplicability {
  entityTypes: string[];
  industries: string[];
  jurisdictions: string[];
  conditions: ApplicabilityCondition[];
}

export interface ApplicabilityCondition {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in_range';
  value: any;
}

export interface CompliancePenalty {
  type: 'fine' | 'sanctions' | 'license_revocation' | 'criminal' | 'civil';
  severity: 'minor' | 'moderate' | 'major' | 'severe';
  description: string;
  monetaryRange?: { min: number; max: number; currency: string };
  otherConsequences: string[];
}

export interface ComplianceResult {
  requirementId: string;
  status: ComplianceStatus;
  confidence: number;
  findings: ComplianceFinding[];
  evidence: Evidence[];
  remediation?: RemediationPlan;
  lastChecked: Date;
}

export interface ComplianceFinding {
  type: 'violation' | 'gap' | 'risk' | 'best_practice' | 'improvement';
  severity: 'info' | 'warning' | 'error' | 'critical';
  description: string;
  location?: DocumentLocation;
  regulation: string;
  requirement: string;
  recommendation: string;
  timeline?: string;
  cost?: number;
}

export interface Evidence {
  type: 'document_clause' | 'policy' | 'procedure' | 'training' | 'audit' | 'certification';
  description: string;
  location?: string;
  verified: boolean;
  date?: Date;
  expiration?: Date;
}

export interface DocumentLocation {
  section: string;
  paragraph?: number;
  line?: number;
  text: string;
}

export interface RemediationPlan {
  id: string;
  steps: RemediationStep[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedCost: number;
  estimatedTimeframe: string;
  responsibleParty: string;
  dependencies: string[];
  successMetrics: string[];
}

export interface RemediationStep {
  id: string;
  order: number;
  description: string;
  action: 'add_clause' | 'modify_language' | 'add_policy' | 'training' | 'audit' | 'certification';
  details: string;
  deadline?: Date;
  assignee?: string;
  cost?: number;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
}

export interface ComplianceRecommendation {
  type: 'immediate' | 'short_term' | 'long_term' | 'ongoing';
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  rationale: string;
  impact: string;
  effort: 'low' | 'medium' | 'high';
  cost?: number;
  timeline: string;
  dependencies?: string[];
}

export interface ComplianceProfile {
  id: string;
  name: string;
  description: string;
  applicableRegulations: string[];
  industry: string[];
  jurisdiction: string[];
  entityTypes: string[];
  customRequirements: CustomRequirement[];
  monitoring: MonitoringSettings;
}

export interface CustomRequirement {
  id: string;
  name: string;
  description: string;
  category: string;
  mandatory: boolean;
  checkFrequency: string;
  checkMethod: 'automated' | 'manual' | 'hybrid';
  criteria: RequirementCriteria[];
}

export interface RequirementCriteria {
  field: string;
  operator: string;
  value: any;
  weight: number;
}

export interface MonitoringSettings {
  frequency: 'real_time' | 'daily' | 'weekly' | 'monthly';
  alertThresholds: AlertThreshold[];
  notificationChannels: string[];
  reportingSchedule: ReportingSchedule[];
}

export interface AlertThreshold {
  metric: string;
  condition: string;
  value: number;
  severity: 'info' | 'warning' | 'error' | 'critical';
}

export interface ReportingSchedule {
  type: 'executive' | 'detailed' | 'regulatory';
  frequency: string;
  recipients: string[];
  format: 'pdf' | 'html' | 'excel' | 'json';
}

export class ComplianceService {
  private apiBaseUrl: string;
  private apiKey: string;

  constructor(apiBaseUrl = '/api/legal', apiKey = '') {
    this.apiBaseUrl = apiBaseUrl;
    this.apiKey = apiKey;
  }

  // Main Compliance Checking
  async checkCompliance(documentId: string, regulations: string[]): Promise<ComplianceCheck> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/compliance/check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({ documentId, regulations })
      });

      if (!response.ok) {
        throw new Error(`Compliance check failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error checking compliance:', error);
      throw error;
    }
  }

  async quickComplianceCheck(content: string, regulations: ComplianceType[]): Promise<ComplianceFlag[]> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/compliance/quick-check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({ content, regulations })
      });

      if (!response.ok) {
        throw new Error(`Quick compliance check failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.flags || [];
    } catch (error) {
      console.error('Error in quick compliance check:', error);
      return [];
    }
  }

  // Regulation Management
  async getAvailableRegulations(): Promise<ComplianceRegulation[]> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/compliance/regulations`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) {
        throw new Error(`Regulations fetch failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.regulations || [];
    } catch (error) {
      console.error('Error fetching regulations:', error);
      return [];
    }
  }

  async getRegulationDetails(regulationId: string): Promise<ComplianceRegulation | null> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/compliance/regulations/${regulationId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`Regulation details fetch failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching regulation details:', error);
      return null;
    }
  }

  async searchRegulations(query: string, filters?: RegulationFilters): Promise<ComplianceRegulation[]> {
    try {
      const params = new URLSearchParams();
      params.append('q', query);
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined) {
            params.append(key, Array.isArray(value) ? value.join(',') : value.toString());
          }
        });
      }

      const response = await fetch(`${this.apiBaseUrl}/compliance/regulations/search?${params}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) {
        throw new Error(`Regulation search failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.regulations || [];
    } catch (error) {
      console.error('Error searching regulations:', error);
      return [];
    }
  }

  // Risk Assessment
  async assessRisk(document: LegalDocument, regulations: string[]): Promise<RiskAssessment> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/compliance/risk-assessment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({ document, regulations })
      });

      if (!response.ok) {
        throw new Error(`Risk assessment failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error assessing risk:', error);
      throw error;
    }
  }

  async identifyRiskFactors(content: string, context: RiskContext): Promise<RiskFactor[]> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/compliance/risk-factors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({ content, context })
      });

      if (!response.ok) {
        throw new Error(`Risk factor identification failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.riskFactors || [];
    } catch (error) {
      console.error('Error identifying risk factors:', error);
      return [];
    }
  }

  // Remediation Planning
  async generateRemediationPlan(findings: ComplianceFinding[]): Promise<RemediationPlan> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/compliance/remediation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({ findings })
      });

      if (!response.ok) {
        throw new Error(`Remediation plan generation failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error generating remediation plan:', error);
      throw error;
    }
  }

  async updateRemediationProgress(planId: string, updates: RemediationUpdate[]): Promise<void> {
    try {
      await fetch(`${this.apiBaseUrl}/compliance/remediation/${planId}/progress`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({ updates })
      });
    } catch (error) {
      console.error('Error updating remediation progress:', error);
    }
  }

  // Compliance Profiles
  async createComplianceProfile(profile: Omit<ComplianceProfile, 'id'>): Promise<ComplianceProfile> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/compliance/profiles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(profile)
      });

      if (!response.ok) {
        throw new Error(`Compliance profile creation failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating compliance profile:', error);
      throw error;
    }
  }

  async getComplianceProfiles(): Promise<ComplianceProfile[]> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/compliance/profiles`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) {
        throw new Error(`Compliance profiles fetch failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.profiles || [];
    } catch (error) {
      console.error('Error fetching compliance profiles:', error);
      return [];
    }
  }

  // Monitoring and Alerts
  async setupComplianceMonitoring(settings: MonitoringSettings): Promise<string> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/compliance/monitoring`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(settings)
      });

      if (!response.ok) {
        throw new Error(`Compliance monitoring setup failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.monitoringId;
    } catch (error) {
      console.error('Error setting up compliance monitoring:', error);
      throw error;
    }
  }

  async getComplianceAlerts(since?: Date): Promise<ComplianceAlert[]> {
    try {
      const params = since ? `?since=${since.toISOString()}` : '';
      const response = await fetch(`${this.apiBaseUrl}/compliance/alerts${params}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) {
        throw new Error(`Compliance alerts fetch failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.alerts || [];
    } catch (error) {
      console.error('Error fetching compliance alerts:', error);
      return [];
    }
  }

  // Reporting
  async generateComplianceReport(documentId: string, options?: ReportOptions): Promise<ComplianceReport> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/compliance/reports/${documentId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(options || {})
      });

      if (!response.ok) {
        throw new Error(`Compliance report generation failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error generating compliance report:', error);
      throw error;
    }
  }

  async exportComplianceData(format: 'json' | 'csv' | 'xml', filters?: ComplianceDataFilters): Promise<Blob> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/compliance/export?format=${format}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(filters || {})
      });

      if (!response.ok) {
        throw new Error(`Compliance data export failed: ${response.statusText}`);
      }

      return await response.blob();
    } catch (error) {
      console.error('Error exporting compliance data:', error);
      throw error;
    }
  }
}

// Supporting interfaces
export interface RegulationFilters {
  type?: ComplianceType[];
  jurisdiction?: string[];
  industry?: string[];
  effectiveDate?: { start?: Date; end?: Date };
}

export interface RiskContext {
  industry: string;
  jurisdiction: string[];
  entityType: string;
  documentType: string;
  businessContext: string;
}

export interface RemediationUpdate {
  stepId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  progress?: number;
  notes?: string;
  completedDate?: Date;
}

export interface ComplianceAlert {
  id: string;
  type: 'new_regulation' | 'regulation_update' | 'deadline_approaching' | 'violation_detected' | 'risk_threshold';
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  description: string;
  regulation?: string;
  documentId?: string;
  dueDate?: Date;
  createdAt: Date;
  acknowledged: boolean;
  actions: AlertAction[];
}

export interface AlertAction {
  id: string;
  label: string;
  url?: string;
  type: 'review' | 'update' | 'acknowledge' | 'remediate' | 'escalate';
}

export interface ReportOptions {
  includeEvidence?: boolean;
  includeRemediation?: boolean;
  format?: 'summary' | 'detailed' | 'executive';
  sections?: string[];
}

export interface ComplianceReport {
  id: string;
  documentId: string;
  generatedAt: Date;
  overallStatus: ComplianceStatus;
  summary: ComplianceSummary;
  findings: ComplianceFinding[];
  recommendations: ComplianceRecommendation[];
  riskAssessment: RiskAssessment;
  remediation?: RemediationPlan;
  nextReview: Date;
}

export interface ComplianceSummary {
  totalRequirements: number;
  compliantRequirements: number;
  nonCompliantRequirements: number;
  riskDistribution: Record<RiskLevel, number>;
  criticalIssues: number;
  estimatedRemediationCost: number;
  estimatedRemediationTime: string;
}

export interface ComplianceDataFilters {
  dateRange?: { start: Date; end: Date };
  regulations?: string[];
  status?: ComplianceStatus[];
  riskLevel?: RiskLevel[];
  documentIds?: string[];
}

export default ComplianceService;