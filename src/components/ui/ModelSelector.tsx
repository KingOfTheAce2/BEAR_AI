import React, { useState, useEffect, useMemo } from 'react'
import { cn } from '../../utils/cn'
import {
  Model,
  ModelStatus,
  ModelStatusType,
  ModelFamily,
  CapabilityPerformance
} from '../../types/modelTypes'
import { Card, CardContent, CardHeader, CardTitle } from './Card'
import { Button } from './Button'
import { Input } from './Input'
import { Badge } from './Badge'
import { LoadingSpinner } from './LoadingSpinner'
import {
  Download,
  Trash2,
  Star,
  Search,
  Filter,
  ChevronDown,
  Play,
  Pause,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  Cpu,
  HardDrive,
  Zap,
  Gauge,
  Globe,
  Shield,
  Tag,
  Eye,
  MoreHorizontal,
  Heart,
  TrendingUp,
  Users
} from 'lucide-react'

export interface ModelSelectorProps {
  models: Model[]
  selectedModel: Model | null
  onModelSelect: (model: Model) => void
  onModelInstall: (modelId: string) => void
  onModelUninstall: (modelId: string) => void
  onModelLoad: (modelId: string) => void
  onModelUnload: (modelId: string) => void
  onModelFavorite: (modelId: string) => void
  loading?: boolean
  error?: string
  className?: string
}

interface FilterOptions {
  search: string
  status: ModelStatusType[]
  family: ModelFamily[]
  capabilities: string[]
  minPerformance: CapabilityPerformance | null
  sizeRange: [number, number]
  favorites: boolean
}

const ModelSelector: React.FC<ModelSelectorProps> = ({
  models,
  selectedModel,
  onModelSelect,
  onModelInstall,
  onModelUninstall,
  onModelLoad,
  onModelUnload,
  onModelFavorite,
  loading = false,
  error,
  className
}) => {
  const [filters, setFilters] = useState<FilterOptions>({
    search: '',
    status: [],
    family: [],
    capabilities: [],
    minPerformance: null,
    sizeRange: [0, Infinity],
    favorites: false
  })
  
  const [sortBy, setSortBy] = useState<'name' | 'size' | 'performance' | 'lastUsed' | 'popularity'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showFilters, setShowFilters] = useState(false)
  const [favorites, setFavorites] = useState<Set<string>>(new Set())

  // Filter and sort models
  const filteredModels = useMemo(() => {
    let filtered = models.filter(model => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        if (
          !model.name.toLowerCase().includes(searchLower) &&
          !model.description.toLowerCase().includes(searchLower) &&
          !model.tags.some(tag => tag.toLowerCase().includes(searchLower))
        ) {
          return false
        }
      }

      // Status filter
      if (filters.status.length > 0 && !filters.status.includes(model.status)) {
        return false
      }

      // Family filter
      if (filters.family.length > 0 && !filters.family.includes(model.family)) {
        return false
      }

      // Capabilities filter
      if (filters.capabilities.length > 0) {
        const modelCapabilities = model.capabilities.map(c => c.name)
        if (!filters.capabilities.every(cap => modelCapabilities.includes(cap))) {
          return false
        }
      }

      // Favorites filter
      if (filters.favorites && !favorites.has(model.id)) {
        return false
      }

      return true
    })

    // Sort models
    filtered.sort((a, b) => {
      let aValue: any, bValue: any

      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
          break
        case 'size':
          aValue = parseFloat(a.size)
          bValue = parseFloat(b.size)
          break
        case 'performance':
          aValue = a.performance.tokensPerSecond
          bValue = b.performance.tokensPerSecond
          break
        case 'lastUsed':
          aValue = a.lastUsed?.getTime() || 0
          bValue = b.lastUsed?.getTime() || 0
          break
        case 'popularity':
          aValue = a.metadata.downloadCount || 0
          bValue = b.metadata.downloadCount || 0
          break
        default:
          return 0
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1
      return 0
    })

    return filtered
  }, [models, filters, sortBy, sortOrder, favorites])

  const statusFilterOptions: ModelStatusType[] = [
    ModelStatus.AVAILABLE,
    ModelStatus.INSTALLED,
    ModelStatus.LOADED
  ]

  const getStatusIcon = (status: ModelStatusType) => {
    switch (status) {
      case ModelStatus.INSTALLED:
      case ModelStatus.LOADED:
      case ModelStatus.ACTIVE:
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case ModelStatus.DOWNLOADING:
      case ModelStatus.LOADING:
      case ModelStatus.UPDATING:
        return <LoadingSpinner className="h-4 w-4" />
      case ModelStatus.ERROR:
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case ModelStatus.AVAILABLE:
        return <Download className="h-4 w-4 text-blue-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusText = (status: ModelStatusType) => {
    switch (status) {
      case ModelStatus.AVAILABLE: return 'Available'
      case ModelStatus.DOWNLOADING: return 'Downloading'
      case ModelStatus.INSTALLED: return 'Installed'
      case ModelStatus.LOADING: return 'Loading'
      case ModelStatus.LOADED:
      case ModelStatus.ACTIVE: return 'Active'
      case ModelStatus.ERROR: return 'Error'
      case ModelStatus.UPDATING: return 'Updating'
      case ModelStatus.UNLOADING: return 'Removing'
      case ModelStatus.UNLOADED: return 'Inactive'
      default: return 'Unknown'
    }
  }

  const getPerformanceColor = (performance: CapabilityPerformance) => {
    switch (performance) {
      case 'excellent': return 'text-green-600'
      case 'good': return 'text-blue-600'
      case 'fair': return 'text-yellow-600'
      case 'poor': return 'text-red-600'
      default: return 'text-gray-400'
    }
  }

  const formatSize = (size: string) => {
    const match = size.match(/(\d+(?:\.\d+)?)(.*)/);
    if (match) {
      const [, number, unit] = match;
      return `${parseFloat(number).toFixed(1)}${unit}`;
    }
    return size;
  }

  const toggleFavorite = (modelId: string) => {
    const newFavorites = new Set(favorites)
    if (newFavorites.has(modelId)) {
      newFavorites.delete(modelId)
    } else {
      newFavorites.add(modelId)
    }
    setFavorites(newFavorites)
    onModelFavorite(modelId)
  }

  const renderModelCard = (model: Model) => (
    <Card
      key={model.id}
      className={cn(
        'cursor-pointer transition-all duration-200 hover:shadow-md',
        selectedModel?.id === model.id && 'ring-2 ring-primary',
        viewMode === 'list' && 'flex-row'
      )}
      onClick={() => onModelSelect(model)}
    >
      <CardHeader className={cn('pb-3', viewMode === 'list' && 'flex-shrink-0 w-1/3')}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon(model.status)}
            <CardTitle className="text-lg font-semibold truncate">
              {model.name}
            </CardTitle>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                toggleFavorite(model.id)
              }}
              className="p-1"
            >
              <Heart
                className={cn(
                  'h-4 w-4',
                  favorites.has(model.id)
                    ? 'fill-red-500 text-red-500'
                    : 'text-gray-400 hover:text-red-500'
                )}
              />
            </Button>
            <Button variant="ghost" size="sm" className="p-1">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-2">
          <Badge variant="outline" className="text-xs">
            {model.family}
          </Badge>
          <Badge
            variant={
              model.status === ModelStatus.LOADED || model.status === ModelStatus.ACTIVE
                ? 'default'
                : 'secondary'
            }
            className="text-xs"
          >
            {getStatusText(model.status)}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {formatSize(model.size)}
          </span>
        </div>
      </CardHeader>

      <CardContent className={cn('pt-0', viewMode === 'list' && 'flex-1')}>
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {model.description}
        </p>

        {/* Performance Metrics */}
        <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
          <div className="flex items-center gap-1">
            <Zap className="h-3 w-3 text-yellow-500" />
            <span>{model.performance.tokensPerSecond} t/s</span>
          </div>
          <div className="flex items-center gap-1">
            <HardDrive className="h-3 w-3 text-blue-500" />
            <span>{model.performance.memoryUsage}MB</span>
          </div>
          <div className="flex items-center gap-1">
            <Gauge className="h-3 w-3 text-green-500" />
            <span>{model.performance.accuracy}% acc</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-purple-500" />
            <span>{model.performance.latency}ms</span>
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mb-3">
          {model.tags.slice(0, 3).map(tag => (
            <Badge key={tag} variant="secondary" className="text-xs px-1 py-0">
              {tag}
            </Badge>
          ))}
          {model.tags.length > 3 && (
            <span className="text-xs text-muted-foreground">
              +{model.tags.length - 3} more
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {model.status === ModelStatus.AVAILABLE && (
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onModelInstall(model.id)
              }}
              className="flex-1"
            >
              <Download className="h-3 w-3 mr-1" />
              Install
            </Button>
          )}

          {model.status === ModelStatus.INSTALLED && (
            <>
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onModelLoad(model.id)
                }}
                className="flex-1"
              >
                <Play className="h-3 w-3 mr-1" />
                Load
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onModelUninstall(model.id)
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </>
          )}

          {(model.status === ModelStatus.LOADED || model.status === ModelStatus.ACTIVE) && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onModelUnload(model.id)
              }}
              className="flex-1"
            >
              <Pause className="h-3 w-3 mr-1" />
              Unload
            </Button>
          )}

          {model.status === ModelStatus.DOWNLOADING && (
            <div className="flex-1">
              <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${model.downloadProgress || 0}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground">
                {model.downloadProgress || 0}%
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className={cn('h-full flex flex-col', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div>
          <h2 className="text-lg font-semibold">Model Library</h2>
          <p className="text-sm text-muted-foreground">
            {filteredModels.length} of {models.length} models
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Search and Controls */}
      <div className="p-4 border-b border-border space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search models, descriptions, tags..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="pl-9"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border border-input rounded-md bg-background"
          >
            <option value="name">Sort by Name</option>
            <option value="size">Sort by Size</option>
            <option value="performance">Sort by Performance</option>
            <option value="lastUsed">Sort by Last Used</option>
            <option value="popularity">Sort by Popularity</option>
          </select>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <Card className="p-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Status</label>
                <div className="space-y-1">
                  {statusFilterOptions.map(status => (
                    <label key={status} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={filters.status.includes(status)}
                        onChange={(e) => {
                          const newStatus = e.target.checked
                            ? [...filters.status, status]
                            : filters.status.filter(s => s !== status)
                          setFilters(prev => ({ ...prev, status: newStatus }))
                        }}
                      />
                      {status}
                    </label>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1 block">Family</label>
                <div className="space-y-1">
                  {['llama', 'mistral', 'codellama', 'phi'].map(family => (
                    <label key={family} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={filters.family.includes(family as ModelFamily)}
                        onChange={(e) => {
                          const newFamily = e.target.checked
                            ? [...filters.family, family as ModelFamily]
                            : filters.family.filter(f => f !== family)
                          setFilters(prev => ({ ...prev, family: newFamily }))
                        }}
                      />
                      {family}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={filters.favorites}
                    onChange={(e) => setFilters(prev => ({ ...prev, favorites: e.target.checked }))}
                  />
                  Show Favorites Only
                </label>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <LoadingSpinner className="h-8 w-8" />
            <span className="ml-2">Loading models...</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-32 text-red-500">
            <AlertCircle className="h-6 w-6 mr-2" />
            {error}
          </div>
        ) : filteredModels.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            <Globe className="h-6 w-6 mr-2" />
            No models found matching your filters
          </div>
        ) : (
          <div className={cn(
            'grid gap-4',
            viewMode === 'grid' 
              ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
              : 'grid-cols-1'
          )}>
            {filteredModels.map(model => renderModelCard(model))}
          </div>
        )}
      </div>
    </div>
  )
}

export { ModelSelector }