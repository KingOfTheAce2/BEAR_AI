/**
 * Local File System Interface for BEAR AI
 * Provides abstraction for local file operations in browser environment
 */

export interface LocalFile {
  id: string;
  name: string;
  path: string;
  size: number;
  type: string;
  lastModified: Date;
  data: ArrayBuffer | string;
  content?: string | ArrayBuffer;
  metadata?: Record<string, any>;
}

export interface FileHandle {
  id: string;
  name: string;
  path: string;
  type: string;
  size: number;
  lastModified: Date;
}

export interface DirectoryEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: DirectoryEntry[];
  lastModified: Date;
}

export interface FileSystemCapabilities {
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
  canMove: boolean;
  canCopy: boolean;
  maxFileSize: number;
  supportedTypes: string[];
  storageQuota?: {
    used: number;
    available: number;
    total: number;
  };
}

type PermissionMode = 'read' | 'readwrite';
type FilePermissionState = 'granted' | 'denied' | 'prompt';

interface FileSystemAccessHandle {
  kind: 'file' | 'directory';
  name: string;
  queryPermission?: (options?: { mode?: PermissionMode }) => Promise<FilePermissionState>;
  requestPermission?: (options?: { mode?: PermissionMode }) => Promise<FilePermissionState>;
}

interface FileSystemAccessFileHandle extends FileSystemAccessHandle {
  kind: 'file';
  getFile: () => Promise<File>;
}

interface FileSystemAccessDirectoryHandle extends FileSystemAccessHandle {
  kind: 'directory';
  values: () => AsyncIterable<FileSystemAccessHandle>;
}

interface FilePickerOptions {
  multiple?: boolean;
  accept?: Record<string, string[]>;
  excludeAcceptAllOption?: boolean;
}

export class LocalFileSystemService {
  private files = new Map<string, LocalFile>();
  private dbName = 'bearai_files';
  private version = 1;
  private db: IDBDatabase | null = null;
  private textMimeTypes = new Set([
    'text/plain',
    'text/markdown',
    'text/html',
    'text/css',
    'application/json',
    'application/xml',
    'application/javascript',
    'application/typescript'
  ]);
  private textExtensions = new Set([
    'txt',
    'md',
    'markdown',
    'html',
    'css',
    'js',
    'jsx',
    'ts',
    'tsx',
    'json',
    'yml',
    'yaml',
    'csv',
    'log'
  ]);

  constructor() {
    this.initDB();
  }

  /**
   * Initialize IndexedDB for file storage
   */
  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        reject(new Error('Failed to open file system database'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.loadFilesFromDB();
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains('files')) {
          const store = db.createObjectStore('files', { keyPath: 'id' });
          store.createIndex('name', 'name', { unique: false });
          store.createIndex('path', 'path', { unique: false });
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('lastModified', 'lastModified', { unique: false });
        }
      };
    });
  }

  /**
   * Load files from IndexedDB into memory map
   */
  private async loadFilesFromDB(): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['files'], 'readonly');
      const store = transaction.objectStore('files');
      
      const request = store.getAll();
      
      request.onsuccess = () => {
        const results = request.result;
        this.files.clear();
        
        results.forEach((file: LocalFile) => {
          file.lastModified = new Date(file.lastModified);
          this.files.set(file.id, file);
        });
        
        resolve();
      };
      
      request.onerror = () => {
        reject(new Error('Failed to load files from database'));
      };
    });
  }

  /**
   * Save file to IndexedDB
   */
  private async saveFileToDB(file: LocalFile): Promise<void> {
    if (!this.db) await this.initDB();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['files'], 'readwrite');
      const store = transaction.objectStore('files');
      
      const request = store.put(file);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to save file'));
    });
  }

  isSupported(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    const win = window as typeof window & {
      showOpenFilePicker?: (options?: any) => Promise<FileSystemAccessFileHandle[]>;
      showDirectoryPicker?: (options?: any) => Promise<FileSystemAccessDirectoryHandle>;
    };

    return typeof win.showOpenFilePicker === 'function' || typeof win.showDirectoryPicker === 'function';
  }

  async pickFiles(options: FilePickerOptions = {}): Promise<FileSystemAccessFileHandle[]> {
    const win = window as typeof window & {
      showOpenFilePicker?: (options?: any) => Promise<FileSystemAccessFileHandle[]>;
    };

    if (!win.showOpenFilePicker) {
      throw new Error('File System Access API is not supported in this browser');
    }

    try {
      const pickerOptions: Record<string, any> = {
        multiple: options.multiple ?? false,
        excludeAcceptAllOption: options.excludeAcceptAllOption ?? false
      };

      if (options.accept && Object.keys(options.accept).length > 0) {
        pickerOptions.types = [
          {
            description: 'Supported files',
            accept: options.accept
          }
        ];
      }

      const handles = await win.showOpenFilePicker(pickerOptions);
      return handles as FileSystemAccessFileHandle[];
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error('File selection cancelled');
      }
      throw error instanceof Error ? error : new Error('Failed to pick files');
    }
  }

  async pickDirectory(): Promise<FileSystemAccessDirectoryHandle> {
    const win = window as typeof window & {
      showDirectoryPicker?: (options?: any) => Promise<FileSystemAccessDirectoryHandle>;
    };

    if (!win.showDirectoryPicker) {
      throw new Error('File System Access API is not supported in this browser');
    }

    try {
      return await win.showDirectoryPicker({ id: 'bearai-directory-picker' });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error('Directory selection cancelled');
      }
      throw error instanceof Error ? error : new Error('Failed to pick directory');
    }
  }

  async readDirectory(
    directoryHandle: FileSystemAccessDirectoryHandle,
    recursive: boolean = false,
    currentPath: string = ''
  ): Promise<LocalFile[]> {
    const files: LocalFile[] = [];

    const hasPermission = await this.ensurePermission(directoryHandle, recursive ? 'readwrite' : 'read');
    if (!hasPermission) {
      throw new Error('Permission denied for directory access');
    }

    const iterator: AsyncIterable<FileSystemAccessHandle | [string, FileSystemAccessHandle]> | null =
      typeof directoryHandle.values === 'function'
        ? directoryHandle.values()
        : typeof (directoryHandle as any).entries === 'function'
          ? (directoryHandle as any).entries()
          : null;

    if (!iterator) {
      console.warn('Directory handle does not support iteration');
      return files;
    }

    for await (const rawEntry of iterator) {
      const entry = Array.isArray(rawEntry) ? (rawEntry as [string, FileSystemAccessHandle])[1] : rawEntry;
      if (entry.kind === 'file') {
        const fileHandle = entry as FileSystemAccessFileHandle;
        const path = this.normalizePath(`${currentPath}/${entry.name}`);
        try {
          const localFile = await this.readFile(fileHandle, path);
          files.push(localFile);
        } catch (error) {
          console.warn(`Failed to read file ${path}:`, error);
        }
      } else if (entry.kind === 'directory' && recursive) {
        const nestedHandle = entry as FileSystemAccessDirectoryHandle;
        const nestedPath = this.normalizePath(`${currentPath}/${entry.name}/`);
        const nestedFiles = await this.readDirectory(nestedHandle, true, nestedPath);
        files.push(...nestedFiles);
      }
    }

    return files;
  }

  async readFile(handle: FileSystemAccessFileHandle, explicitPath?: string): Promise<LocalFile> {
    const hasPermission = await this.ensurePermission(handle, 'read');
    if (!hasPermission) {
      throw new Error(`Permission denied for file: ${handle.name}`);
    }

    const file = await handle.getFile();
    const arrayBuffer = await file.arrayBuffer();
    const path = this.normalizePath(explicitPath || `/${file.name}`);

    const existing = Array.from(this.files.values()).find(stored => stored.path === path);
    const id = existing?.id || this.generateFileId();
    const shouldDecode = this.shouldDecodeAsText(file.type, file.name, arrayBuffer);
    const decoded = shouldDecode ? this.decodeArrayBuffer(arrayBuffer) : undefined;

    const localFile: LocalFile = {
      id,
      name: file.name,
      path,
      size: file.size,
      type: file.type || 'application/octet-stream',
      lastModified: new Date(file.lastModified),
      data: decoded ?? arrayBuffer,
      content: decoded ?? existing?.content,
      metadata: existing?.metadata || {}
    };

    this.files.set(id, localFile);
    await this.saveFileToDB(localFile);

    return localFile;
  }

  /**
   * Store a file from File API
   */
  async storeFile(file: File, customPath?: string): Promise<LocalFile> {
    const id = this.generateFileId();
    const data = await this.fileToArrayBuffer(file);
    
    const localFile: LocalFile = {
      id,
      name: file.name,
      path: customPath || `/${file.name}`,
      size: file.size,
      type: file.type,
      lastModified: new Date(file.lastModified),
      data,
      content: typeof data === 'string' ? data : undefined,
      metadata: {}
    };

    this.files.set(id, localFile);
    await this.saveFileToDB(localFile);

    return localFile;
  }

  /**
   * Store file data directly
   */
  async storeFileData(
    name: string,
    data: ArrayBuffer | string,
    type: string,
    path?: string
  ): Promise<LocalFile> {
    const id = this.generateFileId();
    
    const localFile: LocalFile = {
      id,
      name,
      path: path || `/${name}`,
      size: typeof data === 'string' ? data.length : data.byteLength,
      type,
      lastModified: new Date(),
      data,
      content: typeof data === 'string' ? data : undefined,
      metadata: {}
    };

    this.files.set(id, localFile);
    await this.saveFileToDB(localFile);

    return localFile;
  }

  /**
   * Get file by ID
   */
  async getFile(id: string): Promise<LocalFile | null> {
    const file = this.files.get(id);
    return file || null;
  }

  /**
   * Get file handle (metadata without data)
   */
  async getFileHandle(id: string): Promise<FileHandle | null> {
    const file = this.files.get(id);
    if (!file) return null;

    return {
      id: file.id,
      name: file.name,
      path: file.path,
      type: file.type,
      size: file.size,
      lastModified: file.lastModified
    };
  }

  /**
   * Get files by path pattern
   */
  async getFilesByPath(pathPattern: string): Promise<LocalFile[]> {
    const files = Array.from(this.files.values());
    const regex = new RegExp(pathPattern.replace(/\*/g, '.*'));
    
    return files.filter(file => regex.test(file.path));
  }

  /**
   * List directory contents
   */
  async listDirectory(path: string = '/'): Promise<DirectoryEntry[]> {
    const files = Array.from(this.files.values());
    const entries: DirectoryEntry[] = [];
    const directories = new Set<string>();

    files.forEach(file => {
      if (file.path.startsWith(path)) {
        const relativePath = file.path.substring(path.length);
        const parts = relativePath.split('/').filter(p => p);
        
        if (parts.length === 1) {
          // File directly in this directory
          entries.push({
            name: file.name,
            path: file.path,
            type: 'file',
            lastModified: file.lastModified
          });
        } else if (parts.length > 1) {
          // File in subdirectory
          const dirName = parts[0];
          const dirPath = `${path}${dirName}/`;
          
          if (!directories.has(dirPath)) {
            directories.add(dirPath);
            entries.push({
              name: dirName,
              path: dirPath,
              type: 'directory',
              lastModified: file.lastModified
            });
          }
        }
      }
    });

    return entries.sort((a, b) => {
      // Directories first, then files
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Move file to new path
   */
  async moveFile(id: string, newPath: string): Promise<boolean> {
    const file = this.files.get(id);
    if (!file) return false;

    file.path = newPath;
    file.lastModified = new Date();

    await this.saveFileToDB(file);
    return true;
  }

  /**
   * Copy file
   */
  async copyFile(id: string, newPath: string, newName?: string): Promise<LocalFile | null> {
    const originalFile = this.files.get(id);
    if (!originalFile) return null;

    const newId = this.generateFileId();
    const copiedFile: LocalFile = {
      ...originalFile,
      id: newId,
      name: newName || originalFile.name,
      path: newPath,
      lastModified: new Date(),
      metadata: {
        ...originalFile.metadata,
        copiedFrom: id
      }
    };

    this.files.set(newId, copiedFile);
    await this.saveFileToDB(copiedFile);

    return copiedFile;
  }

  /**
   * Delete file
   */
  async deleteFile(id: string): Promise<boolean> {
    if (!this.files.has(id)) return false;

    this.files.delete(id);

    if (!this.db) return true;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['files'], 'readwrite');
      const store = transaction.objectStore('files');
      
      const request = store.delete(id);
      
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(new Error('Failed to delete file'));
    });
  }

  /**
   * Check if file exists
   */
  async fileExists(id: string): Promise<boolean> {
    return this.files.has(id);
  }

  /**
   * Get file size
   */
  async getFileSize(id: string): Promise<number | null> {
    const file = this.files.get(id);
    return file ? file.size : null;
  }

  /**
   * Update file metadata
   */
  async updateFileMetadata(id: string, metadata: Record<string, any>): Promise<boolean> {
    const file = this.files.get(id);
    if (!file) return false;

    file.metadata = { ...file.metadata, ...metadata };
    file.lastModified = new Date();

    await this.saveFileToDB(file);
    return true;
  }

  /**
   * Read file as text
   */
  async readFileAsText(id: string, encoding: string = 'utf-8'): Promise<string | null> {
    const file = this.files.get(id);
    if (!file) return null;

    if (typeof file.data === 'string') {
      return file.data;
    }

    const decoder = new TextDecoder(encoding);
    return decoder.decode(file.data);
  }

  /**
   * Read file as data URL
   */
  async readFileAsDataURL(id: string): Promise<string | null> {
    const file = this.files.get(id);
    if (!file) return null;

    if (typeof file.data === 'string') {
      return `data:${file.type};base64,${btoa(file.data)}`;
    }

    const blob = new Blob([file.data], { type: file.type });
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read file as data URL'));
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Get file as Blob
   */
  async getFileAsBlob(id: string): Promise<Blob | null> {
    const file = this.files.get(id);
    if (!file) return null;

    if (typeof file.data === 'string') {
      return new Blob([file.data], { type: file.type });
    }

    return new Blob([file.data], { type: file.type });
  }

  /**
   * Search files
   */
  async searchFiles(query: string, options?: {
    searchContent?: boolean;
    fileTypes?: string[];
    maxResults?: number;
  }): Promise<LocalFile[]> {
    const files = Array.from(this.files.values());
    const searchTerm = query.toLowerCase();
    const maxResults = options?.maxResults || 100;

    let results = files.filter(file => {
      // Search in filename and path
      const nameMatch = file.name.toLowerCase().includes(searchTerm);
      const pathMatch = file.path.toLowerCase().includes(searchTerm);

      // Filter by file type if specified
      if (options?.fileTypes && !options.fileTypes.includes(file.type)) {
        return false;
      }

      let contentMatch = false;
      if (options?.searchContent && typeof file.data === 'string') {
        contentMatch = file.data.toLowerCase().includes(searchTerm);
      }

      return nameMatch || pathMatch || contentMatch;
    });

    return results.slice(0, maxResults);
  }

  /**
   * Get system capabilities
   */
  async getCapabilities(): Promise<FileSystemCapabilities> {
    let storageQuota;

    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        storageQuota = {
          used: estimate.usage || 0,
          available: (estimate.quota || 0) - (estimate.usage || 0),
          total: estimate.quota || 0
        };
      } catch (error) {
        console.warn('Failed to get storage estimate:', error);
      }
    }

    return {
      canRead: true,
      canWrite: true,
      canDelete: true,
      canMove: true,
      canCopy: true,
      maxFileSize: 100 * 1024 * 1024, // 100MB default limit
      supportedTypes: [
        'text/plain',
        'text/html',
        'text/css',
        'text/javascript',
        'application/json',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp'
      ],
      storageQuota
    };
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    filesByType: Record<string, number>;
    oldestFile?: Date;
    newestFile?: Date;
  }> {
    const files = Array.from(this.files.values());
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);

    const filesByType: Record<string, number> = {};
    let oldestFile: Date | undefined;
    let newestFile: Date | undefined;

    files.forEach(file => {
      filesByType[file.type] = (filesByType[file.type] || 0) + 1;
      
      if (!oldestFile || file.lastModified < oldestFile) {
        oldestFile = file.lastModified;
      }
      
      if (!newestFile || file.lastModified > newestFile) {
        newestFile = file.lastModified;
      }
    });

    return {
      totalFiles: files.length,
      totalSize,
      filesByType,
      oldestFile,
      newestFile
    };
  }

  /**
   * Clear all files
   */
  async clearAll(): Promise<void> {
    this.files.clear();

    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['files'], 'readwrite');
      const store = transaction.objectStore('files');
      
      const request = store.clear();
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to clear all files'));
    });
  }

  // Private helper methods

  private generateFileId(): string {
    return `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private normalizePath(path: string): string {
    if (!path) {
      return '/';
    }

    const normalized = path.replace(/\\/g, '/');
    const hasTrailingSlash = normalized.endsWith('/');
    const hasLeadingSlash = normalized.startsWith('/');
    const segments = normalized.split('/').filter(segment => segment.length > 0);
    const collapsedPath = `${hasLeadingSlash ? '/' : ''}${segments.join('/')}`;
    const basePath = collapsedPath || (hasLeadingSlash ? '/' : '');
    const finalPath = hasTrailingSlash && basePath && !basePath.endsWith('/') ? `${basePath}/` : basePath;
    return finalPath.startsWith('/') ? finalPath : `/${finalPath}`;
  }

  private async ensurePermission(handle: FileSystemAccessHandle, mode: PermissionMode = 'read'): Promise<boolean> {
    try {
      if (!handle.queryPermission || !handle.requestPermission) {
        return true;
      }

      const options = { mode };
      const status = await handle.queryPermission(options);

      if (status === 'granted') {
        return true;
      }

      const requestStatus = await handle.requestPermission(options);
      return requestStatus === 'granted';
    } catch (error) {
      console.warn('Failed to verify file system permissions:', error);
      return false;
    }
  }

  private shouldDecodeAsText(type: string, name: string, data?: ArrayBuffer): boolean {
    if (type && this.textMimeTypes.has(type)) {
      return true;
    }

    const extension = name.includes('.') ? name.split('.').pop()!.toLowerCase() : '';
    if (extension && this.textExtensions.has(extension)) {
      return true;
    }

    if (!data) {
      return false;
    }

    const sample = new Uint8Array(data.slice(0, 32));
    return !sample.some(byte => byte === 0);
  }

  private decodeArrayBuffer(buffer: ArrayBuffer, encoding: string = 'utf-8'): string | undefined {
    try {
      const decoder = new TextDecoder(encoding, { fatal: false });
      return decoder.decode(buffer);
    } catch (error) {
      console.warn('Failed to decode file content as text:', error);
      return undefined;
    }
  }

  private async fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  }
}

export type FileSystemHandle = FileHandle;

export const localFileSystemService = new LocalFileSystemService();
export const localFileSystem = localFileSystemService;
