/**
 * BEAR AI Zustand State Management
 * Adapted from jan-dev state patterns for agent coordination
 * 
 * @file Central state management for BEAR AI
 * @version 1.0.0
 */

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { persist, createJSONStorage } from 'zustand/middleware'

interface PersistedState {
  version: number
  state: any
}

// State Types
export interface Agent {
  id: string
  type: 'legal-analyzer' | 'document-processor' | 'risk-assessor' | 'compliance-checker'
  status: 'idle' | 'busy' | 'error' | 'offline'
  currentTask?: string
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
  selectedDocumentId?: string
  selectedAgentId?: string
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
interface BearStore {
  // Agents
  agents: Record<string, Agent>
  addAgent: (agent: Agent) => void
  updateAgent: (id: string, updates: Partial<Agent>) => void
  removeAgent: (id: string) => void
  getActiveAgents: () => Agent[]
  
  // Documents
  documents: Record<string, Document>
  addDocument: (document: Document) => void
  updateDocument: (id: string, updates: Partial<Document>) => void
  removeDocument: (id: string) => void
  getDocumentsByStatus: (status: Document['status']) => Document[]
  
  // Tasks
  tasks: Record<string, Task>
  addTask: (task: Task) => void
  updateTask: (id: string, updates: Partial<Task>) => void
  completeTask: (id: string, result: any) => void
  failTask: (id: string, error: string) => void
  getTasksByStatus: (status: Task['status']) => Task[]
  
  // LLM Models
  models: Record<string, LLMModel>
  addModel: (model: LLMModel) => void
  updateModel: (id: string, updates: Partial<LLMModel>) => void
  loadModel: (id: string) => Promise<void>
  unloadModel: (id: string) => Promise<void>
  getLoadedModels: () => LLMModel[]
  
  // UI State
  ui: UIState
  setActiveTab: (tab: UIState['activeTab']) => void
  setSelectedDocument: (id: string | undefined) => void
  setSelectedAgent: (id: string | undefined) => void
  toggleSettings: () => void
  toggleSidebar: () => void
  setTheme: (theme: UIState['theme']) => void
  addNotification: (notification: Omit<UIState['notifications'][0], 'id' | 'timestamp' | 'isRead'>) => void
  markNotificationAsRead: (id: string) => void
  clearNotifications: () => void
  
  // Settings
  settings: AppSettings
  updateSettings: (updates: Partial<AppSettings>) => void
  resetSettings: () => void
  
  // Actions
  processDocument: (documentId: string, analysisType?: string[]) => Promise<void>
  coordinateAgents: (taskId: string, agentIds: string[]) => Promise<void>
  optimizeAgentAllocation: () => void
  
  // System
  isInitialized: boolean
  isLoading: boolean
  error?: string
  initialize: () => Promise<void>
}

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

// Store Implementation
export const useBearStore = create<BearStore>()(
  subscribeWithSelector(
    persist(
      immer<BearStore>((set, get) => ({
        // Initial State
        agents: {},
        documents: {},
        tasks: {},
        models: {},
        ui: {
          activeTab: 'documents',
          selectedDocumentId: undefined,
          selectedAgentId: undefined,
          isSettingsOpen: false,
          isSidebarCollapsed: false,
          theme: 'auto',
          notifications: []
        },
        settings: defaultSettings,
        isInitialized: false,
        isLoading: false,
        error: undefined,

        // Agent Actions
        addAgent: (agent) => set((state) => {
          state.agents[agent.id] = agent
        }),

        updateAgent: (id, updates) => set((state) => {
          if (state.agents[id]) {
            Object.assign(state.agents[id], updates)
          }
        }),

        removeAgent: (id) => set((state) => {
          delete state.agents[id]
        }),

        getActiveAgents: () => {
          const state = get()
          return Object.values(state.agents).filter((agent: Agent) =>
            agent.status !== 'offline' && agent.status !== 'error'
          )
        },

        // Document Actions
        addDocument: (document) => set((state) => {
          state.documents[document.id] = document
        }),

        updateDocument: (id, updates) => set((state) => {
          if (state.documents[id]) {
            Object.assign(state.documents[id], updates)
          }
        }),

        removeDocument: (id) => set((state) => {
          delete state.documents[id]
        }),

        getDocumentsByStatus: (status) => {
          const state = get()
          return Object.values(state.documents).filter((doc: Document) => doc.status === status)
        },

        // Task Actions
        addTask: (task) => set((state) => {
          state.tasks[task.id] = task
        }),

        updateTask: (id, updates) => set((state) => {
          if (state.tasks[id]) {
            Object.assign(state.tasks[id], updates)
          }
        }),

        completeTask: (id, result) => set((state) => {
          if (state.tasks[id]) {
            state.tasks[id].status = 'completed'
            state.tasks[id].result = result
            state.tasks[id].progress = 100
            state.tasks[id].completedAt = new Date()
          }
        }),

        failTask: (id, error) => set((state) => {
          if (state.tasks[id]) {
            state.tasks[id].status = 'failed'
            state.tasks[id].error = error
          }
        }),

        getTasksByStatus: (status) => {
          const state = get()
          return Object.values(state.tasks).filter((task: Task) => task.status === status)
        },

        // Model Actions
        addModel: (model) => set((state) => {
          state.models[model.id] = model
        }),

        updateModel: (id, updates) => set((state) => {
          if (state.models[id]) {
            Object.assign(state.models[id], updates)
          }
        }),

        loadModel: async (id) => {
          set((state) => {
            if (state.models[id]) {
              state.models[id].isLoading = true
            }
          })

          try {
            // Mock model loading - would integrate with actual LLM engine
            await new Promise(resolve => setTimeout(resolve, 2000))
            
            set((state) => {
              if (state.models[id]) {
                state.models[id].isLoaded = true
                state.models[id].isLoading = false
              }
            })
          } catch (error) {
            set((state) => {
              if (state.models[id]) {
                state.models[id].isLoading = false
              }
            })
            throw error
          }
        },

        unloadModel: async (id) => {
          try {
            // Mock model unloading
            await new Promise(resolve => setTimeout(resolve, 500))
            
            set((state) => {
              if (state.models[id]) {
                state.models[id].isLoaded = false
              }
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
        setActiveTab: (tab) => set((state) => {
          state.ui.activeTab = tab
        }),

        setSelectedDocument: (id) => set((state) => {
          state.ui.selectedDocumentId = id
        }),

        setSelectedAgent: (id) => set((state) => {
          state.ui.selectedAgentId = id
        }),

        toggleSettings: () => set((state) => {
          state.ui.isSettingsOpen = !state.ui.isSettingsOpen
        }),

        toggleSidebar: () => set((state) => {
          state.ui.isSidebarCollapsed = !state.ui.isSidebarCollapsed
        }),

        setTheme: (theme) => set((state) => {
          state.ui.theme = theme
        }),

        addNotification: (notification) => set((state) => {
          state.ui.notifications.push({
            ...notification,
            id: `notif-${Date.now()}-${Math.random()}`,
            timestamp: new Date(),
            isRead: false
          })
        }),

        markNotificationAsRead: (id) => set((state) => {
          const notification = state.ui.notifications.find(n => n.id === id)
          if (notification) {
            notification.isRead = true
          }
        }),

        clearNotifications: () => set((state) => {
          state.ui.notifications = []
        }),

        // Settings Actions
        updateSettings: (updates) => set((state) => {
          Object.assign(state.settings, updates)
        }),

        resetSettings: () => set((state) => {
          state.settings = { ...defaultSettings }
        }),

        // Complex Actions
        processDocument: async (documentId, analysisType = ['summary', 'risks', 'compliance']) => {
          const state = get()
          const document = state.documents[documentId]
          
          if (!document) {
            throw new Error(`Document ${documentId} not found`)
          }

          // Create processing task
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

          const store = get()
          store.addTask(task)
          store.updateDocument(documentId, { status: 'processing' })

          try {
            // Assign appropriate agents
            const availableAgents = store.getActiveAgents().filter(agent => 
              agent.status === 'idle' && 
              agent.capabilities.some(cap => analysisType.includes(cap))
            )

            if (availableAgents.length === 0) {
              throw new Error('No available agents for document processing')
            }

            const assignedAgentIds = availableAgents.slice(0, 2).map(agent => agent.id)
            store.updateTask(taskId, { 
              assignedAgents: assignedAgentIds,
              status: 'in-progress'
            })

            // Mark agents as busy
            assignedAgentIds.forEach(agentId => {
              store.updateAgent(agentId, { 
                status: 'busy', 
                currentTask: taskId 
              })
            })

            // Simulate processing
            for (let i = 0; i <= 100; i += 20) {
              await new Promise(resolve => setTimeout(resolve, 200))
              get().updateTask(taskId, { progress: i })
            }

            // Mock analysis result
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

            // Complete task
            const finalStore = get()
            finalStore.completeTask(taskId, analysis)
            finalStore.updateDocument(documentId, { 
              status: 'processed', 
              analysis,
              processedAt: new Date()
            })

            // Free up agents
            assignedAgentIds.forEach(agentId => {
              finalStore.updateAgent(agentId, { 
                status: 'idle', 
                currentTask: undefined 
              })
            })

            finalStore.addNotification({
              type: 'success',
              title: 'Document Processed',
              message: `${document.name} has been successfully analyzed`
            })

          } catch (error: any) {
            const errorStore = get()
            errorStore.failTask(taskId, error?.message || 'Unknown error')
            errorStore.updateDocument(documentId, { status: 'error' })

            errorStore.addNotification({
              type: 'error',
              title: 'Processing Failed',
              message: `Failed to process ${document.name}: ${error?.message || 'Unknown error'}`
            })
          }
        },

        coordinateAgents: async (taskId, agentIds) => {
          const store = get()
          const task = store.tasks[taskId]
          if (!task) {
            throw new Error(`Task ${taskId} not found`)
          }

          store.updateTask(taskId, { 
            assignedAgents: agentIds,
            status: 'in-progress'
          })

          // Update agent statuses
          agentIds.forEach(agentId => {
            store.updateAgent(agentId, {
              status: 'busy',
              currentTask: taskId
            })
          })
        },

        optimizeAgentAllocation: () => {
          const store = get()
          const pendingTasks = store.getTasksByStatus('pending')
          const idleAgents = store.getActiveAgents().filter(agent => agent.status === 'idle')

          // Simple allocation algorithm
          pendingTasks.forEach(task => {
            const suitableAgents = idleAgents.filter(agent => 
              agent.capabilities.some(cap => task.type.includes(cap))
            )

            if (suitableAgents.length > 0) {
              const selectedAgent = suitableAgents[0]
              store.coordinateAgents(task.id, [selectedAgent.id])
            }
          })
        },

        // System Actions
        initialize: async () => {
          set((state) => {
            state.isLoading = true
            state.error = undefined
          })

          try {
            // Initialize default agents
            const defaultAgents: Agent[] = [
              {
                id: 'legal-analyzer-1',
                type: 'legal-analyzer',
                status: 'idle',
                capabilities: ['contract-analysis', 'legal-research'],
                config: {},
                lastActivity: new Date(),
                metrics: { tasksCompleted: 0, averageProcessingTime: 0, errorCount: 0 }
              },
              {
                id: 'document-processor-1',
                type: 'document-processor',
                status: 'idle',
                capabilities: ['text-extraction', 'format-conversion'],
                config: {},
                lastActivity: new Date(),
                metrics: { tasksCompleted: 0, averageProcessingTime: 0, errorCount: 0 }
              }
            ]

            const store = get()
            defaultAgents.forEach(agent => store.addAgent(agent))

            // Initialize default models
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

            defaultModels.forEach(model => store.addModel(model))

            set((state) => {
              state.isInitialized = true
              state.isLoading = false
            })

            get().addNotification({
              type: 'success',
              title: 'System Initialized',
              message: 'BEAR AI is ready for document processing'
            })

          } catch (error: any) {
            set((state) => {
              state.error = error?.message || 'Unknown error'
              state.isLoading = false
            })
          }
        }
      })),
      {
        name: 'bear-ai-store',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          settings: state.settings,
          ui: {
            theme: state.ui.theme,
            isSidebarCollapsed: state.ui.isSidebarCollapsed
          },
          models: state.models,
          agents: state.agents
        })
      }
    )
  )
)

// Store Hooks and Selectors
export const useAgents = () => useBearStore(state => state.agents)
export const useDocuments = () => useBearStore(state => state.documents)
export const useTasks = () => useBearStore(state => state.tasks)
export const useModels = () => useBearStore(state => state.models)
export const useUI = () => useBearStore(state => state.ui)
export const useSettings = () => useBearStore(state => state.settings)

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
