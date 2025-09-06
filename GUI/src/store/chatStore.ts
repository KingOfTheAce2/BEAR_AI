import { create } from 'zustand'
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware'
import type { ChatMessage, Conversation, LoadingState, AutocompleteItem } from '@types/index'

// Chat Store
interface ChatState extends LoadingState {
  conversations: Conversation[]
  currentConversation: Conversation | null
  messages: ChatMessage[]
  isTyping: boolean
  autocompleteItems: AutocompleteItem[]
  recentSearches: string[]
  
  // Actions
  createConversation: (title?: string) => string
  deleteConversation: (id: string) => void
  selectConversation: (id: string) => void
  sendMessage: (content: string, attachments?: File[]) => Promise<void>
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void
  exportConversation: (id: string, format: 'json' | 'pdf' | 'txt') => void
  archiveConversation: (id: string) => void
  searchConversations: (query: string) => Conversation[]
  getRecentConversations: (limit?: number) => Conversation[]
  addAutocompleteItem: (item: AutocompleteItem) => void
  getAutocompleteItems: (query: string, context?: string) => AutocompleteItem[]
  setTyping: (typing: boolean) => void
  clearCurrentConversation: () => void
}

export const useChatStore = create<ChatState>()(
  devtools(
    persist(
      subscribeWithSelector((set, get) => ({
        conversations: [],
        currentConversation: null,
        messages: [],
        isLoading: false,
        error: null,
        isTyping: false,
        autocompleteItems: [
          // Default legal terms
          { id: '1', text: 'breach of contract', type: 'legal-term', category: 'contract law', usage: 150, context: ['contracts', 'disputes'] },
          { id: '2', text: 'due process', type: 'legal-term', category: 'constitutional law', usage: 200, context: ['criminal', 'civil rights'] },
          { id: '3', text: 'proximate cause', type: 'legal-term', category: 'tort law', usage: 120, context: ['negligence', 'liability'] },
          { id: '4', text: 'summary judgment', type: 'legal-term', category: 'procedure', usage: 180, context: ['motion', 'litigation'] },
          { id: '5', text: 'Miranda rights', type: 'legal-term', category: 'criminal law', usage: 90, context: ['criminal', 'procedure'] },
        ],
        recentSearches: [],

        createConversation: (title) => {
          const id = crypto.randomUUID()
          const newConversation: Conversation = {
            id,
            title: title || `New Conversation ${new Date().toLocaleString()}`,
            userId: get().conversations.length > 0 ? 'current-user' : 'current-user', // TODO: Get from auth
            messages: [],
            lastActivity: new Date(),
            tags: [],
            isArchived: false,
            metadata: {
              messageCount: 0,
              legalContext: [],
              caseReferences: [],
            },
            createdAt: new Date(),
            updatedAt: new Date(),
          }

          set((state) => ({
            conversations: [newConversation, ...state.conversations],
            currentConversation: newConversation,
            messages: [],
          }))

          return id
        },

        deleteConversation: (id) => {
          set((state) => ({
            conversations: state.conversations.filter(conv => conv.id !== id),
            currentConversation: state.currentConversation?.id === id ? null : state.currentConversation,
            messages: state.currentConversation?.id === id ? [] : state.messages,
          }))
        },

        selectConversation: (id) => {
          const conversation = get().conversations.find(conv => conv.id === id)
          if (conversation) {
            set({
              currentConversation: conversation,
              messages: conversation.messages,
            })
          }
        },

        sendMessage: async (content, attachments) => {
          const state = get()
          if (!state.currentConversation) {
            // Create new conversation if none exists
            get().createConversation()
          }

          const messageId = crypto.randomUUID()
          const userMessage: ChatMessage = {
            id: messageId,
            content,
            role: 'user',
            timestamp: new Date(),
            attachments: attachments?.map(file => ({
              id: crypto.randomUUID(),
              name: file.name,
              type: file.type.startsWith('image/') ? 'image' : 'document' as const,
              url: URL.createObjectURL(file),
              size: file.size,
              mimeType: file.type,
            })) || [],
            userId: 'current-user', // TODO: Get from auth
            conversationId: state.currentConversation!.id,
          }

          // Add user message
          set((state) => ({
            messages: [...state.messages, userMessage],
            isTyping: true,
          }))

          // Update conversation
          const updatedConversation = {
            ...state.currentConversation!,
            messages: [...state.messages, userMessage],
            lastActivity: new Date(),
            updatedAt: new Date(),
            metadata: {
              ...state.currentConversation!.metadata,
              messageCount: state.messages.length + 1,
            },
          }

          set((state) => ({
            conversations: state.conversations.map(conv => 
              conv.id === updatedConversation.id ? updatedConversation : conv
            ),
            currentConversation: updatedConversation,
          }))

          try {
            // Simulate AI response
            await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000))

            const aiResponse: ChatMessage = {
              id: crypto.randomUUID(),
              content: generateMockAIResponse(content),
              role: 'assistant',
              timestamp: new Date(),
              citations: generateMockCitations(),
              metadata: {
                confidence: 0.85 + Math.random() * 0.1,
                sources: ['Federal Rules of Civil Procedure', 'Restatement of Contracts'],
                processingTime: 1200 + Math.random() * 800,
              },
              userId: 'ai-assistant',
              conversationId: state.currentConversation!.id,
            }

            set((state) => ({
              messages: [...state.messages, aiResponse],
              isTyping: false,
            }))

            // Update conversation with AI response
            const finalConversation = {
              ...updatedConversation,
              messages: [...state.messages, aiResponse],
              lastActivity: new Date(),
              updatedAt: new Date(),
              metadata: {
                ...updatedConversation.metadata,
                messageCount: state.messages.length + 1,
              },
            }

            set((state) => ({
              conversations: state.conversations.map(conv => 
                conv.id === finalConversation.id ? finalConversation : conv
              ),
              currentConversation: finalConversation,
            }))

          } catch (error) {
            set({ 
              isTyping: false,
              error: error instanceof Error ? error.message : 'Failed to get AI response' 
            })
          }
        },

        updateMessage: (id, updates) => {
          set((state) => ({
            messages: state.messages.map(msg => 
              msg.id === id ? { ...msg, ...updates } : msg
            ),
          }))
        },

        exportConversation: (id, format) => {
          const conversation = get().conversations.find(conv => conv.id === id)
          if (!conversation) return

          const filename = `conversation_${conversation.title.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}`
          
          let content: string
          let mimeType: string

          switch (format) {
            case 'json':
              content = JSON.stringify(conversation, null, 2)
              mimeType = 'application/json'
              break
            case 'txt':
              content = conversation.messages.map(msg => 
                `[${msg.timestamp.toLocaleString()}] ${msg.role.toUpperCase()}: ${msg.content}`
              ).join('\n\n')
              mimeType = 'text/plain'
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
          link.download = `${filename}.${format}`
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          URL.revokeObjectURL(url)
        },

        archiveConversation: (id) => {
          set((state) => ({
            conversations: state.conversations.map(conv =>
              conv.id === id ? { ...conv, isArchived: true, updatedAt: new Date() } : conv
            ),
          }))
        },

        searchConversations: (query) => {
          const conversations = get().conversations
          const searchTerm = query.toLowerCase()
          
          return conversations.filter(conv => 
            conv.title.toLowerCase().includes(searchTerm) ||
            conv.messages.some(msg => msg.content.toLowerCase().includes(searchTerm)) ||
            conv.tags.some(tag => tag.toLowerCase().includes(searchTerm))
          )
        },

        getRecentConversations: (limit = 10) => {
          return get().conversations
            .filter(conv => !conv.isArchived)
            .sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime())
            .slice(0, limit)
        },

        addAutocompleteItem: (item) => {
          set((state) => ({
            autocompleteItems: [...state.autocompleteItems.filter(i => i.id !== item.id), item],
          }))
        },

        getAutocompleteItems: (query, context) => {
          const items = get().autocompleteItems
          const searchTerm = query.toLowerCase()
          
          return items
            .filter(item => 
              item.text.toLowerCase().includes(searchTerm) &&
              (!context || item.context?.includes(context))
            )
            .sort((a, b) => b.usage - a.usage)
            .slice(0, 10)
        },

        setTyping: (isTyping) => set({ isTyping }),

        clearCurrentConversation: () => set({ 
          currentConversation: null, 
          messages: [] 
        }),
      })),
      {
        name: 'chat-storage',
        partialize: (state) => ({
          conversations: state.conversations,
          autocompleteItems: state.autocompleteItems,
          recentSearches: state.recentSearches,
        }),
      }
    ),
    { name: 'chat-store' }
  )
)

// Helper functions
function generateMockAIResponse(userQuery: string): string {
  const responses = [
    `Based on your question about "${userQuery}", I can provide the following legal analysis:

This matter involves several key legal principles. First, you should consider the applicable statutes and case law in your jurisdiction. The relevant legal standard typically requires establishing the elements of the claim with sufficient evidence.

Key considerations include:
- Burden of proof and standard of evidence
- Applicable statutes of limitations  
- Relevant case precedents
- Procedural requirements

I recommend reviewing the specific statutory language and recent case law developments in this area. Would you like me to elaborate on any particular aspect?`,

    `Regarding "${userQuery}", this presents an interesting legal question that requires careful analysis.

The legal framework governing this issue typically involves a multi-factor test. Courts generally consider:

1. The factual circumstances of the case
2. The intent of the parties involved
3. The applicable legal standards
4. Any relevant precedential authority

Based on established precedent, the most likely outcome would depend on how these factors align with your specific situation. I'd be happy to dive deeper into any particular element you'd like to explore further.`,

    `Your inquiry about "${userQuery}" touches on an important area of law.

From a legal perspective, this issue is governed by well-established principles. The analysis typically involves:

• Identifying the relevant legal framework
• Applying the facts to the governing law
• Considering any applicable defenses or exceptions
• Evaluating the strength of the legal position

The case law in this area has evolved significantly, and recent decisions have clarified several important points. Would you like me to explain how these developments might impact your specific situation?`
  ]
  
  return responses[Math.floor(Math.random() * responses.length)]
}

function generateMockCitations() {
  const citations = [
    {
      id: '1',
      title: 'Smith v. Jones',
      source: '123 F.3d 456 (9th Cir. 2021)',
      snippet: 'The court held that the plaintiff must establish all elements of the claim by a preponderance of the evidence.',
      relevance: 0.92,
      type: 'case' as const,
    },
    {
      id: '2',
      title: '28 U.S.C. § 1332',
      source: 'Federal Statutes',
      snippet: 'The district courts shall have original jurisdiction of all civil actions where the matter in controversy exceeds the sum or value of $75,000...',
      relevance: 0.88,
      type: 'statute' as const,
    },
    {
      id: '3',
      title: 'Federal Rule of Civil Procedure 12(b)(6)',
      source: 'Fed. R. Civ. P.',
      snippet: 'A party may assert the defense of failure to state a claim upon which relief can be granted by motion.',
      relevance: 0.85,
      type: 'regulation' as const,
    },
  ]
  
  return citations.slice(0, Math.floor(Math.random() * 3) + 1)
}