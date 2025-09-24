// Local document routes - Tauri-only implementation
// This replaces HTTP-based document routes with local Tauri commands

import { localApiClient, LocalDocument } from '../localClient';

/**
 * Local document service using Tauri commands instead of HTTP endpoints
 * All document operations happen locally without external server dependencies
 */
export class LocalDocumentService {
  private static instance: LocalDocumentService;

  private constructor() {}

  static getInstance(): LocalDocumentService {
    if (!LocalDocumentService.instance) {
      LocalDocumentService.instance = new LocalDocumentService();
    }
    return LocalDocumentService.instance;
  }

  /**
   * Get all documents for the current user
   */
  async getDocuments(
    category?: string,
    limit?: number,
    offset?: number
  ): Promise<LocalDocument[]> {
    if (!localApiClient.isAuthenticated()) {
      throw new Error('User not authenticated');
    }

    try {
      return await localApiClient.getDocuments(category, limit, offset);
    } catch (error) {
      // Error logging disabled for production
      throw error;
    }
  }

  /**
   * Upload a new document (metadata only - actual file handling via Tauri)
   */
  async uploadDocument(
    name: string,
    category: string,
    fileSize: number,
    contentType: string,
    tags: string[] = []
  ): Promise<LocalDocument> {
    if (!localApiClient.isAuthenticated()) {
      throw new Error('User not authenticated');
    }

    try {
      return await localApiClient.uploadDocument(name, category, fileSize, contentType, tags);
    } catch (error) {
      // Error logging disabled for production
      throw error;
    }
  }

  /**
   * Get a specific document
   */
  async getDocument(documentId: string): Promise<LocalDocument | null> {
    if (!localApiClient.isAuthenticated()) {
      throw new Error('User not authenticated');
    }

    try {
      return await localApiClient.getDocument(documentId);
    } catch (error) {
      // Error logging disabled for production
      throw error;
    }
  }

  /**
   * Update document metadata
   */
  async updateDocument(
    documentId: string,
    updates: {
      name?: string;
      category?: string;
      tags?: string[];
    }
  ): Promise<LocalDocument | null> {
    if (!localApiClient.isAuthenticated()) {
      throw new Error('User not authenticated');
    }

    try {
      return await localApiClient.updateDocument(documentId, updates);
    } catch (error) {
      // Error logging disabled for production
      throw error;
    }
  }

  /**
   * Delete a document
   */
  async deleteDocument(documentId: string): Promise<boolean> {
    if (!localApiClient.isAuthenticated()) {
      throw new Error('User not authenticated');
    }

    try {
      return await localApiClient.deleteDocument(documentId);
    } catch (error) {
      // Error logging disabled for production
      throw error;
    }
  }

  /**
   * Process file upload with local file system integration
   */
  async processFileUpload(file: File): Promise<{
    document: LocalDocument;
    localPath?: string;
  }> {
    if (!localApiClient.isAuthenticated()) {
      throw new Error('User not authenticated');
    }

    try {
      // In a real Tauri app, you'd use the file system APIs to save the file locally
      // For now, we'll simulate the upload with metadata
      
      const category = this.detectDocumentCategory(file.name, file.type);
      const tags = this.generateTags(file.name, file.type);

      const document = await this.uploadDocument(
        file.name,
        category,
        file.size,
        file.type,
        tags
      );

      // In production, you would:
      // 1. Save file to local app directory using Tauri's fs API
      // 2. Extract text content if it's a PDF/Word doc
      // 3. Generate document preview/thumbnail
      // 4. Index content for search

      return {
        document,
        localPath: `~/Documents/BEAR_AI/uploads/${document.id}/${file.name}`
      };
    } catch (error) {
      // Error logging disabled for production
      throw error;
    }
  }

  /**
   * Auto-detect document category based on filename and type
   */
  private detectDocumentCategory(fileName: string, mimeType: string): string {
    const lowerName = fileName.toLowerCase();
    
    if (lowerName.includes('contract') || lowerName.includes('agreement')) {
      return 'contract';
    } else if (lowerName.includes('brief') || lowerName.includes('motion')) {
      return 'brief';
    } else if (lowerName.includes('research') || lowerName.includes('analysis')) {
      return 'research';
    } else if (lowerName.includes('evidence') || lowerName.includes('exhibit')) {
      return 'evidence';
    } else if (lowerName.includes('correspondence') || lowerName.includes('letter')) {
      return 'correspondence';
    } else if (mimeType.includes('pdf')) {
      return 'other';
    } else if (mimeType.includes('word') || mimeType.includes('document')) {
      return 'other';
    } else {
      return 'other';
    }
  }

  /**
   * Generate relevant tags based on document properties
   */
  private generateTags(fileName: string, mimeType: string): string[] {
    const tags: string[] = [];
    const lowerName = fileName.toLowerCase();
    
    // File type tags
    if (mimeType.includes('pdf')) {
      tags.push('pdf');
    } else if (mimeType.includes('word')) {
      tags.push('word-document');
    } else if (mimeType.includes('text')) {
      tags.push('text-file');
    }
    
    // Content type tags based on filename
    if (lowerName.includes('draft')) {
      tags.push('draft');
    }
    if (lowerName.includes('final')) {
      tags.push('final');
    }
    if (lowerName.includes('confidential')) {
      tags.push('confidential');
    }
    if (lowerName.includes('urgent')) {
      tags.push('urgent');
    }
    
    // Date-based tags
    const today = new Date();
    tags.push(`uploaded-${today.getFullYear()}`);
    tags.push(`uploaded-${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`);
    
    return tags;
  }

  /**
   * Search documents locally
   */
  async searchDocuments(
    query: string,
    filters?: {
      category?: string;
      tags?: string[];
      dateRange?: {
        from?: string;
        to?: string;
      };
    }
  ): Promise<LocalDocument[]> {
    const allDocuments = await this.getDocuments();
    
    return allDocuments.filter(doc => {
      // Text search in name and tags
      const textMatch = query === '' || 
        doc.name.toLowerCase().includes(query.toLowerCase()) ||
        doc.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()));
      
      // Category filter
      const categoryMatch = !filters?.category || doc.category === filters.category;
      
      // Tags filter
      const tagsMatch = !filters?.tags?.length || 
        filters.tags.some(filterTag => doc.tags.includes(filterTag));
      
      // Date range filter
      let dateMatch = true;
      if (filters?.dateRange) {
        const docDate = new Date(doc.created_at);
        if (filters.dateRange.from) {
          dateMatch = dateMatch && docDate >= new Date(filters.dateRange.from);
        }
        if (filters.dateRange.to) {
          dateMatch = dateMatch && docDate <= new Date(filters.dateRange.to);
        }
      }
      
      return textMatch && categoryMatch && tagsMatch && dateMatch;
    });
  }
}

// Export singleton instance
export const localDocumentService = LocalDocumentService.getInstance();

// Export convenience methods that match the original HTTP API interface
export const documents = {
  /**
   * List documents - replaces GET /documents
   */
  list: async (params?: {
    category?: string;
    limit?: number;
    offset?: number;
    search?: string;
    tags?: string[];
    dateRange?: { from?: string; to?: string };
  }): Promise<{
    data: LocalDocument[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> => {
    let documents: LocalDocument[];
    
    if (params?.search) {
      // Use search if query provided
      documents = await localDocumentService.searchDocuments(params.search, {
        category: params.category,
        tags: params.tags,
        dateRange: params.dateRange
      });
    } else {
      // Regular list with category filter
      documents = await localDocumentService.getDocuments(
        params?.category,
        undefined, // Let pagination handle limit
        undefined  // Let pagination handle offset
      );
    }
    
    // Apply pagination
    const total = documents.length;
    const offset = params?.offset || 0;
    const limit = params?.limit || 20;
    const page = Math.floor(offset / limit) + 1;
    
    const paginatedDocs = documents.slice(offset, offset + limit);
    
    return {
      data: paginatedDocs,
      pagination: {
        page,
        limit,
        total,
        hasNext: offset + limit < total,
        hasPrev: offset > 0
      }
    };
  },

  /**
   * Upload document - replaces POST /documents
   */
  upload: async (file: File, metadata?: {
    category?: string;
    tags?: string[];
  }): Promise<{ 
    data: LocalDocument; 
    localPath?: string;
  }> => {
    // Override category if provided
    if (metadata?.category) {
      const document = await localDocumentService.uploadDocument(
        file.name,
        metadata.category,
        file.size,
        file.type,
        metadata.tags || []
      );
      
      return {
        data: document,
        localPath: `~/Documents/BEAR_AI/uploads/${document.id}/${file.name}`
      };
    } else {
      // Auto-detect category
      const uploadResult = await localDocumentService.processFileUpload(file);

      return {
        data: uploadResult.document,
        localPath: uploadResult.localPath
      };
    }
  },

  /**
   * Get document - replaces GET /documents/{documentId}
   */
  get: async (documentId: string): Promise<{ data: LocalDocument | null }> => {
    const document = await localDocumentService.getDocument(documentId);
    return { data: document };
  },

  /**
   * Update document - replaces PUT /documents/{documentId}
   */
  update: async (documentId: string, updates: {
    name?: string;
    category?: string;
    tags?: string[];
  }): Promise<{ data: LocalDocument | null }> => {
    const document = await localDocumentService.updateDocument(documentId, updates);
    return { data: document };
  },

  /**
   * Delete document - replaces DELETE /documents/{documentId}
   */
  delete: async (documentId: string): Promise<{ success: boolean }> => {
    const success = await localDocumentService.deleteDocument(documentId);
    return { success };
  },

  /**
   * Search documents - local search functionality
   */
  search: async (query: string, filters?: {
    category?: string;
    tags?: string[];
    dateRange?: { from?: string; to?: string };
  }): Promise<{ data: LocalDocument[] }> => {
    const results = await localDocumentService.searchDocuments(query, filters);
    return { data: results };
  },

  /**
   * Get document categories - local metadata
   */
  getCategories: (): Promise<{ data: string[] }> => {
    const categories = [
      'contract',
      'brief',
      'research',
      'evidence',
      'correspondence',
      'other'
    ];
    
    return Promise.resolve({ data: categories });
  },

  /**
   * Get popular tags - based on local documents
   */
  getTags: async (): Promise<{ data: string[] }> => {
    const allDocuments = await localDocumentService.getDocuments();
    const tagCounts = new Map<string, number>();
    
    allDocuments.forEach(doc => {
      doc.tags.forEach(tag => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    });
    
    // Return most popular tags
    const popularTags = Array.from(tagCounts.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 20)
      .map(([tag]) => tag);
    
    return { data: popularTags };
  }
};

export default localDocumentService;