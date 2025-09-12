import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useTheme } from '../../contexts/ThemeContext';
import { ThemeSelector } from '../ui/ThemeSelector';
import {
  MagnifyingGlassIcon,
  Bars3Icon,
  BellIcon,
  UserCircleIcon,
  ChevronDownIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';
import { cn } from '../../utils/cn';
import { User } from '../../types';

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
          className="p-2 rounded-lg hover:bg-surface transition-colors"
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <Bars3Icon className="w-5 h-5 text-text-secondary" />
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
              'block w-full pl-10 pr-3 py-2 border rounded-lg bg-background placeholder-text-muted transition-all duration-200',
              'focus:ring-2 focus:border-transparent sm:text-sm',
              searchFocused
                ? 'border-primary ring-primary ring-opacity-20'
                : 'border-border hover:border-text-muted'
            )}
            style={{
              backgroundColor: `var(--color-background)`,
              borderColor: searchFocused ? `var(--color-primary)` : `var(--color-border)`,
              color: `var(--color-text-primary)`
            }}
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
          <button className="p-2 rounded-lg hover:bg-surface transition-colors relative">
            <BellIcon className="w-5 h-5 text-text-secondary" />
            {state.notifications.length > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-accent rounded-full"></span>
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
              className="flex items-center space-x-2 p-2 rounded-lg hover:bg-surface transition-colors"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-accent to-primary rounded-full flex items-center justify-center text-white text-sm font-semibold">
                {user.name.charAt(0)}
              </div>
              <div className="hidden md:block text-left">
                <div className="text-sm font-medium text-text-primary">{user.name}</div>
                <div className="text-xs text-text-muted">{user.role}</div>
              </div>
              <ChevronDownIcon className={cn(
                'w-4 h-4 text-text-muted transition-transform',
                userMenuOpen ? 'rotate-180' : ''
              )} />
            </button>

            {/* User dropdown menu */}
            {userMenuOpen && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setUserMenuOpen(false)} 
                />
                <div className="absolute right-0 top-full mt-2 w-56 bg-background border border-border rounded-lg shadow-lg z-20">
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