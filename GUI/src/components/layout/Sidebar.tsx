import React from 'react'
import { NavLink } from 'react-router-dom'
import { 
  Home, 
  FolderOpen, 
  FileText, 
  Users, 
  Calendar,
  BarChart3,
  Settings,
  MessageCircle,
  HelpCircle,
  X 
} from 'lucide-react'
import { cn } from '@utils/index'
import { Button } from '@components/ui'
import type { NavigationItem } from '@types/index'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

const navigationItems: NavigationItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: Home,
    path: '/',
  },
  {
    id: 'cases',
    label: 'Cases',
    icon: FolderOpen,
    path: '/cases',
    badge: 5,
  },
  {
    id: 'documents',
    label: 'Documents',
    icon: FileText,
    path: '/documents',
  },
  {
    id: 'clients',
    label: 'Clients',
    icon: Users,
    path: '/clients',
  },
  {
    id: 'calendar',
    label: 'Calendar',
    icon: Calendar,
    path: '/calendar',
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: BarChart3,
    path: '/reports',
  },
  {
    id: 'ai-chat',
    label: 'AI Assistant',
    icon: MessageCircle,
    path: '/ai-chat',
  },
]

const bottomNavItems: NavigationItem[] = [
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    path: '/settings',
  },
  {
    id: 'help',
    label: 'Help & Support',
    icon: HelpCircle,
    path: '/help',
  },
]

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden" 
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-secondary-200 shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:shadow-none',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-secondary-200 lg:hidden">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">BA</span>
            </div>
            <span className="text-xl font-bold text-primary-600">BEAR AI</span>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6">
          <div className="space-y-1">
            {navigationItems.map((item) => (
              <NavLink
                key={item.id}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    'flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                    isActive
                      ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-700'
                      : 'text-secondary-700 hover:bg-secondary-50 hover:text-secondary-900'
                  )
                }
              >
                <item.icon className="mr-3 h-5 w-5" />
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Bottom navigation */}
        <div className="border-t border-secondary-200 p-4">
          <div className="space-y-1">
            {bottomNavItems.map((item) => (
              <NavLink
                key={item.id}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    'flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-secondary-700 hover:bg-secondary-50 hover:text-secondary-900'
                  )
                }
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>
      </aside>
    </>
  )
}