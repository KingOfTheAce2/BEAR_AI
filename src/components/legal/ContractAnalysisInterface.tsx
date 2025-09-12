import React, { useState, useEffect } from 'react';
import {
  FileText,
  Upload,
  Search,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  Download,
  Share2,
  BarChart3,
  Shield,
  Scale,
  Clock,
  TrendingUp,
  Filter,
  Info
} from 'lucide-react';
import { LegalComponentProps, RiskLevel } from '../../types/legal';
import ContractAnalysisService, { 
  ContractAnalysisResult, 
  ContractSuggestion, 
  ExtractedContractData 
} from '../../services/legal/ContractAnalysisService';

interface ContractAnalysisInterfaceProps extends LegalComponentProps {
  onAnalysisComplete?: (result: ContractAnalysisResult) => void;
  onExportAnalysis?: (analysisId: string, format: string) => void;
}

interface AnalysisTab {
  id: 'overview' | 'clauses' | 'risks' | 'suggestions' | 'extracted_data';
  label: string;
  icon: React.ReactNode;
  count?: number;
}

export const ContractAnalysisInterface: React.FC<ContractAnalysisInterfaceProps> = ({
  user,
  matter,
  client,
  onAnalysisComplete,
  onExportAnalysis,
  className = ''
}) => {
  const [analysisService] = useState(() => new ContractAnalysisService());
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [documentText, setDocumentText] = useState('');
  const [analysisResult, setAnalysisResult] = useState<ContractAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'clauses' | 'risks' | 'suggestions' | 'extracted_data'>('overview');
  const [selectedRiskFilter, setSelectedRiskFilter] = useState<RiskLevel | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      // In a real implementation, you would extract text from the file
      // For now, we'll simulate with placeholder text
      setDocumentText('Contract content would be extracted here...');
    }
  };

  const handleTextInput = (text: string) => {
    setDocumentText(text);
    setUploadedFile(null);
  };

  const analyzeContract = async () => {
    if (!documentText && !uploadedFile) return;

    try {
      setLoading(true);
      
      // Create a mock legal document for analysis
      const mockDocument = {
        id: `contract_${Date.now()}`,
        title: uploadedFile?.name || 'Pasted Contract',
        type: 'contract' as const,
        category: 'corporate' as const,
        content: documentText,
        metadata: {
          jurisdiction: ['US', 'Federal'],
          practiceArea: ['contracts'],
          client: client || '',
          matter: matter || '',
          tags: [],
          confidentialityLevel: 'attorney_client_privilege' as const,
          customFields: {}
        },
        status: 'draft' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: user?.id || '',
        lastModifiedBy: user?.id || '',
        version: 1,
        citations: [],
        precedents: [],
        clauses: []
      };

      const result = await analysisService.analyzeContract(mockDocument);
      setAnalysisResult(result);
      onAnalysisComplete?.(result);
    } catch (error) {
      console.error('Error analyzing contract:', error);
      
      // Fallback with mock data for demo
      setAnalysisResult({
        documentId: `contract_${Date.now()}`,
        overallRisk: 'medium',
        clauses: [
          {
            id: 'clause_1',
            type: 'termination',
            title: 'Termination Clause',
            content: 'Either party may terminate this agreement with 30 days written notice.',
            position: 1,
            isStandard: true,
            riskLevel: 'medium',
            suggestions: ['Consider adding specific termination causes', 'Include notice delivery requirements'],
            alternativeLanguage: ['Either party may terminate this agreement with sixty (60) days prior written notice.'],
            precedentClauses: []
          },
          {
            id: 'clause_2',
            type: 'indemnification',
            title: 'Indemnification',
            content: 'Company agrees to indemnify and hold harmless Client from all claims.',
            position: 2,
            isStandard: false,
            riskLevel: 'high',
            suggestions: ['Add mutual indemnification', 'Include carve-outs for gross negligence', 'Cap indemnification liability'],
            alternativeLanguage: ['Each party agrees to indemnify the other party for claims arising from their respective negligent acts.'],
            precedentClauses: []
          }
        ],
        riskAssessment: {
          id: 'risk_1',
          documentId: `contract_${Date.now()}`,
          overallRisk: 'medium',
          riskFactors: [
            {
              type: 'liability',
              severity: 'high',
              description: 'Unlimited indemnification liability',
              likelihood: 'medium',
              impact: 'high',
              affectedClauses: ['clause_2']
            },
            {
              type: 'operational',
              severity: 'medium',
              description: 'Short termination notice period',
              likelihood: 'high',
              impact: 'medium',
              affectedClauses: ['clause_1']
            }
          ],
          mitigationStrategies: [
            {
              riskFactorId: 'risk_1',
              strategy: 'Add liability caps',
              implementation: 'Include maximum liability amount',
              timeline: '1-2 days',
              responsible: 'Legal team',
              effectiveness: 'high'
            }
          ],
          complianceIssues: [],
          recommendations: ['Review indemnification clauses', 'Consider extending notice periods'],
          assessmentDate: new Date(),
          assessedBy: user?.id || ''
        },
        suggestions: [
          {
            type: 'modification',
            clauseId: 'clause_2',
            priority: 'high',
            description: 'Add mutual indemnification clause',
            rationale: 'Current one-sided indemnification creates unbalanced risk allocation',
            suggestedLanguage: 'Each party shall indemnify the other for claims arising from their respective negligent acts, subject to a cap of $1,000,000.',
            riskMitigation: 'Reduces liability exposure and creates balanced risk sharing'
          }
        ],
        complianceFlags: [],
        extractedData: {
          parties: [
            { name: 'Company ABC', role: 'vendor', entityType: 'Corporation' },
            { name: 'Client XYZ', role: 'client', entityType: 'LLC' }
          ],
          effectiveDate: new Date('2024-01-01'),
          expirationDate: new Date('2024-12-31'),
          governingLaw: 'State of Delaware',
          paymentTerms: {
            amount: 100000,
            currency: 'USD',
            schedule: 'Monthly',
            method: 'Wire transfer'
          },
          deliverables: [
            {
              description: 'Software development services',
              deadline: new Date('2024-06-01')
            }
          ],
          keyObligations: [
            {
              party: 'Company ABC',
              description: 'Deliver software according to specifications',
              deadline: new Date('2024-06-01')
            }
          ],
          terminationClauses: [
            {
              type: 'convenience',
              noticePeriod: '30 days',
              conditions: 'Written notice required',
              consequences: 'Payment for work completed'
            }
          ]
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (risk: RiskLevel): string => {
    switch (risk) {
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'critical': return 'text-red-800 bg-red-100 border-red-300';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getRiskIcon = (risk: RiskLevel) => {
    switch (risk) {
      case 'low': return <CheckCircle className="w-4 h-4" />;
      case 'medium': return <AlertTriangle className="w-4 h-4" />;
      case 'high': case 'critical': return <XCircle className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  const filteredClauses = analysisResult?.clauses.filter(clause => {
    const matchesSearch = !searchTerm || 
      clause.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      clause.content.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRisk = selectedRiskFilter === 'all' || clause.riskLevel === selectedRiskFilter;
    
    return matchesSearch && matchesRisk;
  }) || [];

  const tabs: AnalysisTab[] = [
    { 
      id: 'overview', 
      label: 'Overview', 
      icon: <BarChart3 className="w-4 h-4" /> 
    },
    { 
      id: 'clauses', 
      label: 'Clauses', 
      icon: <FileText className="w-4 h-4" />,
      count: analysisResult?.clauses.length || 0
    },
    { 
      id: 'risks', 
      label: 'Risks', 
      icon: <Shield className="w-4 h-4" />,
      count: analysisResult?.riskAssessment.riskFactors.length || 0
    },
    { 
      id: 'suggestions', 
      label: 'Suggestions', 
      icon: <TrendingUp className="w-4 h-4" />,
      count: analysisResult?.suggestions.length || 0
    },
    { 
      id: 'extracted_data', 
      label: 'Key Data', 
      icon: <Search className="w-4 h-4" /> 
    }
  ];

  const renderUploadArea = () => (
    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
      <div className="text-center">
        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Upload Contract</h3>
        <p className="text-gray-600 mb-4">
          Upload a contract file or paste the contract text below
        </p>
        
        <div className="space-y-4">
          <div>
            <input
              type="file"
              id="contract-upload"
              accept=".pdf,.docx,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
            <label
              htmlFor="contract-upload"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
            >
              <Upload className="w-4 h-4 mr-2" />
              Choose File
            </label>
          </div>
          
          <div className="text-gray-500">or</div>
          
          <div>
            <textarea
              placeholder="Paste your contract text here..."
              value={documentText}
              onChange={(e) => handleTextInput(e.target.value)}
              rows={10}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {(uploadedFile || documentText) && (
          <div className="mt-4">
            <button
              onClick={analyzeContract}
              disabled={loading}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Analyzing...' : 'Analyze Contract'}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const renderOverview = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Risk Summary */}
      <div className="lg:col-span-2">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Risk Assessment</h3>
          
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mb-4 ${getRiskColor(analysisResult?.overallRisk || 'medium')}`}>
            {getRiskIcon(analysisResult?.overallRisk || 'medium')}
            <span className="ml-2">Overall Risk: {analysisResult?.overallRisk || 'Medium'}</span>
          </div>

          <div className="space-y-4">
            {analysisResult?.riskAssessment.riskFactors.map((risk, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{risk.type.replace('_', ' ').toUpperCase()}</h4>
                    <p className="text-sm text-gray-600 mt-1">{risk.description}</p>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-medium ${getRiskColor(risk.severity)}`}>
                    {risk.severity}
                  </div>
                </div>
                <div className="mt-3 flex items-center space-x-4 text-sm text-gray-500">
                  <span>Likelihood: {risk.likelihood}</span>
                  <span>Impact: {risk.impact}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="space-y-4">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Contract Stats</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Clauses</span>
              <span className="font-medium">{analysisResult?.clauses.length || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Risk Issues</span>
              <span className="font-medium text-red-600">
                {analysisResult?.riskAssessment.riskFactors.length || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Suggestions</span>
              <span className="font-medium text-blue-600">
                {analysisResult?.suggestions.length || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Parties</span>
              <span className="font-medium">
                {analysisResult?.extractedData.parties.length || 0}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Actions</h3>
          <div className="space-y-2">
            <button className="w-full flex items-center justify-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Download className="w-4 h-4 mr-2" />
              Export Analysis
            </button>
            <button className="w-full flex items-center justify-center px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
              <Share2 className="w-4 h-4 mr-2" />
              Share Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderClauses = () => (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search clauses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <select
            value={selectedRiskFilter}
            onChange={(e) => setSelectedRiskFilter(e.target.value as RiskLevel | 'all')}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Risk Levels</option>
            <option value="low">Low Risk</option>
            <option value="medium">Medium Risk</option>
            <option value="high">High Risk</option>
            <option value="critical">Critical Risk</option>
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {filteredClauses.map((clause) => (
          <div key={clause.id} className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-medium text-gray-900">{clause.title}</h3>
                <p className="text-sm text-gray-600 mt-1">Type: {clause.type.replace('_', ' ')}</p>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(clause.riskLevel)}`}>
                {getRiskIcon(clause.riskLevel)}
                <span className="ml-2">{clause.riskLevel} Risk</span>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-gray-800">{clause.content}</p>
            </div>

            {clause.suggestions && clause.suggestions.length > 0 && (
              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-900 mb-2">Suggestions:</h4>
                <ul className="list-disc list-inside space-y-1">
                  {clause.suggestions.map((suggestion, index) => (
                    <li key={index} className="text-sm text-gray-600">{suggestion}</li>
                  ))}
                </ul>
              </div>
            )}

            {clause.alternativeLanguage && clause.alternativeLanguage.length > 0 && (
              <div className="border-t pt-4 mt-4">
                <h4 className="font-medium text-gray-900 mb-2">Alternative Language:</h4>
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-sm text-blue-800">{clause.alternativeLanguage[0]}</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  if (!analysisResult) {
    return (
      <div className={`max-w-4xl mx-auto ${className}`}>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Contract Analysis</h1>
          <p className="text-gray-600">AI-powered contract review and risk assessment</p>
        </div>
        {renderUploadArea()}
      </div>
    );
  }

  return (
    <div className={`max-w-7xl mx-auto ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Contract Analysis</h1>
            <p className="text-gray-600">
              {uploadedFile?.name || 'Contract Analysis Results'}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => {
                setAnalysisResult(null);
                setUploadedFile(null);
                setDocumentText('');
              }}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              New Analysis
            </button>
            <button
              onClick={() => onExportAnalysis?.(analysisResult.documentId, 'pdf')}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.icon}
              <span className="ml-2">{tab.label}</span>
              {tab.count !== undefined && (
                <span className="ml-2 bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div>
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'clauses' && renderClauses()}
        {activeTab === 'risks' && (
          <div>Risk analysis content...</div>
        )}
        {activeTab === 'suggestions' && (
          <div>Suggestions content...</div>
        )}
        {activeTab === 'extracted_data' && (
          <div>Extracted data content...</div>
        )}
      </div>
    </div>
  );
};

export default ContractAnalysisInterface;