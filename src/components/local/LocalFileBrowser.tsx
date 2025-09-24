import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Folder, File, ChevronRight, ChevronDown, Home, HardDrive, Search, Filter, RefreshCw, Lock, Eye, EyeOff, FileText, Image, Video, Music, Archive, Code, Database, AlertCircle, CheckCircle, Clock, Shield, FileWarning } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { Progress } from '../ui/progress';

interface FileSystemItem {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  lastModified: Date;
  isHidden: boolean;
  permissions: {
    readable: boolean;
    writable: boolean;
    executable: boolean;
  };
  mimeType?: string;
  isSymlink?: boolean;
  isEncrypted?: boolean;
  isIndexed?: boolean;
  preview?: {
    text?: string;
    thumbnail?: string;
  };
  metadata?: {
    description?: string;
    tags?: string[];
    lastAccessed?: Date;
    security?: 'safe' | 'warning' | 'restricted';
  };
}

interface LocalFileBrowserProps {
  onFileSelect: (files: FileSystemItem[]) => void;
  onDirectoryChange: (path: string) => void;
  multiSelect?: boolean;
  allowedExtensions?: string[];
  maxFileSize?: number; // in bytes
  showHidden?: boolean;
  rootPath?: string;
  className?: string;
}

export const LocalFileBrowser: React.FC<LocalFileBrowserProps> = ({
  onFileSelect,
  onDirectoryChange,
  multiSelect = false,
  allowedExtensions,
  maxFileSize,
  showHidden = false,
  rootPath = '',
  className = ""
}) => {
  const [currentPath, setCurrentPath] = useState(rootPath || '/home/user/Documents');
  const [items, setItems] = useState<FileSystemItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'modified' | 'size' | 'type'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [filterBy, setFilterBy] = useState<'all' | 'documents' | 'images' | 'videos' | 'code'>('all');
  const [showPreview, setShowPreview] = useState(true);
  const [breadcrumbs, setBreadcrumbs] = useState<Array<{name: string, path: string}>>([]);

  // Simulate file system access (in real implementation, this would use Tauri APIs)
  const loadDirectory = useCallback(async (path: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // In a real implementation, this would call:
      // - await invoke('read_dir', { path })
      // - Tauri's fs plugin APIs
      // - Node.js fs APIs (if available)
      
      const mockItems: FileSystemItem[] = [
        {
          id: 'dir-1',
          name: 'Legal Documents',
          path: `${path}/Legal Documents`,
          type: 'directory',
          lastModified: new Date('2024-01-15'),
          isHidden: false,
          permissions: { readable: true, writable: true, executable: true },
          metadata: {
            description: 'Contains case files and legal research documents',
            tags: ['legal', 'work'],
            security: 'safe'
          }
        },
        {
          id: 'dir-2',
          name: 'Research',
          path: `${path}/Research`,
          type: 'directory',
          lastModified: new Date('2024-01-14'),
          isHidden: false,
          permissions: { readable: true, writable: true, executable: true },
          metadata: {
            description: 'Research papers and analysis documents',
            tags: ['research', 'analysis'],
            security: 'safe'
          }
        },
        {
          id: 'file-1',
          name: 'Contract_Analysis_2024.pdf',
          path: `${path}/Contract_Analysis_2024.pdf`,
          type: 'file',
          size: 2485760, // 2.48 MB
          lastModified: new Date('2024-01-13'),
          isHidden: false,
          permissions: { readable: true, writable: true, executable: false },
          mimeType: 'application/pdf',
          isIndexed: true,
          preview: {
            text: 'This document contains a comprehensive analysis of contract terms and conditions...'
          },
          metadata: {
            description: 'Contract analysis report for Q1 2024',
            tags: ['contract', 'analysis', '2024'],
            lastAccessed: new Date('2024-01-13'),
            security: 'safe'
          }
        },
        {
          id: 'file-2',
          name: 'Client_Meeting_Notes.docx',
          path: `${path}/Client_Meeting_Notes.docx`,
          type: 'file',
          size: 524288, // 512 KB
          lastModified: new Date('2024-01-12'),
          isHidden: false,
          permissions: { readable: true, writable: true, executable: false },
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          isIndexed: true,
          metadata: {
            description: 'Meeting notes from client consultation',
            tags: ['meeting', 'notes', 'client'],
            lastAccessed: new Date('2024-01-12'),
            security: 'safe'
          }
        },
        {
          id: 'file-3',
          name: 'Confidential_Settlement.pdf',
          path: `${path}/Confidential_Settlement.pdf`,
          type: 'file',
          size: 1048576, // 1 MB
          lastModified: new Date('2024-01-11'),
          isHidden: false,
          permissions: { readable: true, writable: false, executable: false },
          mimeType: 'application/pdf',
          isEncrypted: true,
          metadata: {
            description: 'Confidential settlement agreement - encrypted',
            tags: ['confidential', 'settlement', 'encrypted'],
            lastAccessed: new Date('2024-01-11'),
            security: 'restricted'
          }
        },
        {
          id: 'file-4',
          name: '.hidden_backup',
          path: `${path}/.hidden_backup`,
          type: 'file',
          size: 2097152, // 2 MB
          lastModified: new Date('2024-01-10'),
          isHidden: true,
          permissions: { readable: true, writable: true, executable: false },
          metadata: {
            description: 'Hidden backup file',
            tags: ['backup', 'hidden'],
            security: 'safe'
          }
        },
        {
          id: 'file-5',
          name: 'case_database.sqlite',
          path: `${path}/case_database.sqlite`,
          type: 'file',
          size: 10485760, // 10 MB
          lastModified: new Date('2024-01-09'),
          isHidden: false,
          permissions: { readable: true, writable: true, executable: false },
          mimeType: 'application/x-sqlite3',
          metadata: {
            description: 'Case management database',
            tags: ['database', 'cases'],
            security: 'warning'
          }
        }
      ];

      const filteredItems = mockItems.filter(item => {
        if (!showHidden && item.isHidden) return false;
        if (allowedExtensions) {
          const ext = item.name.split('.').pop()?.toLowerCase();
          if (item.type === 'file' && ext && !allowedExtensions.includes(ext)) return false;
        }
        if (maxFileSize && item.size && item.size > maxFileSize) return false;
        return true;
      });

      setItems(filteredItems);
      
      // Generate breadcrumbs
      const pathParts = path.split('/').filter(Boolean);
      const crumbs = [{ name: 'Home', path: '/home/user' }];
      let currentCrumbPath = '/home/user';
      
      pathParts.slice(2).forEach(part => {
        currentCrumbPath += '/' + part;
        crumbs.push({ name: part, path: currentCrumbPath });
      });
      
      setBreadcrumbs(crumbs);
      
    } catch (err) {
      setError('Failed to load directory. Check permissions and try again.');
      // Error logging disabled for production
    } finally {
      setLoading(false);
    }
  }, [showHidden, allowedExtensions, maxFileSize]);

  useEffect(() => {
    loadDirectory(currentPath);
  }, [currentPath, loadDirectory]);

  const handleDirectoryClick = (item: FileSystemItem) => {
    if (item.type === 'directory' && item.permissions.readable) {
      setCurrentPath(item.path);
      onDirectoryChange(item.path);
      setSelectedItems(new Set());
    }
  };

  const handleFileSelect = (item: FileSystemItem) => {
    const newSelected = new Set(selectedItems);
    
    if (multiSelect) {
      if (newSelected.has(item.id)) {
        newSelected.delete(item.id);
      } else {
        newSelected.add(item.id);
      }
    } else {
      if (newSelected.has(item.id)) {
        newSelected.clear();
      } else {
        newSelected.clear();
        newSelected.add(item.id);
      }
    }
    
    setSelectedItems(newSelected);
    
    const selectedFiles = items.filter(i => newSelected.has(i.id));
    onFileSelect(selectedFiles);
  };

  const getFileIcon = (item: FileSystemItem) => {
    if (item.type === 'directory') {
      return <Folder className="w-4 h-4 text-blue-500" />;
    }
    
    const ext = item.name.split('.').pop()?.toLowerCase() || '';
    const mimeType = item.mimeType || '';
    
    if (mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
      return <Image className="w-4 h-4 text-green-500" />;
    }
    if (mimeType.startsWith('video/') || ['mp4', 'avi', 'mov', 'webm'].includes(ext)) {
      return <Video className="w-4 h-4 text-red-500" />;
    }
    if (mimeType.startsWith('audio/') || ['mp3', 'wav', 'flac', 'ogg'].includes(ext)) {
      return <Music className="w-4 h-4 text-purple-500" />;
    }
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
      return <Archive className="w-4 h-4 text-orange-500" />;
    }
    if (['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'html', 'css'].includes(ext)) {
      return <Code className="w-4 h-4 text-indigo-500" />;
    }
    if (['sqlite', 'db', 'sql'].includes(ext)) {
      return <Database className="w-4 h-4 text-gray-500" />;
    }
    
    return <FileText className="w-4 h-4 text-gray-600" />;
  };

  const formatFileSize = (bytes: number): string => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getSecurityIcon = (security?: 'safe' | 'warning' | 'restricted') => {
    switch (security) {
      case 'safe':
        return <CheckCircle className="w-3 h-3 text-green-500" />;
      case 'warning':
        return <AlertCircle className="w-3 h-3 text-yellow-500" />;
      case 'restricted':
        return <Shield className="w-3 h-3 text-red-500" />;
      default:
        return null;
    }
  };

  const filteredItems = useMemo(() => {
    let filtered = items.filter(item => {
      if (searchQuery) {
        return item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
               item.metadata?.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      }
      return true;
    });

    if (filterBy !== 'all') {
      filtered = filtered.filter(item => {
        if (item.type === 'directory') return true;
        const ext = item.name.split('.').pop()?.toLowerCase() || '';
        const mimeType = item.mimeType || '';
        
        switch (filterBy) {
          case 'documents':
            return ['pdf', 'doc', 'docx', 'txt', 'rtf'].includes(ext) || mimeType.startsWith('text/');
          case 'images':
            return mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
          case 'videos':
            return mimeType.startsWith('video/') || ['mp4', 'avi', 'mov', 'webm'].includes(ext);
          case 'code':
            return ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'html', 'css'].includes(ext);
          default:
            return true;
        }
      });
    }

    return filtered.sort((a, b) => {
      // Directories first
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1;
      }

      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'modified':
          comparison = a.lastModified.getTime() - b.lastModified.getTime();
          break;
        case 'size':
          comparison = (a.size || 0) - (b.size || 0);
          break;
        case 'type':
          const aExt = a.name.split('.').pop() || '';
          const bExt = b.name.split('.').pop() || '';
          comparison = aExt.localeCompare(bExt);
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [items, searchQuery, filterBy, sortBy, sortOrder]);

  const refreshDirectory = () => {
    loadDirectory(currentPath);
  };

  const navigateUp = () => {
    const parentPath = currentPath.split('/').slice(0, -1).join('/') || '/';
    setCurrentPath(parentPath);
    onDirectoryChange(parentPath);
  };

  const navigateToBreadcrumb = (path: string) => {
    setCurrentPath(path);
    onDirectoryChange(path);
  };

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="w-5 h-5" />
            Local File Browser
            {selectedItems.size > 0 && (
              <Badge variant="default">
                {selectedItems.size} selected
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
            >
              {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshDirectory}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Breadcrumbs */}
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Home className="w-4 h-4" />
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={crumb.path}>
              <button
                onClick={() => navigateToBreadcrumb(crumb.path)}
                className="hover:text-foreground transition-colors"
              >
                {crumb.name}
              </button>
              {index < breadcrumbs.length - 1 && <ChevronRight className="w-3 h-3" />}
            </React.Fragment>
          ))}
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search files and folders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="flex gap-2">
            <select
              className="px-3 py-2 border rounded-md text-sm"
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value as any)}
            >
              <option value="all">All Files</option>
              <option value="documents">Documents</option>
              <option value="images">Images</option>
              <option value="videos">Videos</option>
              <option value="code">Code</option>
            </select>
            <select
              className="px-3 py-2 border rounded-md text-sm"
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [sort, order] = e.target.value.split('-');
                setSortBy(sort as any);
                setSortOrder(order as any);
              }}
            >
              <option value="name-asc">Name A-Z</option>
              <option value="name-desc">Name Z-A</option>
              <option value="modified-desc">Newest First</option>
              <option value="modified-asc">Oldest First</option>
              <option value="size-asc">Smallest First</option>
              <option value="size-desc">Largest First</option>
            </select>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {error ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Access Error</h3>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={refreshDirectory}>Try Again</Button>
            </div>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-sm text-muted-foreground">Loading directory...</p>
            </div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-8">
            <Folder className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No files found</h3>
            <p className="text-muted-foreground">
              {searchQuery ? "No files match your search criteria" : "This directory is empty"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Navigation up */}
            {currentPath !== '/' && (
              <div
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={navigateUp}
              >
                <Folder className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">..</span>
              </div>
            )}

            {/* File/Directory List */}
            {filteredItems.map((item) => {
              const isSelected = selectedItems.has(item.id);
              const hasPreview = showPreview && item.preview;

              return (
                <div
                  key={item.id}
                  className={`border rounded-lg p-3 transition-all hover:shadow-sm ${
                    isSelected ? 'border-primary bg-primary/5' : 'border-border'
                  } ${!item.permissions.readable ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    {/* Selection checkbox (only for files if multiSelect) */}
                    {item.type === 'file' && (
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleFileSelect(item)}
                        disabled={!item.permissions.readable}
                      />
                    )}

                    {/* Icon and Name */}
                    <div
                      className="flex items-center gap-3 flex-1 cursor-pointer"
                      onClick={() => item.type === 'directory' ? handleDirectoryClick(item) : handleFileSelect(item)}
                    >
                      <div className="flex items-center gap-2">
                        {getFileIcon(item)}
                        {item.isEncrypted && <Lock className="w-3 h-3 text-amber-500" />}
                        {item.isSymlink && <span className="text-xs text-blue-500">→</span>}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium truncate">{item.name}</span>
                          {item.metadata?.security && getSecurityIcon(item.metadata.security)}
                          {item.isIndexed && <Badge variant="outline" className="text-xs">Indexed</Badge>}
                        </div>

                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          {item.size && <span>{formatFileSize(item.size)}</span>}
                          <span>{item.lastModified.toLocaleDateString()}</span>
                          {item.metadata?.lastAccessed && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {item.metadata.lastAccessed.toLocaleDateString()}
                            </span>
                          )}
                        </div>

                        {item.metadata?.description && (
                          <p className="text-sm text-muted-foreground mt-1">{item.metadata.description}</p>
                        )}

                        {item.metadata?.tags && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {item.metadata.tags.map(tag => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {hasPreview && item.preview.text && (
                          <div className="mt-2 p-2 bg-muted/30 rounded text-xs text-muted-foreground">
                            {item.preview.text.slice(0, 150)}...
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Permissions indicator */}
                    <div className="flex items-center gap-1 text-xs">
                      <span className={item.permissions.readable ? 'text-green-500' : 'text-red-500'}>R</span>
                      <span className={item.permissions.writable ? 'text-green-500' : 'text-red-500'}>W</span>
                      {item.permissions.executable && <span className="text-green-500">X</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* File count and privacy notice */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t text-xs text-muted-foreground">
          <span>{filteredItems.length} items</span>
          <div className="flex items-center gap-2">
            <Shield className="w-3 h-3" />
            <span>All files remain on your local device</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LocalFileBrowser;
