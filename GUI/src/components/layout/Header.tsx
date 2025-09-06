import React from 'react'
import { Link } from 'react-router-dom'
import { Menu, Search, Bell, User, Settings } from 'lucide-react'
import { cn } from '@utils/index'
import { Button } from '@components/ui'
import { useAuthStore, useAppStore } from '@store/index'

interface HeaderProps {
  onMenuClick: () => void
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { user, logout } = useAuthStore()
  const { notifications } = useAppStore()
  
  const unreadCount = notifications.filter(n => !n.id.includes('read')).length

  return (
    <header className="bg-white border-b border-secondary-200 shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Left side */}
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onMenuClick}
            className="lg:hidden"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          <Link 
            to="/" 
            className="flex items-center space-x-2 text-xl font-bold text-primary-600"
          >
            <div className="h-8 w-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">BA</span>
            </div>
            <span className="hidden sm:block">BEAR AI</span>
          </Link>
        </div>

        {/* Center - Search */}
        <div className="flex-1 max-w-lg mx-8 hidden md:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-secondary-400" />
            <input
              type="text"
              placeholder="Search cases, documents, clients..."
              className="w-full pl-10 pr-4 py-2 border border-secondary-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-3">
          {/* Search button for mobile */}
          <Button variant="ghost" size="sm" className="md:hidden">
            <Search className="h-5 w-5" />
          </Button>

          {/* Notifications */}
          <div className="relative">
            <Button variant="ghost" size="sm">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 bg-danger-500 text-white text-xs rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>
          </div>

          {/* Settings */}
          <Button variant="ghost" size="sm">
            <Settings className="h-5 w-5" />
          </Button>

          {/* User menu */}
          <div className="relative">
            <div className="flex items-center space-x-3">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-secondary-900">
                  {user?.name || 'User'}
                </p>
                <p className="text-xs text-secondary-500">
                  {user?.role || 'Role'}
                </p>
              </div>
              
              <div className="h-8 w-8 bg-primary-100 rounded-full flex items-center justify-center">
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <User className="h-4 w-4 text-primary-600" />
                )}
              </div>
            </div>
          </div>

          {/* Logout button */}
          <Button 
            variant="outline" 
            size="sm"
            onClick={logout}
            className="hidden sm:inline-flex"
          >
            Logout
          </Button>
        </div>
      </div>
    </header>
  )
}