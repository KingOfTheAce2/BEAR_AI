import React from 'react';
import { SearchResult } from '../../types';
import {
  DocumentTextIcon,
  ScaleIcon,
  BookOpenIcon,
  ChatBubbleLeftRightIcon,
  ClipboardDocumentListIcon,
  StarIcon,
  CalendarIcon,
  ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline';

interface SearchResultsProps {
  results: SearchResult[];
  searchQuery: string;
  onResultClick: (result: SearchResult) => void;
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  searchQuery,
  onResultClick
}) => {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'document':
        return <DocumentTextIcon className="w-5 h-5 text-blue-500" />;
      case 'case':
        return <ScaleIcon className="w-5 h-5 text-purple-500" />;
      case 'statute':
        return <BookOpenIcon className="w-5 h-5 text-green-500" />;
      case 'regulation':
        return <ClipboardDocumentListIcon className="w-5 h-5 text-orange-500" />;
      case 'conversation':
        return <ChatBubbleLeftRightIcon className="w-5 h-5 text-bear-green" />;
      default:
        return <DocumentTextIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'document':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'case':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'statute':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'regulation':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'conversation':
        return 'bg-bear-green-light text-bear-green border-bear-green';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const highlightSearchTerms = (text: string, query: string): React.ReactNode => {
    if (!query.trim()) return text;

    const terms = query.toLowerCase().split(' ').filter(term => term.length > 0);
    let highlightedText = text;

    terms.forEach(term => {
      const regex = new RegExp(`(${term})`, 'gi');
      highlightedText = highlightedText.replace(regex, '|||HIGHLIGHT_START|||$1|||HIGHLIGHT_END|||');
    });

    const parts = highlightedText.split('|||');
    
    return parts.map((part, index) => {
      if (part === 'HIGHLIGHT_START') {
        return null;
      } else if (part === 'HIGHLIGHT_END') {
        return null;
      } else if (parts[index - 1] === 'HIGHLIGHT_START') {
        return (
          <mark key={index} className="bg-yellow-200 text-yellow-900 px-0.5 rounded">
            {part}
          </mark>
        );
      }
      return <span key={index}>{part}</span>;
    }).filter(Boolean);
  };

  const formatDate = (date?: Date): string => {
    if (!date) return '';
    
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    if (days < 365) return `${Math.floor(days / 30)} months ago`;
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getRelevanceColor = (relevance: number) => {
    if (relevance >= 0.9) return 'text-bear-green';
    if (relevance >= 0.7) return 'text-yellow-500';
    return 'text-gray-500';
  };

  // Group results by type for better organization
  const groupedResults = results.reduce((acc, result) => {
    const category = result.category || result.type;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  const categoryOrder = ['Document', 'Case Law', 'Statute', 'Chat History', 'Other'];
  const sortedCategories = Object.keys(groupedResults).sort((a, b) => {
    const aIndex = categoryOrder.indexOf(a);
    const bIndex = categoryOrder.indexOf(b);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  if (results.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        No results found for "{searchQuery}"
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {/* Results Summary */}
      <div className="px-4 py-3 bg-gray-50 text-sm text-gray-600 flex items-center justify-between">
        <span>
          {results.length} result{results.length !== 1 ? 's' : ''} found
          {searchQuery && ` for "${searchQuery}"`}
        </span>
        <span className="text-xs">
          Sorted by relevance
        </span>
      </div>

      {/* Grouped Results */}
      {sortedCategories.map((category, categoryIndex) => (
        <div key={category}>
          {/* Category Header */}
          {Object.keys(groupedResults).length > 1 && (
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
              <h4 className="text-sm font-medium text-gray-700 capitalize">
                {category} ({groupedResults[category].length})
              </h4>
            </div>
          )}

          {/* Results in Category */}
          {groupedResults[category].map((result, index) => (
            <div
              key={result.id}
              onClick={() => onResultClick(result)}
              className="p-4 hover:bg-gray-50 cursor-pointer transition-colors duration-150 border-l-4 border-transparent hover:border-bear-green"
            >
              <div className="flex items-start space-x-3">
                {/* Type Icon */}
                <div className="flex-shrink-0 mt-0.5">
                  {getTypeIcon(result.type)}
                </div>

                {/* Result Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="text-sm font-medium text-gray-900 line-clamp-2 flex-1">
                      {highlightSearchTerms(result.title, searchQuery)}
                    </h3>
                    
                    {/* External Link Indicator */}
                    {result.source !== 'Local Documents' && result.source !== 'Chat History' && (
                      <ArrowTopRightOnSquareIcon className="w-4 h-4 text-gray-400 ml-2 flex-shrink-0" />
                    )}
                  </div>

                  {/* Preview Text */}
                  <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                    {highlightSearchTerms(result.preview, searchQuery)}
                  </p>

                  {/* Metadata */}
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    {/* Source */}
                    <span className="flex items-center space-x-1">
                      <span className="font-medium">{result.source}</span>
                    </span>

                    {/* Date */}
                    {result.date && (
                      <span className="flex items-center space-x-1">
                        <CalendarIcon className="w-3 h-3" />
                        <span>{formatDate(result.date)}</span>
                      </span>
                    )}

                    {/* Relevance Score */}
                    <span className="flex items-center space-x-1">
                      <StarIcon className={`w-3 h-3 ${getRelevanceColor(result.relevance)}`} />
                      <span className={getRelevanceColor(result.relevance)}>
                        {Math.round(result.relevance * 100)}% match
                      </span>
                    </span>

                    {/* Type Badge */}
                    <span className={`px-2 py-0.5 rounded-full border text-xs font-medium ${getTypeColor(result.type)}`}>
                      {result.type}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}

      {/* Load More */}
      {results.length >= 10 && (
        <div className="p-4 text-center border-t border-gray-200">
          <button className="text-sm text-bear-navy hover:text-bear-green font-medium transition-colors duration-200">
            Load more results
          </button>
        </div>
      )}
    </div>
  );
};