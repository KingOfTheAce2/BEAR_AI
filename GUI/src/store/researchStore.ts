import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { ResearchQuery, ResearchResult, ResearchFilters, LoadingState } from '@types/index'

interface ResearchState extends LoadingState {
  queries: ResearchQuery[]
  currentQuery: ResearchQuery | null
  results: ResearchResult[]
  filters: ResearchFilters
  savedSearches: Array<{
    id: string
    name: string
    query: string
    filters: ResearchFilters
    createdAt: Date
  }>
  bookmarkedResults: string[]
  searchHistory: string[]

  // Actions
  performSearch: (query: string, filters?: Partial<ResearchFilters>) => Promise<void>
  updateFilters: (filters: Partial<ResearchFilters>) => void
  saveSearch: (name: string) => void
  loadSavedSearch: (id: string) => void
  deleteSavedSearch: (id: string) => void
  bookmarkResult: (resultId: string) => void
  unbookmarkResult: (resultId: string) => void
  exportResults: (format: 'json' | 'csv' | 'pdf') => void
  clearResults: () => void
  addToSearchHistory: (query: string) => void
  getSearchSuggestions: (partial: string) => string[]
}

export const useResearchStore = create<ResearchState>()(
  devtools(
    persist(
      (set, get) => ({
        queries: [],
        currentQuery: null,
        results: [],
        isLoading: false,
        error: null,
        filters: {
          documentTypes: [],
          dateRange: undefined,
          jurisdiction: [],
          practiceArea: [],
          relevanceThreshold: 0.7,
          sortBy: 'relevance',
          sortOrder: 'desc',
        },
        savedSearches: [],
        bookmarkedResults: [],
        searchHistory: [],

        performSearch: async (query, additionalFilters = {}) => {
          set({ isLoading: true, error: null })
          
          const finalFilters = { ...get().filters, ...additionalFilters }
          
          try {
            // Add to search history
            get().addToSearchHistory(query)
            
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1500))
            
            const mockResults: ResearchResult[] = generateMockResults(query, finalFilters)
            
            const newQuery: ResearchQuery = {
              id: crypto.randomUUID(),
              query,
              filters: finalFilters,
              results: mockResults,
              savedAt: new Date(),
              userId: 'current-user', // TODO: Get from auth
            }
            
            set({
              currentQuery: newQuery,
              results: mockResults,
              queries: [newQuery, ...get().queries.slice(0, 9)], // Keep last 10 queries
              isLoading: false,
            })
            
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Search failed',
              isLoading: false,
            })
          }
        },

        updateFilters: (newFilters) => {
          set((state) => ({
            filters: { ...state.filters, ...newFilters },
          }))
        },

        saveSearch: (name) => {
          const { currentQuery } = get()
          if (!currentQuery) return
          
          const savedSearch = {
            id: crypto.randomUUID(),
            name,
            query: currentQuery.query,
            filters: currentQuery.filters,
            createdAt: new Date(),
          }
          
          set((state) => ({
            savedSearches: [...state.savedSearches, savedSearch],
          }))
        },

        loadSavedSearch: (id) => {
          const savedSearch = get().savedSearches.find(s => s.id === id)
          if (savedSearch) {
            get().performSearch(savedSearch.query, savedSearch.filters)
          }
        },

        deleteSavedSearch: (id) => {
          set((state) => ({
            savedSearches: state.savedSearches.filter(s => s.id !== id),
          }))
        },

        bookmarkResult: (resultId) => {
          set((state) => ({
            bookmarkedResults: [...state.bookmarkedResults, resultId],
          }))
        },

        unbookmarkResult: (resultId) => {
          set((state) => ({
            bookmarkedResults: state.bookmarkedResults.filter(id => id !== resultId),
          }))
        },

        exportResults: (format) => {
          const { results, currentQuery } = get()
          if (!results.length || !currentQuery) return
          
          const filename = `research_results_${currentQuery.query.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}`
          
          let content: string
          let mimeType: string
          let fileExtension: string
          
          switch (format) {
            case 'json':
              content = JSON.stringify({ query: currentQuery, results }, null, 2)
              mimeType = 'application/json'
              fileExtension = 'json'
              break
            case 'csv':
              const headers = ['Title', 'Source', 'Type', 'Jurisdiction', 'Practice Area', 'Relevance', 'Published Date', 'URL']
              const rows = results.map(result => [
                result.title,
                result.source,
                result.type,
                result.jurisdiction,
                result.practiceArea.join('; '),
                result.relevance.toString(),
                result.publishedDate.toISOString().split('T')[0],
                result.url || '',
              ])
              content = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
              mimeType = 'text/csv'
              fileExtension = 'csv'
              break
            case 'pdf':
              // TODO: Implement PDF generation
              console.warn('PDF export not yet implemented')
              return
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

        clearResults: () => {
          set({ results: [], currentQuery: null })
        },

        addToSearchHistory: (query) => {
          set((state) => ({
            searchHistory: [
              query,
              ...state.searchHistory.filter(q => q !== query).slice(0, 19)
            ],
          }))
        },

        getSearchSuggestions: (partial) => {
          const history = get().searchHistory
          const suggestions = history.filter(query => 
            query.toLowerCase().includes(partial.toLowerCase())
          ).slice(0, 5)
          
          // Add common legal search patterns
          const commonPatterns = [
            'breach of contract',
            'negligence standards',
            'due process requirements',
            'statutory interpretation',
            'constitutional analysis',
            'summary judgment standard',
            'discovery rules',
            'evidence admissibility',
          ]
          
          const patternSuggestions = commonPatterns.filter(pattern =>
            pattern.toLowerCase().includes(partial.toLowerCase()) &&
            !suggestions.includes(pattern)
          ).slice(0, 3)
          
          return [...suggestions, ...patternSuggestions]
        },
      }),
      {
        name: 'research-storage',
        partialize: (state) => ({
          savedSearches: state.savedSearches,
          bookmarkedResults: state.bookmarkedResults,
          searchHistory: state.searchHistory,
          filters: state.filters,
        }),
      }
    ),
    { name: 'research-store' }
  )
)

function generateMockResults(query: string, filters: ResearchFilters): ResearchResult[] {
  const baseResults = [
    {
      id: '1',
      title: 'Landmark Contract Law Case - Elements of Breach',
      snippet: 'This case establishes the fundamental elements required to prove breach of contract including duty, breach, causation, and damages...',
      source: 'Federal Reporter, 3d Series',
      url: 'https://example.com/case1',
      relevance: 0.95,
      type: 'case' as const,
      jurisdiction: 'Federal',
      practiceArea: ['Contract Law', 'Commercial Law'],
      publishedDate: new Date('2021-03-15'),
      citations: 247,
      bookmarked: false,
    },
    {
      id: '2',
      title: 'Uniform Commercial Code § 2-608 - Revocation of Acceptance',
      snippet: 'A buyer may revoke his acceptance of a lot or commercial unit whose non-conformity substantially impairs its value to him...',
      source: 'Uniform Commercial Code',
      url: 'https://example.com/ucc2-608',
      relevance: 0.89,
      type: 'statute' as const,
      jurisdiction: 'Federal',
      practiceArea: ['Commercial Law', 'Sales Law'],
      publishedDate: new Date('2020-01-01'),
      citations: 156,
      bookmarked: false,
    },
    {
      id: '3',
      title: 'Restatement (Second) of Contracts § 241 - Circumstances Significant in Determining Whether a Failure Is Material',
      snippet: 'In determining whether a failure to render or to offer performance is material, the following circumstances are significant...',
      source: 'American Law Institute',
      url: 'https://example.com/restatement241',
      relevance: 0.87,
      type: 'article' as const,
      jurisdiction: 'Federal',
      practiceArea: ['Contract Law'],
      publishedDate: new Date('2019-07-22'),
      citations: 89,
      bookmarked: false,
    },
    {
      id: '4',
      title: 'Modern Approaches to Contract Interpretation',
      snippet: 'Recent developments in contract interpretation have shifted towards a more contextual approach, considering the entire agreement and surrounding circumstances...',
      source: 'Harvard Law Review',
      url: 'https://example.com/harvard-contracts',
      relevance: 0.82,
      type: 'article' as const,
      jurisdiction: 'Federal',
      practiceArea: ['Contract Law', 'Legal Theory'],
      publishedDate: new Date('2022-11-08'),
      citations: 34,
      bookmarked: false,
    },
    {
      id: '5',
      title: 'State v. Commercial Defendant - Punitive Damages Standard',
      snippet: 'The court clarified the standard for awarding punitive damages in commercial disputes, requiring clear and convincing evidence of malicious conduct...',
      source: 'State Supreme Court Reports',
      url: 'https://example.com/state-punitive',
      relevance: 0.78,
      type: 'case' as const,
      jurisdiction: 'California',
      practiceArea: ['Commercial Law', 'Tort Law'],
      publishedDate: new Date('2021-09-14'),
      citations: 67,
      bookmarked: false,
    },
    {
      id: '6',
      title: 'Federal Rules of Civil Procedure Rule 56 - Summary Judgment',
      snippet: 'The court shall grant summary judgment if the movant shows that there is no genuine dispute as to any material fact...',
      source: 'Federal Rules of Civil Procedure',
      url: 'https://example.com/frcp56',
      relevance: 0.75,
      type: 'regulation' as const,
      jurisdiction: 'Federal',
      practiceArea: ['Civil Procedure', 'Litigation'],
      publishedDate: new Date('2020-12-01'),
      citations: 342,
      bookmarked: false,
    },
  ]

  // Filter results based on criteria
  let filteredResults = baseResults.filter(result => {
    // Document type filter
    if (filters.documentTypes && filters.documentTypes.length > 0) {
      if (!filters.documentTypes.includes(result.type)) return false
    }
    
    // Jurisdiction filter
    if (filters.jurisdiction && filters.jurisdiction.length > 0) {
      if (!filters.jurisdiction.includes(result.jurisdiction)) return false
    }
    
    // Practice area filter
    if (filters.practiceArea && filters.practiceArea.length > 0) {
      if (!filters.practiceArea.some(area => result.practiceArea.includes(area))) return false
    }
    
    // Relevance threshold
    if (filters.relevanceThreshold && result.relevance < filters.relevanceThreshold) {
      return false
    }
    
    // Date range filter
    if (filters.dateRange) {
      if (result.publishedDate < filters.dateRange.start || result.publishedDate > filters.dateRange.end) {
        return false
      }
    }
    
    return true
  })

  // Sort results
  if (filters.sortBy) {
    filteredResults.sort((a, b) => {
      let comparison = 0
      
      switch (filters.sortBy) {
        case 'relevance':
          comparison = b.relevance - a.relevance
          break
        case 'date':
          comparison = b.publishedDate.getTime() - a.publishedDate.getTime()
          break
        case 'title':
          comparison = a.title.localeCompare(b.title)
          break
        default:
          comparison = 0
      }
      
      return filters.sortOrder === 'asc' ? -comparison : comparison
    })
  }

  // Simulate relevance boost based on query
  const queryLower = query.toLowerCase()
  filteredResults.forEach(result => {
    if (result.title.toLowerCase().includes(queryLower) || 
        result.snippet.toLowerCase().includes(queryLower)) {
      result.relevance = Math.min(result.relevance + 0.1, 1.0)
    }
  })

  return filteredResults
}