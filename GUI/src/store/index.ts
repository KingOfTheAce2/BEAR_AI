import { create } from 'zustand'
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware'
import type { User, Case, Document, LoadingState } from '@types/index'

// Auth Store
interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  updateUser: (updates: Partial<User>) => void
  clearError: () => void
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      subscribeWithSelector((set, get) => ({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,

        login: async (email: string, password: string) => {
          set({ isLoading: true, error: null })
          try {
            // TODO: Replace with actual API call
            await new Promise(resolve => setTimeout(resolve, 1000))
            
            const mockUser: User = {
              id: '1',
              email,
              name: 'John Doe',
              role: 'lawyer',
              preferences: {
                theme: 'light',
                language: 'en',
                notifications: true,
                autoSave: true,
                defaultView: 'dashboard',
              },
              createdAt: new Date(),
              updatedAt: new Date(),
            }

            set({
              user: mockUser,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            })
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Login failed',
              isLoading: false,
            })
          }
        },

        logout: () => {
          set({
            user: null,
            isAuthenticated: false,
            error: null,
          })
        },

        updateUser: (updates: Partial<User>) => {
          const currentUser = get().user
          if (currentUser) {
            set({
              user: {
                ...currentUser,
                ...updates,
                updatedAt: new Date(),
              },
            })
          }
        },

        clearError: () => set({ error: null }),
      })),
      {
        name: 'auth-storage',
        partialize: (state) => ({
          user: state.user,
          isAuthenticated: state.isAuthenticated,
        }),
      }
    ),
    { name: 'auth-store' }
  )
)

// App Store
interface AppState extends LoadingState {
  sidebarCollapsed: boolean
  theme: 'light' | 'dark' | 'system'
  notifications: Array<{
    id: string
    type: 'info' | 'success' | 'warning' | 'error'
    title: string
    message: string
    timestamp: Date
  }>
  toggleSidebar: () => void
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  addNotification: (notification: {
    type: 'info' | 'success' | 'warning' | 'error'
    title: string
    message: string
  }) => void
  removeNotification: (id: string) => void
  clearNotifications: () => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set, get) => ({
        isLoading: false,
        error: null,
        sidebarCollapsed: false,
        theme: 'system',
        notifications: [],

        toggleSidebar: () => {
          set({ sidebarCollapsed: !get().sidebarCollapsed })
        },

        setTheme: (theme) => {
          set({ theme })
        },

        addNotification: (notification) => {
          const id = Math.random().toString(36).substring(2)
          set({
            notifications: [
              ...get().notifications,
              {
                ...notification,
                id,
                timestamp: new Date(),
              },
            ],
          })

          // Auto-remove notification after 5 seconds
          setTimeout(() => {
            get().removeNotification(id)
          }, 5000)
        },

        removeNotification: (id) => {
          set({
            notifications: get().notifications.filter((n) => n.id !== id),
          })
        },

        clearNotifications: () => {
          set({ notifications: [] })
        },

        setLoading: (isLoading) => set({ isLoading }),
        setError: (error) => set({ error }),
      }),
      {
        name: 'app-storage',
        partialize: (state) => ({
          sidebarCollapsed: state.sidebarCollapsed,
          theme: state.theme,
        }),
      }
    ),
    { name: 'app-store' }
  )
)

// Cases Store
interface CasesState extends LoadingState {
  cases: Case[]
  selectedCase: Case | null
  setCases: (cases: Case[]) => void
  addCase: (case_: Case) => void
  updateCase: (id: string, updates: Partial<Case>) => void
  deleteCase: (id: string) => void
  selectCase: (case_: Case | null) => void
}

export const useCasesStore = create<CasesState>()(
  devtools(
    (set, get) => ({
      cases: [],
      selectedCase: null,
      isLoading: false,
      error: null,

      setCases: (cases) => set({ cases }),

      addCase: (case_) => {
        set({ cases: [...get().cases, case_] })
      },

      updateCase: (id, updates) => {
        set({
          cases: get().cases.map((case_) =>
            case_.id === id
              ? { ...case_, ...updates, updatedAt: new Date() }
              : case_
          ),
        })
      },

      deleteCase: (id) => {
        set({
          cases: get().cases.filter((case_) => case_.id !== id),
          selectedCase: get().selectedCase?.id === id ? null : get().selectedCase,
        })
      },

      selectCase: (selectedCase) => set({ selectedCase }),
    }),
    { name: 'cases-store' }
  )
)

// Documents Store
interface DocumentsState extends LoadingState {
  documents: Document[]
  setDocuments: (documents: Document[]) => void
  addDocument: (document: Document) => void
  updateDocument: (id: string, updates: Partial<Document>) => void
  deleteDocument: (id: string) => void
}

export const useDocumentsStore = create<DocumentsState>()(
  devtools(
    (set, get) => ({
      documents: [],
      isLoading: false,
      error: null,

      setDocuments: (documents) => set({ documents }),

      addDocument: (document) => {
        set({ documents: [...get().documents, document] })
      },

      updateDocument: (id, updates) => {
        set({
          documents: get().documents.map((doc) =>
            doc.id === id
              ? { ...doc, ...updates, updatedAt: new Date() }
              : doc
          ),
        })
      },

      deleteDocument: (id) => {
        set({
          documents: get().documents.filter((doc) => doc.id !== id),
        })
      },
    }),
    { name: 'documents-store' }
  )
)