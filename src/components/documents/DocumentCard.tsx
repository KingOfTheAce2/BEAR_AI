import React, { useState } from 'react';
import { Document } from '../../types';

import { DocumentTextIcon, EyeIcon, ArrowDownIcon, TrashIcon, PencilIcon, ClockIcon, TagIcon, ExclamationCircleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

interface DocumentCardProps {
  document: Document;
  viewMode: 'grid' | 'list';
  [extra: string]: unknown;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({ document, viewMode }) => {
  const [showVersions, setShowVersions] = useState(false);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready':
        return 'text-bear-green bg-green-50 border-green-200';
      case 'processing':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'uploading':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'error':
        return 'text-bear-red bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready':
        return <CheckCircleIcon className="w-3 h-3" />;
      case 'processing':
        return <ClockIcon className="w-3 h-3 animate-spin" />;
      case 'uploading':
        return <ClockIcon className="w-3 h-3" />;
      case 'error':
        return <ExclamationCircleIcon className="w-3 h-3" />;
      default:
        return null;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'contract':
        return 'bg-blue-100 text-blue-800';
      case 'brief':
        return 'bg-purple-100 text-purple-800';
      case 'research':
        return 'bg-green-100 text-green-800';
      case 'evidence':
        return 'bg-orange-100 text-orange-800';
      case 'correspondence':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handlePreview = () => {
    console.log('Preview document:', document.id);
  };

  const handleDownload = () => {
    console.log('Download document:', document.id);
  };

  const handleEdit = () => {
    console.log('Edit document:', document.id);
  };

  const handleDelete = () => {
    // eslint-disable-next-line no-restricted-globals
    if (window.confirm(`Are you sure you want to delete "${document.name}"?`)) {
      console.log('Delete document:', document.id);
    }
  };

  if (viewMode === 'list') {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200">
        <div className="flex items-center space-x-4">
          {/* Document Icon */}
          <div className="flex-shrink-0">
            <DocumentTextIcon className="w-8 h-8 text-bear-navy" />
          </div>

          {/* Document Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-sm font-medium text-gray-900 truncate">
                  {document.name}
                </h3>
                <div className="mt-1 flex items-center space-x-4 text-xs text-gray-500">
                  <span>{formatFileSize(document.size)}</span>
                  <span>{formatDate(document.uploadDate)}</span>
                  <span className={`px-2 py-1 rounded-full border text-xs ${getCategoryColor(document.category)}`}>
                    {document.category}
                  </span>
                </div>
              </div>
              
              {/* Status */}
              <div className={`flex items-center space-x-1 px-2 py-1 rounded-full border text-xs ${getStatusColor(document.status)}`}>
                {getStatusIcon(document.status)}
                <span className="capitalize">{document.status}</span>
              </div>
            </div>

            {/* Tags */}
            {document.tags.length > 0 && (
              <div className="mt-2 flex items-center space-x-1">
                <TagIcon className="w-3 h-3 text-gray-400" />
                <div className="flex flex-wrap gap-1">
                  {document.tags.slice(0, 3).map((tag, index) => (
                    <span key={index} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                      {tag}
                    </span>
                  ))}
                  {document.tags.length > 3 && (
                    <span className="text-xs text-gray-500">+{document.tags.length - 3}</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePreview}
              className="p-1.5 text-gray-500 hover:text-bear-navy rounded-lg hover:bg-gray-100"
              title="Preview"
            >
              <EyeIcon className="w-4 h-4" />
            </button>
            <button
              onClick={handleDownload}
              className="p-1.5 text-gray-500 hover:text-bear-navy rounded-lg hover:bg-gray-100"
              title="Download"
            >
              <ArrowDownIcon className="w-4 h-4" />
            </button>
            <button
              onClick={handleEdit}
              className="p-1.5 text-gray-500 hover:text-bear-navy rounded-lg hover:bg-gray-100"
              title="Edit"
            >
              <PencilIcon className="w-4 h-4" />
            </button>
            <button
              onClick={handleDelete}
              className="p-1.5 text-gray-500 hover:text-bear-red rounded-lg hover:bg-gray-100"
              title="Delete"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow duration-200">
      {/* Document Preview/Thumbnail */}
      <div className="aspect-w-3 aspect-h-2 bg-gray-100">
        {document.thumbnail ? (
          <img
            src={document.thumbnail}
            alt={document.name}
            className="w-full h-32 object-cover"
          />
        ) : (
          <div className="w-full h-32 flex items-center justify-center bg-gradient-to-br from-bear-navy to-bear-green">
            <DocumentTextIcon className="w-12 h-12 text-white" />
          </div>
        )}
        
        {/* Status Overlay */}
        <div className="absolute top-2 right-2">
          <div className={`flex items-center space-x-1 px-2 py-1 rounded-full border text-xs backdrop-blur-sm ${getStatusColor(document.status)}`}>
            {getStatusIcon(document.status)}
            <span className="capitalize">{document.status}</span>
          </div>
        </div>

        {/* Category Badge */}
        <div className="absolute top-2 left-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(document.category)}`}>
            {document.category}
          </span>
        </div>
      </div>

      {/* Document Details */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-900 line-clamp-2 flex-1">
            {document.name}
          </h3>
        </div>

        <div className="text-xs text-gray-500 space-y-1 mb-3">
          <div className="flex items-center justify-between">
            <span>{document.type.toUpperCase()}</span>
            <span>{formatFileSize(document.size)}</span>
          </div>
          <div>{formatDate(document.uploadDate)}</div>
          {document.versions.length > 1 && (
            <div className="flex items-center justify-between">
              <span>Version {document.versions.length}</span>
              <button
                onClick={() => setShowVersions(!showVersions)}
                className="text-bear-navy hover:text-bear-green"
              >
                {showVersions ? 'Hide' : 'View'} History
              </button>
            </div>
          )}
        </div>

        {/* Version History */}
        {showVersions && document.versions.length > 1 && (
          <div className="mb-3 p-2 bg-gray-50 rounded text-xs">
            <div className="space-y-1">
              {document.versions.slice(-3).reverse().map((version) => (
                <div key={version.id} className="flex justify-between">
                  <span>v{version.version} - {version.changes}</span>
                  <span className="text-gray-400">{formatDate(version.modifiedDate)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tags */}
        {document.tags.length > 0 && (
          <div className="mb-3">
            <div className="flex flex-wrap gap-1">
              {document.tags.slice(0, 2).map((tag, index) => (
                <span key={index} className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                  {tag}
                </span>
              ))}
              {document.tags.length > 2 && (
                <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded-full text-xs">
                  +{document.tags.length - 2}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePreview}
              className="p-1.5 text-gray-500 hover:text-bear-navy rounded-lg hover:bg-gray-100 transition-colors duration-200"
              title="Preview"
            >
              <EyeIcon className="w-4 h-4" />
            </button>
            <button
              onClick={handleDownload}
              className="p-1.5 text-gray-500 hover:text-bear-navy rounded-lg hover:bg-gray-100 transition-colors duration-200"
              title="Download"
            >
              <ArrowDownIcon className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={handleEdit}
              className="p-1.5 text-gray-500 hover:text-bear-navy rounded-lg hover:bg-gray-100 transition-colors duration-200"
              title="Edit"
            >
              <PencilIcon className="w-4 h-4" />
            </button>
            <button
              onClick={handleDelete}
              className="p-1.5 text-gray-500 hover:text-bear-red rounded-lg hover:bg-gray-100 transition-colors duration-200"
              title="Delete"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
