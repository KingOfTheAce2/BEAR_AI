import React from 'react'
import { 
  BarChart3, 
  Users, 
  FileText, 
  Calendar,
  TrendingUp,
  AlertCircle,
  Clock,
  CheckCircle
} from 'lucide-react'
import { Button } from '@components/ui'

const stats = [
  {
    name: 'Active Cases',
    value: '24',
    change: '+2',
    changeType: 'increase',
    icon: BarChart3,
    color: 'text-primary-600',
  },
  {
    name: 'Clients',
    value: '142',
    change: '+5',
    changeType: 'increase',
    icon: Users,
    color: 'text-success-600',
  },
  {
    name: 'Documents',
    value: '1,234',
    change: '+12',
    changeType: 'increase',
    icon: FileText,
    color: 'text-accent-600',
  },
  {
    name: 'Due This Week',
    value: '8',
    change: '-2',
    changeType: 'decrease',
    icon: Calendar,
    color: 'text-warning-600',
  },
]

const recentCases = [
  {
    id: '1',
    title: 'Smith vs. Johnson Contract Dispute',
    client: 'Smith Industries',
    status: 'In Progress',
    priority: 'High',
    dueDate: '2024-01-15',
  },
  {
    id: '2',
    title: 'Estate Planning - Williams Family',
    client: 'Williams Family Trust',
    status: 'Review',
    priority: 'Medium',
    dueDate: '2024-01-18',
  },
  {
    id: '3',
    title: 'Corporate Merger - TechCorp',
    client: 'TechCorp Solutions',
    status: 'Discovery',
    priority: 'High',
    dueDate: '2024-01-20',
  },
]

const upcomingTasks = [
  {
    id: '1',
    title: 'Client meeting with Smith Industries',
    time: '2:00 PM',
    type: 'meeting',
  },
  {
    id: '2',
    title: 'Document review deadline',
    time: '5:00 PM',
    type: 'deadline',
  },
  {
    id: '3',
    title: 'Court hearing preparation',
    time: 'Tomorrow 9:00 AM',
    type: 'preparation',
  },
]

export const Dashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Dashboard</h1>
          <p className="text-secondary-600">Welcome back! Here's what's happening today.</p>
        </div>
        
        <Button>
          New Case
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white rounded-lg border border-secondary-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-secondary-600">{stat.name}</p>
                <p className="text-2xl font-bold text-secondary-900">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-lg bg-secondary-50 ${stat.color}`}>
                <stat.icon className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <TrendingUp className={`h-4 w-4 mr-1 ${
                stat.changeType === 'increase' ? 'text-success-500' : 'text-danger-500'
              }`} />
              <span className={`text-sm font-medium ${
                stat.changeType === 'increase' ? 'text-success-600' : 'text-danger-600'
              }`}>
                {stat.change}
              </span>
              <span className="text-sm text-secondary-500 ml-1">from last month</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Cases */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-secondary-200">
          <div className="px-6 py-4 border-b border-secondary-200">
            <h2 className="text-lg font-semibold text-secondary-900">Recent Cases</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {recentCases.map((case_) => (
                <div key={case_.id} className="flex items-center justify-between p-4 bg-secondary-50 rounded-lg">
                  <div className="flex-1">
                    <h3 className="font-medium text-secondary-900">{case_.title}</h3>
                    <p className="text-sm text-secondary-600">{case_.client}</p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="flex items-center">
                        {case_.status === 'In Progress' && (
                          <Clock className="h-4 w-4 mr-1 text-warning-500" />
                        )}
                        {case_.status === 'Review' && (
                          <AlertCircle className="h-4 w-4 mr-1 text-primary-500" />
                        )}
                        {case_.status === 'Discovery' && (
                          <CheckCircle className="h-4 w-4 mr-1 text-success-500" />
                        )}
                        <span className="text-sm font-medium">{case_.status}</span>
                      </div>
                      <p className="text-xs text-secondary-500">Due {case_.dueDate}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      case_.priority === 'High' 
                        ? 'bg-danger-100 text-danger-700'
                        : 'bg-warning-100 text-warning-700'
                    }`}>
                      {case_.priority}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6">
              <Button variant="outline" className="w-full">
                View All Cases
              </Button>
            </div>
          </div>
        </div>

        {/* Upcoming Tasks */}
        <div className="bg-white rounded-lg border border-secondary-200">
          <div className="px-6 py-4 border-b border-secondary-200">
            <h2 className="text-lg font-semibold text-secondary-900">Today's Schedule</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {upcomingTasks.map((task) => (
                <div key={task.id} className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-2 h-2 bg-primary-500 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-secondary-900">{task.title}</p>
                    <p className="text-xs text-secondary-500">{task.time}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6">
              <Button variant="outline" className="w-full">
                View Calendar
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}