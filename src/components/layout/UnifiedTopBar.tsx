import React, { useState } from 'react';
import { cn } from '../../utils/cn';
import { ThemeSelector } from '../ui/ThemeSelector';
import { useApp } from '../../contexts/AppContext';
import { useTheme } from '../../contexts/ThemeContext';

interface UnifiedTopBarProps {
  user: User | null;
  onToggleSidebar: () => void;
  searchQuery: string;
  sidebarCollapsed: boolean;
}

export const UnifiedTopBar: React.FC<UnifiedTopBarProps> = ({
  user,
  onToggleSidebar,
  searchQuery,
  sidebarCollapsed
}) => {
  const { state, setSearchQuery, logout } = useApp();
  const { config } = useTheme();
  const [searchFocused, setSearchFocused] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleLogout = () => {
    setUserMenuOpen(false);
    logout();
  };

  return (
    <div className="flex items-center justify-between h-full px-4">
      {/* Left section - Menu toggle and search */}
      <div className="flex items-center space-x-4 flex-1">
        <button
          onClick={onToggleSidebar}
          className="apple-button-ghost p-2 focus-ring-apple"
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <Bars3Icon className="w-5 h-5" style={{ color: 'var(--apple-label-secondary)' }} />
        </button>

        {/* Global Search */}
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className={cn(
              'w-4 h-4 transition-colors',
              searchFocused ? 'text-primary' : 'text-text-muted'
            )} />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="Search documents, cases, or ask AI..."
            className={cn(
              'apple-input',
              searchFocused && 'ring-2 ring-blue-500/20'
            )}
          />
          
          {/* Search suggestions/results overlay could go here */}
          {searchQuery && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-lg shadow-lg z-50">
              <div className="p-3 text-sm text-text-muted">
                Press Enter to search or type more...
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right section - Notifications, theme, and user menu */}
      <div className="flex items-center space-x-2">
        {/* Notifications */}
        <div className="relative">
          <button className="apple-button-ghost p-2 relative focus-ring-apple">
            <BellIcon className="w-5 h-5" style={{ color: 'var(--apple-label-secondary)' }} />
            {state.notifications.length > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full" style={{ background: 'var(--apple-system-red)' }}></span>
            )}
          </button>
        </div>

        {/* Theme Selector */}
        <ThemeSelector compact />

        {/* User Menu */}
        {user && (
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="apple-button-ghost flex items-center space-x-2 p-2 focus-ring-apple"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                {user.name.charAt(0)}
              </div>
              <div className="hidden md:block text-left">
                <div className="apple-callout font-medium" style={{ color: 'var(--apple-label-primary)' }}>{user.name}</div>
                <div className="apple-caption" style={{ color: 'var(--apple-label-tertiary)' }}>{user.role}</div>
              </div>
              <ChevronDownIcon className={cn(
                'w-4 h-4 transition-transform duration-200',
                userMenuOpen ? 'rotate-180' : ''
              )} style={{ color: 'var(--apple-label-secondary)' }} />
            </button>

            {/* User dropdown menu */}
            {userMenuOpen && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setUserMenuOpen(false)} 
                />
                <div className="absolute right-0 top-full mt-2 w-56 apple-modal z-20">
                  <div className="p-4 border-b border-border">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-accent to-primary rounded-full flex items-center justify-center text-white font-semibold">
                        {user.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">
                          {user.name}
                        </p>
                        <p className="text-sm text-text-muted truncate">
                          {user.email}
                        </p>
                        {user.firm && (
                          <p className="text-xs text-text-muted truncate">
                            {user.firm}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-2">
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        // Navigate to profile settings
                      }}
                      className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-text-secondary hover:bg-surface hover:text-text-primary rounded-md transition-colors"
                    >
                      <UserCircleIcon className="w-4 h-4" />
                      <span>Profile Settings</span>
                    </button>
                    
                    <hr className="my-2 border-border" />
                    
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-error hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                    >
                      <ArrowRightOnRectangleIcon className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};