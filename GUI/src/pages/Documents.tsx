import React, { useState, useEffect, useMemo } from 'react'
import {
  FileText,
  Upload,
  Download,
  Share2,
  Trash2,
  Eye,
  Edit,
  Filter,
  Grid,
  List,
  Search,
  SortAsc,
  SortDesc,
  Tag,
  Clock,
  User,
  Shield,
  Archive,
  Star,
  MoreVertical,
  Folder,
  FolderOpen,
  Plus,
  CheckSquare,
  Square
} from 'lucide-react'
import { useDocumentsStore } from '../store'
import { useHistoryStore } from '../store/historyStore'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import type { Document, SecurityClassification } from '../types'

const Documents: React.FC = () => {
  const { documents, isLoading, setDocuments, addDocument, updateDocument, deleteDocument } = useDocumentsStore()
  const { addActivity } = useHistoryStore()
  
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set())
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size' | 'type'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [filterBy, setFilterBy] = useState<{
    type: string[]
    tags: string[]
    dateRange: { start?: Date; end?: Date }
  }>({ type: [], tags: [], dateRange: {} })
  const [showFilters, setShowFilters] = useState(false)
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  
  // Mock data - in real app, this would come from API
  useEffect(() => {
    if (documents.length === 0) {
      const mockDocuments: Document[] = [
        {
          id: '1',
          name: 'Contract Agreement - Smith v. Jones',
          type: 'contract',
          url: '/documents/contract-smith-jones.pdf',
          size: 1024000,
          mimeType: 'application/pdf',
          caseId: '1',
          tags: ['contract', 'litigation', 'commercial'],
          uploadedBy: 'john.doe@law.com',
          createdAt: new Date('2023-11-15'),
          updatedAt: new Date('2023-11-20'),
        },
        {
          id: '2',
          name: 'Motion for Summary Judgment',
          type: 'motion',
          url: '/documents/motion-summary-judgment.pdf',
          size: 512000,
          mimeType: 'application/pdf',
          tags: ['motion', 'litigation', 'civil-procedure'],
          uploadedBy: 'jane.smith@law.com',
          createdAt: new Date('2023-11-10'),
          updatedAt: new Date('2023-11-10'),
        },
        {
          id: '3',
          name: 'Evidence - Email Correspondence',
          type: 'evidence',
          url: '/documents/email-evidence.pdf',
          size: 256000,
          mimeType: 'application/pdf',
          caseId: '1',
          tags: ['evidence', 'email', 'discovery'],
          uploadedBy: 'paralegal@law.com',
          createdAt: new Date('2023-11-05'),
          updatedAt: new Date('2023-11-08'),
        },
        {
          id: '4',
          name: 'Legal Brief - Constitutional Analysis',
          type: 'brief',
          url: '/documents/constitutional-brief.pdf',
          size: 2048000,
          mimeType: 'application/pdf',
          tags: ['brief', 'constitutional', 'appeal'],
          uploadedBy: 'senior.attorney@law.com',
          createdAt: new Date('2023-10-28'),
          updatedAt: new Date('2023-11-01'),
        },
      ]
      setDocuments(mockDocuments)
    }
  }, [documents.length, setDocuments])
  
  // Filter and sort documents
  const filteredAndSortedDocuments = useMemo(() => {
    let filtered = documents.filter((doc) => {
      // Search filter
      if (searchQuery && !doc.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !doc.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))) {
        return false
      }
      
      // Type filter
      if (filterBy.type.length > 0 && !filterBy.type.includes(doc.type)) {
        return false
      }
      
      // Tags filter
      if (filterBy.tags.length > 0 && !filterBy.tags.some(tag => doc.tags.includes(tag))) {
        return false
      }
      
      // Date range filter
      if (filterBy.dateRange.start && doc.createdAt < filterBy.dateRange.start) {
        return false
      }
      if (filterBy.dateRange.end && doc.createdAt > filterBy.dateRange.end) {
        return false
      }
      
      return true
    })
    
    // Sort documents
    filtered.sort((a, b) => {
      let comparison = 0
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'date':
          comparison = a.updatedAt.getTime() - b.updatedAt.getTime()
          break
        case 'size':
          comparison = a.size - b.size
          break
        case 'type':
          comparison = a.type.localeCompare(b.type)
          break
      }
      
      return sortOrder === 'asc' ? comparison : -comparison
    })
    
    return filtered
  }, [documents, searchQuery, filterBy, sortBy, sortOrder])
  
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    
    files.forEach((file) => {
      const newDocument: Document = {
        id: crypto.randomUUID(),
        name: file.name,
        type: getDocumentType(file.type),
        url: URL.createObjectURL(file),
        size: file.size,
        mimeType: file.type,
        tags: [],
        uploadedBy: 'current-user@law.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      
      addDocument(newDocument)
      
      // Add activity
      addActivity({
        type: 'document_viewed',
        userId: 'current-user',
        metadata: {
          action: 'upload',
          documentId: newDocument.id,
          documentName: newDocument.name,
          documentType: newDocument.type,
        },
      })
    })
    
    // Reset file input
    if (event.target) {
      event.target.value = ''
    }
  }
  
  const getDocumentType = (mimeType: string): Document['type'] => {
    if (mimeType.includes('pdf')) return 'other'
    if (mimeType.includes('word')) return 'other'
    if (mimeType.includes('image')) return 'evidence'
    return 'other'
  }
  
  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 Bytes'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }
  
  const getDocumentIcon = (type: Document['type']) => {
    switch (type) {
      case 'contract': return <FileText className="w-5 h-5 text-blue-600" />
      case 'brief': return <FileText className="w-5 h-5 text-purple-600" />
      case 'motion': return <FileText className="w-5 h-5 text-green-600" />
      case 'evidence': return <FileText className="w-5 h-5 text-orange-600" />
      case 'correspondence': return <FileText className="w-5 h-5 text-red-600" />
      default: return <FileText className="w-5 h-5 text-gray-600" />
    }
  }
  
  const getSecurityBadge = (doc: Document) => {
    // Mock security classification - in real app, this would be from document metadata
    const classifications: SecurityClassification[] = [
      { level: 'confidential', reason: 'Client privilege', expiresAt: undefined, grantedBy: 'system', grantedAt: new Date() },
      { level: 'internal', reason: 'Work product', expiresAt: undefined, grantedBy: 'system', grantedAt: new Date() },
      { level: 'public', reason: 'Filed document', expiresAt: undefined, grantedBy: 'system', grantedAt: new Date() },
    ]
    
    const classification = classifications[Math.floor(Math.random() * classifications.length)]
    
    const colors = {
      public: 'bg-green-100 text-green-800',
      internal: 'bg-yellow-100 text-yellow-800',
      confidential: 'bg-red-100 text-red-800',
      restricted: 'bg-purple-100 text-purple-800',
    }
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colors[classification.level]}`}>
        <Shield className="w-3 h-3 mr-1" />
        {classification.level.toUpperCase()}
      </span>
    )
  }
  
  const handleSelectDocument = (id: string) => {
    const newSelected = new Set(selectedDocuments)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedDocuments(newSelected)
  }
  
  const handleBulkAction = (action: 'download' | 'delete' | 'archive' | 'tag') => {
    const selectedIds = Array.from(selectedDocuments)
    
    switch (action) {
      case 'delete':
        selectedIds.forEach(id => {
          deleteDocument(id)
          addActivity({
            type: 'document_viewed',
            userId: 'current-user',
            metadata: {
              action: 'delete',
              documentId: id,
            },
          })
        })
        setSelectedDocuments(new Set())
        break
      case 'download':
        // Mock download - in real app, would trigger actual downloads
        selectedIds.forEach(id => {
          const doc = documents.find(d => d.id === id)
          if (doc) {
            console.log(`Downloading: ${doc.name}`)
            addActivity({
              type: 'document_viewed',
              userId: 'current-user',
              metadata: {
                action: 'download',
                documentId: id,
                documentName: doc.name,
              },
            })
          }
        })
        break
      case 'archive':
        // Mock archive
        console.log('Archiving selected documents')
        break
    }
  }
  
  const documentTypes = ['contract', 'brief', 'motion', 'evidence', 'correspondence', 'other']
  const allTags = Array.from(new Set(documents.flatMap(doc => doc.tags)))
  
  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
            <p className="text-gray-600">
              Manage and organize your legal documents
            </p>
          </div>
          
          {/* Upload Button */}
          <div className="flex items-center space-x-3">
            <input
              type="file"
              id="file-upload"
              multiple
              onChange={handleFileUpload}
              className="hidden"
              accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
            />
            <Button
              onClick={() => document.getElementById('file-upload')?.click()}
              className="flex items-center space-x-2"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Documents</span>
            </Button>
          </div>
        </div>
        
        {/* Search and Filters */}
        <div className="flex items-center space-x-4 mb-4">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {/* View Mode Toggle */}
          <div className="flex items-center border border-gray-300 rounded-md">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          
          {/* Sort */}
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [newSortBy, newSortOrder] = e.target.value.split('-')
              setSortBy(newSortBy as any)
              setSortOrder(newSortOrder as any)
            }}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="name-asc">Name A-Z</option>
            <option value="name-desc">Name Z-A</option>
            <option value="date-desc">Newest First</option>
            <option value="date-asc">Oldest First</option>
            <option value="size-desc">Largest First</option>
            <option value="size-asc">Smallest First</option>
            <option value="type-asc">Type A-Z</option>
          </select>
          
          {/* Filter Toggle */}
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2"
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
          </Button>
        </div>
        
        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Document Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Document Type
                </label>
                <div className="space-y-1">
                  {documentTypes.map((type) => (
                    <label key={type} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filterBy.type.includes(type)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFilterBy(prev => ({ ...prev, type: [...prev.type, type] }))
                          } else {
                            setFilterBy(prev => ({ ...prev, type: prev.type.filter(t => t !== type) }))
                          }
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm capitalize">{type}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              {/* Tags Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags
                </label>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {allTags.map((tag) => (
                    <label key={tag} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filterBy.tags.includes(tag)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFilterBy(prev => ({ ...prev, tags: [...prev.tags, tag] }))
                          } else {
                            setFilterBy(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }))
                          }
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm">{tag}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              {/* Date Range Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date Range
                </label>
                <div className="space-y-2">
                  <input
                    type="date"
                    value={filterBy.dateRange.start?.toISOString().split('T')[0] || ''}
                    onChange={(e) => {
                      const date = e.target.value ? new Date(e.target.value) : undefined
                      setFilterBy(prev => ({ ...prev, dateRange: { ...prev.dateRange, start: date } }))
                    }}
                    className="w-full border border-gray-300 rounded-md px-3 py-1 text-sm"
                    placeholder="Start date"
                  />
                  <input
                    type="date"
                    value={filterBy.dateRange.end?.toISOString().split('T')[0] || ''}
                    onChange={(e) => {
                      const date = e.target.value ? new Date(e.target.value) : undefined
                      setFilterBy(prev => ({ ...prev, dateRange: { ...prev.dateRange, end: date } }))
                    }}
                    className="w-full border border-gray-300 rounded-md px-3 py-1 text-sm"
                    placeholder="End date"
                  />
                </div>
              </div>
            </div>
            
            {/* Clear Filters */}
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilterBy({ type: [], tags: [], dateRange: {} })}
              >
                Clear All Filters
              </Button>
            </div>
          </div>
        )}
        
        {/* Bulk Actions */}
        {selectedDocuments.size > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
            <span className="text-blue-800">
              {selectedDocuments.size} document{selectedDocuments.size !== 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAction('download')}
              >
                <Download className="w-4 h-4 mr-1" />
                Download
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAction('archive')}
              >
                <Archive className="w-4 h-4 mr-1" />
                Archive
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAction('delete')}
                className="text-red-600 border-red-300 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Delete
              </Button>
            </div>
          </div>
        )}
      </div>
      
      {/* Documents Grid/List */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-gray-500">Loading documents...</div>
          </div>
        ) : filteredAndSortedDocuments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <FileText className="w-12 h-12 mb-4" />
            <h3 className="text-lg font-medium mb-2">No documents found</h3>
            <p className="text-center">
              {searchQuery || filterBy.type.length > 0 || filterBy.tags.length > 0
                ? 'Try adjusting your search or filters'
                : 'Upload your first document to get started'
              }
            </p>
          </div>
        ) : (
          <div className={viewMode === 'grid' 
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' 
            : 'space-y-2'
          }>
            {filteredAndSortedDocuments.map((document) => (
              <div
                key={document.id}
                className={`bg-white border border-gray-200 rounded-lg transition-all duration-200 hover:shadow-md ${
                  selectedDocuments.has(document.id) ? 'ring-2 ring-blue-500' : ''
                } ${viewMode === 'list' ? 'flex items-center p-4' : 'p-6'}`}
              >
                {viewMode === 'grid' ? (
                  <>
                    {/* Grid View */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <button
                          onClick={() => handleSelectDocument(document.id)}
                          className="mr-3"
                        >
                          {selectedDocuments.has(document.id) ? (
                            <CheckSquare className="w-4 h-4 text-blue-600" />
                          ) : (
                            <Square className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                        {getDocumentIcon(document.type)}
                      </div>
                      <button className="text-gray-400 hover:text-gray-600">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <h3 className="font-medium text-gray-900 mb-2 line-clamp-2">
                      {document.name}
                    </h3>
                    
                    {getSecurityBadge(document)}
                    
                    <div className="mt-3 space-y-2 text-sm text-gray-600">
                      <div className="flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {document.updatedAt.toLocaleDateString()}
                      </div>
                      <div className="flex items-center">
                        <FileText className="w-3 h-3 mr-1" />
                        {formatFileSize(document.size)}
                      </div>
                      <div className="flex items-center">
                        <User className="w-3 h-3 mr-1" />
                        {document.uploadedBy.split('@')[0]}
                      </div>
                    </div>
                    
                    {/* Tags */}
                    {document.tags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {document.tags.slice(0, 3).map((tag, index) => (
                          <span
                            key={index}
                            className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                        {document.tags.length > 3 && (
                          <span className="text-xs text-gray-500">
                            +{document.tags.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                    
                    {/* Actions */}
                    <div className="mt-4 flex items-center space-x-2">
                      <Button size="sm" variant="outline" className="flex-1">
                        <Eye className="w-3 h-3 mr-1" />
                        View
                      </Button>
                      <Button size="sm" variant="outline">
                        <Download className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Share2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    {/* List View */}
                    <button
                      onClick={() => handleSelectDocument(document.id)}
                      className="mr-4"
                    >
                      {selectedDocuments.has(document.id) ? (
                        <CheckSquare className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Square className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                    
                    <div className="mr-4">
                      {getDocumentIcon(document.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-1">
                        <h3 className="font-medium text-gray-900 truncate">
                          {document.name}
                        </h3>
                        {getSecurityBadge(document)}
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>{document.type}</span>
                        <span>{formatFileSize(document.size)}</span>
                        <span>{document.uploadedBy.split('@')[0]}</span>
                        <span>{document.updatedAt.toLocaleDateString()}</span>
                      </div>
                      
                      {document.tags.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {document.tags.slice(0, 5).map((tag, index) => (
                            <span
                              key={index}
                              className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      <Button size="sm" variant="outline">
                        <Eye className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Download className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Share2 className="w-3 h-3" />
                      </Button>
                      <button className="text-gray-400 hover:text-gray-600 p-1">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Documents