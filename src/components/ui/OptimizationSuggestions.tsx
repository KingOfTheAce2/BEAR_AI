import React, { useState } from 'react';
import { OptimizationSuggestion } from '../../services/performanceMonitor';
import { usePerformance } from '../../contexts/PerformanceContext';

interface OptimizationSuggestionProps {
  suggestion: OptimizationSuggestion;
  onImplement?: (suggestionId: string) => void;
  className?: string;
}

export const OptimizationSuggestionComponent: React.FC<OptimizationSuggestionProps> = ({
  suggestion,
  onImplement,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isImplementing, setIsImplementing] = useState(false);

  const handleImplement = async () => {
    if (!onImplement) return;
    
    setIsImplementing(true);
    try {
      await onImplement(suggestion.id);
    } finally {
      setIsImplementing(false);
    }
  };

  const getCategoryConfig = (category: string) => {
    switch (category) {
      case 'performance':
        return {
          bgColor: 'bg-blue-50 border-blue-200',
          textColor: 'text-blue-800',
          icon: '⚡',
          badgeColor: 'bg-blue-500'
        };
      case 'memory':
        return {
          bgColor: 'bg-green-50 border-green-200',
          textColor: 'text-green-800',
          icon: '💾',
          badgeColor: 'bg-green-500'
        };
      case 'network':
        return {
          bgColor: 'bg-purple-50 border-purple-200',
          textColor: 'text-purple-800',
          icon: '🌐',
          badgeColor: 'bg-purple-500'
        };
      case 'model':
        return {
          bgColor: 'bg-orange-50 border-orange-200',
          textColor: 'text-orange-800',
          icon: '🤖',
          badgeColor: 'bg-orange-500'
        };
      case 'ui':
        return {
          bgColor: 'bg-pink-50 border-pink-200',
          textColor: 'text-pink-800',
          icon: '🎨',
          badgeColor: 'bg-pink-500'
        };
      default:
        return {
          bgColor: 'bg-gray-50 border-gray-200',
          textColor: 'text-gray-800',
          icon: '📊',
          badgeColor: 'bg-gray-500'
        };
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getEffortColor = (effort: string) => {
    switch (effort) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const config = getCategoryConfig(suggestion.category);
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className={`border rounded-lg ${config.bgColor} ${config.textColor} ${className}`}>
      <div className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-start space-x-3">
            <span className="text-xl">{config.icon}</span>
            <div>
              <h3 className="font-semibold text-lg">{suggestion.title}</h3>
              <div className="flex items-center space-x-2 mt-1">
                <span className={`px-2 py-1 rounded-full text-xs text-white ${config.badgeColor}`}>
                  {suggestion.category}
                </span>
                <span className={`px-2 py-1 rounded text-xs ${getImpactColor(suggestion.impact)}`}>
                  {suggestion.impact} impact
                </span>
                <span className={`px-2 py-1 rounded text-xs ${getEffortColor(suggestion.effort)}`}>
                  {suggestion.effort} effort
                </span>
                <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-800">
                  Priority: {suggestion.priority}/10
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-sm bg-white bg-opacity-50 hover:bg-opacity-70 px-3 py-1 rounded transition-colors"
            >
              {isExpanded ? 'Less' : 'More'}
            </button>
            
            {suggestion.actionable && onImplement && (
              <button
                onClick={handleImplement}
                disabled={isImplementing}
                className="text-sm bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded transition-colors disabled:opacity-50"
              >
                {isImplementing ? 'Implementing...' : 'Implement'}
              </button>
            )}
          </div>
        </div>

        <p className="text-sm mb-3 leading-relaxed">{suggestion.description}</p>

        {isExpanded && (
          <div className="space-y-4">
            {suggestion.implementation && (
              <div className="bg-white bg-opacity-50 p-3 rounded">
                <h4 className="font-medium text-sm mb-2">Implementation Details:</h4>
                <p className="text-sm">{suggestion.implementation}</p>
              </div>
            )}

            {suggestion.metrics && Object.keys(suggestion.metrics).length > 0 && (
              <div className="bg-white bg-opacity-50 p-3 rounded">
                <h4 className="font-medium text-sm mb-2">Related Metrics:</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {Object.entries(suggestion.metrics).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').toLowerCase()}:</span>
                      <span className="font-mono">{typeof value === 'number' ? value.toFixed(2) : value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="text-xs text-opacity-75 flex justify-between items-center">
              <span>Generated: {formatTime(suggestion.timestamp)}</span>
              <span>Actionable: {suggestion.actionable ? '✅ Yes' : '❌ No'}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface OptimizationSuggestionsListProps {
  maxSuggestions?: number;
  category?: string;
  minPriority?: number;
  onImplement?: (suggestionId: string) => void;
  className?: string;
}

export const OptimizationSuggestionsList: React.FC<OptimizationSuggestionsListProps> = ({
  maxSuggestions = 10,
  category,
  minPriority = 0,
  onImplement,
  className = ''
}) => {
  const { suggestions } = usePerformance();
  
  const filteredSuggestions = suggestions
    .filter(suggestion => {
      if (category && suggestion.category !== category) return false;
      if (suggestion.priority < minPriority) return false;
      return true;
    })
    .sort((a, b) => b.priority - a.priority)
    .slice(0, maxSuggestions);

  if (filteredSuggestions.length === 0) {
    return (
      <div className={`text-center py-8 text-gray-500 ${className}`}>
        <div className="text-4xl mb-2">🎯</div>
        <div>No optimization suggestions available</div>
        <div className="text-sm">
          {category ? `No suggestions for ${category}` : 'System is already optimized'}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Optimization Suggestions</h2>
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <span>{filteredSuggestions.length} suggestions</span>
          {category && (
            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
              {category}
            </span>
          )}
        </div>
      </div>
      
      {filteredSuggestions.map(suggestion => (
        <OptimizationSuggestionComponent
          key={suggestion.id}
          suggestion={suggestion}
          onImplement={onImplement}
        />
      ))}
    </div>
  );
};

export default OptimizationSuggestionComponent;