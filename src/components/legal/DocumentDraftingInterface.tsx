import React, { useState, useEffect } from 'react';
import { LegalComponentProps, LegalDocumentType, LegalCategory } from '../../types/legal';
import DocumentDraftingService, { DraftingTemplate, DraftingResult, DocumentAssemblyRequest } from '../../services/legal/DocumentDraftingService';

interface DocumentDraftingInterfaceProps extends LegalComponentProps {
  initialDocumentType?: LegalDocumentType;
  initialTemplate?: string;
  onDocumentSaved?: (documentId: string) => void;
  onDocumentExported?: (documentId: string, format: string) => void;
}

interface TemplateVariable {
  name: string;
  type: 'text' | 'date' | 'number' | 'select' | 'boolean';
  required: boolean;
  value?: any;
  options?: string[];
  description?: string;
}

export const DocumentDraftingInterface: React.FC<DocumentDraftingInterfaceProps> = ({
  user,
  matter,
  client,
  initialDocumentType,
  initialTemplate,
  onDocumentSaved,
  onDocumentExported,
  className = ''
}) => {
  const [draftingService] = useState(() => new DocumentDraftingService());
  const [selectedDocType, setSelectedDocType] = useState<LegalDocumentType>(initialDocumentType || 'contract');
  const [templates, setTemplates] = useState<DraftingTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<DraftingTemplate | null>(null);
  const [templateVariables, setTemplateVariables] = useState<Record<string, any>>({});
  const [generatedContent, setGeneratedContent] = useState<string>('');
  const [draftingResult, setDraftingResult] = useState<DraftingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'template' | 'prompt' | 'preview' | 'review'>('template');
  const [promptInput, setPromptInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<LegalCategory | 'all'>('all');
  
  const docTypes: Array<{ value: LegalDocumentType; label: string; icon: React.ReactNode }> = [
    { value: 'contract', label: 'Contract', icon: <FileText className="w-4 h-4" /> },
    { value: 'brief', label: 'Brief', icon: <BookOpen className="w-4 h-4" /> },
    { value: 'memo', label: 'Memo', icon: <FileText className="w-4 h-4" /> },
    { value: 'pleading', label: 'Pleading', icon: <FileText className="w-4 h-4" /> },
    { value: 'motion', label: 'Motion', icon: <FileText className="w-4 h-4" /> },
    { value: 'agreement', label: 'Agreement', icon: <FileText className="w-4 h-4" /> },
    { value: 'correspondence', label: 'Letter', icon: <FileText className="w-4 h-4" /> }
  ];

  const categories: Array<{ value: LegalCategory | 'all'; label: string }> = [
    { value: 'all', label: 'All Categories' },
    { value: 'corporate', label: 'Corporate' },
    { value: 'litigation', label: 'Litigation' },
    { value: 'employment', label: 'Employment' },
    { value: 'intellectual_property', label: 'IP' },
    { value: 'real_estate', label: 'Real Estate' },
    { value: 'regulatory', label: 'Regulatory' }
  ];

  useEffect(() => {
    loadTemplates();
  }, [selectedDocType, selectedCategory]);

  useEffect(() => {
    if (initialTemplate && templates.length > 0) {
      const template = templates.find(t => t.id === initialTemplate);
      if (template) {
        setSelectedTemplate(template);
        initializeTemplateVariables(template);
      }
    }
  }, [initialTemplate, templates]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const filters = {
        type: [selectedDocType],
        ...(selectedCategory !== 'all' && { category: [selectedCategory] }),
        isActive: true
      };
      
      const templatesData = await draftingService.getTemplates(filters);
      setTemplates(templatesData);
    } catch (error) {
      console.error('Error loading templates:', error);
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  const initializeTemplateVariables = (template: DraftingTemplate) => {
    const variables: Record<string, any> = {};
    template.variables.forEach(variable => {
      variables[variable.name] = variable.defaultValue || '';
    });
    
    // Pre-populate with context if available
    if (client) variables.client_name = client;
    if (matter) variables.matter_number = matter;
    if (user?.name) variables.attorney_name = user.name;
    if (user?.firm) variables.firm_name = user.firm;
    
    setTemplateVariables(variables);
  };

  const handleTemplateSelect = (template: DraftingTemplate) => {
    setSelectedTemplate(template);
    initializeTemplateVariables(template);
    setActiveTab('template');
  };

  const handleVariableChange = (variableName: string, value: any) => {
    setTemplateVariables(prev => ({
      ...prev,
      [variableName]: value
    }));
  };

  const generateFromTemplate = async () => {
    if (!selectedTemplate) return;

    try {
      setLoading(true);
      const request: DocumentAssemblyRequest = {
        templateId: selectedTemplate.id,
        variables: templateVariables,
        selectedClauses: selectedTemplate.clauses.map(c => c.id),
        customizations: [],
        outputFormat: 'html',
        jurisdiction: selectedTemplate.jurisdiction,
        practiceArea: selectedTemplate.category
      };

      const result = await draftingService.assembleDocument(request);
      setDraftingResult(result);
      setGeneratedContent(result.content);
      setActiveTab('preview');
    } catch (error) {
      console.error('Error generating document:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateFromPrompt = async () => {
    if (!promptInput.trim()) return;

    try {
      setLoading(true);
      const result = await draftingService.generateFromPrompt(
        promptInput, 
        selectedDocType, 
        ['US', 'Federal']
      );
      
      setDraftingResult(result);
      setGeneratedContent(result.content);
      setActiveTab('preview');
    } catch (error) {
      console.error('Error generating from prompt:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDocument = async () => {
    if (!draftingResult) return;

    try {
      // Save document logic here
      const documentId = `doc_${Date.now()}`;
      onDocumentSaved?.(documentId);
    } catch (error) {
      console.error('Error saving document:', error);
    }
  };

  const handleExportDocument = async (format: 'docx' | 'pdf' | 'html') => {
    if (!draftingResult) return;

    try {
      const blob = await draftingService.exportDocument(draftingResult.documentId, format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `document.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      
      onDocumentExported?.(draftingResult.documentId, format);
    } catch (error) {
      console.error('Error exporting document:', error);
    }
  };

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderTemplateSelector = () => (
    <div className="space-y-4">
      <div className="flex items-center space-x-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value as LegalCategory | 'all')}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {categories.map(category => (
            <option key={category.value} value={category.value}>
              {category.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
        {filteredTemplates.map((template) => (
          <div
            key={template.id}
            onClick={() => handleTemplateSelect(template)}
            className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
              selectedTemplate?.id === template.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-medium text-gray-900 truncate">{template.name}</h3>
              <div className="flex items-center text-xs text-gray-500">
                <User className="w-3 h-3 mr-1" />
                {template.usageCount}
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-3 line-clamp-2">{template.description}</p>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span className="bg-gray-100 px-2 py-1 rounded">{template.category}</span>
              <span>{template.jurisdiction.join(', ')}</span>
            </div>
          </div>
        ))}
      </div>

      {selectedTemplate && (
        <div className="border-t pt-4">
          <h3 className="font-medium text-gray-900 mb-3">Template Variables</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {selectedTemplate.variables.map((variable) => (
              <div key={variable.name}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {variable.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  {variable.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                {variable.type === 'select' ? (
                  <select
                    value={templateVariables[variable.name] || ''}
                    onChange={(e) => handleVariableChange(variable.name, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select...</option>
                    {variable.options?.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                ) : variable.type === 'date' ? (
                  <input
                    type="date"
                    value={templateVariables[variable.name] || ''}
                    onChange={(e) => handleVariableChange(variable.name, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                ) : variable.type === 'boolean' ? (
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={templateVariables[variable.name] || false}
                      onChange={(e) => handleVariableChange(variable.name, e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 text-sm text-gray-600">Yes</label>
                  </div>
                ) : (
                  <input
                    type={variable.type === 'number' ? 'number' : 'text'}
                    value={templateVariables[variable.name] || ''}
                    onChange={(e) => handleVariableChange(variable.name, e.target.value)}
                    placeholder={variable.description}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                )}
              </div>
            ))}
          </div>
          <div className="mt-4">
            <button
              onClick={generateFromTemplate}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Generating...' : 'Generate Document'}
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const renderPromptInput = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Describe the document you want to create
        </label>
        <textarea
          value={promptInput}
          onChange={(e) => setPromptInput(e.target.value)}
          placeholder="Example: Create a non-disclosure agreement for a technology startup working with contractors. Include standard confidentiality clauses, non-compete provisions, and intellectual property protection..."
          rows={8}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          <Sparkles className="w-4 h-4 inline mr-1" />
          AI will generate a complete document based on your description
        </div>
        <button
          onClick={generateFromPrompt}
          disabled={loading || !promptInput.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Generating...' : 'Generate from Description'}
        </button>
      </div>
    </div>
  );

  const renderPreview = () => (
    <div className="space-y-4">
      {draftingResult && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <div className="flex items-center mb-2">
            <AlertCircle className="w-5 h-5 text-yellow-600 mr-2" />
            <h3 className="font-medium text-yellow-800">Review Suggestions</h3>
          </div>
          <div className="space-y-2">
            {draftingResult.suggestions.map((suggestion, index) => (
              <div key={index} className="text-sm text-yellow-700">
                • {suggestion}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="border rounded-lg bg-white">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-medium text-gray-900">Document Preview</h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleSaveDocument}
              className="flex items-center px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
            >
              <Save className="w-4 h-4 mr-1" />
              Save
            </button>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => handleExportDocument('docx')}
                className="flex items-center px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
              >
                <Download className="w-4 h-4 mr-1" />
                Word
              </button>
              <button
                onClick={() => handleExportDocument('pdf')}
                className="flex items-center px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
              >
                <Download className="w-4 h-4 mr-1" />
                PDF
              </button>
            </div>
          </div>
        </div>
        <div 
          className="p-6 prose max-w-none"
          dangerouslySetInnerHTML={{ __html: generatedContent }}
        />
      </div>
    </div>
  );

  return (
    <div className={`max-w-7xl mx-auto ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Document Drafting</h1>
            <p className="text-gray-600">Create legal documents with AI assistance</p>
          </div>
          <div className="flex items-center space-x-4">
            {(matter || client) && (
              <div className="text-sm text-gray-600">
                {matter && `Matter: ${matter}`}
                {matter && client && ' • '}
                {client && `Client: ${client}`}
              </div>
            )}
          </div>
        </div>

        {/* Document Type Selector */}
        <div className="mt-4">
          <div className="flex items-center space-x-2 overflow-x-auto pb-2">
            {docTypes.map((docType) => (
              <button
                key={docType.value}
                onClick={() => setSelectedDocType(docType.value)}
                className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                  selectedDocType === docType.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {docType.icon}
                <span className="ml-2">{docType.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'template', label: 'Template', icon: FileText },
            { id: 'prompt', label: 'AI Prompt', icon: Sparkles },
            { id: 'preview', label: 'Preview', icon: Eye, disabled: !generatedContent },
            { id: 'review', label: 'Review', icon: CheckCircle, disabled: !draftingResult }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => !tab.disabled && setActiveTab(tab.id as any)}
              disabled={tab.disabled}
              className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : tab.disabled
                  ? 'border-transparent text-gray-400 cursor-not-allowed'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6">
          {activeTab === 'template' && renderTemplateSelector()}
          {activeTab === 'prompt' && renderPromptInput()}
          {activeTab === 'preview' && renderPreview()}
          {activeTab === 'review' && draftingResult && (
            <div>
              <h3 className="font-medium text-gray-900 mb-4">Document Analysis</h3>
              {/* Review content would go here */}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentDraftingInterface;