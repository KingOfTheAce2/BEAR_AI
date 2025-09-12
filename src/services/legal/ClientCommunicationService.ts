// Client Communication Service for legal client interaction and template management
import { 
  ClientCommunication, 
  CommunicationType, 
  CommunicationStatus,
  CommunicationTemplate,
  TemplateVariable,
  DeliveryMethod 
} from '../../types/legal';

export interface CommunicationRequest {
  clientId: string;
  type: CommunicationType;
  templateId?: string;
  subject: string;
  content: string;
  variables?: Record<string, any>;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  deliveryMethods: DeliveryMethod[];
  scheduledDate?: Date;
  attachments?: AttachmentRequest[];
  responseRequired: boolean;
  responseDeadline?: Date;
  billingCode?: string;
  matter?: string;
}

export interface AttachmentRequest {
  name: string;
  type: string;
  content: string | Blob;
  confidential: boolean;
}

export interface CommunicationResponse {
  id: string;
  status: 'sent' | 'delivered' | 'failed' | 'scheduled';
  deliveryDetails: DeliveryDetail[];
  estimatedDelivery?: Date;
  trackingInfo?: TrackingInfo;
}

export interface DeliveryDetail {
  method: DeliveryMethod;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced';
  timestamp?: Date;
  recipient: string;
  error?: string;
}

export interface TrackingInfo {
  opened?: Date;
  clicked?: boolean;
  downloaded?: string[];
  responded?: Date;
  forwarded?: boolean;
}

export interface CommunicationAnalytics {
  clientId: string;
  totalCommunications: number;
  byType: Record<CommunicationType, number>;
  byStatus: Record<CommunicationStatus, number>;
  averageResponseTime: number;
  openRate: number;
  responseRate: number;
  preferredMethods: DeliveryMethod[];
  communicationTrends: TrendData[];
}

export interface TrendData {
  period: string;
  count: number;
  type: CommunicationType;
  responseTime: number;
}

export interface CommunicationWorkflow {
  id: string;
  name: string;
  description: string;
  triggers: WorkflowTrigger[];
  steps: WorkflowStep[];
  conditions: WorkflowCondition[];
  isActive: boolean;
  createdBy: string;
  lastModified: Date;
}

export interface WorkflowTrigger {
  type: 'date' | 'event' | 'document_status' | 'case_milestone' | 'manual';
  condition: string;
  parameters: Record<string, any>;
}

export interface WorkflowStep {
  id: string;
  order: number;
  type: 'send_communication' | 'wait' | 'condition' | 'assign_task' | 'update_status';
  parameters: Record<string, any>;
  templateId?: string;
  delay?: string;
}

export interface WorkflowCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains';
  value: any;
}

export interface ClientPreferences {
  clientId: string;
  preferredMethods: DeliveryMethod[];
  frequency: 'daily' | 'weekly' | 'bi_weekly' | 'monthly' | 'as_needed';
  timePreferences: TimePreference[];
  languages: string[];
  accessibilityNeeds: string[];
  communicationStyle: 'formal' | 'casual' | 'technical' | 'simplified';
  excludeDates: Date[];
}

export interface TimePreference {
  method: DeliveryMethod;
  timeZone: string;
  preferredHours: { start: number; end: number };
  preferredDays: number[]; // 0-6, Sunday-Saturday
}

export interface SecureMessage {
  id: string;
  clientId: string;
  subject: string;
  content: string;
  encrypted: boolean;
  accessCode?: string;
  expiresAt?: Date;
  viewCount: number;
  maxViews?: number;
  downloadCount: number;
  maxDownloads?: number;
  watermark: boolean;
  restrictPrint: boolean;
  attachments: SecureAttachment[];
}

export interface SecureAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  encrypted: boolean;
  viewCount: number;
  downloadCount: number;
  accessRestrictions: AccessRestriction[];
}

export interface AccessRestriction {
  type: 'ip_address' | 'device' | 'time_window' | 'location';
  value: string;
  description: string;
}

export class ClientCommunicationService {
  private apiBaseUrl: string;
  private apiKey: string;

  constructor(apiBaseUrl = '/api/legal', apiKey = '') {
    this.apiBaseUrl = apiBaseUrl;
    this.apiKey = apiKey;
  }

  // Template Management
  async getTemplates(filters?: TemplateFilters): Promise<CommunicationTemplate[]> {
    try {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined) {
            params.append(key, Array.isArray(value) ? value.join(',') : value.toString());
          }
        });
      }

      const response = await fetch(`${this.apiBaseUrl}/communication/templates?${params}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) {
        throw new Error(`Templates fetch failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.templates || [];
    } catch (error) {
      console.error('Error fetching templates:', error);
      return [];
    }
  }

  async createTemplate(template: Omit<CommunicationTemplate, 'id' | 'createdBy' | 'lastModified'>): Promise<CommunicationTemplate> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/communication/templates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(template)
      });

      if (!response.ok) {
        throw new Error(`Template creation failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating template:', error);
      throw error;
    }
  }

  async updateTemplate(templateId: string, updates: Partial<CommunicationTemplate>): Promise<CommunicationTemplate> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/communication/templates/${templateId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error(`Template update failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating template:', error);
      throw error;
    }
  }

  // Communication Sending
  async sendCommunication(request: CommunicationRequest): Promise<CommunicationResponse> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/communication/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`Communication sending failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error sending communication:', error);
      throw error;
    }
  }

  async scheduleCommunication(request: CommunicationRequest): Promise<string> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/communication/schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`Communication scheduling failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.scheduledId;
    } catch (error) {
      console.error('Error scheduling communication:', error);
      throw error;
    }
  }

  async sendBulkCommunication(requests: CommunicationRequest[]): Promise<BulkCommunicationResult> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/communication/bulk-send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({ communications: requests })
      });

      if (!response.ok) {
        throw new Error(`Bulk communication failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error sending bulk communications:', error);
      throw error;
    }
  }

  // Communication Tracking
  async getCommunicationStatus(communicationId: string): Promise<ClientCommunication> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/communication/${communicationId}/status`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) {
        throw new Error(`Communication status fetch failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching communication status:', error);
      throw error;
    }
  }

  async getClientCommunications(clientId: string, filters?: CommunicationFilters): Promise<ClientCommunication[]> {
    try {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined) {
            params.append(key, Array.isArray(value) ? value.join(',') : value.toString());
          }
        });
      }

      const response = await fetch(`${this.apiBaseUrl}/communication/client/${clientId}?${params}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) {
        throw new Error(`Client communications fetch failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.communications || [];
    } catch (error) {
      console.error('Error fetching client communications:', error);
      return [];
    }
  }

  // Client Preferences
  async getClientPreferences(clientId: string): Promise<ClientPreferences | null> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/communication/preferences/${clientId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`Client preferences fetch failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching client preferences:', error);
      return null;
    }
  }

  async updateClientPreferences(clientId: string, preferences: Partial<ClientPreferences>): Promise<ClientPreferences> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/communication/preferences/${clientId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(preferences)
      });

      if (!response.ok) {
        throw new Error(`Client preferences update failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating client preferences:', error);
      throw error;
    }
  }

  // Secure Communication
  async sendSecureMessage(message: Omit<SecureMessage, 'id' | 'viewCount' | 'downloadCount'>): Promise<SecureMessage> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/communication/secure`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(message)
      });

      if (!response.ok) {
        throw new Error(`Secure message sending failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error sending secure message:', error);
      throw error;
    }
  }

  async getSecureMessageAccess(messageId: string, accessCode?: string): Promise<SecureMessage | null> {
    try {
      const body = accessCode ? JSON.stringify({ accessCode }) : undefined;
      const response = await fetch(`${this.apiBaseUrl}/communication/secure/${messageId}/access`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body
      });

      if (!response.ok) {
        if (response.status === 403) return null; // Access denied
        throw new Error(`Secure message access failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error accessing secure message:', error);
      return null;
    }
  }

  // Workflow Automation
  async createCommunicationWorkflow(workflow: Omit<CommunicationWorkflow, 'id' | 'createdBy' | 'lastModified'>): Promise<CommunicationWorkflow> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/communication/workflows`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(workflow)
      });

      if (!response.ok) {
        throw new Error(`Workflow creation failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating workflow:', error);
      throw error;
    }
  }

  async triggerWorkflow(workflowId: string, context: Record<string, any>): Promise<void> {
    try {
      await fetch(`${this.apiBaseUrl}/communication/workflows/${workflowId}/trigger`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(context)
      });
    } catch (error) {
      console.error('Error triggering workflow:', error);
    }
  }

  async getActiveWorkflows(): Promise<CommunicationWorkflow[]> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/communication/workflows?active=true`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) {
        throw new Error(`Active workflows fetch failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.workflows || [];
    } catch (error) {
      console.error('Error fetching active workflows:', error);
      return [];
    }
  }

  // Analytics and Reporting
  async getCommunicationAnalytics(clientId: string, period?: string): Promise<CommunicationAnalytics> {
    try {
      const params = period ? `?period=${period}` : '';
      const response = await fetch(`${this.apiBaseUrl}/communication/analytics/${clientId}${params}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) {
        throw new Error(`Analytics fetch failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching communication analytics:', error);
      throw error;
    }
  }

  async generateCommunicationReport(options: ReportOptions): Promise<CommunicationReport> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/communication/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(options)
      });

      if (!response.ok) {
        throw new Error(`Report generation failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error generating report:', error);
      throw error;
    }
  }

  // Template Variable Processing
  async processTemplateVariables(templateId: string, variables: Record<string, any>): Promise<ProcessedTemplate> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/communication/templates/${templateId}/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({ variables })
      });

      if (!response.ok) {
        throw new Error(`Template processing failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error processing template:', error);
      throw error;
    }
  }

  async validateTemplateVariables(templateId: string, variables: Record<string, any>): Promise<ValidationResult> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/communication/templates/${templateId}/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({ variables })
      });

      if (!response.ok) {
        throw new Error(`Template validation failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error validating template:', error);
      return { isValid: false, errors: ['Validation service unavailable'] };
    }
  }
}

// Supporting interfaces
export interface TemplateFilters {
  type?: CommunicationType[];
  category?: string[];
  isActive?: boolean;
  tags?: string[];
}

export interface CommunicationFilters {
  type?: CommunicationType[];
  status?: CommunicationStatus[];
  dateRange?: { start: Date; end: Date };
  priority?: ('low' | 'medium' | 'high' | 'urgent')[];
  hasResponse?: boolean;
}

export interface BulkCommunicationResult {
  total: number;
  successful: number;
  failed: number;
  results: CommunicationResponse[];
  errors: BulkError[];
}

export interface BulkError {
  index: number;
  clientId: string;
  error: string;
  details?: string;
}

export interface ReportOptions {
  clientIds?: string[];
  dateRange: { start: Date; end: Date };
  types?: CommunicationType[];
  includeAnalytics: boolean;
  format: 'pdf' | 'excel' | 'csv';
  groupBy?: 'client' | 'type' | 'date' | 'matter';
}

export interface CommunicationReport {
  id: string;
  generatedAt: Date;
  period: { start: Date; end: Date };
  summary: ReportSummary;
  details: ReportDetail[];
  analytics: CommunicationAnalytics[];
  recommendations: string[];
}

export interface ReportSummary {
  totalCommunications: number;
  clientsContacted: number;
  averageResponseTime: number;
  mostUsedTypes: CommunicationType[];
  preferredMethods: DeliveryMethod[];
  satisfaction?: number;
}

export interface ReportDetail {
  clientId: string;
  clientName: string;
  totalCommunications: number;
  responseRate: number;
  preferredMethod: DeliveryMethod;
  lastContact: Date;
  satisfaction?: number;
}

export interface ProcessedTemplate {
  subject: string;
  body: string;
  missingVariables: string[];
  warnings: string[];
  preview: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
  missingRequired: string[];
  invalidValues: Record<string, string>;
}

export default ClientCommunicationService;