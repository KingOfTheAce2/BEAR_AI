/**
 * File Metadata Management Service
 * Handles metadata extraction, storage, and management for local files
 */

import { LocalFile } from './localFileSystem';
import { ParsedDocument } from './documentParser';

export interface ExtendedFileMetadata {
  id: string;
  name: string;
  path: string;
  size: number;
  type: string;
  lastModified: Date;
  created?: Date;
  accessed?: Date;
  checksum?: string;
  encoding?: string;
  language?: string;
  
  // Content metadata
  wordCount?: number;
  characterCount?: number;
  lineCount?: number;
  pageCount?: number;
  
  // Document structure
  hasImages?: boolean;
  hasLinks?: boolean;
  hasTables?: boolean;
  sectionsCount?: number;
  
  // Content analysis
  readingTime?: number; // in minutes
  complexity?: 'low' | 'medium' | 'high';
  contentType?: 'technical' | 'narrative' | 'legal' | 'academic' | 'other';
  
  // Custom metadata
  tags: string[];
  categories: string[];
  description?: string;
  author?: string;
  title?: string;
  keywords: string[];
  
  // Processing metadata
  indexed: boolean;
  lastIndexed?: Date;
  processingErrors?: string[];
  
  // Version control
  version: number;
  previousVersions?: string[];
  
  // Relationships
  relatedFiles?: string[];
  duplicates?: string[];
  
  // Security
  permissions?: {
    read: boolean;
    write: boolean;
    delete: boolean;
  };
  
  // Analytics
  accessCount: number;
  lastAccessed: Date;
  searchCount: number;
  editCount: number;
}

export class FileMetadataService {
  private metadataCache: Map<string, ExtendedFileMetadata> = new Map();
  
  /**
   * Extract comprehensive metadata from a local file
   */
  async extractMetadata(file: LocalFile, parsedDocument?: ParsedDocument): Promise<ExtendedFileMetadata> {
    const basicMetadata = this.extractBasicMetadata(file);
    const contentMetadata = await this.extractContentMetadata(file, parsedDocument);
    const analysisMetadata = await this.analyzeContent(file, parsedDocument);
    
    const metadata: ExtendedFileMetadata = {
      ...basicMetadata,
      ...contentMetadata,
      ...analysisMetadata,
      
      // Initialize tracking fields
      tags: [],
      categories: [],
      keywords: [],
      indexed: false,
      version: 1,
      accessCount: 0,
      lastAccessed: new Date(),
      searchCount: 0,
      editCount: 0,
      permissions: {
        read: true,
        write: true,
        delete: true
      }
    };
    
    // Cache the metadata
    this.metadataCache.set(file.id, metadata);
    
    return metadata;
  }
  
  /**
   * Extract basic file metadata
   */
  private extractBasicMetadata(file: LocalFile): Partial<ExtendedFileMetadata> {
    return {
      id: file.id,
      name: file.name,
      path: file.path,
      size: file.size,
      type: file.type,
      lastModified: new Date(file.lastModified),
      encoding: this.detectEncoding(file),
      checksum: this.calculateChecksum(file)
    };
  }
  
  /**
   * Extract content-based metadata
   */
  private async extractContentMetadata(
    file: LocalFile, 
    parsedDocument?: ParsedDocument
  ): Promise<Partial<ExtendedFileMetadata>> {
    const metadata: Partial<ExtendedFileMetadata> = {};
    
    if (parsedDocument) {
      metadata.wordCount = parsedDocument.metadata.wordCount;
      metadata.characterCount = parsedDocument.metadata.characters;
      metadata.pageCount = parsedDocument.metadata.pages;
      metadata.sectionsCount = parsedDocument.sections?.length || 0;
      metadata.title = parsedDocument.title;
      metadata.author = parsedDocument.metadata.author;
    }
    
    if (typeof file.content === 'string') {
      const content = file.content;
      metadata.lineCount = content.split('\n').length;
      metadata.hasLinks = this.containsLinks(content);
      metadata.hasTables = this.containsTables(content);
      metadata.language = this.detectLanguage(content);
      metadata.keywords = this.extractKeywords(content);
    }
    
    return metadata;
  }
  
  /**
   * Analyze content for additional insights
   */
  private async analyzeContent(
    file: LocalFile, 
    parsedDocument?: ParsedDocument
  ): Promise<Partial<ExtendedFileMetadata>> {
    const metadata: Partial<ExtendedFileMetadata> = {};
    
    if (parsedDocument) {
      // Calculate reading time (average 200 words per minute)
      metadata.readingTime = Math.ceil(parsedDocument.metadata.wordCount / 200);
      
      // Analyze complexity
      metadata.complexity = this.analyzeComplexity(parsedDocument.content);
      
      // Determine content type
      metadata.contentType = this.determineContentType(parsedDocument.content);
    }
    
    return metadata;
  }
  
  /**
   * Update metadata for a file
   */
  async updateMetadata(
    fileId: string, 
    updates: Partial<ExtendedFileMetadata>
  ): Promise<ExtendedFileMetadata> {
    const existing = this.metadataCache.get(fileId);
    if (!existing) {
      throw new Error(`Metadata not found for file: ${fileId}`);
    }
    
    const updated: ExtendedFileMetadata = {
      ...existing,
      ...updates,
      version: existing.version + 1,
      lastModified: new Date()
    };
    
    // Track previous version
    if (!updated.previousVersions) {
      updated.previousVersions = [];
    }
    updated.previousVersions.push(`v${existing.version}`);
    
    this.metadataCache.set(fileId, updated);
    return updated;
  }
  
  /**
   * Get metadata for a file
   */
  getMetadata(fileId: string): ExtendedFileMetadata | null {
    return this.metadataCache.get(fileId) || null;
  }
  
  /**
   * Search files by metadata
   */
  searchByMetadata(criteria: Partial<ExtendedFileMetadata>): ExtendedFileMetadata[] {
    const results: ExtendedFileMetadata[] = [];
    
    for (const metadata of this.metadataCache.values()) {
      if (this.matchesCriteria(metadata, criteria)) {
        results.push(metadata);
      }
    }
    
    return results.sort((a, b) => b.lastAccessed.getTime() - a.lastAccessed.getTime());
  }
  
  /**
   * Add tags to a file
   */
  async addTags(fileId: string, tags: string[]): Promise<void> {
    const metadata = this.metadataCache.get(fileId);
    if (!metadata) return;
    
    const newTags = tags.filter(tag => !metadata.tags.includes(tag));
    metadata.tags.push(...newTags);
    metadata.lastModified = new Date();
    
    this.metadataCache.set(fileId, metadata);
  }
  
  /**
   * Remove tags from a file
   */
  async removeTags(fileId: string, tags: string[]): Promise<void> {
    const metadata = this.metadataCache.get(fileId);
    if (!metadata) return;
    
    metadata.tags = metadata.tags.filter(tag => !tags.includes(tag));
    metadata.lastModified = new Date();
    
    this.metadataCache.set(fileId, metadata);
  }
  
  /**
   * Track file access
   */
  async recordAccess(fileId: string): Promise<void> {
    const metadata = this.metadataCache.get(fileId);
    if (!metadata) return;
    
    metadata.accessCount++;
    metadata.lastAccessed = new Date();
    
    this.metadataCache.set(fileId, metadata);
  }
  
  /**
   * Track search operations
   */
  async recordSearch(fileId: string): Promise<void> {
    const metadata = this.metadataCache.get(fileId);
    if (!metadata) return;
    
    metadata.searchCount++;
    this.metadataCache.set(fileId, metadata);
  }
  
  /**
   * Find duplicate files
   */
  async findDuplicates(): Promise<Array<ExtendedFileMetadata[]>> {
    const checksumGroups = new Map<string, ExtendedFileMetadata[]>();
    
    for (const metadata of this.metadataCache.values()) {
      if (metadata.checksum) {
        if (!checksumGroups.has(metadata.checksum)) {
          checksumGroups.set(metadata.checksum, []);
        }
        checksumGroups.get(metadata.checksum)!.push(metadata);
      }
    }
    
    // Return only groups with duplicates
    return Array.from(checksumGroups.values()).filter(group => group.length > 1);
  }
  
  /**
   * Get file statistics
   */
  getStatistics(): {
    totalFiles: number;
    totalSize: number;
    averageSize: number;
    typeDistribution: Record<string, number>;
    tagDistribution: Record<string, number>;
    complexityDistribution: Record<string, number>;
    oldestFile: Date | null;
    newestFile: Date | null;
  } {
    const files = Array.from(this.metadataCache.values());
    
    const stats = {
      totalFiles: files.length,
      totalSize: files.reduce((sum, f) => sum + f.size, 0),
      averageSize: 0,
      typeDistribution: {} as Record<string, number>,
      tagDistribution: {} as Record<string, number>,
      complexityDistribution: {} as Record<string, number>,
      oldestFile: null as Date | null,
      newestFile: null as Date | null
    };
    
    if (files.length > 0) {
      stats.averageSize = stats.totalSize / files.length;
    }
    
    for (const file of files) {
      // Type distribution
      stats.typeDistribution[file.type] = (stats.typeDistribution[file.type] || 0) + 1;
      
      // Tag distribution
      for (const tag of file.tags) {
        stats.tagDistribution[tag] = (stats.tagDistribution[tag] || 0) + 1;
      }
      
      // Complexity distribution
      if (file.complexity) {
        stats.complexityDistribution[file.complexity] = 
          (stats.complexityDistribution[file.complexity] || 0) + 1;
      }
      
      // Date ranges
      if (!stats.oldestFile || file.lastModified < stats.oldestFile) {
        stats.oldestFile = file.lastModified;
      }
      if (!stats.newestFile || file.lastModified > stats.newestFile) {
        stats.newestFile = file.lastModified;
      }
    }
    
    return stats;
  }
  
  // Private helper methods
  
  private detectEncoding(file: LocalFile): string {
    // Simple encoding detection - in a real app, you'd use a proper library
    if (typeof file.content === 'string') {
      // Check for common encoding indicators
      if (file.content.includes('utf-8') || file.content.includes('UTF-8')) {
        return 'utf-8';
      }
    }
    return 'utf-8'; // default
  }
  
  private calculateChecksum(file: LocalFile): string {
    // Simple checksum based on content and size
    // In a real app, you'd use a proper hashing algorithm
    const content = typeof file.content === 'string' ? file.content : file.content?.toString() || '';
    return btoa(`${file.size}-${content.length}-${file.lastModified}`).substring(0, 16);
  }
  
  private containsLinks(content: string): boolean {
    const linkRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/i;
    return linkRegex.test(content);
  }
  
  private containsTables(content: string): boolean {
    // Check for markdown tables or HTML tables
    return content.includes('|') && content.includes('---') || 
           content.includes('<table>') || 
           content.includes('<tr>');
  }
  
  private detectLanguage(content: string): string {
    // Very basic language detection
    const codeKeywords = ['function', 'const', 'let', 'var', 'class', 'import', 'export'];
    const hasCodeKeywords = codeKeywords.some(keyword => content.includes(keyword));
    
    if (hasCodeKeywords) return 'code';
    
    // Could add more sophisticated language detection here
    return 'en'; // default to English
  }
  
  private extractKeywords(content: string): string[] {
    // Simple keyword extraction
    const words = content
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !this.isStopWord(word));
    
    // Count frequency and return top keywords
    const frequency: Record<string, number> = {};
    words.forEach(word => {
      frequency[word] = (frequency[word] || 0) + 1;
    });
    
    return Object.entries(frequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);
  }
  
  private analyzeComplexity(content: string): 'low' | 'medium' | 'high' {
    const sentences = content.split(/[.!?]+/).length;
    const words = content.split(/\s+/).length;
    const avgWordsPerSentence = words / sentences;
    
    if (avgWordsPerSentence > 20) return 'high';
    if (avgWordsPerSentence > 12) return 'medium';
    return 'low';
  }
  
  private determineContentType(content: string): 'technical' | 'narrative' | 'legal' | 'academic' | 'other' {
    const lowerContent = content.toLowerCase();
    
    // Technical indicators
    const technicalTerms = ['algorithm', 'function', 'variable', 'method', 'class', 'interface'];
    if (technicalTerms.some(term => lowerContent.includes(term))) {
      return 'technical';
    }
    
    // Legal indicators
    const legalTerms = ['shall', 'whereas', 'hereby', 'pursuant', 'agreement', 'contract'];
    if (legalTerms.some(term => lowerContent.includes(term))) {
      return 'legal';
    }
    
    // Academic indicators
    const academicTerms = ['research', 'study', 'analysis', 'hypothesis', 'methodology', 'conclusion'];
    if (academicTerms.some(term => lowerContent.includes(term))) {
      return 'academic';
    }
    
    // Narrative indicators
    const narrativeTerms = ['story', 'character', 'chapter', 'once upon', 'narrative'];
    if (narrativeTerms.some(term => lowerContent.includes(term))) {
      return 'narrative';
    }
    
    return 'other';
  }
  
  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have',
      'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
      'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they'
    ]);
    
    return stopWords.has(word);
  }
  
  private matchesCriteria(metadata: ExtendedFileMetadata, criteria: Partial<ExtendedFileMetadata>): boolean {
    for (const [key, value] of Object.entries(criteria)) {
      if (value === undefined) continue;
      
      const metadataValue = (metadata as any)[key];
      
      if (Array.isArray(value)) {
        // For array fields like tags, check if any match
        if (!Array.isArray(metadataValue)) continue;
        const hasMatch = value.some(v => metadataValue.includes(v));
        if (!hasMatch) return false;
      } else if (typeof value === 'string') {
        // For string fields, do partial matching
        if (typeof metadataValue !== 'string') continue;
        if (!metadataValue.toLowerCase().includes(value.toLowerCase())) {
          return false;
        }
      } else {
        // For other types, do exact matching
        if (metadataValue !== value) return false;
      }
    }
    
    return true;
  }
}

export const fileMetadataService = new FileMetadataService();