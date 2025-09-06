import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { ActivityEvent, LoadingState } from '@types/index'

interface HistoryState extends LoadingState {
  activities: ActivityEvent[]
  recentConversations: Array<{
    id: string
    title: string
    lastMessage: string
    timestamp: Date
    messageCount: number
  }>
  searchHistory: Array<{
    id: string
    query: string
    type: 'chat' | 'research' | 'document'
    timestamp: Date
    results?: number
  }>
  documentHistory: Array<{
    id: string
    documentId: string
    documentName: string
    action: 'viewed' | 'edited' | 'downloaded' | 'shared'
    timestamp: Date
    duration?: number
  }>

  // Actions
  addActivity: (activity: Omit<ActivityEvent, 'id' | 'timestamp'>) => void
  getActivitiesByType: (type: ActivityEvent['type']) => ActivityEvent[]
  getActivitiesByDateRange: (start: Date, end: Date) => ActivityEvent[]
  clearOldActivities: (olderThanDays: number) => void
  exportHistory: (format: 'json' | 'csv') => void
  getActivityStats: () => {
    totalActivities: number
    activitiesByType: Record<string, number>
    activitiesByDay: Record<string, number>
    averageSessionDuration: number
  }
  clearHistory: () => void
}

export const useHistoryStore = create<HistoryState>()(
  devtools(
    persist(
      (set, get) => ({
        activities: [],
        recentConversations: [],
        searchHistory: [],
        documentHistory: [],
        isLoading: false,
        error: null,

        addActivity: (activity) => {
          const newActivity: ActivityEvent = {
            ...activity,
            id: crypto.randomUUID(),
            timestamp: new Date(),
          }

          set((state) => ({
            activities: [newActivity, ...state.activities].slice(0, 1000), // Keep last 1000 activities
          }))

          // Update related histories based on activity type
          switch (activity.type) {
            case 'chat_message':
              if (activity.metadata.conversationId) {
                get().updateRecentConversation(
                  activity.metadata.conversationId,
                  activity.metadata.title || 'Conversation',
                  activity.metadata.lastMessage || '',
                  activity.metadata.messageCount || 1
                )
              }
              break
            
            case 'search_performed':
              get().addSearchHistory(
                activity.metadata.query,
                activity.metadata.type || 'chat',
                activity.metadata.results
              )
              break
            
            case 'document_viewed':
              get().addDocumentHistory(
                activity.metadata.documentId,
                activity.metadata.documentName,
                'viewed',
                activity.duration
              )
              break
          }
        },

        getActivitiesByType: (type) => {
          return get().activities.filter(activity => activity.type === type)
        },

        getActivitiesByDateRange: (start, end) => {
          return get().activities.filter(activity => 
            activity.timestamp >= start && activity.timestamp <= end
          )
        },

        clearOldActivities: (olderThanDays) => {
          const cutoffDate = new Date()
          cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)
          
          set((state) => ({
            activities: state.activities.filter(activity => 
              activity.timestamp >= cutoffDate
            ),
          }))
        },

        exportHistory: (format) => {
          const { activities } = get()
          const filename = `activity_history_${new Date().toISOString().split('T')[0]}`
          
          let content: string
          let mimeType: string
          let fileExtension: string
          
          switch (format) {
            case 'json':
              content = JSON.stringify(activities, null, 2)
              mimeType = 'application/json'
              fileExtension = 'json'
              break
            case 'csv':
              const headers = ['ID', 'Type', 'User ID', 'Timestamp', 'Duration', 'Metadata']
              const rows = activities.map(activity => [
                activity.id,
                activity.type,
                activity.userId,
                activity.timestamp.toISOString(),
                activity.duration?.toString() || '',
                JSON.stringify(activity.metadata),
              ])
              content = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
              mimeType = 'text/csv'
              fileExtension = 'csv'
              break
            default:
              return
          }
          
          const blob = new Blob([content], { type: mimeType })
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = `${filename}.${fileExtension}`
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          URL.revokeObjectURL(url)
        },

        getActivityStats: () => {
          const { activities } = get()
          const totalActivities = activities.length
          
          const activitiesByType = activities.reduce((acc, activity) => {
            acc[activity.type] = (acc[activity.type] || 0) + 1
            return acc
          }, {} as Record<string, number>)
          
          const activitiesByDay = activities.reduce((acc, activity) => {
            const day = activity.timestamp.toISOString().split('T')[0]
            acc[day] = (acc[day] || 0) + 1
            return acc
          }, {} as Record<string, number>)
          
          const activitiesWithDuration = activities.filter(a => a.duration !== undefined)
          const averageSessionDuration = activitiesWithDuration.length > 0
            ? activitiesWithDuration.reduce((sum, a) => sum + (a.duration || 0), 0) / activitiesWithDuration.length
            : 0
          
          return {
            totalActivities,
            activitiesByType,
            activitiesByDay,
            averageSessionDuration,
          }
        },

        clearHistory: () => {
          set({
            activities: [],
            recentConversations: [],
            searchHistory: [],
            documentHistory: [],
          })
        },

        // Helper methods (not exposed in interface but used internally)
        updateRecentConversation: (id: string, title: string, lastMessage: string, messageCount: number) => {
          set((state) => {
            const existing = state.recentConversations.find(conv => conv.id === id)
            const updated = {
              id,
              title,
              lastMessage,
              messageCount,
              timestamp: new Date(),
            }
            
            if (existing) {
              return {
                recentConversations: [
                  updated,
                  ...state.recentConversations.filter(conv => conv.id !== id)
                ].slice(0, 50),
              }
            } else {
              return {
                recentConversations: [updated, ...state.recentConversations].slice(0, 50),
              }
            }
          })
        },

        addSearchHistory: (query: string, type: 'chat' | 'research' | 'document', results?: number) => {
          set((state) => ({
            searchHistory: [
              {
                id: crypto.randomUUID(),
                query,
                type,
                timestamp: new Date(),
                results,
              },
              ...state.searchHistory.filter(search => search.query !== query || search.type !== type)
            ].slice(0, 100),
          }))
        },

        addDocumentHistory: (documentId: string, documentName: string, action: 'viewed' | 'edited' | 'downloaded' | 'shared', duration?: number) => {
          set((state) => ({
            documentHistory: [
              {
                id: crypto.randomUUID(),
                documentId,
                documentName,
                action,
                timestamp: new Date(),
                duration,
              },
              ...state.documentHistory
            ].slice(0, 200),
          }))
        },
      }),
      {
        name: 'history-storage',
        partialize: (state) => ({
          activities: state.activities,
          recentConversations: state.recentConversations,
          searchHistory: state.searchHistory,
          documentHistory: state.documentHistory,
        }),
      }
    ),
    { name: 'history-store' }
  )
)