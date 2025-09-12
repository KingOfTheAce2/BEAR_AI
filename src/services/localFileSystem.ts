/**
 * Local File System Service
 * Provides browser-based file system access using File System Access API
 */

export interface FileSystemHandle {
  kind: 'file' | 'directory';
  name: string;
  handle: FileSystemFileHandle | FileSystemDirectoryHandle;
}

export interface LocalFile {
  id: string;
  name: string;
  type: string;
  size: number;
  lastModified: number;
  path: string;
  content?: string | ArrayBuffer;
  metadata?: Record<string, any>;
}

export class LocalFileSystemService {
  private supportedTypes = {
    text: ['.txt', '.md', '.json', '.js', '.ts', '.jsx', '.tsx', '.css', '.html'],
    document: ['.pdf', '.docx', '.doc', '.rtf'],
    image: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg'],
    archive: ['.zip', '.rar', '.7z', '.tar']
  };

  /**
   * Check if File System Access API is supported
   */
  isSupported(): boolean {
    return 'showOpenFilePicker' in window && 'showDirectoryPicker' in window;
  }

  /**
   * Open file picker dialog
   */
  async pickFiles(options?: {
    multiple?: boolean;
    accept?: Record<string, string[]>;
    excludeAcceptAllOption?: boolean;
  }): Promise<FileSystemFileHandle[]> {
    if (!this.isSupported()) {
      throw new Error('File System Access API not supported');
    }

    try {
      const fileHandles = await (window as any).showOpenFilePicker({
        multiple: options?.multiple ?? false,
        types: options?.accept ? [{
          description: 'Supported files',
          accept: options.accept
        }] : undefined,
        excludeAcceptAllOption: options?.excludeAcceptAllOption ?? false
      });

      return fileHandles;
    } catch (error) {
      if ((error as any).name === 'AbortError') {
        throw new Error('File selection cancelled');
      }
      throw error;
    }
  }

  /**
   * Open directory picker dialog
   */
  async pickDirectory(): Promise<FileSystemDirectoryHandle> {
    if (!this.isSupported()) {
      throw new Error('File System Access API not supported');
    }

    try {
      const dirHandle = await (window as any).showDirectoryPicker();
      return dirHandle;
    } catch (error) {
      if ((error as any).name === 'AbortError') {
        throw new Error('Directory selection cancelled');
      }
      throw error;
    }
  }

  /**
   * Read file content from file handle
   */
  async readFile(fileHandle: FileSystemFileHandle): Promise<LocalFile> {
    const file = await fileHandle.getFile();
    const content = await this.getFileContent(file);

    return {
      id: this.generateFileId(file),
      name: file.name,
      type: file.type,
      size: file.size,
      lastModified: file.lastModified,
      path: fileHandle.name,
      content,
      metadata: {
        handle: fileHandle,
        webkitRelativePath: (file as any).webkitRelativePath || ''
      }
    };
  }

  /**
   * Read directory contents recursively
   */
  async readDirectory(dirHandle: FileSystemDirectoryHandle, recursive = false): Promise<LocalFile[]> {
    const files: LocalFile[] = [];

    for await (const [name, handle] of dirHandle.entries()) {
      if (handle.kind === 'file') {
        try {
          const localFile = await this.readFile(handle as FileSystemFileHandle);
          localFile.path = `${dirHandle.name}/${name}`;
          files.push(localFile);
        } catch (error) {
          console.warn(`Failed to read file ${name}:`, error);
        }
      } else if (handle.kind === 'directory' && recursive) {
        const subFiles = await this.readDirectory(handle as FileSystemDirectoryHandle, true);
        files.push(...subFiles.map(f => ({
          ...f,
          path: `${dirHandle.name}/${f.path}`
        })));
      }
    }

    return files;
  }

  /**
   * Save file to user's file system
   */
  async saveFile(
    content: string | ArrayBuffer,
    suggestedName: string,
    options?: {
      types?: Array<{
        description: string;
        accept: Record<string, string[]>;
      }>;
    }
  ): Promise<void> {
    if (!this.isSupported()) {
      // Fallback to download
      this.downloadFile(content, suggestedName);
      return;
    }

    try {
      const fileHandle = await (window as any).showSaveFilePicker({
        suggestedName,
        types: options?.types
      });

      const writable = await fileHandle.createWritable();
      await writable.write(content);
      await writable.close();
    } catch (error) {
      if ((error as any).name === 'AbortError') {
        throw new Error('Save cancelled');
      }
      throw error;
    }
  }

  /**
   * Get file content based on type
   */
  private async getFileContent(file: File): Promise<string | ArrayBuffer> {
    const extension = this.getFileExtension(file.name);
    
    if (this.supportedTypes.text.includes(extension)) {
      return await file.text();
    } else if (this.supportedTypes.document.includes(extension) || 
               this.supportedTypes.image.includes(extension)) {
      return await file.arrayBuffer();
    } else {
      // Default to text for unknown types
      try {
        return await file.text();
      } catch {
        return await file.arrayBuffer();
      }
    }
  }

  /**
   * Generate unique file ID
   */
  private generateFileId(file: File): string {
    return `${file.name}-${file.size}-${file.lastModified}`;
  }

  /**
   * Get file extension
   */
  private getFileExtension(filename: string): string {
    return filename.toLowerCase().substring(filename.lastIndexOf('.'));
  }

  /**
   * Fallback download for unsupported browsers
   */
  private downloadFile(content: string | ArrayBuffer, filename: string): void {
    const blob = new Blob([content], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Check file permissions
   */
  async checkPermission(
    handle: FileSystemFileHandle | FileSystemDirectoryHandle,
    mode: 'read' | 'readwrite' = 'read'
  ): Promise<boolean> {
    const permission = await handle.queryPermission({ mode });
    return permission === 'granted';
  }

  /**
   * Request file permissions
   */
  async requestPermission(
    handle: FileSystemFileHandle | FileSystemDirectoryHandle,
    mode: 'read' | 'readwrite' = 'read'
  ): Promise<boolean> {
    const permission = await handle.requestPermission({ mode });
    return permission === 'granted';
  }
}

export const localFileSystemService = new LocalFileSystemService();