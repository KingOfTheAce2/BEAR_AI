import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import React from 'react';
import { useApp } from '../../contexts/AppContext';

export const SearchPage: React.FC = () => {
  const { state } = useApp();

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary mb-2">
          Advanced Search
        </h1>
        <p className="text-text-muted">
          Search across all your documents, cases, and conversation history.
        </p>
      </div>
      
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <MagnifyingGlassIcon className="w-16 h-16 text-text-muted mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-text-primary mb-2">
            Advanced Search Coming Soon
          </h2>
          <p className="text-text-muted max-w-md">
            We're building powerful search capabilities that will let you find exactly what you need across all your legal documents and AI conversations.
          </p>
          {state.searchQuery && (
            <div className="mt-4 p-3 bg-surface rounded-lg">
              <p className="text-sm text-text-muted">
                Current search query: <span className="font-medium text-text-primary">{state.searchQuery}</span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
