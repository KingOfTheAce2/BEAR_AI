import React from 'react';
import { ClockIcon } from '@heroicons/react/24/outline';

export const HistoryPage: React.FC = () => {
  return (
    <div className="p-6 h-full flex flex-col">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary mb-2">
          Conversation History
        </h1>
        <p className="text-text-muted">
          Access and manage your previous AI conversations and chat sessions.
        </p>
      </div>
      
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <ClockIcon className="w-16 h-16 text-text-muted mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-text-primary mb-2">
            History Feature Coming Soon
          </h2>
          <p className="text-text-muted max-w-md">
            We're building a comprehensive history system that will let you revisit and continue previous conversations with your AI legal assistant.
          </p>
        </div>
      </div>
    </div>
  );
};