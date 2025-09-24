import React, { useState, useEffect, useCallback } from 'react';
import { SearchQuery, SearchResult, FacetedSearchResult, SearchFilters, SearchOptions } from '../../../types/knowledge/types';
import KnowledgeBaseService from '../../../services/knowledge/core/KnowledgeBaseService';
import './KnowledgeSearch.css';

interface KnowledgeSearchProps {
  onResultsChange?: (results: SearchResult[]) => void;
  onDocumentSelect?: (documentId: string) => void;
  initialQuery?: string;
  className?: string;
}

export const KnowledgeSearchComponent: React.FC<KnowledgeSearchProps> = ({
  onResultsChange,
  onDocumentSelect,
  initialQuery = '',
  className = ''
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [facetedResults, setFacetedResults] = useState<FacetedSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchMode, setSearchMode] = useState<'simple' | 'advanced'>('simple');
  
  // Search options state
  const [searchOptions, setSearchOptions] = useState<SearchOptions>({
    semantic: true,
    fuzzy: false,
    exact: false,
    includeSummary: true,
    includeContext: true,
    contextWindow: 200,
    rankingModel: 'hybrid'
  });

  // Filters state
  const [filters, setFilters] = useState<SearchFilters>({
    maxResults: 20
  });

  const knowledgeBase = KnowledgeBaseService.getInstance();

  const performSearch = useCallback(async (searchQuery: string, useFaceted: boolean = true) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setFacetedResults(null);
      onResultsChange?.([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const queryObject: SearchQuery = {
        text: searchQuery,
        filters,
        options: searchOptions
      };

      if (useFaceted) {
        const facetedResult = await knowledgeBase.facetedSearch(queryObject);
        setFacetedResults(facetedResult);
        setResults(facetedResult.results);
        onResultsChange?.(facetedResult.results);
        
        // Track search analytics
        await knowledgeBase.getAnalytics({
          type: 'summary',
          field: 'search',
          filters: { query: searchQuery, resultCount: facetedResult.results.length }
        });
      } else {
        const searchResults = await knowledgeBase.search(queryObject);
        setResults(searchResults);
        onResultsChange?.(searchResults);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Search failed';
      setError(errorMessage);
      // Error logging disabled for production
    } finally {
      setLoading(false);
    }
  }, [filters, searchOptions, onResultsChange]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(query);
  };

  const handleFilterChange = (newFilters: Partial<SearchFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleOptionsChange = (newOptions: Partial<SearchOptions>) => {
    setSearchOptions(prev => ({ ...prev, ...newOptions }));
  };

  const handleFacetClick = (field: string, value: string) => {
    const currentValues = filters[field as keyof SearchFilters] as string[] || [];
    const newValues = currentValues.includes(value)
      ? currentValues.filter(v => v !== value)
      : [...currentValues, value];
    
    handleFilterChange({ [field]: newValues });
  };

  // Auto-search on query change with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query.trim()) {
        performSearch(query);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, performSearch]);

  return (
    <div className={`knowledge-search ${className}`}>
      {/* Search Header */}
      <div className="search-header">
        <form onSubmit={handleSearchSubmit} className="search-form">
          <div className="search-input-container">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your knowledge base..."
              className="search-input"
              disabled={loading}
            />
            <button 
              type="submit" 
              className="search-button"
              disabled={loading || !query.trim()}
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </form>

        <div className="search-mode-toggle">
          <button
            className={searchMode === 'simple' ? 'active' : ''}
            onClick={() => setSearchMode('simple')}
          >
            Simple
          </button>
          <button
            className={searchMode === 'advanced' ? 'active' : ''}
            onClick={() => setSearchMode('advanced')}
          >
            Advanced
          </button>
        </div>
      </div>

      {/* Advanced Search Options */}
      {searchMode === 'advanced' && (
        <div className="advanced-search">
          <div className="search-options">
            <h4>Search Options</h4>
            <div className="option-group">
              <label>
                <input
                  type="checkbox"
                  checked={searchOptions.semantic}
                  onChange={(e) => handleOptionsChange({ semantic: e.target.checked })}
                />
                Semantic Search
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={searchOptions.exact}
                  onChange={(e) => handleOptionsChange({ exact: e.target.checked })}
                />
                Exact Match
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={searchOptions.fuzzy}
                  onChange={(e) => handleOptionsChange({ fuzzy: e.target.checked })}
                />
                Fuzzy Search
              </label>
            </div>
            
            <div className="option-group">
              <label>
                Ranking Model:
                <select
                  value={searchOptions.rankingModel}
                  onChange={(e) => handleOptionsChange({ 
                    rankingModel: e.target.value as 'bm25' | 'semantic' | 'hybrid' 
                  })}
                >
                  <option value="hybrid">Hybrid</option>
                  <option value="semantic">Semantic</option>
                  <option value="bm25">BM25</option>
                </select>
              </label>
            </div>
            
            <div className="option-group">
              <label>
                Max Results:
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={filters.maxResults || 20}
                  onChange={(e) => handleFilterChange({ maxResults: parseInt(e.target.value) })}
                />
              </label>
            </div>
          </div>

          <div className="search-filters">
            <h4>Filters</h4>
            
            {/* Date Range Filter */}
            <div className="filter-group">
              <label>Date Range:</label>
              <div className="date-range">
                <input
                  type="date"
                  onChange={(e) => {
                    const startDate = e.target.value ? new Date(e.target.value) : undefined;
                    handleFilterChange({
                      dateRange: startDate ? { 
                        start: startDate, 
                        end: filters.dateRange?.end || new Date() 
                      } : undefined
                    });
                  }}
                />
                <span>to</span>
                <input
                  type="date"
                  onChange={(e) => {
                    const endDate = e.target.value ? new Date(e.target.value) : undefined;
                    handleFilterChange({
                      dateRange: endDate ? { 
                        start: filters.dateRange?.start || new Date(0), 
                        end: endDate 
                      } : undefined
                    });
                  }}
                />
              </div>
            </div>

            {/* File Type Filter */}
            <div className="filter-group">
              <label>File Types:</label>
              <div className="checkbox-group">
                {['pdf', 'txt', 'md', 'docx', 'html'].map(type => (
                  <label key={type}>
                    <input
                      type="checkbox"
                      checked={filters.fileTypes?.includes(type) || false}
                      onChange={(e) => {
                        const currentTypes = filters.fileTypes || [];
                        const newTypes = e.target.checked
                          ? [...currentTypes, type]
                          : currentTypes.filter(t => t !== type);
                        handleFilterChange({ fileTypes: newTypes });
                      }}
                    />
                    {type.toUpperCase()}
                  </label>
                ))}
              </div>
            </div>

            {/* Language Filter */}
            <div className="filter-group">
              <label>Languages:</label>
              <div className="checkbox-group">
                {['en', 'es', 'fr', 'de', 'zh', 'ja'].map(lang => (
                  <label key={lang}>
                    <input
                      type="checkbox"
                      checked={filters.languages?.includes(lang) || false}
                      onChange={(e) => {
                        const currentLangs = filters.languages || [];
                        const newLangs = e.target.checked
                          ? [...currentLangs, lang]
                          : currentLangs.filter(l => l !== lang);
                        handleFilterChange({ languages: newLangs });
                      }}
                    />
                    {lang.toUpperCase()}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search Results */}
      <div className="search-results">
        {error && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            {error}
          </div>
        )}

        {loading && (
          <div className="loading-message">
            <div className="loading-spinner"></div>
            Searching...
          </div>
        )}

        {facetedResults && (
          <div className="results-summary">
            <span className="results-count">
              Found {facetedResults.totalCount} results in {facetedResults.queryTime}ms
            </span>
          </div>
        )}

        <div className="results-container">
          {/* Facets Sidebar */}
          {facetedResults && facetedResults.facets.length > 0 && (
            <div className="facets-sidebar">
              <h4>Refine Results</h4>
              {facetedResults.facets.map(facet => (
                <div key={facet.field} className="facet-group">
                  <h5>{facet.field}</h5>
                  <div className="facet-values">
                    {facet.values.map(value => (
                      <button
                        key={value.value}
                        className={`facet-value ${value.selected ? 'selected' : ''}`}
                        onClick={() => handleFacetClick(facet.field, value.value)}
                      >
                        <span className="facet-label">{value.value}</span>
                        <span className="facet-count">({value.count})</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Results List */}
          <div className="results-list">
            {results.length === 0 && !loading && query && (
              <div className="no-results">
                <span className="no-results-icon">🔍</span>
                <p>No results found for "{query}"</p>
                <p className="no-results-suggestion">
                  Try adjusting your search terms or filters
                </p>
              </div>
            )}

            {results.map((result, index) => (
              <div key={result.document.id} className="search-result">
                <div className="result-header">
                  <h3 
                    className="result-title"
                    onClick={() => onDocumentSelect?.(result.document.id)}
                  >
                    {result.document.title}
                  </h3>
                  <div className="result-meta">
                    <span className="relevance-score">
                      {Math.round(result.relevanceScore * 100)}% match
                    </span>
                    <span className="document-category">
                      {result.document.category}
                    </span>
                    <span className="document-date">
                      {new Date(result.document.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {result.summary && (
                  <div className="result-summary">
                    {result.summary}
                  </div>
                )}

                {result.highlights && result.highlights.length > 0 && (
                  <div className="result-highlights">
                    {result.highlights.map((highlight, idx) => (
                      <span 
                        key={idx} 
                        className={`highlight highlight-${highlight.type}`}
                      >
                        {highlight.text}
                      </span>
                    ))}
                  </div>
                )}

                {result.chunks && result.chunks.length > 0 && (
                  <div className="result-chunks">
                    <h4>Relevant Sections:</h4>
                    {result.chunks.slice(0, 2).map((chunkResult, idx) => (
                      <div key={idx} className="chunk-preview">
                        <span className="chunk-score">
                          {Math.round(chunkResult.score * 100)}%
                        </span>
                        <span className="chunk-content">
                          {chunkResult.chunk.content.substring(0, 150)}
                          {chunkResult.chunk.content.length > 150 ? '...' : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {result.document.tags && result.document.tags.length > 0 && (
                  <div className="result-tags">
                    {result.document.tags.map(tag => (
                      <span key={tag} className="tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {result.explanation && (
                  <div className="result-explanation">
                    <em>{result.explanation}</em>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeSearchComponent;
