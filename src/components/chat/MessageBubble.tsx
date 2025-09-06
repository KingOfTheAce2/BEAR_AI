import React, { useState } from 'react';
import { Message } from '../../types';
import {
  CheckIcon,
  ClockIcon,
  ExclamationCircleIcon,
  DocumentTextIcon,
  ChartBarIcon,
  BookOpenIcon,
  ClipboardDocumentIcon
} from '@heroicons/react/24/outline';

interface MessageBubbleProps {
  message: Message;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const [showMetadata, setShowMetadata] = useState(false);

  const getStatusIcon = () => {
    switch (message.status) {
      case 'sending':
        return <ClockIcon className="w-3 h-3 text-gray-400 animate-spin" />;
      case 'sent':
        return <CheckIcon className="w-3 h-3 text-gray-400" />;
      case 'delivered':
        return <CheckIcon className="w-3 h-3 text-bear-green" />;
      case 'error':
        return <ExclamationCircleIcon className="w-3 h-3 text-bear-red" />;
      default:
        return null;
    }
  };

  const getTypeIcon = () => {
    switch (message.type) {
      case 'document':
        return <DocumentTextIcon className="w-4 h-4 text-blue-500" />;
      case 'analysis':
        return <ChartBarIcon className="w-4 h-4 text-purple-500" />;
      case 'citation':
        return <BookOpenIcon className="w-4 h-4 text-bear-green" />;
      default:
        return null;
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return timestamp.toLocaleDateString();
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      // Could add a toast notification here
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const renderConfidenceBar = () => {
    if (!message.metadata?.confidence) return null;
    
    const confidence = message.metadata.confidence;
    const percentage = Math.round(confidence * 100);
    
    return (
      <div className="mt-2 text-xs">
        <div className="flex items-center justify-between mb-1">
          <span className="text-gray-500">Confidence</span>
          <span className={`
            ${confidence >= 0.8 ? 'text-bear-green' :
              confidence >= 0.6 ? 'text-yellow-500' : 
              'text-bear-red'}
          `}>
            {percentage}%
          </span>
        </div>
        <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-300 ${
              confidence >= 0.8 ? 'bg-bear-green' :
              confidence >= 0.6 ? 'bg-yellow-500' : 
              'bg-bear-red'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  };

  const renderSources = () => {
    if (!message.metadata?.sources) return null;

    return (
      <div className="mt-2 text-xs">
        <span className="text-gray-500">Sources:</span>
        <div className="flex flex-wrap gap-1 mt-1">
          {message.metadata.sources.map((source, index) => (
            <span 
              key={index}
              className="px-2 py-1 bg-bear-navy text-white rounded text-[10px]"
            >
              {source}
            </span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex items-start space-x-3 max-w-3xl ${message.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
        {/* Avatar */}
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          message.sender === 'user' 
            ? 'bg-bear-navy text-white' 
            : 'bg-bear-green text-white'
        }`}>
          <span className="text-sm font-medium">
            {message.sender === 'user' ? 'U' : 'AI'}
          </span>
        </div>

        {/* Message Content */}
        <div className={`group relative ${message.sender === 'user' ? 'items-end' : 'items-start'}`}>
          <div
            className={`relative px-4 py-3 rounded-2xl shadow-sm ${
              message.sender === 'user'
                ? 'bg-bear-navy text-white rounded-br-md'
                : 'bg-gray-100 text-gray-900 rounded-bl-md'
            }`}
            onClick={() => message.sender === 'ai' && setShowMetadata(!showMetadata)}
          >
            {/* Message Type Icon */}
            {message.type !== 'text' && (
              <div className="flex items-center space-x-2 mb-2">
                {getTypeIcon()}
                <span className="text-xs font-medium capitalize">
                  {message.type}
                </span>
              </div>
            )}

            {/* Message Text */}
            <div className="whitespace-pre-wrap break-words">
              {message.content}
            </div>

            {/* Metadata (for AI messages) */}
            {showMetadata && message.sender === 'ai' && message.metadata && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                {renderConfidenceBar()}
                {renderSources()}
                {message.metadata.documentRefs && (
                  <div className="mt-2 text-xs">
                    <span className="text-gray-500">Referenced Documents:</span>
                    <div className="mt-1 space-y-1">
                      {message.metadata.documentRefs.map((ref, index) => (
                        <div key={index} className="flex items-center space-x-1">
                          <DocumentTextIcon className="w-3 h-3 text-gray-400" />
                          <span className="text-bear-navy hover:underline cursor-pointer">
                            {ref}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Copy button (appears on hover) */}
            <button
              onClick={copyToClipboard}
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 hover:bg-white hover:bg-opacity-20 rounded"
              title="Copy message"
            >
              <ClipboardDocumentIcon className="w-3 h-3" />
            </button>
          </div>

          {/* Timestamp and Status */}
          <div className={`flex items-center space-x-2 mt-1 text-xs text-gray-500 ${
            message.sender === 'user' ? 'justify-end' : 'justify-start'
          }`}>
            <span>{formatTimestamp(message.timestamp)}</span>
            {message.sender === 'user' && getStatusIcon()}
            {message.sender === 'ai' && message.metadata?.confidence && (
              <span className="text-bear-green">
                {Math.round(message.metadata.confidence * 100)}% confident
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};