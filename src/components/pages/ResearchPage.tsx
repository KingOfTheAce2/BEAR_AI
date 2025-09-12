import React from 'react';
import { BookOpenIcon } from '@heroicons/react/24/outline';

export const ResearchPage: React.FC = () => {
  return (
    <div className="p-6 h-full flex flex-col">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary mb-2">
          Legal Research
        </h1>
        <p className="text-text-muted">
          AI-powered legal research tools for case law, statutes, and legal precedents.
        </p>
      </div>
      
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <BookOpenIcon className="w-16 h-16 text-text-muted mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-text-primary mb-2">
            Research Tools Coming Soon
          </h2>
          <p className="text-text-muted max-w-md">
            We're developing advanced AI research capabilities that will help you find relevant case law, analyze legal precedents, and build stronger arguments for your cases.
          </p>
        </div>
      </div>
    </div>
  );
};