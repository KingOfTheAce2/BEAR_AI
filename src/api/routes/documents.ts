// Document management routes
import { Router } from 'express';
import multer from 'multer';
import { authenticateToken } from '../middleware/auth';
import { 
  listDocumentsValidation,
  updateDocumentValidation,
  validateFileUpload 
} from '../middleware/validation';
import { uploadRateLimit } from '../middleware/rateLimit';
import { 
  successResponse, 
  createdResponse,
  paginatedResponse,
  noContentResponse,
  asyncHandler,
  NotFoundError 
} from '../middleware/errorHandler';

export const documentRoutes = Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
    files: 1
  }
});

// All document routes require authentication
documentRoutes.use(authenticateToken);

// Mock document store
const documents = new Map();

documentRoutes.get('/',
  listDocumentsValidation,
  asyncHandler(async (req, res) => {
    const userId = (req as any).user.id;
    const { limit = 20, offset = 0, category, status, search } = req.query;
    
    let userDocs = Array.from(documents.values())
      .filter(doc => doc.userId === userId);
    
    // Apply filters
    if (category) {
      userDocs = userDocs.filter(doc => doc.category === category);
    }
    if (status) {
      userDocs = userDocs.filter(doc => doc.status === status);
    }
    if (search) {
      const searchTerm = (search as string).toLowerCase();
      userDocs = userDocs.filter(doc => 
        doc.name.toLowerCase().includes(searchTerm) ||
        doc.tags.some((tag: string) => tag.toLowerCase().includes(searchTerm))
      );
    }
    
    // Sort by most recent
    userDocs.sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());
    
    const total = userDocs.length;
    const paginatedDocs = userDocs.slice(Number(offset), Number(offset) + Number(limit));
    
    paginatedResponse(res, paginatedDocs, total, Math.floor(Number(offset) / Number(limit)) + 1, Number(limit));
  })
);

documentRoutes.post('/',
  uploadRateLimit,
  upload.single('file'),
  validateFileUpload({
    maxSize: 50 * 1024 * 1024,
    allowedTypes: ['pdf', 'docx', 'txt', 'doc'],
    required: true
  }),
  asyncHandler(async (req, res) => {
    const userId = (req as any).user.id;
    const file = req.file!;
    const { category, tags } = req.body;
    
    const documentId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    // Parse tags
    let parsedTags: string[] = [];
    if (tags) {
      if (Array.isArray(tags)) {
        parsedTags = tags;
      } else if (typeof tags === 'string') {
        try {
          parsedTags = JSON.parse(tags);
        } catch {
          parsedTags = tags.split(',').map(tag => tag.trim());
        }
      }
    }
    
    const document = {
      id: documentId,
      name: file.originalname,
      type: file.originalname.split('.').pop()?.toLowerCase() || 'unknown',
      size: file.size,
      uploadDate: now,
      status: 'processing',
      category,
      tags: parsedTags,
      userId,
      versions: [{
        id: `v_${documentId}_1`,
        version: 1,
        modifiedDate: now,
        modifiedBy: userId,
        changes: 'Initial upload'
      }]
    };
    
    documents.set(documentId, document);
    
    // Simulate processing
    setTimeout(() => {
      const doc = documents.get(documentId);
      if (doc) {
        doc.status = 'ready';
        doc.preview = generateDocumentPreview(file.originalname);
        documents.set(documentId, doc);
      }
    }, 2000);
    
    createdResponse(res, document);
  })
);

documentRoutes.get('/:documentId',
  asyncHandler(async (req, res) => {
    const userId = (req as any).user.id;
    const { documentId } = req.params;
    
    const document = documents.get(documentId);
    
    if (!document || document.userId !== userId) {
      throw new NotFoundError('Document');
    }
    
    successResponse(res, document);
  })
);

documentRoutes.put('/:documentId',
  updateDocumentValidation,
  asyncHandler(async (req, res) => {
    const userId = (req as any).user.id;
    const { documentId } = req.params;
    const { name, tags, category } = req.body;
    
    const document = documents.get(documentId);
    
    if (!document || document.userId !== userId) {
      throw new NotFoundError('Document');
    }
    
    // Update fields
    if (name) document.name = name;
    if (tags) document.tags = tags;
    if (category) document.category = category;
    
    // Add version
    const newVersion = {
      id: `v_${documentId}_${document.versions.length + 1}`,
      version: document.versions.length + 1,
      modifiedDate: new Date().toISOString(),
      modifiedBy: userId,
      changes: 'Metadata updated'
    };
    document.versions.push(newVersion);
    
    documents.set(documentId, document);
    
    successResponse(res, document);
  })
);

documentRoutes.delete('/:documentId',
  asyncHandler(async (req, res) => {
    const userId = (req as any).user.id;
    const { documentId } = req.params;
    
    const document = documents.get(documentId);
    
    if (!document || document.userId !== userId) {
      throw new NotFoundError('Document');
    }
    
    documents.delete(documentId);
    
    noContentResponse(res);
  })
);

documentRoutes.get('/:documentId/download',
  asyncHandler(async (req, res) => {
    const userId = (req as any).user.id;
    const { documentId } = req.params;
    
    const document = documents.get(documentId);
    
    if (!document || document.userId !== userId) {
      throw new NotFoundError('Document');
    }
    
    // In production, stream file from storage
    res.setHeader('Content-Disposition', `attachment; filename="${document.name}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.send(Buffer.from(`Mock file content for ${document.name}`));
  })
);

function generateDocumentPreview(filename: string): string {
  const type = filename.split('.').pop()?.toLowerCase();
  
  switch (type) {
    case 'pdf':
      return 'PDF document with legal contract terms and conditions...';
    case 'docx':
    case 'doc':
      return 'Word document containing legal analysis and recommendations...';
    case 'txt':
      return 'Text document with case law research and notes...';
    default:
      return 'Document preview not available for this file type.';
  }
}