import React, { useState, useMemo } from 'react'
import {
  Clock,
  MessageSquare,
  Search,
  FileText,
  Download,
  Filter,
  Calendar,
  User,
  BarChart3,
  Activity,
  Trash2,
  Archive,
  ExternalLink,
  Eye,
  TrendingUp,
  PieChart,
  RefreshCw
} from 'lucide-react'
import { useHistoryStore } from '../store/historyStore'
import { useChatStore } from '../store/chatStore'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import type { ActivityEvent } from '../types'

const History: React.FC = () => {
  const {
    activities,
    recentConversations,
    searchHistory,
    documentHistory,
    getActivitiesByType,
    getActivitiesByDateRange,
    clearOldActivities,
    exportHistory,
    getActivityStats,
    clearHistory
  } = useHistoryStore()
  
  const { selectConversation } = useChatStore()
  
  const [activeTab, setActiveTab] = useState<'conversations' | 'searches' | 'documents' | 'activities' | 'stats'>('conversations')
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all'>('all')
  const [activityTypeFilter, setActivityTypeFilter] = useState<ActivityEvent['type'] | 'all'>('all')
  const [showExportDialog, setShowExportDialog] = useState(false)
  
  const stats = getActivityStats()
  
  // Filter activities based on search and filters
  const filteredActivities = useMemo(() => {
    let filtered = activities
    
    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date()
      let startDate: Date
      
      switch (dateFilter) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          break
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          break
        default:
          startDate = new Date(0)
      }
      
      filtered = filtered.filter(activity => activity.timestamp >= startDate)
    }
    
    // Activity type filter
    if (activityTypeFilter !== 'all') {
      filtered = filtered.filter(activity => activity.type === activityTypeFilter)
    }
    
    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(activity =>
        JSON.stringify(activity.metadata).toLowerCase().includes(searchQuery.toLowerCase()) ||
        activity.type.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
    
    return filtered
  }, [activities, dateFilter, activityTypeFilter, searchQuery])
  
  const handleConversationClick = (conversationId: string) => {
    selectConversation(conversationId)
    // Navigate to chat page - in real app, would use router
    console.log(`Navigate to chat with conversation: ${conversationId}`)
  }
  
  const formatDuration = (ms?: number) => {
    if (!ms) return 'N/A'
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`
    return `${seconds}s`
  }
  
  const formatTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString()
  }
  
  const getActivityIcon = (type: ActivityEvent['type']) => {
    switch (type) {
      case 'login':
      case 'logout':
        return <User className="w-4 h-4 text-green-600" />
      case 'chat_message':
        return <MessageSquare className="w-4 h-4 text-blue-600" />
      case 'search_performed':
        return <Search className="w-4 h-4 text-purple-600" />
      case 'document_viewed':
        return <FileText className="w-4 h-4 text-orange-600" />
      case 'case_updated':
        return <Archive className="w-4 h-4 text-red-600" />
      default:
        return <Activity className="w-4 h-4 text-gray-600" />
    }
  }
  
  const getActivityDescription = (activity: ActivityEvent) => {
    switch (activity.type) {
      case 'login':
        return 'Logged into the application'
      case 'logout':
        return 'Logged out of the application'
      case 'chat_message':
        return `${activity.metadata.action || 'Sent message in'} conversation${activity.metadata.title ? `: ${activity.metadata.title}` : ''}`
      case 'search_performed':
        return `Searched for "${activity.metadata.query}" (${activity.metadata.results || 0} results)`
      case 'document_viewed':
        return `${activity.metadata.action || 'Viewed'} document: ${activity.metadata.documentName || 'Unknown'}`
      case 'case_updated':
        return `Updated case: ${activity.metadata.caseName || 'Unknown'}`
      default:
        return 'Unknown activity'
    }
  }
  
  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Activity History</h1>
            <p className="text-gray-600">
              Track your conversations, searches, and document activity
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowExportDialog(true)}
            >
              <Download className="w-4 h-4 mr-1" />
              Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => clearOldActivities(30)}
              title="Clear activities older than 30 days"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Cleanup
            </Button>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          {[
            { id: 'conversations', label: 'Conversations', icon: MessageSquare },
            { id: 'searches', label: 'Searches', icon: Search },
            { id: 'documents', label: 'Documents', icon: FileText },
            { id: 'activities', label: 'All Activity', icon: Activity },
            { id: 'stats', label: 'Statistics', icon: BarChart3 }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
        
        {/* Filters */}
        {(activeTab === 'activities' || activeTab === 'conversations' || activeTab === 'searches' || activeTab === 'documents') && (
          <div className="flex items-center space-x-4 mt-4">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Search history..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Date Filter */}
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Past Week</option>
              <option value="month">Past Month</option>
            </select>
            
            {/* Activity Type Filter */}
            {activeTab === 'activities' && (
              <select
                value={activityTypeFilter}
                onChange={(e) => setActivityTypeFilter(e.target.value as any)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="all">All Types</option>
                <option value="login">Login/Logout</option>
                <option value="chat_message">Chat Messages</option>
                <option value="search_performed">Searches</option>
                <option value="document_viewed">Documents</option>
                <option value="case_updated">Case Updates</option>
              </select>
            )}
          </div>
        )}
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'conversations' && (
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-gray-900">Recent Conversations</h2>
            {recentConversations.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No recent conversations</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200">
                {recentConversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    onClick={() => handleConversationClick(conversation.id)}
                    className="flex items-center justify-between p-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">
                        {conversation.title}
                      </h3>
                      <p className="text-sm text-gray-600 truncate mt-1">
                        {conversation.lastMessage}
                      </p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500 mt-2">
                        <span className="flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {formatTime(conversation.timestamp)}
                        </span>
                        <span className="flex items-center">
                          <MessageSquare className="w-3 h-3 mr-1" />
                          {conversation.messageCount} messages
                        </span>
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-gray-400" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'searches' && (
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-gray-900">Search History</h2>
            {searchHistory.length === 0 ? (
              <div className="text-center py-12">
                <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No search history</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200">
                {searchHistory.map((search) => (
                  <div
                    key={search.id}
                    className="flex items-center justify-between p-4 border-b border-gray-100 last:border-b-0"
                  >
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <Search className="w-4 h-4 text-purple-600 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 truncate">{search.query}</p>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span className="capitalize">{search.type} search</span>
                          <span>{formatTime(search.timestamp)}</span>
                          {search.results !== undefined && (
                            <span>{search.results} results</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Repeat
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'documents' && (
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-gray-900">Document Activity</h2>
            {documentHistory.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No document activity</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200">
                {documentHistory.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-4 border-b border-gray-100 last:border-b-0"
                  >
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <FileText className="w-4 h-4 text-orange-600 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 truncate">{doc.documentName}</p>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span className="capitalize">{doc.action}</span>
                          <span>{formatTime(doc.timestamp)}</span>
                          {doc.duration && (
                            <span>Duration: {formatDuration(doc.duration)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      <Eye className="w-3 h-3 mr-1" />
                      View
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'activities' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">All Activity</h2>
              <span className="text-sm text-gray-600">
                {filteredActivities.length} activities
              </span>
            </div>
            
            {filteredActivities.length === 0 ? (
              <div className="text-center py-12">
                <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No activities found</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200">
                {filteredActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center space-x-3 p-4 border-b border-gray-100 last:border-b-0"
                  >
                    {getActivityIcon(activity.type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-900">{getActivityDescription(activity)}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>{formatTime(activity.timestamp)}</span>
                        {activity.duration && (
                          <span>Duration: {formatDuration(activity.duration)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'stats' && (
          <div className="space-y-6">
            <h2 className="text-lg font-medium text-gray-900">Activity Statistics</h2>
            
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Activities</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalActivities}</p>
                  </div>
                  <Activity className="w-8 h-8 text-blue-600" />
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Conversations</p>
                    <p className="text-2xl font-bold text-gray-900">{recentConversations.length}</p>
                  </div>
                  <MessageSquare className="w-8 h-8 text-green-600" />
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Searches</p>
                    <p className="text-2xl font-bold text-gray-900">{searchHistory.length}</p>
                  </div>
                  <Search className="w-8 h-8 text-purple-600" />
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Avg. Session</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {Math.round(stats.averageSessionDuration / 1000 / 60)}m
                    </p>
                  </div>
                  <Clock className="w-8 h-8 text-orange-600" />
                </div>
              </div>
            </div>
            
            {/* Activity by Type */}
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <PieChart className="w-5 h-5 mr-2" />
                Activity by Type
              </h3>
              <div className="space-y-3">
                {Object.entries(stats.activitiesByType).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getActivityIcon(type as ActivityEvent['type'])}
                      <span className="capitalize">{type.replace('_', ' ')}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${(count / stats.totalActivities) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600 w-8">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Daily Activity */}
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" />
                Daily Activity (Last 7 Days)
              </h3>
              <div className="space-y-2">
                {Object.entries(stats.activitiesByDay)
                  .slice(-7)
                  .map(([date, count]) => (
                    <div key={date} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">
                        {new Date(date).toLocaleDateString()}
                      </span>
                      <div className="flex items-center space-x-2">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-600 h-2 rounded-full"
                            style={{ 
                              width: `${Math.max((count / Math.max(...Object.values(stats.activitiesByDay))) * 100, 5)}%` 
                            }}
                          />
                        </div>
                        <span className="text-sm text-gray-900 w-8">{count}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Export Dialog */}
      {showExportDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Export History</h3>
            <div className="space-y-3 mb-4">
              <Button
                variant="outline"
                onClick={() => {
                  exportHistory('json')
                  setShowExportDialog(false)
                }}
                className="w-full justify-start"
              >
                <Download className="w-4 h-4 mr-2" />
                Export as JSON
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  exportHistory('csv')
                  setShowExportDialog(false)
                }}
                className="w-full justify-start"
              >
                <Download className="w-4 h-4 mr-2" />
                Export as CSV
              </Button>
            </div>
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowExportDialog(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default History