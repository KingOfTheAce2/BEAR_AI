import React, { useState, useEffect, useMemo } from 'react'
import {
  Search,
  Filter,
  Bookmark,
  BookmarkCheck,
  Download,
  ExternalLink,
  Star,
  Calendar,
  MapPin,
  Scale,
  FileText,
  Gavel,
  Book,
  Newspaper,
  Save,
  History,
  Trash2,
  SortAsc,
  SortDesc,
  Eye,
  Copy,
  Share2,
  RefreshCw
} from 'lucide-react'
import { useResearchStore } from '../store/researchStore'
import { useHistoryStore } from '../store/historyStore'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import type { ResearchResult, ResearchFilters } from '../types'

const Research: React.FC = () => {
  const {
    results,
    filters,
    savedSearches,
    bookmarkedResults,
    searchHistory,
    isLoading,
    performSearch,
    updateFilters,
    saveSearch,
    loadSavedSearch,
    deleteSavedSearch,
    bookmarkResult,
    unbookmarkResult,
    exportResults,
    clearResults,
    getSearchSuggestions
  } = useResearchStore()
  
  const { addActivity } = useHistoryStore()
  
  const [searchQuery, setSearchQuery] = useState('')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [showSavedSearches, setShowSavedSearches] = useState(false)
  const [saveSearchName, setSaveSearchName] = useState('')
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedResult, setSelectedResult] = useState<string | null>(null)
  
  // Update search suggestions as user types
  useEffect(() => {
    if (searchQuery.length > 2) {
      const suggestions = getSearchSuggestions(searchQuery)
      setSearchSuggestions(suggestions)
      setShowSuggestions(suggestions.length > 0)
    } else {
      setShowSuggestions(false)
    }
  }, [searchQuery, getSearchSuggestions])
  
  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    
    await performSearch(searchQuery, filters)
    
    // Add to activity history
    addActivity({
      type: 'search_performed',
      userId: 'current-user',
      metadata: {
        query: searchQuery,
        type: 'research',
        filters: filters,
        results: results.length,
      },
    })
    
    setShowSuggestions(false)
  }
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }
  
  const handleSaveSearch = () => {
    if (saveSearchName.trim()) {
      saveSearch(saveSearchName)
      setSaveSearchName('')
      setShowSaveDialog(false)
    }
  }
  
  const handleBookmark = (resultId: string) => {
    const isBookmarked = bookmarkedResults.includes(resultId)
    if (isBookmarked) {
      unbookmarkResult(resultId)
    } else {
      bookmarkResult(resultId)
    }
    
    const result = results.find(r => r.id === resultId)
    if (result) {
      addActivity({
        type: 'search_performed',
        userId: 'current-user',
        metadata: {
          action: isBookmarked ? 'unbookmark' : 'bookmark',
          resultId: resultId,
          resultTitle: result.title,
        },
      })
    }
  }
  
  const copyResultText = (result: ResearchResult) => {
    const text = `${result.title}\n${result.source}\n\n${result.snippet}\n\n${result.url || ''}`
    navigator.clipboard.writeText(text)
    setSelectedResult(result.id)
    setTimeout(() => setSelectedResult(null), 2000)
  }
  
  const getDocumentTypeIcon = (type: ResearchResult['type']) => {
    switch (type) {
      case 'case': return <Gavel className="w-4 h-4 text-blue-600" />
      case 'statute': return <Book className="w-4 h-4 text-green-600" />
      case 'regulation': return <Scale className="w-4 h-4 text-purple-600" />
      case 'article': return <Newspaper className="w-4 h-4 text-orange-600" />
      case 'brief': return <FileText className="w-4 h-4 text-red-600" />
      default: return <FileText className="w-4 h-4 text-gray-600" />
    }
  }
  
  const getRelevanceColor = (relevance: number) => {
    if (relevance >= 0.9) return 'text-green-600 bg-green-50'
    if (relevance >= 0.7) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }
  
  const filteredResults = useMemo(() => {
    return results.filter(result => result.relevance >= (filters.relevanceThreshold || 0))
  }, [results, filters.relevanceThreshold])
  
  return (
    <div className="flex h-full bg-gray-50">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Search History & Saved Searches */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex space-x-2 mb-3">
            <Button
              variant={showSavedSearches ? "default" : "outline"}
              size="sm"
              onClick={() => setShowSavedSearches(!showSavedSearches)}
              className="flex-1"
            >
              <Save className="w-3 h-3 mr-1" />
              Saved ({savedSearches.length})
            </Button>
            <Button
              variant={!showSavedSearches ? "default" : "outline"}
              size="sm"
              onClick={() => setShowSavedSearches(false)}
              className="flex-1"
            >
              <History className="w-3 h-3 mr-1" />
              History
            </Button>
          </div>
          
          {showSavedSearches ? (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-700">Saved Searches</h3>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {savedSearches.map((saved) => (
                  <div
                    key={saved.id}
                    className="flex items-center justify-between p-2 hover:bg-gray-50 rounded"
                  >
                    <button
                      onClick={() => loadSavedSearch(saved.id)}
                      className="flex-1 text-left text-sm text-gray-700 truncate"
                      title={saved.query}
                    >
                      {saved.name}
                    </button>
                    <button
                      onClick={() => deleteSavedSearch(saved.id)}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-700">Recent Searches</h3>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {searchHistory.slice(0, 10).map((query, index) => (
                  <button
                    key={index}
                    onClick={() => setSearchQuery(query)}
                    className="block w-full text-left p-2 text-sm text-gray-600 hover:bg-gray-50 rounded truncate"
                  >
                    {query}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Advanced Filters */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-700">Filters</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            >
              <Filter className="w-3 h-3 mr-1" />
              {showAdvancedFilters ? 'Hide' : 'Show'}
            </Button>
          </div>
          
          {/* Quick Filters */}
          <div className="space-y-4">
            {/* Document Types */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Document Types
              </label>
              <div className="space-y-1">
                {['case', 'statute', 'regulation', 'article', 'brief', 'other'].map((type) => (
                  <label key={type} className="flex items-center text-sm">
                    <input
                      type="checkbox"
                      checked={filters.documentTypes?.includes(type) || false}
                      onChange={(e) => {
                        const current = filters.documentTypes || []
                        const updated = e.target.checked
                          ? [...current, type]
                          : current.filter(t => t !== type)
                        updateFilters({ documentTypes: updated })
                      }}
                      className="mr-2"
                    />
                    <span className="capitalize">{type}</span>
                  </label>
                ))}
              </div>
            </div>
            
            {/* Relevance Threshold */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Min Relevance: {((filters.relevanceThreshold || 0.7) * 100).toFixed(0)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={filters.relevanceThreshold || 0.7}
                onChange={(e) => updateFilters({ relevanceThreshold: parseFloat(e.target.value) })}
                className="w-full"
              />
            </div>
            
            {/* Sort Options */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Sort By
              </label>
              <select
                value={`${filters.sortBy || 'relevance'}-${filters.sortOrder || 'desc'}`}
                onChange={(e) => {
                  const [sortBy, sortOrder] = e.target.value.split('-')
                  updateFilters({ sortBy: sortBy as any, sortOrder: sortOrder as any })
                }}
                className="w-full text-sm border border-gray-300 rounded px-2 py-1"
              >
                <option value="relevance-desc">Relevance (High to Low)</option>
                <option value="relevance-asc">Relevance (Low to High)</option>
                <option value="date-desc">Date (Newest First)</option>
                <option value="date-asc">Date (Oldest First)</option>
                <option value="title-asc">Title (A-Z)</option>
                <option value="title-desc">Title (Z-A)</option>
              </select>
            </div>
            
            {showAdvancedFilters && (
              <>
                {/* Jurisdiction */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Jurisdiction
                  </label>
                  <div className="space-y-1">
                    {['Federal', 'California', 'New York', 'Texas', 'Florida'].map((jurisdiction) => (
                      <label key={jurisdiction} className="flex items-center text-sm">
                        <input
                          type="checkbox"
                          checked={filters.jurisdiction?.includes(jurisdiction) || false}
                          onChange={(e) => {
                            const current = filters.jurisdiction || []
                            const updated = e.target.checked
                              ? [...current, jurisdiction]
                              : current.filter(j => j !== jurisdiction)
                            updateFilters({ jurisdiction: updated })
                          }}
                          className="mr-2"
                        />
                        <span>{jurisdiction}</span>
                      </label>
                    ))}
                  </div>
                </div>
                
                {/* Practice Areas */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Practice Areas
                  </label>
                  <div className="space-y-1">
                    {['Contract Law', 'Civil Procedure', 'Constitutional Law', 'Criminal Law', 'Tort Law', 'Commercial Law'].map((area) => (
                      <label key={area} className="flex items-center text-sm">
                        <input
                          type="checkbox"
                          checked={filters.practiceArea?.includes(area) || false}
                          onChange={(e) => {
                            const current = filters.practiceArea || []
                            const updated = e.target.checked
                              ? [...current, area]
                              : current.filter(a => a !== area)
                            updateFilters({ practiceArea: updated })
                          }}
                          className="mr-2"
                        />
                        <span>{area}</span>
                      </label>
                    ))}
                  </div>
                </div>
                
                {/* Date Range */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Date Range
                  </label>
                  <div className="space-y-2">
                    <input
                      type="date"
                      value={filters.dateRange?.start?.toISOString().split('T')[0] || ''}
                      onChange={(e) => {
                        const date = e.target.value ? new Date(e.target.value) : undefined
                        updateFilters({ 
                          dateRange: { ...filters.dateRange, start: date }
                        })
                      }}
                      className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                    />
                    <input
                      type="date"
                      value={filters.dateRange?.end?.toISOString().split('T')[0] || ''}
                      onChange={(e) => {
                        const date = e.target.value ? new Date(e.target.value) : undefined
                        updateFilters({ 
                          dateRange: { ...filters.dateRange, end: date }
                        })
                      }}
                      className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
          
          {/* Clear Filters */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => updateFilters({
              documentTypes: [],
              jurisdiction: [],
              practiceArea: [],
              dateRange: undefined,
              relevanceThreshold: 0.7,
              sortBy: 'relevance',
              sortOrder: 'desc'
            })}
            className="w-full mt-4"
          >
            Clear All Filters
          </Button>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Legal Research</h1>
              <p className="text-gray-600">
                Search through comprehensive legal databases
              </p>
            </div>
            
            {results.length > 0 && (
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSaveDialog(true)}
                >
                  <Save className="w-4 h-4 mr-1" />
                  Save Search
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportResults('json')}
                >
                  <Download className="w-4 h-4 mr-1" />
                  Export
                </Button>
                <select
                  onChange={(e) => exportResults(e.target.value as any)}
                  className="text-sm border border-gray-300 rounded px-2 py-1"
                  defaultValue=""
                >
                  <option value="" disabled>Export as...</option>
                  <option value="json">JSON</option>
                  <option value="csv">CSV</option>
                  <option value="pdf">PDF</option>
                </select>
              </div>
            )}
          </div>
          
          {/* Search Bar */}
          <div className="relative">
            <div className="flex items-center space-x-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  type="text"
                  placeholder="Search legal documents, cases, statutes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="pl-12 pr-4 py-3 text-lg"
                />
                
                {/* Search Suggestions */}
                {showSuggestions && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 z-10">
                    {searchSuggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setSearchQuery(suggestion)
                          setShowSuggestions(false)
                        }}
                        className="block w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                      >
                        <div className="flex items-center">
                          <History className="w-3 h-3 text-gray-400 mr-2" />
                          <span>{suggestion}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <Button
                onClick={handleSearch}
                disabled={!searchQuery.trim() || isLoading}
                className="px-8 py-3"
              >
                {isLoading ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Search className="w-5 h-5 mr-2" />
                    Search
                  </>
                )}
              </Button>
            </div>
            
            {/* Boolean Operators Help */}
            <div className="mt-2 text-sm text-gray-500">
              <span className="mr-4">
                Use <code className="bg-gray-100 px-1 rounded">AND</code>, <code className="bg-gray-100 px-1 rounded">OR</code>, <code className="bg-gray-100 px-1 rounded">NOT</code> for advanced searches
              </span>
              <span className="mr-4">
                Use quotes for exact phrases: <code className="bg-gray-100 px-1 rounded">"breach of contract"</code>
              </span>
            </div>
          </div>
        </div>
        
        {/* Results */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
                <p className="text-gray-600">Searching legal databases...</p>
              </div>
            </div>
          ) : results.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchQuery ? 'No results found' : 'Start your research'}
                </h3>
                <p className="text-gray-600 max-w-md">
                  {searchQuery 
                    ? 'Try adjusting your search terms or filters to find relevant legal documents.'
                    : 'Enter search terms above to find cases, statutes, regulations, and legal articles.'
                  }
                </p>
              </div>
            </div>
          ) : (
            <div>
              {/* Results Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-medium text-gray-900">
                    {filteredResults.length} result{filteredResults.length !== 1 ? 's' : ''} found
                  </h2>
                  {searchQuery && (
                    <p className="text-gray-600">
                      for "{searchQuery}"
                    </p>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearResults}
                  >
                    Clear Results
                  </Button>
                </div>
              </div>
              
              {/* Results List */}
              <div className="space-y-6">
                {filteredResults.map((result) => (
                  <div
                    key={result.id}
                    className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {/* Result Header */}
                        <div className="flex items-center space-x-3 mb-2">
                          {getDocumentTypeIcon(result.type)}
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRelevanceColor(result.relevance)}`}>
                            {(result.relevance * 100).toFixed(0)}% match
                          </span>
                          <span className="text-xs text-gray-500 uppercase">
                            {result.type}
                          </span>
                        </div>
                        
                        {/* Title */}
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {result.title}
                        </h3>
                        
                        {/* Metadata */}
                        <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                          <span className="flex items-center">
                            <MapPin className="w-3 h-3 mr-1" />
                            {result.jurisdiction}
                          </span>
                          <span className="flex items-center">
                            <Calendar className="w-3 h-3 mr-1" />
                            {result.publishedDate.toLocaleDateString()}
                          </span>
                          <span className="flex items-center">
                            <Star className="w-3 h-3 mr-1" />
                            {result.citations} citations
                          </span>
                        </div>
                        
                        {/* Source */}
                        <p className="text-sm font-medium text-gray-700 mb-2">
                          {result.source}
                        </p>
                        
                        {/* Snippet */}
                        <p className="text-gray-700 mb-4 leading-relaxed">
                          {result.snippet}
                        </p>
                        
                        {/* Practice Areas */}
                        <div className="flex flex-wrap gap-2 mb-4">
                          {result.practiceArea.map((area, index) => (
                            <span
                              key={index}
                              className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                            >
                              {area}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex items-center space-x-2 ml-6">
                        <button
                          onClick={() => handleBookmark(result.id)}
                          className={`p-2 rounded-full transition-colors ${
                            bookmarkedResults.includes(result.id)
                              ? 'bg-yellow-100 text-yellow-600'
                              : 'text-gray-400 hover:bg-gray-100'
                          }`}
                          title={bookmarkedResults.includes(result.id) ? 'Remove bookmark' : 'Bookmark'}
                        >
                          {bookmarkedResults.includes(result.id) ? (
                            <BookmarkCheck className="w-4 h-4" />
                          ) : (
                            <Bookmark className="w-4 h-4" />
                          )}
                        </button>
                        
                        <button
                          onClick={() => copyResultText(result)}
                          className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"
                          title="Copy result"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        
                        <button
                          className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"
                          title="Share result"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                        
                        {result.url && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(result.url, '_blank')}
                          >
                            <ExternalLink className="w-3 h-3 mr-1" />
                            View
                          </Button>
                        )}
                        
                        {selectedResult === result.id && (
                          <div className="absolute -top-8 right-0 bg-green-600 text-white px-2 py-1 rounded text-xs">
                            Copied!
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Save Search Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Save Search</h3>
            <Input
              type="text"
              placeholder="Enter search name..."
              value={saveSearchName}
              onChange={(e) => setSaveSearchName(e.target.value)}
              className="mb-4"
            />
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowSaveDialog(false)
                  setSaveSearchName('')
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveSearch}>
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Research