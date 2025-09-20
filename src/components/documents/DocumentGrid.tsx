import React, { useState, useMemo } from 'react';
import {
import { Document } from '../../types';
import { DocumentCard } from './DocumentCard';
import { DocumentUpload } from './DocumentUpload';

  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  FolderIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

interface DocumentGridProps {
  searchQuery?: string;
}

// Mock documents for demonstration
const mockDocuments: Document[] = [
  {
    id: '1',
    name: 'Employment Contract - Smith v. Corp',
    type: 'pdf',
    size: 2547200,
    uploadDate: new Date('2024-01-15'),
    status: 'ready',
    tags: ['employment', 'contract', 'litigation'],
    category: 'contract',
    thumbnail: '/api/documents/1/thumbnail',
    versions: [
      {
        id: 'v1',
        version: 1,
        modifiedDate: new Date('2024-01-15'),
        modifiedBy: 'John Doe',
        changes: 'Initial upload'
      }
    ]
  },
  {
    id: '2',
    name: 'Motion for Summary Judgment',
    type: 'docx',
    size: 1024000,
    uploadDate: new Date('2024-01-20'),
    status: 'ready',
    tags: ['motion', 'summary judgment', 'civil'],
    category: 'brief',
    versions: [
      {
        id: 'v1',
        version: 1,
        modifiedDate: new Date('2024-01-20'),
        modifiedBy: 'Jane Smith',
        changes: 'Initial draft'
      },
      {
        id: 'v2',
        version: 2,
        modifiedDate: new Date('2024-01-22'),
        modifiedBy: 'Jane Smith',
        changes: 'Added case citations'
      }
    ]
  },
  {
    id: '3',
    name: 'Medical Records - Patient X',
    type: 'pdf',
    size: 5242880,
    uploadDate: new Date('2024-01-18'),
    status: 'processing',
    tags: ['medical', 'records', 'evidence'],
    category: 'evidence',
    versions: [
      {
        id: 'v1',
        version: 1,
        modifiedDate: new Date('2024-01-18'),
        modifiedBy: 'Legal Assistant',
        changes: 'Uploaded for review'
      }
    ]
  },
  {
    id: '4',
    name: 'Deposition Transcript - Witness A',
    type: 'txt',
    size: 512000,
    uploadDate: new Date('2024-01-25'),
    status: 'ready',
    tags: ['deposition', 'transcript', 'witness'],
    category: 'evidence',
    versions: [
      {
        id: 'v1',
        version: 1,
        modifiedDate: new Date('2024-01-25'),
        modifiedBy: 'Court Reporter',
        changes: 'Official transcript'
      }
    ]
  },
  {
    id: '5',
    name: 'Settlement Agreement Draft',
    type: 'docx',
    size: 768000,
    uploadDate: new Date('2024-01-28'),
    status: 'ready',
    tags: ['settlement', 'agreement', 'draft'],
    category: 'contract',
    versions: [
      {
        id: 'v1',
        version: 1,
        modifiedDate: new Date('2024-01-28'),
        modifiedBy: 'Partner Attorney',
        changes: 'Initial draft'
      }
    ]
  }
];

const categories = [
  { id: 'all', label: 'All Documents', icon: DocumentTextIcon },
  { id: 'contract', label: 'Contracts', icon: DocumentTextIcon },
  { id: 'brief', label: 'Briefs', icon: DocumentTextIcon },
  { id: 'research', label: 'Research', icon: MagnifyingGlassIcon },
  { id: 'evidence', label: 'Evidence', icon: FolderIcon },
  { id: 'correspondence', label: 'Correspondence', icon: DocumentTextIcon },
  { id: 'other', label: 'Other', icon: FolderIcon }
];

const sortOptions = [
  { id: 'name', label: 'Name' },
  { id: 'date', label: 'Upload Date' },
  { id: 'size', label: 'Size' },
  { id: 'category', label: 'Category' }
];

export const DocumentGrid: React.FC<DocumentGridProps> = ({ searchQuery = '' }) => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);

  // Filter and sort documents
  const filteredAndSortedDocuments = useMemo(() => {
    let filtered = mockDocuments;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(doc => doc.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(doc =>
        doc.name.toLowerCase().includes(query) ||
        doc.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Sort documents
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'date':
          aValue = a.uploadDate.getTime();
          bValue = b.uploadDate.getTime();
          break;
        case 'size':
          aValue = a.size;
          bValue = b.size;
          break;
        case 'category':
          aValue = a.category;
          bValue = b.category;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [selectedCategory, searchQuery, sortBy, sortOrder]);

  const handleDocumentUpload = (files: FileList) => {
    // Handle document upload logic
    console.log('Uploading files:', files);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-bear-navy">Documents</h1>
          <p className="text-gray-600">
            Manage and organize your legal documents
          </p>
        </div>
        
        {/* View Toggle and Filters */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg border transition-colors duration-200 ${
              showFilters
                ? 'bg-bear-navy text-white border-bear-navy'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
            }`}
            title="Toggle filters"
          >
            <AdjustmentsHorizontalIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Upload Area */}
      <DocumentUpload onUpload={handleDocumentUpload} />

      {/* Filters */}
      {showFilters && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => {
                const IconComponent = category.icon;
                return (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`flex items-center space-x-2 px-3 py-2 text-sm rounded-lg border transition-colors duration-200 ${
                      selectedCategory === category.id
                        ? 'bg-bear-navy text-white border-bear-navy'
                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <IconComponent className="w-4 h-4" />
                    <span>{category.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sort Options */}
          <div className="flex items-center space-x-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sort by
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-bear-green focus:border-bear-green"
              >
                {sortOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Order
              </label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-bear-green focus:border-bear-green"
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Results Summary */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>
          {filteredAndSortedDocuments.length} document{filteredAndSortedDocuments.length !== 1 ? 's' : ''} found
          {searchQuery && ` for "${searchQuery}"`}
        </span>
      </div>

      {/* Document Grid */}
      {filteredAndSortedDocuments.length === 0 ? (
        <div className="text-center py-12">
          <DocumentTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No documents found</h3>
          <p className="text-gray-500">
            {searchQuery 
              ? 'Try adjusting your search terms or filters'
              : 'Upload your first document to get started'
            }
          </p>
        </div>
      ) : (
        <div className={`grid gap-4 ${
          viewMode === 'grid' 
            ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
            : 'grid-cols-1'
        }`}>
          {filteredAndSortedDocuments.map((document) => (
            <DocumentCard
              key={document.id}
              document={document}
              viewMode={viewMode}
            />
          ))}
        </div>
      )}
    </div>
  );
};