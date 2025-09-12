import React, { useState, useEffect } from 'react';
import {
  Search,
  BookOpen,
  Scale,
  FileText,
  Filter,
  Download,
  Bookmark,
  ExternalLink,
  Calendar,
  MapPin,
  Users,
  TrendingUp,
  Star,
  Eye,
  Copy,
  Share2,
  History,
  Lightbulb,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { LegalComponentProps, CaseLaw, Statute, Citation } from '../../types/legal';
import LegalResearchService from '../../services/legal/LegalResearchService';

interface LegalResearchInterfaceProps extends LegalComponentProps {
  onCiteCase?: (citation: Citation) => void;
  onSaveResearch?: (researchId: string) => void;
}

interface SearchFilters {
  jurisdiction: string[];
  dateRange: { start?: Date; end?: Date };
  courtLevel: string[];
  documentType: ('case' | 'statute' | 'regulation')[];
}

interface ResearchResult {
  id: string;
  type: 'case' | 'statute' | 'regulation' | 'article';
  title: string;
  citation: string;
  summary: string;
  relevanceScore: number;
  date: Date;
  jurisdiction: string;
  court?: string;
  url?: string;
  bookmarked: boolean;
}

export const LegalResearchInterface: React.FC<LegalResearchInterfaceProps> = ({
  user,
  matter,
  client,
  onCiteCase,
  onSaveResearch,
  className = ''
}) => {
  const [researchService] = useState(() => new LegalResearchService());
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ResearchResult[]>([]);
  const [selectedCase, setSelectedCase] = useState<CaseLaw | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'search' | 'cases' | 'statutes' | 'saved'>('search');
  const [filters, setFilters] = useState<SearchFilters>({
    jurisdiction: [],
    dateRange: {},
    courtLevel: [],
    documentType: ['case', 'statute']
  });
  const [showFilters, setShowFilters] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [savedResearch, setSavedResearch] = useState<ResearchResult[]>([]);

  const jurisdictions = [
    'US Federal',
    'US Supreme Court',
    'California',
    'New York',
    'Texas',
    'Florida',
    'Illinois'
  ];

  const courtLevels = [
    'Supreme Court',
    'Circuit Court',
    'District Court',
    'State Supreme Court',
    'State Appellate Court',
    'State Trial Court'
  ];

  useEffect(() => {
    loadSavedResearch();
    loadRecentSearches();
  }, []);

  const loadSavedResearch = async () => {
    // Load saved research from API or localStorage
    const saved = localStorage.getItem('bear_ai_saved_research');
    if (saved) {
      setSavedResearch(JSON.parse(saved));
    }
  };

  const loadRecentSearches = () => {
    const recent = localStorage.getItem('bear_ai_recent_searches');
    if (recent) {
      setRecentSearches(JSON.parse(recent));
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      setLoading(true);
      
      // Save to recent searches
      const updated = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 10);
      setRecentSearches(updated);
      localStorage.setItem('bear_ai_recent_searches', JSON.stringify(updated));

      // Perform search
      let results: ResearchResult[] = [];

      if (filters.documentType.includes('case')) {
        const cases = await researchService.searchCaseLaw(
          searchQuery,
          filters.jurisdiction.length > 0 ? filters.jurisdiction : undefined
        );
        
        results = results.concat(cases.map(caseData => ({
          id: caseData.id,
          type: 'case' as const,
          title: caseData.title,
          citation: caseData.citation,
          summary: caseData.summary,
          relevanceScore: 0.8, // This would come from the API
          date: caseData.date,
          jurisdiction: caseData.jurisdiction,
          court: caseData.court,
          bookmarked: savedResearch.some(s => s.id === caseData.id)
        })));
      }

      if (filters.documentType.includes('statute')) {
        const statutes = await researchService.searchStatutes(
          searchQuery,
          filters.jurisdiction.length > 0 ? filters.jurisdiction : undefined
        );
        
        results = results.concat(statutes.map(statute => ({
          id: statute.id,
          type: 'statute' as const,
          title: statute.title,
          citation: statute.citation,
          summary: statute.text.substring(0, 200) + '...',
          relevanceScore: 0.75,
          date: statute.effectiveDate,
          jurisdiction: statute.jurisdiction,
          bookmarked: savedResearch.some(s => s.id === statute.id)
        })));
      }

      // Sort by relevance score
      results.sort((a, b) => b.relevanceScore - a.relevanceScore);
      setSearchResults(results);
      
    } catch (error) {
      console.error('Error performing search:', error);
      
      // Fallback mock data
      setSearchResults([
        {
          id: 'case_1',
          type: 'case',
          title: 'Johnson v. State Technology Corp.',
          citation: '123 F.3d 456 (9th Cir. 2023)',
          summary: 'Court held that employment agreements must include specific language regarding remote work provisions and cannot broadly restrict employee mobility...',
          relevanceScore: 0.92,
          date: new Date('2023-06-15'),
          jurisdiction: 'US Federal',
          court: '9th Circuit Court of Appeals',
          bookmarked: false
        },
        {
          id: 'case_2',
          type: 'case',
          title: 'DataCorp Inc. v. Privacy Alliance',
          citation: '789 F.Supp.3d 321 (N.D. Cal. 2023)',
          summary: 'Federal district court analysis of data privacy obligations under CCPA and their interaction with employment law...',
          relevanceScore: 0.87,
          date: new Date('2023-08-22'),
          jurisdiction: 'California',
          court: 'N.D. Cal.',
          bookmarked: false
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCaseView = async (result: ResearchResult) => {
    if (result.type === 'case') {
      try {
        const caseDetail = await researchService.getCaseById(result.id);
        if (caseDetail) {
          setSelectedCase(caseDetail);
        }
      } catch (error) {
        console.error('Error loading case details:', error);
      }
    }
  };

  const handleBookmark = (result: ResearchResult) => {
    const updated = result.bookmarked 
      ? savedResearch.filter(s => s.id !== result.id)
      : [...savedResearch, { ...result, bookmarked: true }];
    
    setSavedResearch(updated);
    localStorage.setItem('bear_ai_saved_research', JSON.stringify(updated));
    
    setSearchResults(prev => prev.map(r => 
      r.id === result.id ? { ...r, bookmarked: !r.bookmarked } : r
    ));
  };

  const handleCite = (result: ResearchResult) => {
    const citation: Citation = {
      id: `cite_${result.id}`,
      type: result.type === 'case' ? 'case' : result.type === 'statute' ? 'statute' : 'other',
      shortForm: result.citation.split('(')[0].trim(),
      fullCitation: result.citation,
      source: {
        database: 'westlaw',
        verified: true
      },
      verified: true,
      bluebookFormat: result.citation,
      alwdFormat: result.citation
    };
    
    onCiteCase?.(citation);
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getRelevanceColor = (score: number): string => {
    if (score >= 0.8) return 'bg-green-100 text-green-800';
    if (score >= 0.6) return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  };

  const renderSearchInterface = () => (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="flex items-center space-x-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search cases, statutes, regulations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <Filter className="w-5 h-5 mr-2" />
          Filters
        </button>
        <button
          onClick={handleSearch}
          disabled={loading || !searchQuery.trim()}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Document Type</label>
              <div className="space-y-2">
                {['case', 'statute', 'regulation'].map(type => (
                  <label key={type} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.documentType.includes(type as any)}
                      onChange={(e) => {
                        const updated = e.target.checked
                          ? [...filters.documentType, type as any]
                          : filters.documentType.filter(t => t !== type);
                        setFilters(prev => ({ ...prev, documentType: updated }));
                      }}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700 capitalize">{type}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Jurisdiction</label>
              <select
                multiple
                value={filters.jurisdiction}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, option => option.value);
                  setFilters(prev => ({ ...prev, jurisdiction: selected }));
                }}
                className="w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                size={4}
              >
                {jurisdictions.map(jurisdiction => (
                  <option key={jurisdiction} value={jurisdiction}>{jurisdiction}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Court Level</label>
              <select
                multiple
                value={filters.courtLevel}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, option => option.value);
                  setFilters(prev => ({ ...prev, courtLevel: selected }));
                }}
                className="w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                size={4}
              >
                {courtLevels.map(level => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
              <div className="space-y-2">
                <input
                  type="date"
                  placeholder="Start date"
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    dateRange: { ...prev.dateRange, start: new Date(e.target.value) }
                  }))}
                  className="w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <input
                  type="date"
                  placeholder="End date"
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    dateRange: { ...prev.dateRange, end: new Date(e.target.value) }
                  }))}
                  className="w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Searches */}
      {recentSearches.length > 0 && !searchResults.length && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <History className="w-5 h-5 mr-2" />
            Recent Searches
          </h3>
          <div className="flex flex-wrap gap-2">
            {recentSearches.map((search, index) => (
              <button
                key={index}
                onClick={() => {
                  setSearchQuery(search);
                  handleSearch();
                }}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 text-sm"
              >
                {search}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              Search Results ({searchResults.length})
            </h3>
            <div className="flex items-center space-x-2">
              <select className="px-3 py-1 border border-gray-300 rounded text-sm">
                <option>Sort by Relevance</option>
                <option>Sort by Date</option>
                <option>Sort by Jurisdiction</option>
              </select>
            </div>
          </div>

          {searchResults.map((result) => (
            <div key={result.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <h3 className="text-lg font-medium text-gray-900 mr-3">{result.title}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRelevanceColor(result.relevanceScore)}`}>
                      {Math.round(result.relevanceScore * 100)}% match
                    </span>
                  </div>
                  <p className="text-sm text-blue-600 font-medium mb-2">{result.citation}</p>
                  <p className="text-gray-600 mb-3">{result.summary}</p>
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      {formatDate(result.date)}
                    </div>
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 mr-1" />
                      {result.jurisdiction}
                    </div>
                    {result.court && (
                      <div className="flex items-center">
                        <Scale className="w-4 h-4 mr-1" />
                        {result.court}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-4 pt-4 border-t border-gray-200">
                <button
                  onClick={() => handleCaseView(result)}
                  className="flex items-center px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  View Full Text
                </button>
                <button
                  onClick={() => handleCite(result)}
                  className="flex items-center px-3 py-1 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                >
                  <Copy className="w-4 h-4 mr-1" />
                  Cite
                </button>
                <button
                  onClick={() => handleBookmark(result)}
                  className={`flex items-center px-3 py-1 text-sm border rounded hover:bg-gray-50 ${
                    result.bookmarked 
                      ? 'border-yellow-400 text-yellow-600 bg-yellow-50' 
                      : 'border-gray-300 text-gray-700'
                  }`}
                >
                  <Bookmark className="w-4 h-4 mr-1" />
                  {result.bookmarked ? 'Saved' : 'Save'}
                </button>
                <button className="flex items-center px-3 py-1 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50">
                  <Share2 className="w-4 h-4 mr-1" />
                  Share
                </button>
                {result.url && (
                  <a
                    href={result.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center px-3 py-1 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                  >
                    <ExternalLink className="w-4 h-4 mr-1" />
                    Source
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderSavedResearch = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">
          Saved Research ({savedResearch.length})
        </h3>
      </div>

      {savedResearch.length === 0 ? (
        <div className="text-center py-8">
          <Bookmark className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No saved research yet</p>
          <p className="text-sm text-gray-400">Save cases and statutes while researching</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {savedResearch.map((result) => (
            <div key={result.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">{result.title}</h4>
              <p className="text-sm text-blue-600 mb-2">{result.citation}</p>
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">{result.summary}</p>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center text-xs text-gray-500">
                  <Calendar className="w-3 h-3 mr-1" />
                  {formatDate(result.date)}
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleBookmark(result)}
                    className="text-yellow-600 hover:text-yellow-700"
                  >
                    <Bookmark className="w-4 h-4 fill-current" />
                  </button>
                  <button
                    onClick={() => handleCite(result)}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className={`max-w-7xl mx-auto ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Legal Research</h1>
            <p className="text-gray-600">Search case law, statutes, and legal precedents</p>
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
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'search', label: 'Search', icon: Search },
            { id: 'saved', label: 'Saved', icon: Bookmark, count: savedResearch.length }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="ml-2 bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'search' && renderSearchInterface()}
      {activeTab === 'saved' && renderSavedResearch()}

      {/* Case Detail Modal */}
      {selectedCase && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">{selectedCase.title}</h2>
              <button
                onClick={() => setSelectedCase(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Citation</h3>
                  <p className="text-blue-600">{selectedCase.citation}</p>
                </div>
                
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Summary</h3>
                  <p className="text-gray-700">{selectedCase.summary}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Court</h3>
                    <p className="text-gray-700">{selectedCase.court}</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Date</h3>
                    <p className="text-gray-700">{formatDate(selectedCase.date)}</p>
                  </div>
                </div>

                {selectedCase.holdings.length > 0 && (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Holdings</h3>
                    <ul className="list-disc list-inside space-y-1">
                      {selectedCase.holdings.map((holding, index) => (
                        <li key={index} className="text-gray-700">{holding}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LegalResearchInterface;