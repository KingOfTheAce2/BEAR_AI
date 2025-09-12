/**
 * File System Components Export
 * Central export file for all file system related components and services
 */

// Components
export { default as FileBrowser } from './FileBrowser';
export { default as DocumentViewer } from './DocumentViewer';
export { default as FileSearchIndex } from './FileSearchIndex';
export { default as FileUploadProcessor } from './FileUploadProcessor';
export { default as LocalFileSystemIntegration } from './LocalFileSystemIntegration';

// Services
export { LocalFileSystemService, localFileSystemService } from '../../services/localFileSystem';
export { DocumentParserService, documentParserService } from '../../services/documentParser';
export { LocalStorageService, localStorageService } from '../../services/localStorage';
export { FileMetadataService, fileMetadataService } from '../../services/fileMetadata';
export { OfflineSyncService, offlineSyncService } from '../../services/offlineSync';
export { FileSecurityService, fileSecurityService } from '../../services/fileSecurity';

// Types
export type { LocalFile, FileSystemHandle } from '../../services/localFileSystem';
export type { ParsedDocument } from '../../services/documentParser';
export type { StoredDocument, DocumentIndex } from '../../services/localStorage';
export type { ExtendedFileMetadata } from '../../services/fileMetadata';
export type { SyncOperation, SyncStatus, ConflictResolution } from '../../services/offlineSync';
export type { SecurityPolicy, SecurityRule, ScanResult, SecurityThreat, SecurityWarning, AccessLog } from '../../services/fileSecurity';