import React, { useState, useRef } from 'react';
import { GlobalSearch } from '../search/GlobalSearch';

interface TopBarProps {
  user: User | null;
  onToggleSidebar: () => void;
  onSearch: (query: string) => void;
  searchQuery: string;
}

export const TopBar: React.FC<TopBarProps> = ({
  user,
  onToggleSidebar,
  onSearch,
  searchQuery
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Mock notifications for demo
  const notifications = [
    { id: 1, text: 'Document analysis completed', type: 'success', time: '2m ago' },
    { id: 2, text: 'New research results available', type: 'info', time: '5m ago' },
    { id: 3, text: 'System maintenance scheduled', type: 'warning', time: '1h ago' }
  ];

  const handleUserMenuToggle = () => {
    setShowUserMenu(!showUserMenu);
    setShowNotifications(false);
  };

  const handleNotificationToggle = () => {
    setShowNotifications(!showNotifications);
    setShowUserMenu(false);
  };

  return (
    <div className="h-full flex items-center justify-between px-6 bg-white">
      {/* Left Section - Menu Toggle & Breadcrumb */}
      <div className="flex items-center space-x-4">
        <button
          onClick={onToggleSidebar}
          className="p-2 text-gray-600 hover:text-bear-navy hover:bg-gray-100 rounded-lg transition-colors duration-200"
          aria-label="Toggle sidebar"
        >
          <Bars3Icon className="w-5 h-5" />
        </button>
        
        <div className="hidden md:block text-sm text-gray-600">
          BEAR AI Legal Assistant
        </div>
      </div>

      {/* Center Section - Global Search */}
      <div className="flex-1 max-w-2xl mx-8">
        <GlobalSearch
          onSearch={onSearch}
          initialQuery={searchQuery}
          placeholder="Search documents, cases, statutes, or ask a question..."
        />
      </div>

      {/* Right Section - Actions & User */}
      <div className="flex items-center space-x-3">
        {/* Security Status */}
        <div className="hidden lg:flex items-center space-x-2 text-sm text-bear-green">
          <ShieldCheckIcon className="w-4 h-4" />
          <span>Secure</span>
        </div>

        {/* Notifications */}
        <div className="relative" ref={notificationRef}>
          <button
            onClick={handleNotificationToggle}
            className="relative p-2 text-gray-600 hover:text-bear-navy hover:bg-gray-100 rounded-lg transition-colors duration-200"
            aria-label="Notifications"
          >
            <BellIcon className="w-5 h-5" />
            {notifications.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-bear-red text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                {notifications.length}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 top-12 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">Notifications</h3>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="p-4 border-b border-gray-100 hover:bg-gray-50"
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`w-2 h-2 rounded-full mt-2 ${
                        notification.type === 'success' ? 'bg-bear-green' :
                        notification.type === 'warning' ? 'bg-yellow-500' :
                        'bg-blue-500'
                      }`} />
                      <div className="flex-1">
                        <p className="text-sm text-gray-900">{notification.text}</p>
                        <p className="text-xs text-gray-500 mt-1">{notification.time}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-2 border-t border-gray-200">
                <button className="w-full text-sm text-bear-navy hover:text-bear-green text-center py-2">
                  View all notifications
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Settings Quick Access */}
        <button
          className="p-2 text-gray-600 hover:text-bear-navy hover:bg-gray-100 rounded-lg transition-colors duration-200"
          aria-label="Settings"
        >
          <CogIcon className="w-5 h-5" />
        </button>

        {/* User Profile */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={handleUserMenuToggle}
            className="flex items-center space-x-2 p-2 text-gray-600 hover:text-bear-navy hover:bg-gray-100 rounded-lg transition-colors duration-200"
            aria-label="User menu"
          >
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <UserCircleIcon className="w-8 h-8" />
            )}
            {user && (
              <div className="hidden md:block text-left">
                <div className="text-sm font-medium text-gray-900">{user.name}</div>
                <div className="text-xs text-gray-500 capitalize">{user.role}</div>
              </div>
            )}
          </button>

          {/* User Menu Dropdown */}
          {showUserMenu && (
            <div className="absolute right-0 top-12 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
              <div className="p-4 border-b border-gray-200">
                {user && (
                  <div>
                    <div className="font-semibold text-gray-900">{user.name}</div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                    {user.firm && (
                      <div className="text-sm text-bear-navy mt-1">{user.firm}</div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="py-2">
                <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2">
                  <UserCircleIcon className="w-4 h-4" />
                  <span>Profile Settings</span>
                </button>
                <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2">
                  <CogIcon className="w-4 h-4" />
                  <span>Preferences</span>
                </button>
              </div>
              
              <div className="border-t border-gray-200 py-2">
                <button className="w-full px-4 py-2 text-left text-sm text-bear-red hover:bg-gray-50 flex items-center space-x-2">
                  <ArrowRightOnRectangleIcon className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};