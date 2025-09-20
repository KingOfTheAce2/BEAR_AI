import React, { useState, useRef, useEffect } from 'react';
import { SearchResult } from '../../types';
import { SearchResults } from './SearchResults';

import {
  MagnifyingGlassIcon,
  XMarkIcon,
  AdjustmentsHorizontalIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

interface GlobalSearchProps {
  onSearch: (query: string) => void;
  initialQuery?: string;
  placeholder?: string;
  showResults?: boolean;
}

// Mock search history and suggestions
const recentSearches = [
  'employment contract liability',
  'summary judgment motion',
  'deposition transcript analysis',
  'settlement agreement terms'
];

const searchSuggestions = [
  'contract analysis',
  'case law research',
  'statute lookup',
  'compliance review',
  'legal precedents',
  'document summary'
];

const mockSearchResults: SearchResult[] = [
  {
    id: '1',
    type: 'document',
    title: 'Employment Contract - Smith vs. Corporation',
    content: 'This employment contract contains several liability clauses that may expose the company to significant risk...',
    relevance: 0.95,
    source: 'Local Documents',
    preview: 'Contains indemnification clauses, termination provisions, and non-compete agreements...',
    category: 'Contract',
    date: new Date('2024-01-15')
  },
  {
    id: '2',
    type: 'case',
    title: 'Johnson v. ABC Corp - Employment Law',
    content: 'Federal court ruling on employment contract enforceability and liability limitations...',
    relevance: 0.88,
    source: 'Federal Case Law',
    preview: 'Court ruled that liability limitation clauses must be clearly stated and mutually agreed...',
    category: 'Case Law',
    date: new Date('2023-11-20')
  },
  {
    id: '3',
    type: 'statute',
    title: 'Employment Standards Act Section 14',
    content: 'Statutory requirements for employment contract liability and employer obligations...',
    relevance: 0.82,
    source: 'Federal Statutes',
    preview: 'Defines minimum standards for employment contracts and liability distribution...',
    category: 'Statute',
    date: new Date('2023-01-01')
  },
  {
    id: '4',
    type: 'conversation',
    title: 'Previous Chat: Contract Liability Analysis',
    content: 'Discussion about liability clauses in employment contracts and risk mitigation strategies...',
    relevance: 0.76,
    source: 'Chat History',
    preview: 'AI provided analysis of indemnification clauses and recommended modifications...',
    category: 'Chat History',
    date: new Date('2024-01-20')
  }
];

export const GlobalSearch: React.FC<GlobalSearchProps> = ({
  onSearch,
  initialQuery = '',
  placeholder = 'Search documents, cases, statutes...',
  showResults: externalShowResults
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showResults, setShowResults] = useState(externalShowResults || false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const searchFilters = [
    { id: 'documents', label: 'Documents', count: 145 },
    { id: 'cases', label: 'Case Law', count: 892 },
    { id: 'statutes', label: 'Statutes', count: 234 },
    { id: 'regulations', label: 'Regulations', count: 156 },
    { id: 'history', label: 'Chat History', count: 23 }
  ];

  // Handle clicks outside to close search results
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
        setIsExpanded(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    
    // Show suggestions when typing
    if (value.length > 0) {
      setShowResults(true);
      setIsExpanded(true);
    } else {
      setShowResults(false);
    }
  };

  const handleInputFocus = () => {
    setIsExpanded(true);
    if (query.length > 0 || recentSearches.length > 0) {
      setShowResults(true);
    }
  };

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    onSearch(searchQuery);

    // Simulate API call
    setTimeout(() => {
      // Filter mock results based on selected filters
      let filteredResults = mockSearchResults;
      
      if (selectedFilters.length > 0) {
        filteredResults = mockSearchResults.filter(result => {
          const typeMapping: Record<string, string> = {
            'documents': 'document',
            'cases': 'case',
            'statutes': 'statute',
            'regulations': 'regulation',
            'history': 'conversation'
          };
          
          return selectedFilters.some(filter => typeMapping[filter] === result.type);
        });
      }

      setResults(filteredResults);
      setIsSearching(false);
      setShowResults(true);
    }, 800);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      performSearch(query);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    performSearch(suggestion);
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setShowResults(false);
    inputRef.current?.focus();
  };

  const toggleFilter = (filterId: string) => {
    setSelectedFilters(prev => 
      prev.includes(filterId)
        ? prev.filter(id => id !== filterId)
        : [...prev, filterId]
    );
  };

  return (
    <div ref={searchRef} className="relative w-full">
      {/* Search Input */}
      <form onSubmit={handleSubmit} className="relative">
        <div className={`
          flex items-center bg-white border border-gray-300 rounded-lg
          transition-all duration-200 ease-in-out
          ${isExpanded ? 'ring-2 ring-bear-green border-bear-green shadow-lg' : 'hover:border-gray-400'}
        `}>
          <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 ml-3 flex-shrink-0" />
          
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            placeholder={placeholder}
            className="flex-1 px-3 py-2 border-0 bg-transparent focus:ring-0 focus:outline-none text-gray-900 placeholder-gray-500"
          />

          {/* Search Actions */}
          <div className="flex items-center space-x-1 pr-2">
            {query && (
              <button
                type="button"
                onClick={clearSearch}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
                title="Clear search"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            )}
            
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className={`p-1 rounded transition-colors duration-200 ${
                selectedFilters.length > 0 
                  ? 'text-bear-green bg-green-50' 
                  : 'text-gray-400 hover:text-gray-600'
              }`}
              title="Search filters"
            >
              <AdjustmentsHorizontalIcon className="w-4 h-4" />
              {selectedFilters.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-bear-green text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">
                  {selectedFilters.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Search Dropdown */}
      {(showResults || isExpanded) && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-hidden">
          {/* Filters */}
          {isExpanded && (
            <div className="p-4 border-b border-gray-200">
              <div className="flex flex-wrap gap-2">
                {searchFilters.map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => toggleFilter(filter.id)}
                    className={`
                      flex items-center space-x-2 px-3 py-1 rounded-full text-sm border
                      transition-colors duration-200
                      ${selectedFilters.includes(filter.id)
                        ? 'bg-bear-navy text-white border-bear-navy'
                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                      }
                    `}
                  >
                    <span>{filter.label}</span>
                    <span className="text-xs opacity-75">({filter.count})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Search Content */}
          <div className="max-h-80 overflow-y-auto">
            {isSearching ? (
              <div className="p-6 text-center">
                <MagnifyingGlassIcon className="w-8 h-8 text-gray-400 mx-auto mb-3 animate-pulse" />
                <p className="text-gray-500">Searching legal database...</p>
              </div>
            ) : results.length > 0 ? (
              <SearchResults 
                results={results}
                searchQuery={query}
                onResultClick={(result) => {
                  console.log('Selected result:', result);
                  setShowResults(false);
                  setIsExpanded(false);
                }}
              />
            ) : query.length > 0 ? (
              <div className="p-6 text-center">
                <p className="text-gray-500 mb-3">No results found for "{query}"</p>
                <p className="text-sm text-gray-400">Try adjusting your search terms or filters</p>
              </div>
            ) : (
              <div className="p-4">
                {/* Recent Searches */}
                {recentSearches.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <ClockIcon className="w-4 h-4 mr-1" />
                      Recent Searches
                    </h4>
                    <div className="space-y-1">
                      {recentSearches.slice(0, 3).map((search, index) => (
                        <button
                          key={index}
                          onClick={() => handleSuggestionClick(search)}
                          className="w-full text-left px-2 py-1 text-sm text-gray-600 hover:bg-gray-50 rounded"
                        >
                          {search}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Search Suggestions */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Popular Searches
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {searchSuggestions.slice(0, 6).map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full hover:bg-bear-navy hover:text-white transition-colors duration-200"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};