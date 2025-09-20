import React from 'react';
import {
import { NavigationItem } from '../../types';

  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  ClockIcon,
  CogIcon,
  HomeIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon
} from '@heroicons/react/24/outline';

interface SidebarProps {
  collapsed: boolean;
  activeView: string;
  onViewChange: (view: string) => void;
}

const navigationItems: NavigationItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'HomeIcon',
    path: '/dashboard'
  },
  {
    id: 'chat',
    label: 'Chat / Conversation',
    icon: 'ChatBubbleLeftRightIcon',
    path: '/chat',
    badge: 3
  },
  {
    id: 'documents',
    label: 'Documents',
    icon: 'DocumentTextIcon',
    path: '/documents',
    badge: '12'
  },
  {
    id: 'research',
    label: 'Research',
    icon: 'MagnifyingGlassIcon',
    path: '/research'
  },
  {
    id: 'history',
    label: 'History',
    icon: 'ClockIcon',
    path: '/history'
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: 'CogIcon',
    path: '/settings'
  }
];

const getIconComponent = (iconName: string) => {
  const iconMap = {
    HomeIcon,
    ChatBubbleLeftRightIcon,
    DocumentTextIcon,
    MagnifyingGlassIcon,
    ClockIcon,
    CogIcon
  };
  
  return iconMap[iconName as keyof typeof iconMap] || HomeIcon;
};

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  activeView,
  onViewChange
}) => {
  return (
    <div className="h-full flex flex-col">
      {/* Logo/Brand Area */}
      <div className="h-16 flex items-center justify-center px-4 border-b border-bear-navy-light">
        {!collapsed ? (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-bear-green rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">B</span>
            </div>
            <span className="text-white font-semibold text-lg">BEAR AI</span>
          </div>
        ) : (
          <div className="w-8 h-8 bg-bear-green rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">B</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-2 overflow-y-auto">
        {navigationItems.map((item) => {
          const IconComponent = getIconComponent(item.icon);
          const isActive = activeView === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`
                w-full flex items-center px-3 py-3 text-sm font-medium rounded-lg
                transition-all duration-200 ease-in-out
                ${
                  isActive
                    ? 'bg-bear-green text-white shadow-md'
                    : 'text-gray-300 hover:bg-bear-navy-light hover:text-white'
                }
                ${collapsed ? 'justify-center' : 'justify-start'}
              `}
              title={collapsed ? item.label : ''}
            >
              <IconComponent className="w-5 h-5 flex-shrink-0" />
              
              {!collapsed && (
                <>
                  <span className="ml-3 truncate">{item.label}</span>
                  {item.badge && (
                    <span className="ml-auto bg-bear-red text-white text-xs px-2 py-1 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
              
              {collapsed && item.badge && (
                <span className="absolute left-8 top-2 bg-bear-red text-white text-xs w-4 h-4 rounded-full flex items-center justify-center text-[10px]">
                  {typeof item.badge === 'number' && item.badge > 9 ? '9+' : item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Professional Footer */}
      <div className="p-3 border-t border-bear-navy-light">
        {!collapsed ? (
          <div className="text-xs text-gray-400 text-center">
            <div>Legal AI Assistant</div>
            <div className="text-bear-green">Professional Edition</div>
          </div>
        ) : (
          <div className="w-2 h-2 bg-bear-green rounded-full mx-auto"></div>
        )}
      </div>
    </div>
  );
};