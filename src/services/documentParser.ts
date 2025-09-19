/**
 * Document Parser Service
 * Handles offline parsing of various document formats
 */

import { LocalFile } from './localFileSystem';
import type { DocumentSection } from './localStorage';

export interface ParsedDocument {
  id: string;
  title: string;
  content: string;
  metadata: {
    pages?: number;
    wordCount: number;
    characters: number;
    author?: string;
    createdDate?: Date;
    modifiedDate?: Date;
    format: string;
  };
  sections?: DocumentSection[];
}

export class DocumentParserService {
  /**
   * Parse document based on file type
   */
  async parseDocument(file: LocalFile): Promise<ParsedDocument> {
    const extension = this.getFileExtension(file.name);
    
    switch (extension) {
      case '.txt':
        return this.parsePlainText(file);
      case '.pdf':
        return this.parsePDF(file);
      case '.docx':
        return this.parseDOCX(file);
      case '.md':
        return this.parseMarkdown(file);
      case '.json':
        return this.parseJSON(file);
      case '.html':
        return this.parseHTML(file);
      default:
        return this.parsePlainText(file);
    }
  }

  /**
   * Parse plain text files
   */
  private async parsePlainText(file: LocalFile): Promise<ParsedDocument> {
    const content = file.content as string;
    const lines = content.split('\n');
    const title = this.extractTitle(lines) || file.name;
    
    return {
      id: file.id,
      title,
      content,
      metadata: {
        wordCount: this.countWords(content),
        characters: content.length,
        format: 'text/plain',
        createdDate: new Date(file.lastModified),
        modifiedDate: new Date(file.lastModified)
      },
      sections: this.extractSections(lines)
    };
  }

  /**
   * Parse PDF files (basic implementation)
   * Note: For full PDF parsing, you'd need a library like pdf-parse or PDF.js
   */
  private async parsePDF(file: LocalFile): Promise<ParsedDocument> {
    // This is a placeholder implementation
    // In a real app, you'd use PDF.js or similar library
    const title = file.name.replace('.pdf', '');
    
    try {
      // Basic PDF text extraction would go here
      // For now, we'll return metadata only
      return {
        id: file.id,
        title,
        content: '[PDF content - requires PDF.js library for full parsing]',
        metadata: {
          wordCount: 0,
          characters: 0,
          format: 'application/pdf',
          createdDate: new Date(file.lastModified),
          modifiedDate: new Date(file.lastModified)
        }
      };
    } catch (error) {
      throw new Error(`Failed to parse PDF: ${error}`);
    }
  }

  /**
   * Parse DOCX files
   * Note: For full DOCX parsing, you'd need a library like mammoth.js
   */
  private async parseDOCX(file: LocalFile): Promise<ParsedDocument> {
    // This is a placeholder implementation
    // In a real app, you'd use mammoth.js or similar library
    const title = file.name.replace('.docx', '');
    
    try {
      // Basic DOCX text extraction would go here
      return {
        id: file.id,
        title,
        content: '[DOCX content - requires mammoth.js library for full parsing]',
        metadata: {
          wordCount: 0,
          characters: 0,
          format: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          createdDate: new Date(file.lastModified),
          modifiedDate: new Date(file.lastModified)
        }
      };
    } catch (error) {
      throw new Error(`Failed to parse DOCX: ${error}`);
    }
  }

  /**
   * Parse Markdown files
   */
  private async parseMarkdown(file: LocalFile): Promise<ParsedDocument> {
    const content = file.content as string;
    const lines = content.split('\n');
    const title = this.extractMarkdownTitle(lines) || file.name;
    
    return {
      id: file.id,
      title,
      content,
      metadata: {
        wordCount: this.countWords(content),
        characters: content.length,
        format: 'text/markdown',
        createdDate: new Date(file.lastModified),
        modifiedDate: new Date(file.lastModified)
      },
      sections: this.extractMarkdownSections(lines)
    };
  }

  /**
   * Parse JSON files
   */
  private async parseJSON(file: LocalFile): Promise<ParsedDocument> {
    const content = file.content as string;
    const title = file.name;
    
    try {
      const jsonData = JSON.parse(content);
      const formattedContent = JSON.stringify(jsonData, null, 2);
      
      return {
        id: file.id,
        title,
        content: formattedContent,
        metadata: {
          wordCount: this.countWords(formattedContent),
          characters: formattedContent.length,
          format: 'application/json',
          createdDate: new Date(file.lastModified),
          modifiedDate: new Date(file.lastModified)
        }
      };
    } catch (error) {
      throw new Error(`Invalid JSON format: ${error}`);
    }
  }

  /**
   * Parse HTML files
   */
  private async parseHTML(file: LocalFile): Promise<ParsedDocument> {
    const content = file.content as string;
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');
    
    const title = doc.querySelector('title')?.textContent || file.name;
    const textContent = doc.body?.textContent || content;
    
    return {
      id: file.id,
      title,
      content: textContent,
      metadata: {
        wordCount: this.countWords(textContent),
        characters: textContent.length,
        format: 'text/html',
        createdDate: new Date(file.lastModified),
        modifiedDate: new Date(file.lastModified)
      },
      sections: this.extractHTMLSections(doc)
    };
  }

  /**
   * Extract title from text lines
   */
  private extractTitle(lines: string[]): string | null {
    for (const line of lines.slice(0, 10)) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('#')) {
        return trimmed.substring(0, 100);
      }
    }
    return null;
  }

  /**
   * Extract title from Markdown
   */
  private extractMarkdownTitle(lines: string[]): string | null {
    for (const line of lines.slice(0, 10)) {
      if (line.startsWith('# ')) {
        return line.substring(2).trim();
      }
    }
    return null;
  }

  /**
   * Extract sections from text
   */
  private extractSections(lines: string[]): DocumentSection[] {
    const sections: DocumentSection[] = [];
    let currentSection: DocumentSection | null = null;
    
    for (const line of lines) {
      if (line.trim().length === 0) continue;
      
      // Simple section detection (you can enhance this)
      if (line.match(/^[A-Z][A-Za-z\s]+:$/)) {
        if (currentSection) {
          sections.push(currentSection);
        }
        currentSection = {
          title: line.replace(':', ''),
          content: '',
          level: 1
        };
      } else if (currentSection) {
        currentSection.content += line + '\n';
      }
    }
    
    if (currentSection) {
      sections.push(currentSection);
    }

    return sections;
  }

  /**
   * Extract sections from Markdown
   */
  private extractMarkdownSections(lines: string[]): DocumentSection[] {
    const sections: DocumentSection[] = [];
    let currentSection: DocumentSection | null = null;
    
    for (const line of lines) {
      const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
      
      if (headerMatch) {
        if (currentSection) {
          sections.push(currentSection);
        }
        currentSection = {
          title: headerMatch[2],
          content: '',
          level: headerMatch[1].length
        };
      } else if (currentSection) {
        currentSection.content += line + '\n';
      }
    }
    
    if (currentSection) {
      sections.push(currentSection);
    }

    return sections;
  }

  /**
   * Extract sections from HTML
   */
  private extractHTMLSections(doc: Document): DocumentSection[] {
    const sections: DocumentSection[] = [];
    const headers = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');
    
    headers.forEach(header => {
      const level = parseInt(header.tagName.substring(1));
      const title = header.textContent || '';
      
      // Get content until next header of same or higher level
      let content = '';
      let nextElement = header.nextElementSibling;
      
      while (nextElement && !nextElement.matches('h1, h2, h3, h4, h5, h6')) {
        content += nextElement.textContent + '\n';
        nextElement = nextElement.nextElementSibling;
      }
      
      sections.push({ title, content, level });
    });

    return sections;
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Get file extension
   */
  private getFileExtension(filename: string): string {
    return filename.toLowerCase().substring(filename.lastIndexOf('.'));
  }
}

export const documentParserService = new DocumentParserService();
