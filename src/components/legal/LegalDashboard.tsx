import React, { useState, useEffect } from 'react';
import { LegalComponentProps } from '../../types/legal';

interface DashboardStats {
  totalDocuments: number;
  activeMatters: number;
  pendingReviews: number;
  complianceIssues: number;
  documentsThisMonth: number;
  documentsTrend: number;
  upcomingDeadlines: number;
  clientCommunications: number;
}

interface RecentActivity {
  id: string;
  type: 'document_created' | 'review_completed' | 'deadline_approaching' | 'client_communication';
  title: string;
  description: string;
  timestamp: Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
  userId: string;
  userName: string;
}

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action: string;
  category: 'drafting' | 'research' | 'analysis' | 'communication';
}

export interface LegalDashboardProps extends LegalComponentProps {
  onQuickAction?: (actionId: string) => void;
  onViewDocument?: (documentId: string) => void;
  onViewMatter?: (matterId: string) => void;
}

export const LegalDashboard: React.FC<LegalDashboardProps> = ({
  user,
  matter,
  client,
  onQuickAction,
  onViewDocument,
  onViewMatter,
  className = ''
}) => {
  const [stats, setStats] = useState<DashboardStats>({
    totalDocuments: 0,
    activeMatters: 0,
    pendingReviews: 0,
    complianceIssues: 0,
    documentsThisMonth: 0,
    documentsTrend: 0,
    upcomingDeadlines: 0,
    clientCommunications: 0
  });
  
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const quickActions: QuickAction[] = [
    {
      id: 'draft_contract',
      title: 'Draft Contract',
      description: 'Create a new contract using templates',
      icon: <FileText className="w-5 h-5" />,
      action: 'draft_contract',
      category: 'drafting'
    },
    {
      id: 'research_case_law',
      title: 'Research Case Law',
      description: 'Search legal databases and precedents',
      icon: <BookOpen className="w-5 h-5" />,
      action: 'research_case_law',
      category: 'research'
    },
    {
      id: 'analyze_document',
      title: 'Analyze Document',
      description: 'Review contract terms and compliance',
      icon: <Search className="w-5 h-5" />,
      action: 'analyze_document',
      category: 'analysis'
    },
    {
      id: 'client_update',
      title: 'Client Update',
      description: 'Send status update to client',
      icon: <Users className="w-5 h-5" />,
      action: 'client_update',
      category: 'communication'
    },
    {
      id: 'compliance_check',
      title: 'Compliance Check',
      description: 'Verify regulatory compliance',
      icon: <Shield className="w-5 h-5" />,
      action: 'compliance_check',
      category: 'analysis'
    },
    {
      id: 'brief_generator',
      title: 'Generate Brief',
      description: 'Create legal brief or memo',
      icon: <Scale className="w-5 h-5" />,
      action: 'brief_generator',
      category: 'drafting'
    }
  ];

  useEffect(() => {
    loadDashboardData();
  }, [user, matter, client]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Simulate API calls - replace with actual API integration
      const [statsResponse, activityResponse] = await Promise.all([
        fetch('/api/legal/dashboard/stats'),
        fetch('/api/legal/dashboard/activity')
      ]);

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }

      if (activityResponse.ok) {
        const activityData = await activityResponse.json();
        setRecentActivity(activityData.activities || []);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      
      // Fallback mock data
      setStats({
        totalDocuments: 247,
        activeMatters: 23,
        pendingReviews: 8,
        complianceIssues: 3,
        documentsThisMonth: 34,
        documentsTrend: 12.5,
        upcomingDeadlines: 5,
        clientCommunications: 18
      });

      setRecentActivity([
        {
          id: '1',
          type: 'document_created',
          title: 'Employment Agreement Draft',
          description: 'New employment agreement created for TechCorp Inc.',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
          priority: 'medium',
          userId: '1',
          userName: 'Sarah Johnson'
        },
        {
          id: '2',
          type: 'review_completed',
          title: 'Contract Review Complete',
          description: 'Service agreement review completed with recommendations',
          timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
          priority: 'high',
          userId: '1',
          userName: 'Sarah Johnson'
        },
        {
          id: '3',
          type: 'deadline_approaching',
          title: 'Discovery Deadline',
          description: 'Discovery deadline for Miller v. State in 3 days',
          timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
          priority: 'critical',
          userId: '2',
          userName: 'Michael Chen'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = (actionId: string) => {
    if (onQuickAction) {
      onQuickAction(actionId);
    }
  };

  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'critical': return 'text-red-600 bg-red-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'document_created': return <FileText className="w-4 h-4" />;
      case 'review_completed': return <CheckCircle className="w-4 h-4" />;
      case 'deadline_approaching': return <Clock className="w-4 h-4" />;
      case 'client_communication': return <Users className="w-4 h-4" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-gray-200 h-24 rounded-lg"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-gray-200 h-96 rounded-lg"></div>
          <div className="bg-gray-200 h-96 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Legal Dashboard</h1>
          <p className="text-gray-600">
            Welcome back, {user?.name}. Here's your legal practice overview.
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <Calendar className="w-4 h-4 mr-2" />
            Schedule
          </button>
          <button className="flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
            <Bell className="w-4 h-4 mr-2" />
            Alerts ({stats.complianceIssues + stats.upcomingDeadlines})
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Documents</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalDocuments}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <span className="text-sm text-gray-500">
              {stats.documentsThisMonth} this month
            </span>
            {stats.documentsTrend > 0 && (
              <div className="ml-2 flex items-center text-green-600">
                <TrendingUp className="w-3 h-3 mr-1" />
                <span className="text-xs">{stats.documentsTrend}%</span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Matters</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeMatters}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <Scale className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-sm text-gray-500">
              {stats.pendingReviews} pending reviews
            </span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Compliance Issues</p>
              <p className="text-2xl font-bold text-gray-900">{stats.complianceIssues}</p>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-sm text-orange-600">Needs attention</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Upcoming Deadlines</p>
              <p className="text-2xl font-bold text-gray-900">{stats.upcomingDeadlines}</p>
            </div>
            <div className="p-3 bg-red-50 rounded-lg">
              <Clock className="w-6 h-6 text-red-600" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-sm text-red-600">Next 7 days</span>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
            <p className="text-sm text-gray-600">Start common legal tasks</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {quickActions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => handleQuickAction(action.id)}
                  className="flex items-start p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all text-left group"
                >
                  <div className="flex-shrink-0 p-2 bg-gray-100 rounded-lg group-hover:bg-blue-100 transition-colors">
                    {action.icon}
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-gray-900 group-hover:text-blue-700">
                      {action.title}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {action.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
            <p className="text-sm text-gray-600">Latest updates and actions</p>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3">
                    <div className={`flex-shrink-0 p-1 rounded ${getPriorityColor(activity.priority)}`}>
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {activity.title}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {activity.description}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-400">
                          by {activity.userName}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatTimeAgo(activity.timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6">
                  <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No recent activity</p>
                </div>
              )}
            </div>
            
            {recentActivity.length > 0 && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <button className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium">
                  View all activity
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Current Context */}
      {(matter || client) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg mr-4">
                <Scale className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-blue-900">Current Context</h3>
                <p className="text-sm text-blue-700">
                  {matter && `Matter: ${matter}`}
                  {matter && client && ' • '}
                  {client && `Client: ${client}`}
                </p>
              </div>
            </div>
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              Change Context
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LegalDashboard;