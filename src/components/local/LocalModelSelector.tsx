import React, { useState, useEffect, useCallback } from 'react';
import { Search, Download, HardDrive, Cpu, MemoryStick, Check, X, AlertCircle, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';

interface LocalModel {
  id: string;
  name: string;
  displayName: string;
  size: string;
  sizeBytes: number;
  format: 'GGUF' | 'ONNX' | 'PyTorch' | 'Safetensors';
  quantization: 'Q4_0' | 'Q4_1' | 'Q5_0' | 'Q5_1' | 'Q8_0' | 'F16' | 'F32';
  parameters: string;
  isDownloaded: boolean;
  isActive: boolean;
  localPath?: string;
  downloadProgress?: number;
  lastUsed?: Date;
  memoryRequirement: number; // in MB
  cpuOptimized: boolean;
  gpuCompatible: boolean;
  description: string;
  license: string;
  capabilities: string[];
  performance: {
    tokensPerSecond: number;
    memoryUsage: number;
    averageLatency: number;
  };
}

interface SystemResources {
  totalMemory: number;
  availableMemory: number;
  cpuCores: number;
  gpuMemory?: number;
  diskSpace: number;
}

interface LocalModelSelectorProps {
  onModelSelect: (model: LocalModel) => void;
  currentModel?: LocalModel;
  className?: string;
}

export const LocalModelSelector: React.FC<LocalModelSelectorProps> = ({
  onModelSelect,
  currentModel,
  className = ""
}) => {
  const [models, setModels] = useState<LocalModel[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'downloaded' | 'available' | 'recommended'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'size' | 'performance' | 'lastUsed'>('name');
  const [systemResources, setSystemResources] = useState<SystemResources | null>(null);
  const [scanning, setScanning] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Simulate model discovery from local file system
  const discoverLocalModels = useCallback(async () => {
    setScanning(true);
    try {
      // In a real implementation, this would scan:
      // - ~/.cache/huggingface/hub
      // - ./models directory
      // - Custom model paths from settings
      // - Registry of known model locations
      
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate scan time
      
      const discoveredModels: LocalModel[] = [
        {
          id: 'llama-2-7b-chat-q4',
          name: 'llama-2-7b-chat-q4_0.gguf',
          displayName: 'Llama 2 7B Chat (Q4_0)',
          size: '3.8 GB',
          sizeBytes: 4080218522,
          format: 'GGUF',
          quantization: 'Q4_0',
          parameters: '7B',
          isDownloaded: true,
          isActive: currentModel?.id === 'llama-2-7b-chat-q4',
          localPath: '/home/.cache/huggingface/hub/models--meta-llama--Llama-2-7b-chat-hf',
          lastUsed: new Date('2024-01-15'),
          memoryRequirement: 4096,
          cpuOptimized: true,
          gpuCompatible: true,
          description: 'A conversational AI model fine-tuned for chat applications',
          license: 'Custom (Commercial use allowed)',
          capabilities: ['chat', 'completion', 'reasoning'],
          performance: {
            tokensPerSecond: 15.2,
            memoryUsage: 3840,
            averageLatency: 125
          }
        },
        {
          id: 'mistral-7b-instruct-q5',
          name: 'mistral-7b-instruct-v0.1.Q5_1.gguf',
          displayName: 'Mistral 7B Instruct (Q5_1)',
          size: '4.8 GB',
          sizeBytes: 5153560781,
          format: 'GGUF',
          quantization: 'Q5_1',
          parameters: '7B',
          isDownloaded: true,
          isActive: false,
          localPath: '/home/.cache/huggingface/hub/models--mistralai--Mistral-7B-Instruct-v0.1',
          lastUsed: new Date('2024-01-10'),
          memoryRequirement: 5120,
          cpuOptimized: true,
          gpuCompatible: true,
          description: 'High-quality instruction-following model with excellent reasoning',
          license: 'Apache 2.0',
          capabilities: ['instruct', 'reasoning', 'coding', 'math'],
          performance: {
            tokensPerSecond: 18.7,
            memoryUsage: 4920,
            averageLatency: 98
          }
        },
        {
          id: 'codellama-13b-q4',
          name: 'codellama-13b-instruct.Q4_K_M.gguf',
          displayName: 'CodeLlama 13B Instruct (Q4_K_M)',
          size: '7.9 GB',
          sizeBytes: 8485406310,
          format: 'GGUF',
          quantization: 'Q4_0',
          parameters: '13B',
          isDownloaded: false,
          isActive: false,
          memoryRequirement: 8192,
          cpuOptimized: true,
          gpuCompatible: true,
          description: 'Specialized code generation and programming assistance model',
          license: 'Custom (Commercial use allowed)',
          capabilities: ['coding', 'completion', 'debugging', 'explanation'],
          performance: {
            tokensPerSecond: 8.3,
            memoryUsage: 7680,
            averageLatency: 245
          }
        },
        {
          id: 'phi-2-q8',
          name: 'phi-2.Q8_0.gguf',
          displayName: 'Phi-2 (Q8_0)',
          size: '2.8 GB',
          sizeBytes: 3006477107,
          format: 'GGUF',
          quantization: 'Q8_0',
          parameters: '2.7B',
          isDownloaded: true,
          isActive: false,
          localPath: '/home/.cache/huggingface/hub/models--microsoft--phi-2',
          lastUsed: new Date('2024-01-08'),
          memoryRequirement: 3072,
          cpuOptimized: true,
          gpuCompatible: true,
          description: 'Small but capable model, excellent for resource-constrained environments',
          license: 'MIT',
          capabilities: ['completion', 'reasoning', 'coding'],
          performance: {
            tokensPerSecond: 25.1,
            memoryUsage: 2840,
            averageLatency: 76
          }
        }
      ];

      setModels(discoveredModels);
    } finally {
      setScanning(false);
    }
  }, [currentModel?.id]);

  // Get system resources
  const checkSystemResources = useCallback(async () => {
    try {
      // In a real implementation, this would use:
      // - navigator.deviceMemory (if available)
      // - Performance API
      // - Tauri system info APIs
      // - OS-specific commands via shell
      
      const resources: SystemResources = {
        totalMemory: 16384, // 16 GB
        availableMemory: 8192, // 8 GB available
        cpuCores: 8,
        gpuMemory: 8192, // 8 GB VRAM
        diskSpace: 512000 // 512 GB available
      };
      
      setSystemResources(resources);
    } catch (error) {
      console.error('Failed to get system resources:', error);
    }
  }, []);

  useEffect(() => {
    discoverLocalModels();
    checkSystemResources();
  }, [discoverLocalModels, checkSystemResources]);

  const filteredModels = models
    .filter(model => {
      if (selectedCategory === 'downloaded' && !model.isDownloaded) return false;
      if (selectedCategory === 'available' && model.isDownloaded) return false;
      if (selectedCategory === 'recommended' && model.memoryRequirement > (systemResources?.availableMemory || 0)) return false;
      if (searchQuery) {
        return model.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
               model.capabilities.some(cap => cap.toLowerCase().includes(searchQuery.toLowerCase()));
      }
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'size':
          return a.sizeBytes - b.sizeBytes;
        case 'performance':
          return b.performance.tokensPerSecond - a.performance.tokensPerSecond;
        case 'lastUsed':
          return (b.lastUsed?.getTime() || 0) - (a.lastUsed?.getTime() || 0);
        default:
          return a.displayName.localeCompare(b.displayName);
      }
    });

  const canRunModel = (model: LocalModel): boolean => {
    return systemResources ? model.memoryRequirement <= systemResources.availableMemory : false;
  };

  const handleModelSelect = (model: LocalModel) => {
    if (model.isDownloaded && canRunModel(model)) {
      onModelSelect(model);
    }
  };

  const formatBytes = (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <Card className={`w-full max-w-4xl ${className}`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="w-5 h-5" />
            Local Model Selector
            <Badge variant="outline" className="ml-2">
              {scanning ? 'Scanning...' : `${filteredModels.length} models`}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <Settings className="w-4 h-4 mr-1" />
              Advanced
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={discoverLocalModels}
              disabled={scanning}
            >
              <Search className="w-4 h-4 mr-1" />
              {scanning ? 'Scanning...' : 'Rescan'}
            </Button>
          </div>
        </div>

        {/* System Resources Display */}
        {systemResources && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <MemoryStick className="w-4 h-4 text-blue-500" />
              <div>
                <div className="text-sm font-medium">RAM</div>
                <div className="text-xs text-muted-foreground">
                  {formatBytes(systemResources.availableMemory * 1024 * 1024)} / {formatBytes(systemResources.totalMemory * 1024 * 1024)}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-green-500" />
              <div>
                <div className="text-sm font-medium">CPU</div>
                <div className="text-xs text-muted-foreground">{systemResources.cpuCores} cores</div>
              </div>
            </div>
            {systemResources.gpuMemory && (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-purple-500 rounded"></div>
                <div>
                  <div className="text-sm font-medium">GPU</div>
                  <div className="text-xs text-muted-foreground">{formatBytes(systemResources.gpuMemory * 1024 * 1024)}</div>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-orange-500" />
              <div>
                <div className="text-sm font-medium">Storage</div>
                <div className="text-xs text-muted-foreground">{formatBytes(systemResources.diskSpace * 1024 * 1024)}</div>
              </div>
            </div>
          </div>
        )}

        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <div className="flex-1">
            <Input
              placeholder="Search models by name or capabilities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="flex gap-2">
            <select
              className="px-3 py-2 border rounded-md text-sm"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as any)}
            >
              <option value="all">All Models</option>
              <option value="downloaded">Downloaded</option>
              <option value="available">Available</option>
              <option value="recommended">Recommended</option>
            </select>
            <select
              className="px-3 py-2 border rounded-md text-sm"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
            >
              <option value="name">Sort by Name</option>
              <option value="size">Sort by Size</option>
              <option value="performance">Sort by Performance</option>
              <option value="lastUsed">Sort by Last Used</option>
            </select>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {scanning ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-sm text-muted-foreground">Scanning local file system for models...</p>
            </div>
          </div>
        ) : filteredModels.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No models found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery
                ? "No models match your search criteria"
                : "No local models detected. Download a model to get started."
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredModels.map((model) => {
              const isCompatible = canRunModel(model);
              const isSelected = model.isActive;

              return (
                <div
                  key={model.id}
                  className={`border rounded-lg p-4 transition-all hover:shadow-md ${
                    isSelected ? 'border-primary bg-primary/5' : 'border-border'
                  } ${!isCompatible ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{model.displayName}</h3>
                        <Badge variant={model.format === 'GGUF' ? 'default' : 'secondary'}>
                          {model.format}
                        </Badge>
                        <Badge variant="outline">{model.quantization}</Badge>
                        <Badge variant="outline">{model.parameters}</Badge>
                        {model.isDownloaded ? (
                          <Badge variant="default">
                            <Check className="w-3 h-3 mr-1" />
                            Downloaded
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <Download className="w-3 h-3 mr-1" />
                            Available
                          </Badge>
                        )}
                        {isSelected && (
                          <Badge variant="default" className="bg-green-500">
                            Active
                          </Badge>
                        )}
                      </div>

                      <p className="text-sm text-muted-foreground mb-3">{model.description}</p>

                      <div className="flex flex-wrap gap-4 text-sm">
                        <span className="flex items-center gap-1">
                          <HardDrive className="w-4 h-4" />
                          {model.size}
                        </span>
                        <span className="flex items-center gap-1">
                          <MemoryStick className="w-4 h-4" />
                          {formatBytes(model.memoryRequirement * 1024 * 1024)} RAM
                        </span>
                        <span className="flex items-center gap-1">
                          <Cpu className="w-4 h-4" />
                          {model.performance.tokensPerSecond.toFixed(1)} tok/s
                        </span>
                        {model.lastUsed && (
                          <span className="text-muted-foreground">
                            Last used: {model.lastUsed.toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      {showAdvanced && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="font-medium">License:</span> {model.license}
                            </div>
                            <div>
                              <span className="font-medium">Latency:</span> {model.performance.averageLatency}ms
                            </div>
                            <div>
                              <span className="font-medium">Memory Usage:</span> {formatBytes(model.performance.memoryUsage * 1024 * 1024)}
                            </div>
                            {model.localPath && (
                              <div className="col-span-full">
                                <span className="font-medium">Path:</span> 
                                <code className="text-xs bg-muted px-1 py-0.5 rounded ml-1">
                                  {model.localPath}
                                </code>
                              </div>
                            )}
                          </div>
                          <div className="mt-2">
                            <span className="font-medium">Capabilities:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {model.capabilities.map(cap => (
                                <Badge key={cap} variant="outline" className="text-xs">
                                  {cap}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="ml-4 flex flex-col gap-2">
                      {model.isDownloaded ? (
                        <Button
                          onClick={() => handleModelSelect(model)}
                          disabled={!isCompatible || isSelected}
                          variant={isSelected ? "default" : "outline"}
                        >
                          {isSelected ? "Active" : isCompatible ? "Select" : "Insufficient RAM"}
                        </Button>
                      ) : (
                        <Button variant="outline" disabled>
                          <Download className="w-4 h-4 mr-1" />
                          Download Required
                        </Button>
                      )}

                      {!isCompatible && model.isDownloaded && (
                        <div className="text-xs text-destructive text-center">
                          <AlertCircle className="w-3 h-3 inline mr-1" />
                          Needs {formatBytes((model.memoryRequirement - (systemResources?.availableMemory || 0)) * 1024 * 1024)} more RAM
                        </div>
                      )}

                      {model.downloadProgress !== undefined && (
                        <div className="w-32">
                          <Progress value={model.downloadProgress} className="h-1" />
                          <div className="text-xs text-center mt-1">{model.downloadProgress}%</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LocalModelSelector;