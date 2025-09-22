/**
 * BEAR AI Zustand State Management
 * Adapted from jan-dev state patterns for agent coordination
 * 
 * @file Central state management for BEAR AI
 * @version 1.0.0
 */

import { create } from 'zustand'

// State Types
export interface Agent {
  id: string
  type: 'legal-analyzer' | 'document-processor' | 'risk-assessor' | 'compliance-checker'
  status: 'idle' | 'busy' | 'error' | 'offline'
  currentTask: string | null
  capabilities: string[]
  config: Record<string, any>
  lastActivity: Date
  metrics: {
    tasksCompleted: number
    averageProcessingTime: number
    errorCount: number
  }
}

export interface Document {
  id: string
  name: string
  type: 'pdf' | 'docx' | 'txt' | 'other'
  size: number
  path: string
  uploadedAt: Date
  processedAt?: Date
  status: 'uploaded' | 'processing' | 'processed' | 'error'
  analysis?: DocumentAnalysis
  metadata: Record<string, any>
}

export interface DocumentAnalysis {
  summary: string
  keyTerms: string[]
  risks: Array<{ type: string; description: string; severity: 'low' | 'medium' | 'high' }>
  compliance: Array<{ rule: string; status: 'compliant' | 'non-compliant' | 'needs-review' }>
  recommendations: string[]
  confidence: number
}

export interface Task {
  id: string
  type: 'document-analysis' | 'contract-review' | 'compliance-check' | 'risk-assessment'
  status: 'pending' | 'in-progress' | 'completed' | 'failed'
  assignedAgents: string[]
  priority: 'low' | 'medium' | 'high' | 'critical'
  documentIds: string[]
  result?: any
  progress: number
  startedAt?: Date
  completedAt?: Date
  error?: string
}

export interface LLMModel {
  id: string
  name: string
  type: 'legal-specialist' | 'general-purpose' | 'document-processor'
  size: number
  quantization: string
  isLoaded: boolean
  isLoading: boolean
  capabilities: string[]
  performanceMetrics: {
    tokensPerSecond: number
    memoryUsage: number
    accuracy: number
  }
}

export interface UIState {
  activeTab: 'documents' | 'analysis' | 'agents' | 'settings'
  selectedDocumentId: string | null
  selectedAgentId: string | null
  isSettingsOpen: boolean
  isSidebarCollapsed: boolean
  theme: 'light' | 'dark' | 'auto'
  notifications: Array<{
    id: string
    type: 'info' | 'success' | 'warning' | 'error'
    title: string
    message: string
    timestamp: Date
    isRead: boolean
  }>
}

export interface AppSettings {
  llm: {
    defaultModel: string
    maxContextLength: number
    temperature: number
    enableGPU: boolean
    memoryLimit: number
  }
  privacy: {
    enablePIIDetection: boolean
    enableAuditLog: boolean
    dataRetentionDays: number
    enableEncryption: boolean
  }
  processing: {
    maxConcurrentTasks: number
    autoSaveInterval: number
    enableBackgroundProcessing: boolean
  }
  ui: {
    theme: 'light' | 'dark' | 'auto'
    language: string
    enableAnimations: boolean
    compactMode: boolean
  }
}

// Main Store Interface
interface BearState {
  agents: Record<string, Agent>
  documents: Record<string, Document>
  tasks: Record<string, Task>
  models: Record<string, LLMModel>
  ui: UIState
  settings: AppSettings
  isInitialized: boolean
  isLoading: boolean
  error: string | null
}

interface BearActions {
  // Agents
  addAgent: (agent: Agent) => void
  updateAgent: (id: string, updates: Partial<Agent>) => void
  removeAgent: (id: string) => void
  getActiveAgents: () => Agent[]

  // Documents
  addDocument: (document: Document) => void
  updateDocument: (id: string, updates: Partial<Document>) => void
  removeDocument: (id: string) => void
  getDocumentsByStatus: (status: Document['status']) => Document[]

  // Tasks
  addTask: (task: Task) => void
  updateTask: (id: string, updates: Partial<Task>) => void
  completeTask: (id: string, result: any) => void
  failTask: (id: string, error: string) => void
  getTasksByStatus: (status: Task['status']) => Task[]

  // LLM Models
  addModel: (model: LLMModel) => void
  updateModel: (id: string, updates: Partial<LLMModel>) => void
  loadModel: (id: string) => Promise<void>
  unloadModel: (id: string) => Promise<void>
  getLoadedModels: () => LLMModel[]

  // UI State
  setActiveTab: (tab: UIState['activeTab']) => void
  setSelectedDocument: (id: string | null) => void
  setSelectedAgent: (id: string | null) => void
  toggleSettings: () => void
  toggleSidebar: () => void
  setTheme: (theme: UIState['theme']) => void
  addNotification: (notification: Omit<UIState['notifications'][0], 'id' | 'timestamp' | 'isRead'>) => void
  markNotificationAsRead: (id: string) => void
  clearNotifications: () => void

  // Settings
  updateSettings: (updates: Partial<AppSettings>) => void
  resetSettings: () => void

  // Actions
  processDocument: (documentId: string, analysisType?: string[]) => Promise<void>
  coordinateAgents: (taskId: string, agentIds: string[]) => Promise<void>
  optimizeAgentAllocation: () => void

  // System
  initialize: () => Promise<void>
}

export type BearStore = BearState & BearActions

// Default Settings
const defaultSettings: AppSettings = {
  llm: {
    defaultModel: 'legal-llama-7b',
    maxContextLength: 4096,
    temperature: 0.1,
    enableGPU: true,
    memoryLimit: 8192
  },
  privacy: {
    enablePIIDetection: true,
    enableAuditLog: true,
    dataRetentionDays: 90,
    enableEncryption: true
  },
  processing: {
    maxConcurrentTasks: 3,
    autoSaveInterval: 30000,
    enableBackgroundProcessing: true
  },
  ui: {
    theme: 'auto',
    language: 'en',
    enableAnimations: true,
    compactMode: false
  }
}

const defaultUIState: UIState = {
  activeTab: 'documents',
  selectedDocumentId: null,
  selectedAgentId: null,
  isSettingsOpen: false,
  isSidebarCollapsed: false,
  theme: 'auto',
  notifications: []
}

const STORAGE_KEY = 'bear-ai-store'

const canUseStorage = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'

type PersistedSnapshot = {
  settings: AppSettings
  ui: Pick<UIState, 'theme' | 'isSidebarCollapsed'>
  models: Record<string, LLMModel>
  agents: Record<string, Agent>
}

const cloneSettings = (settings: AppSettings): AppSettings => ({
  llm: { ...settings.llm },
  privacy: { ...settings.privacy },
  processing: { ...settings.processing },
  ui: { ...settings.ui }
})

const mergeSettings = (base: AppSettings, updates?: Partial<AppSettings>): AppSettings => ({
  llm: { ...base.llm, ...(updates?.llm ?? {}) },
  privacy: { ...base.privacy, ...(updates?.privacy ?? {}) },
  processing: { ...base.processing, ...(updates?.processing ?? {}) },
  ui: { ...base.ui, ...(updates?.ui ?? {}) }
})

const hydrateAgent = (agent: Agent): Agent => ({
  ...agent,
  currentTask: agent.currentTask ?? null,
  lastActivity: agent.lastActivity instanceof Date ? agent.lastActivity : new Date(agent.lastActivity),
  metrics: {
    tasksCompleted: agent.metrics?.tasksCompleted ?? 0,
    averageProcessingTime: agent.metrics?.averageProcessingTime ?? 0,
    errorCount: agent.metrics?.errorCount ?? 0
  }
})

const loadPersistedSnapshot = (): Partial<PersistedSnapshot> => {
  if (!canUseStorage) {
    return {}
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return {}
    }

    const parsed = JSON.parse(raw) as Partial<PersistedSnapshot>
    const hydrated: Partial<PersistedSnapshot> = {}

    if (parsed.settings) {
      hydrated.settings = parsed.settings
    }

    if (parsed.ui) {
      hydrated.ui = {
        theme: parsed.ui.theme ?? defaultUIState.theme,
        isSidebarCollapsed: parsed.ui.isSidebarCollapsed ?? defaultUIState.isSidebarCollapsed
      }
    }

    if (parsed.models) {
      hydrated.models = parsed.models
    }

    if (parsed.agents) {
      const agents: Record<string, Agent> = {}
      Object.entries(parsed.agents).forEach(([id, value]) => {
        agents[id] = hydrateAgent(value as Agent)
      })
      hydrated.agents = agents
    }

    return hydrated
  } catch (error) {
    console.warn('Failed to load persisted BEAR AI state:', error)
    return {}
  }
}

const persistSnapshot = (state: Pick<BearState, 'settings' | 'ui' | 'models' | 'agents'>) => {
  if (!canUseStorage) {
    return
  }

  const snapshot: PersistedSnapshot = {
    settings: cloneSettings(state.settings),
    ui: {
      theme: state.ui.theme,
      isSidebarCollapsed: state.ui.isSidebarCollapsed
    },
    models: state.models,
    agents: state.agents
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
  } catch (error) {
    console.warn('Failed to persist BEAR AI state:', error)
  }
}

const persistedState = loadPersistedSnapshot()

// Store Implementation
export const useBearStore = create<BearStore>((set, get) => {
  const baseSettings = mergeSettings(defaultSettings, persistedState.settings)
  const baseUI: UIState = {
    ...defaultUIState,
    ...(persistedState.ui ?? {})
  }

  const persistFromState = (state: BearStore, overrides: Partial<BearState> = {}) => {
    persistSnapshot({
      settings: overrides.settings ?? state.settings,
      ui: overrides.ui ?? state.ui,
      models: overrides.models ?? state.models,
      agents: overrides.agents ?? state.agents
    })
  }

  const typedSet = set as unknown as (
    partial:
      | Partial<BearStore>
      | ((state: BearStore) => Partial<BearStore>)
  ) => void

  return {
    agents: persistedState.agents ?? {},
    documents: {},
    tasks: {},
    models: persistedState.models ?? {},
    ui: baseUI,
    settings: baseSettings,
    isInitialized: false,
    isLoading: false,
    error: null,

    // Agent Actions
    addAgent: (agent) =>
      typedSet((state) => {
        const agents = { ...state.agents, [agent.id]: agent }
        persistFromState(state, { agents })
        return { agents }
      }),

    updateAgent: (id, updates) =>
      typedSet((state) => {
        const existing = state.agents[id]
        if (!existing) {
          return {}
        }
        const agents = {
          ...state.agents,
          [id]: { ...existing, ...updates }
        }
        persistFromState(state, { agents })
        return { agents }
      }),

    removeAgent: (id) =>
      typedSet((state) => {
        if (!state.agents[id]) {
          return {}
        }
        const { [id]: _removed, ...rest } = state.agents
        persistFromState(state, { agents: rest })
        return { agents: rest }
      }),

    getActiveAgents: () => {
      const state = get()
      return Object.values(state.agents).filter((agent: Agent) =>
        agent.status !== 'offline' && agent.status !== 'error'
      )
    },

    // Document Actions
    addDocument: (document) =>
      typedSet((state) => ({
        documents: { ...state.documents, [document.id]: document }
      })),

    updateDocument: (id, updates) =>
      typedSet((state) => {
        const existing = state.documents[id]
        if (!existing) {
          return {}
        }
        return {
          documents: {
            ...state.documents,
            [id]: { ...existing, ...updates }
          }
        }
      }),

    removeDocument: (id) =>
      typedSet((state) => {
        if (!state.documents[id]) {
          return {}
        }
        const { [id]: _removed, ...rest } = state.documents
        return { documents: rest }
      }),

    getDocumentsByStatus: (status) => {
      const state = get()
      return Object.values(state.documents).filter((doc: Document) => doc.status === status)
    },

    // Task Actions
    addTask: (task) =>
      typedSet((state) => ({
        tasks: { ...state.tasks, [task.id]: task }
      })),

    updateTask: (id, updates) =>
      typedSet((state) => {
        const existing = state.tasks[id]
        if (!existing) {
          return {}
        }
        return {
          tasks: {
            ...state.tasks,
            [id]: { ...existing, ...updates }
          }
        }
      }),

    completeTask: (id, result) =>
      typedSet((state) => {
        const existing = state.tasks[id]
        if (!existing) {
          return {}
        }
        const task: Task = {
          ...existing,
          status: 'completed',
          result,
          progress: 100,
          completedAt: new Date()
        }
        return {
          tasks: {
            ...state.tasks,
            [id]: task
          }
        }
      }),

    failTask: (id, errorMessage) =>
      typedSet((state) => {
        const existing = state.tasks[id]
        if (!existing) {
          return {}
        }
        const task: Task = {
          ...existing,
          status: 'failed',
          error: errorMessage
        }
        return {
          tasks: {
            ...state.tasks,
            [id]: task
          }
        }
      }),

    getTasksByStatus: (status) => {
      const state = get()
      return Object.values(state.tasks).filter((task: Task) => task.status === status)
    },

    // Model Actions
    addModel: (model) =>
      typedSet((state) => {
        const models = { ...state.models, [model.id]: model }
        persistFromState(state, { models })
        return { models }
      }),

    updateModel: (id, updates) =>
      typedSet((state) => {
        const existing = state.models[id]
        if (!existing) {
          return {}
        }
        const models = {
          ...state.models,
          [id]: { ...existing, ...updates }
        }
        persistFromState(state, { models })
        return { models }
      }),

    loadModel: async (id) => {
      typedSet((state) => {
        const existing = state.models[id]
        if (!existing) {
          return {}
        }
        const models = {
          ...state.models,
          [id]: { ...existing, isLoading: true }
        }
        persistFromState(state, { models })
        return { models }
      })

      try {
        await new Promise(resolve => setTimeout(resolve, 2000))

        typedSet((state) => {
          const existing = state.models[id]
          if (!existing) {
            return {}
          }
          const models = {
            ...state.models,
            [id]: { ...existing, isLoaded: true, isLoading: false }
          }
          persistFromState(state, { models })
          return { models }
        })
      } catch (error) {
        typedSet((state) => {
          const existing = state.models[id]
          if (!existing) {
            return {}
          }
          const models = {
            ...state.models,
            [id]: { ...existing, isLoading: false }
          }
          persistFromState(state, { models })
          return { models }
        })
        throw error
      }
    },

    unloadModel: async (id) => {
      try {
        await new Promise(resolve => setTimeout(resolve, 500))

        typedSet((state) => {
          const existing = state.models[id]
          if (!existing) {
            return {}
          }
          const models = {
            ...state.models,
            [id]: { ...existing, isLoaded: false }
          }
          persistFromState(state, { models })
          return { models }
        })
      } catch (error) {
        console.error('Failed to unload model:', error)
      }
    },

    getLoadedModels: () => {
      const state = get()
      return Object.values(state.models).filter((model: LLMModel) => model.isLoaded)
    },

    // UI Actions
    setActiveTab: (tab) =>
      typedSet((state) => {
        const ui = { ...state.ui, activeTab: tab }
        persistFromState(state, { ui })
        return { ui }
      }),

    setSelectedDocument: (id) =>
      typedSet((state) => {
        const ui = { ...state.ui, selectedDocumentId: id }
        persistFromState(state, { ui })
        return { ui }
      }),

    setSelectedAgent: (id) =>
      typedSet((state) => {
        const ui = { ...state.ui, selectedAgentId: id }
        persistFromState(state, { ui })
        return { ui }
      }),

    toggleSettings: () =>
      typedSet((state) => {
        const ui = { ...state.ui, isSettingsOpen: !state.ui.isSettingsOpen }
        persistFromState(state, { ui })
        return { ui }
      }),

    toggleSidebar: () =>
      typedSet((state) => {
        const ui = { ...state.ui, isSidebarCollapsed: !state.ui.isSidebarCollapsed }
        persistFromState(state, { ui })
        return { ui }
      }),

    setTheme: (theme) =>
      typedSet((state) => {
        const ui = { ...state.ui, theme }
        persistFromState(state, { ui })
        return { ui }
      }),

    addNotification: (notification) =>
      typedSet((state) => {
        const ui = {
          ...state.ui,
          notifications: [
            ...state.ui.notifications,
            {
              ...notification,
              id: `notif-${Date.now()}-${Math.random()}`,
              timestamp: new Date(),
              isRead: false
            }
          ]
        }
        persistFromState(state, { ui })
        return { ui }
      }),

    markNotificationAsRead: (id) =>
      typedSet((state) => {
        const notifications = state.ui.notifications.map(notification =>
          notification.id === id ? { ...notification, isRead: true } : notification
        )
        const ui = { ...state.ui, notifications }
        persistFromState(state, { ui })
        return { ui }
      }),

    clearNotifications: () =>
      typedSet((state) => {
        const ui = { ...state.ui, notifications: [] }
        persistFromState(state, { ui })
        return { ui }
      }),

    // Settings Actions
    updateSettings: (updates) =>
      typedSet((state) => {
        const settings = mergeSettings(state.settings, updates)
        persistFromState(state, { settings })
        return { settings }
      }),

    resetSettings: () =>
      typedSet((state) => {
        const settings = mergeSettings(defaultSettings)
        persistFromState(state, { settings })
        return { settings }
      }),

    // Complex Actions
    processDocument: async (documentId, analysisType = ['summary', 'risks', 'compliance']) => {
      const state = get()
      const document = state.documents[documentId]

      if (!document) {
        throw new Error(`Document ${documentId} not found`)
      }

      const taskId = `task-${Date.now()}`
      const task: Task = {
        id: taskId,
        type: 'document-analysis',
        status: 'pending',
        assignedAgents: [],
        priority: 'medium',
        documentIds: [documentId],
        progress: 0,
        startedAt: new Date()
      }

      const { addTask, updateDocument, updateTask, getActiveAgents, updateAgent, completeTask, addNotification } = get()

      addTask(task)
      updateDocument(documentId, { status: 'processing' })

      try {
        const availableAgents = getActiveAgents().filter(agent =>
          agent.status === 'idle' &&
          agent.capabilities.some(cap => analysisType.includes(cap))
        )

        if (availableAgents.length === 0) {
          throw new Error('No available agents for document processing')
        }

        const assignedAgentIds = availableAgents.slice(0, 2).map(agent => agent.id)
        updateTask(taskId, {
          assignedAgents: assignedAgentIds,
          status: 'in-progress'
        })

        assignedAgentIds.forEach(agentId => {
          updateAgent(agentId, {
            status: 'busy',
            currentTask: taskId
          })
        })

        for (let i = 0; i <= 100; i += 20) {
          await new Promise(resolve => setTimeout(resolve, 200))
          updateTask(taskId, { progress: i })
        }

        const analysis: DocumentAnalysis = {
          summary: `Analysis complete for ${document.name}`,
          keyTerms: ['contract', 'liability', 'termination'],
          risks: [
            { type: 'legal', description: 'Unlimited liability clause', severity: 'high' }
          ],
          compliance: [
            { rule: 'GDPR', status: 'compliant' }
          ],
          recommendations: ['Review liability terms', 'Add force majeure clause'],
          confidence: 0.85
        }

        completeTask(taskId, analysis)
        updateDocument(documentId, {
          status: 'processed',
          analysis,
          processedAt: new Date()
        })

        assignedAgentIds.forEach(agentId => {
          updateAgent(agentId, {
            status: 'idle',
            currentTask: null
          })
        })

        addNotification({
          type: 'success',
          title: 'Document Processed',
          message: `${document.name} has been successfully analyzed`
        })
      } catch (error: any) {
        const { failTask, updateDocument, addNotification } = get()
        failTask(taskId, error?.message || 'Unknown error')
        updateDocument(documentId, { status: 'error' })

        addNotification({
          type: 'error',
          title: 'Processing Failed',
          message: `Failed to process ${document.name}: ${error?.message || 'Unknown error'}`
        })
      }
    },

    coordinateAgents: async (taskId, agentIds) => {
      const { tasks, updateTask, updateAgent } = get()
      const task = tasks[taskId]
      if (!task) {
        throw new Error(`Task ${taskId} not found`)
      }

      updateTask(taskId, {
        assignedAgents: agentIds,
        status: 'in-progress'
      })

      agentIds.forEach(agentId => {
        updateAgent(agentId, {
          status: 'busy',
          currentTask: taskId
        })
      })
    },

    optimizeAgentAllocation: () => {
      const { getTasksByStatus, getActiveAgents, coordinateAgents } = get()
      const pendingTasks = getTasksByStatus('pending')
      const idleAgents = getActiveAgents().filter(agent => agent.status === 'idle')

      pendingTasks.forEach(task => {
        const suitableAgents = idleAgents.filter(agent =>
          agent.capabilities.some(cap => task.type.includes(cap))
        )

        const selectedAgent = suitableAgents[0]
        if (selectedAgent) {
          coordinateAgents(task.id, [selectedAgent.id])
        }
      })
    },

    // System Actions
    initialize: async () => {
      typedSet(() => ({
        isLoading: true,
        error: null
      }))

      try {
        const { addAgent, addModel, addNotification } = get()

        const defaultAgents: Agent[] = [
          {
            id: 'legal-analyzer-1',
            type: 'legal-analyzer',
            status: 'idle',
            currentTask: null,
            capabilities: ['contract-analysis', 'legal-research'],
            config: {},
            lastActivity: new Date(),
            metrics: { tasksCompleted: 0, averageProcessingTime: 0, errorCount: 0 }
          },
          {
            id: 'document-processor-1',
            type: 'document-processor',
            status: 'idle',
            currentTask: null,
            capabilities: ['text-extraction', 'format-conversion'],
            config: {},
            lastActivity: new Date(),
            metrics: { tasksCompleted: 0, averageProcessingTime: 0, errorCount: 0 }
          }
        ]

        defaultAgents.forEach(agent => addAgent(agent))

        const defaultModels: LLMModel[] = [
          {
            id: 'legal-llama-7b',
            name: 'Legal Llama 7B',
            type: 'legal-specialist',
            size: 4000000000,
            quantization: 'Q4_K_M',
            isLoaded: false,
            isLoading: false,
            capabilities: ['contract-analysis', 'legal-reasoning'],
            performanceMetrics: { tokensPerSecond: 0, memoryUsage: 0, accuracy: 0 }
          }
        ]

        defaultModels.forEach(model => addModel(model))

        typedSet(() => ({
          isInitialized: true,
          isLoading: false
        }))

        addNotification({
          type: 'success',
          title: 'System Initialized',
          message: 'BEAR AI is ready for document processing'
        })
      } catch (error: any) {
        typedSet(() => ({
          error: error?.message || 'Unknown error',
          isLoading: false
        }))
      }
    }
  }
})

// Store Hooks and Selectors
export const useAgents = () => useBearStore().agents
export const useDocuments = () => useBearStore().documents
export const useTasks = () => useBearStore().tasks
export const useModels = () => useBearStore().models
export const useUI = () => useBearStore().ui
export const useSettings = () => useBearStore().settings

// Action Hooks
export const useStoreActions = () => {
  const store = useBearStore()
  
  return {
    // Agent actions
    addAgent: store.addAgent,
    updateAgent: store.updateAgent,
    removeAgent: store.removeAgent,

    // Document actions
    addDocument: store.addDocument,
    updateDocument: store.updateDocument,
    removeDocument: store.removeDocument,
    processDocument: store.processDocument,

    // Task actions
    addTask: store.addTask,
    updateTask: store.updateTask,
    completeTask: store.completeTask,
    failTask: store.failTask,

    // Model actions
    addModel: store.addModel,
    updateModel: store.updateModel,
    loadModel: store.loadModel,
    unloadModel: store.unloadModel,

    // UI actions
    setActiveTab: store.setActiveTab,
    setSelectedDocument: store.setSelectedDocument,
    addNotification: store.addNotification,

    // System actions
    initialize: store.initialize,
    coordinateAgents: store.coordinateAgents,
    optimizeAgentAllocation: store.optimizeAgentAllocation
  }
}
