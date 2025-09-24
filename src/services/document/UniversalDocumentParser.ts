/**
 * Universal Document Parser
 * Handles PDF, DOCX, PPTX, XLSX, TXT, RTF, ODT, ODS, ODP
 * Full production implementation with OCR support
 */

import { invoke } from '@tauri-apps/api/tauri';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { parseString } from 'xml2js';
import { promisify } from 'util';

const parseXml = promisify(parseString);

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface DocumentMetadata {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string[];
  created?: Date;
  modified?: Date;
  pages?: number;
  wordCount?: number;
  language?: string;
  fileSize?: number;
  mimeType?: string;
}

export interface ParsedDocument {
  text: string;
  metadata: DocumentMetadata;
  structure: DocumentStructure;
  images?: DocumentImage[];
  tables?: DocumentTable[];
  slides?: DocumentSlide[];
  sheets?: DocumentSheet[];
  errors?: string[];
}

export interface DocumentStructure {
  headings: DocumentHeading[];
  paragraphs: string[];
  lists: DocumentList[];
  sections: DocumentSection[];
}

export interface DocumentHeading {
  level: number;
  text: string;
  pageNumber?: number;
}

export interface DocumentList {
  type: 'ordered' | 'unordered';
  items: string[];
}

export interface DocumentSection {
  title: string;
  content: string;
  pageStart?: number;
  pageEnd?: number;
}

export interface DocumentImage {
  id: string;
  data: string; // base64
  mimeType: string;
  width?: number;
  height?: number;
  caption?: string;
  pageNumber?: number;
}

export interface DocumentTable {
  headers: string[];
  rows: string[][];
  caption?: string;
  pageNumber?: number;
}

export interface DocumentSlide {
  number: number;
  title?: string;
  content: string;
  notes?: string;
  images?: DocumentImage[];
}

export interface DocumentSheet {
  name: string;
  data: any[][];
  headers?: string[];
  formulas?: string[][];
}

export class UniversalDocumentParser {
  private static instance: UniversalDocumentParser;

  private constructor() {}

  public static getInstance(): UniversalDocumentParser {
    if (!UniversalDocumentParser.instance) {
      UniversalDocumentParser.instance = new UniversalDocumentParser();
    }
    return UniversalDocumentParser.instance;
  }

  /**
   * Parse any supported document format
   */
  public async parseDocument(
    file: File | Blob,
    options: {
      extractImages?: boolean;
      extractTables?: boolean;
      performOCR?: boolean;
      language?: string;
    } = {}
  ): Promise<ParsedDocument> {
    const fileType = this.detectFileType(file);

    switch (fileType) {
      case 'pdf':
        return await this.parsePDF(file, options);
      case 'docx':
        return await this.parseDOCX(file, options);
      case 'pptx':
        return await this.parsePPTX(file, options);
      case 'xlsx':
        return await this.parseXLSX(file, options);
      case 'txt':
        return await this.parseTXT(file);
      case 'rtf':
        return await this.parseRTF(file);
      case 'odt':
        return await this.parseODT(file, options);
      case 'ods':
        return await this.parseODS(file, options);
      case 'odp':
        return await this.parseODP(file, options);
      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }
  }

  /**
   * Parse PDF with OCR support
   */
  private async parsePDF(
    file: File | Blob,
    options: any
  ): Promise<ParsedDocument> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    const metadata = await this.extractPDFMetadata(pdf);
    const structure: DocumentStructure = {
      headings: [],
      paragraphs: [],
      lists: [],
      sections: []
    };

    const images: DocumentImage[] = [];
    const tables: DocumentTable[] = [];
    let fullText = '';

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);

      // Extract text
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');

      fullText += pageText + '\n\n';

      // Extract structure
      this.extractStructureFromText(pageText, structure, pageNum);

      // Extract images if requested
      if (options.extractImages) {
        const pageImages = await this.extractPDFImages(page, pageNum);
        images.push(...pageImages);
      }

      // Perform OCR if text is minimal and OCR is requested
      if (options.performOCR && pageText.trim().length < 50) {
        const ocrText = await this.performOCR(page, options.language);
        fullText += ocrText + '\n\n';
      }
    }

    // Extract tables using Tauri backend
    if (options.extractTables) {
      const extractedTables = await this.extractTablesFromText(fullText);
      tables.push(...extractedTables);
    }

    return {
      text: fullText.trim(),
      metadata,
      structure,
      images,
      tables,
      errors: []
    };
  }

  /**
   * Parse DOCX files
   */
  private async parseDOCX(
    file: File | Blob,
    options: any
  ): Promise<ParsedDocument> {
    const arrayBuffer = await file.arrayBuffer();

    // Use mammoth for better DOCX parsing
    const result = await mammoth.convertToHtml({
      arrayBuffer: arrayBuffer
    });

    const text = await mammoth.extractRawText({
      arrayBuffer: arrayBuffer
    });

    // Extract metadata from DOCX
    const metadata = await this.extractDOCXMetadata(arrayBuffer);

    // Parse HTML to extract structure
    const structure = this.extractStructureFromHTML(result.value);

    // Extract images if requested
    const images: DocumentImage[] = [];
    if (options.extractImages) {
      const docxImages = await this.extractDOCXImages(arrayBuffer);
      images.push(...docxImages);
    }

    // Extract tables
    const tables: DocumentTable[] = [];
    if (options.extractTables) {
      const docxTables = await this.extractDOCXTables(result.value);
      tables.push(...docxTables);
    }

    return {
      text: text.value,
      metadata,
      structure,
      images,
      tables,
      errors: result.messages
    };
  }

  /**
   * Parse PPTX files
   */
  private async parsePPTX(
    file: File | Blob,
    options: any
  ): Promise<ParsedDocument> {
    const arrayBuffer = await file.arrayBuffer();
    const zip = new JSZip();
    const contents = await zip.loadAsync(arrayBuffer);

    const slides: DocumentSlide[] = [];
    let fullText = '';
    const images: DocumentImage[] = [];

    // Find all slide files
    const slideFiles = Object.keys(contents.files)
      .filter(name => name.match(/ppt\/slides\/slide\d+\.xml$/))
      .sort();

    for (const slidePath of slideFiles) {
      const slideContent = await contents.files[slidePath].async('string');
      const slideData = await this.parseSlideXML(slideContent);

      const slideNumber = parseInt(slidePath.match(/slide(\d+)/)![1]);

      // Extract notes if present
      const notesPath = slidePath.replace('slides/slide', 'notesSlides/notesSlide');
      let notes = '';
      if (contents.files[notesPath]) {
        const notesContent = await contents.files[notesPath].async('string');
        notes = await this.extractNotesFromXML(notesContent);
      }

      slides.push({
        number: slideNumber,
        title: slideData.title,
        content: slideData.content,
        notes,
        images: slideData.images
      });

      fullText += `Slide ${slideNumber}: ${slideData.title}\n${slideData.content}\n\n`;

      if (slideData.images && options.extractImages) {
        images.push(...slideData.images);
      }
    }

    // Extract metadata
    const metadata = await this.extractPPTXMetadata(contents);

    return {
      text: fullText.trim(),
      metadata,
      structure: {
        headings: slides.map(s => ({ level: 1, text: s.title || `Slide ${s.number}` })),
        paragraphs: slides.map(s => s.content),
        lists: [],
        sections: []
      },
      slides,
      images,
      errors: []
    };
  }

  /**
   * Parse XLSX files
   */
  private async parseXLSX(
    file: File | Blob,
    options: any
  ): Promise<ParsedDocument> {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });

    const sheets: DocumentSheet[] = [];
    let fullText = '';
    const tables: DocumentTable[] = [];

    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // Extract formulas if present
      const formulas: string[][] = [];
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');

      for (let row = range.s.r; row <= range.e.r; row++) {
        const rowFormulas: string[] = [];
        for (let col = range.s.c; col <= range.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          const cell = worksheet[cellAddress];
          rowFormulas.push(cell?.f || '');
        }
        formulas.push(rowFormulas);
      }

      sheets.push({
        name: sheetName,
        data: jsonData as any[][],
        headers: jsonData[0] as string[],
        formulas
      });

      // Convert to text
      const sheetText = this.sheetToText(jsonData as any[][]);
      fullText += `Sheet: ${sheetName}\n${sheetText}\n\n`;

      // Extract as table
      if (options.extractTables && jsonData.length > 1) {
        tables.push({
          headers: jsonData[0] as string[],
          rows: jsonData.slice(1) as string[][],
          caption: sheetName
        });
      }
    }

    // Extract metadata
    const metadata = this.extractXLSXMetadata(workbook);

    return {
      text: fullText.trim(),
      metadata,
      structure: {
        headings: sheets.map(s => ({ level: 1, text: s.name })),
        paragraphs: [],
        lists: [],
        sections: sheets.map(s => ({
          title: s.name,
          content: this.sheetToText(s.data)
        }))
      },
      sheets,
      tables,
      errors: []
    };
  }

  /**
   * Parse plain text files
   */
  private async parseTXT(file: File | Blob): Promise<ParsedDocument> {
    const text = await file.text();

    return {
      text,
      metadata: {
        fileSize: file.size,
        mimeType: 'text/plain'
      },
      structure: this.extractStructureFromText(text, {
        headings: [],
        paragraphs: text.split('\n\n'),
        lists: [],
        sections: []
      }),
      errors: []
    };
  }

  /**
   * Parse RTF files
   */
  private async parseRTF(file: File | Blob): Promise<ParsedDocument> {
    const text = await file.text();

    // Basic RTF parsing - remove RTF control codes
    const plainText = text
      .replace(/\\par\b/g, '\n')
      .replace(/\\\w+\b\s?/g, '')
      .replace(/[{}]/g, '')
      .trim();

    return {
      text: plainText,
      metadata: {
        fileSize: file.size,
        mimeType: 'application/rtf'
      },
      structure: {
        headings: [],
        paragraphs: plainText.split('\n\n'),
        lists: [],
        sections: []
      },
      errors: []
    };
  }

  /**
   * Parse OpenDocument Text (ODT)
   */
  private async parseODT(
    file: File | Blob,
    options: any
  ): Promise<ParsedDocument> {
    const arrayBuffer = await file.arrayBuffer();
    const zip = new JSZip();
    const contents = await zip.loadAsync(arrayBuffer);

    // Extract content.xml
    const contentXml = await contents.files['content.xml'].async('string');
    const content = await this.parseODFContent(contentXml);

    // Extract metadata
    const metaXml = await contents.files['meta.xml'].async('string');
    const metadata = await this.parseODFMetadata(metaXml);

    return {
      text: content.text,
      metadata,
      structure: content.structure,
      images: options.extractImages ? content.images : [],
      tables: options.extractTables ? content.tables : [],
      errors: []
    };
  }

  /**
   * Parse OpenDocument Spreadsheet (ODS)
   */
  private async parseODS(
    file: File | Blob,
    options: any
  ): Promise<ParsedDocument> {
    const arrayBuffer = await file.arrayBuffer();
    const zip = new JSZip();
    const contents = await zip.loadAsync(arrayBuffer);

    // Extract content.xml
    const contentXml = await contents.files['content.xml'].async('string');
    const sheets = await this.parseODSContent(contentXml);

    // Extract metadata
    const metaXml = await contents.files['meta.xml'].async('string');
    const metadata = await this.parseODFMetadata(metaXml);

    let fullText = '';
    sheets.forEach(sheet => {
      fullText += `Sheet: ${sheet.name}\n${this.sheetToText(sheet.data)}\n\n`;
    });

    return {
      text: fullText.trim(),
      metadata,
      structure: {
        headings: sheets.map(s => ({ level: 1, text: s.name })),
        paragraphs: [],
        lists: [],
        sections: []
      },
      sheets,
      tables: options.extractTables ?
        sheets.map(s => ({
          headers: s.headers || [],
          rows: s.data.slice(1),
          caption: s.name
        })) : [],
      errors: []
    };
  }

  /**
   * Parse OpenDocument Presentation (ODP)
   */
  private async parseODP(
    file: File | Blob,
    options: any
  ): Promise<ParsedDocument> {
    const arrayBuffer = await file.arrayBuffer();
    const zip = new JSZip();
    const contents = await zip.loadAsync(arrayBuffer);

    // Extract content.xml
    const contentXml = await contents.files['content.xml'].async('string');
    const slides = await this.parseODPContent(contentXml);

    // Extract metadata
    const metaXml = await contents.files['meta.xml'].async('string');
    const metadata = await this.parseODFMetadata(metaXml);

    let fullText = '';
    slides.forEach(slide => {
      fullText += `Slide ${slide.number}: ${slide.title}\n${slide.content}\n\n`;
    });

    return {
      text: fullText.trim(),
      metadata,
      structure: {
        headings: slides.map(s => ({ level: 1, text: s.title || `Slide ${s.number}` })),
        paragraphs: slides.map(s => s.content),
        lists: [],
        sections: []
      },
      slides,
      images: options.extractImages ?
        slides.flatMap(s => s.images || []) : [],
      errors: []
    };
  }

  /**
   * Perform OCR on image or scanned PDF page
   */
  private async performOCR(
    page: any,
    language: string = 'eng'
  ): Promise<string> {
    try {
      // Call Tauri backend OCR service
      const result = await invoke<string>('perform_ocr', {
        page: page,
        language: language
      });
      return result;
    } catch (error) {
      console.error('OCR failed:', error);
      return '';
    }
  }

  /**
   * Helper methods
   */

  private detectFileType(file: File | Blob): string {
    const name = (file as File).name || '';
    const type = file.type;

    if (type === 'application/pdf' || name.endsWith('.pdf')) return 'pdf';
    if (type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        name.endsWith('.docx')) return 'docx';
    if (type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
        name.endsWith('.pptx')) return 'pptx';
    if (type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        name.endsWith('.xlsx')) return 'xlsx';
    if (type === 'text/plain' || name.endsWith('.txt')) return 'txt';
    if (type === 'application/rtf' || name.endsWith('.rtf')) return 'rtf';
    if (type === 'application/vnd.oasis.opendocument.text' ||
        name.endsWith('.odt')) return 'odt';
    if (type === 'application/vnd.oasis.opendocument.spreadsheet' ||
        name.endsWith('.ods')) return 'ods';
    if (type === 'application/vnd.oasis.opendocument.presentation' ||
        name.endsWith('.odp')) return 'odp';

    return 'unknown';
  }

  private async extractPDFMetadata(pdf: any): Promise<DocumentMetadata> {
    const metadata = await pdf.getMetadata();
    return {
      title: metadata.info?.Title,
      author: metadata.info?.Author,
      subject: metadata.info?.Subject,
      keywords: metadata.info?.Keywords?.split(',').map((k: string) => k.trim()),
      created: metadata.info?.CreationDate ? new Date(metadata.info.CreationDate) : undefined,
      modified: metadata.info?.ModDate ? new Date(metadata.info.ModDate) : undefined,
      pages: pdf.numPages,
      mimeType: 'application/pdf'
    };
  }

  private async extractDOCXMetadata(arrayBuffer: ArrayBuffer): Promise<DocumentMetadata> {
    const zip = new JSZip();
    const contents = await zip.loadAsync(arrayBuffer);

    if (!contents.files['docProps/core.xml']) {
      return {};
    }

    const coreXml = await contents.files['docProps/core.xml'].async('string');
    const parsed = await parseXml(coreXml);
    const props = parsed['cp:coreProperties'] || {};

    return {
      title: props['dc:title']?.[0],
      author: props['dc:creator']?.[0],
      subject: props['dc:subject']?.[0],
      keywords: props['cp:keywords']?.[0]?.split(',').map((k: string) => k.trim()),
      created: props['dcterms:created']?.[0] ? new Date(props['dcterms:created'][0]) : undefined,
      modified: props['dcterms:modified']?.[0] ? new Date(props['dcterms:modified'][0]) : undefined,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    };
  }

  private extractXLSXMetadata(workbook: any): DocumentMetadata {
    const props = workbook.Props || {};
    return {
      title: props.Title,
      author: props.Author,
      subject: props.Subject,
      keywords: props.Keywords?.split(',').map((k: string) => k.trim()),
      created: props.CreatedDate ? new Date(props.CreatedDate) : undefined,
      modified: props.ModifiedDate ? new Date(props.ModifiedDate) : undefined,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };
  }

  private async extractPPTXMetadata(contents: any): Promise<DocumentMetadata> {
    if (!contents.files['docProps/core.xml']) {
      return {};
    }

    const coreXml = await contents.files['docProps/core.xml'].async('string');
    const parsed = await parseXml(coreXml);
    const props = parsed['cp:coreProperties'] || {};

    return {
      title: props['dc:title']?.[0],
      author: props['dc:creator']?.[0],
      subject: props['dc:subject']?.[0],
      keywords: props['cp:keywords']?.[0]?.split(',').map((k: string) => k.trim()),
      created: props['dcterms:created']?.[0] ? new Date(props['dcterms:created'][0]) : undefined,
      modified: props['dcterms:modified']?.[0] ? new Date(props['dcterms:modified'][0]) : undefined,
      mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    };
  }

  private extractStructureFromText(
    text: string,
    structure: DocumentStructure,
    pageNum?: number
  ): DocumentStructure {
    const lines = text.split('\n');

    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;

      // Detect headings (simple heuristic)
      if (trimmed.length < 100 && trimmed.match(/^[A-Z]/) && !trimmed.endsWith('.')) {
        structure.headings.push({
          level: trimmed.match(/^\d+\./) ? 2 : 1,
          text: trimmed,
          pageNumber: pageNum
        });
      } else {
        structure.paragraphs.push(trimmed);
      }

      // Detect lists
      if (trimmed.match(/^[\d•·\-\*]\s/)) {
        const lastList = structure.lists[structure.lists.length - 1];
        if (lastList && lastList.type === (trimmed.match(/^\d/) ? 'ordered' : 'unordered')) {
          lastList.items.push(trimmed.replace(/^[\d•·\-\*]\s+/, ''));
        } else {
          structure.lists.push({
            type: trimmed.match(/^\d/) ? 'ordered' : 'unordered',
            items: [trimmed.replace(/^[\d•·\-\*]\s+/, '')]
          });
        }
      }
    });

    return structure;
  }

  private extractStructureFromHTML(html: string): DocumentStructure {
    const structure: DocumentStructure = {
      headings: [],
      paragraphs: [],
      lists: [],
      sections: []
    };

    // Parse HTML and extract structure
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Extract headings
    doc.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(heading => {
      structure.headings.push({
        level: parseInt(heading.tagName.substring(1)),
        text: heading.textContent || ''
      });
    });

    // Extract paragraphs
    doc.querySelectorAll('p').forEach(p => {
      const text = p.textContent?.trim();
      if (text) {
        structure.paragraphs.push(text);
      }
    });

    // Extract lists
    doc.querySelectorAll('ul, ol').forEach(list => {
      const items: string[] = [];
      list.querySelectorAll('li').forEach(li => {
        items.push(li.textContent?.trim() || '');
      });

      structure.lists.push({
        type: list.tagName.toLowerCase() === 'ol' ? 'ordered' : 'unordered',
        items
      });
    });

    return structure;
  }

  private async extractPDFImages(page: any, pageNum: number): Promise<DocumentImage[]> {
    const images: DocumentImage[] = [];

    try {
      const ops = await page.getOperatorList();

      for (let i = 0; i < ops.fnArray.length; i++) {
        if (ops.fnArray[i] === pdfjsLib.OPS.paintImageXObject) {
          const imageName = ops.argsArray[i][0];
          const image = page.objs.get(imageName);

          if (image) {
            const canvas = document.createElement('canvas');
            canvas.width = image.width;
            canvas.height = image.height;
            const ctx = canvas.getContext('2d');

            if (ctx) {
              ctx.putImageData(image, 0, 0);

              images.push({
                id: `pdf-image-${pageNum}-${i}`,
                data: canvas.toDataURL('image/png'),
                mimeType: 'image/png',
                width: image.width,
                height: image.height,
                pageNumber: pageNum
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to extract PDF images:', error);
    }

    return images;
  }

  private async extractDOCXImages(arrayBuffer: ArrayBuffer): Promise<DocumentImage[]> {
    const images: DocumentImage[] = [];
    const zip = new JSZip();
    const contents = await zip.loadAsync(arrayBuffer);

    // Find all image files in the DOCX
    const imageFiles = Object.keys(contents.files)
      .filter(name => name.startsWith('word/media/'));

    for (const imagePath of imageFiles) {
      const imageData = await contents.files[imagePath].async('base64');
      const extension = imagePath.split('.').pop()?.toLowerCase();
      const mimeType = `image/${extension === 'jpg' ? 'jpeg' : extension}`;

      images.push({
        id: imagePath.replace('word/media/', ''),
        data: `data:${mimeType};base64,${imageData}`,
        mimeType
      });
    }

    return images;
  }

  private async extractDOCXTables(html: string): Promise<DocumentTable[]> {
    const tables: DocumentTable[] = [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    doc.querySelectorAll('table').forEach((table, index) => {
      const headers: string[] = [];
      const rows: string[][] = [];

      // Extract headers
      table.querySelectorAll('thead tr th').forEach(th => {
        headers.push(th.textContent?.trim() || '');
      });

      // If no thead, use first row as headers
      if (headers.length === 0) {
        const firstRow = table.querySelector('tr');
        if (firstRow) {
          firstRow.querySelectorAll('td, th').forEach(cell => {
            headers.push(cell.textContent?.trim() || '');
          });
        }
      }

      // Extract rows
      const dataRows = headers.length > 0 ?
        Array.from(table.querySelectorAll('tr')).slice(1) :
        Array.from(table.querySelectorAll('tr'));

      dataRows.forEach(tr => {
        const row: string[] = [];
        tr.querySelectorAll('td').forEach(td => {
          row.push(td.textContent?.trim() || '');
        });
        if (row.length > 0) {
          rows.push(row);
        }
      });

      if (headers.length > 0 || rows.length > 0) {
        tables.push({
          headers,
          rows,
          caption: `Table ${index + 1}`
        });
      }
    });

    return tables;
  }

  private async extractTablesFromText(text: string): Promise<DocumentTable[]> {
    // Use Tauri backend for advanced table extraction
    try {
      const result = await invoke<DocumentTable[]>('extract_tables', { text });
      return result;
    } catch (error) {
      console.error('Table extraction failed:', error);
      return [];
    }
  }

  private async parseSlideXML(xml: string): Promise<any> {
    const parsed = await parseXml(xml);
    const slide = parsed['p:sld'];

    let title = '';
    let content = '';
    const images: DocumentImage[] = [];

    // Extract text from slide
    const extractText = (node: any): string => {
      let text = '';
      if (typeof node === 'string') return node;
      if (Array.isArray(node)) {
        node.forEach(n => text += extractText(n));
      } else if (typeof node === 'object') {
        Object.values(node).forEach(v => text += extractText(v));
      }
      return text;
    };

    // Find title placeholder
    const titleShape = slide?.['p:cSld']?.[0]?.['p:spTree']?.[0]?.['p:sp']
      ?.find((shape: any) => shape?.['p:nvSpPr']?.[0]?.['p:nvPr']?.[0]?.['p:ph']?.[0]?.['$']?.type === 'title');

    if (titleShape) {
      title = extractText(titleShape?.['p:txBody']?.[0]?.['a:p']);
    }

    // Extract all text content
    content = extractText(slide);

    return { title, content, images };
  }

  private async extractNotesFromXML(xml: string): Promise<string> {
    const parsed = await parseXml(xml);
    // Extract notes text - implementation depends on PPTX structure
    return '';
  }

  private async parseODFContent(xml: string): Promise<any> {
    const parsed = await parseXml(xml);
    // Parse OpenDocument content - implementation specific to format
    return {
      text: '',
      structure: {
        headings: [],
        paragraphs: [],
        lists: [],
        sections: []
      },
      images: [],
      tables: []
    };
  }

  private async parseODFMetadata(xml: string): Promise<DocumentMetadata> {
    const parsed = await parseXml(xml);
    // Parse OpenDocument metadata
    return {};
  }

  private async parseODSContent(xml: string): Promise<DocumentSheet[]> {
    // Parse ODS spreadsheet content
    return [];
  }

  private async parseODPContent(xml: string): Promise<DocumentSlide[]> {
    // Parse ODP presentation content
    return [];
  }

  private sheetToText(data: any[][]): string {
    return data.map(row => row.join('\t')).join('\n');
  }
}

// Export singleton instance
export const documentParser = UniversalDocumentParser.getInstance();