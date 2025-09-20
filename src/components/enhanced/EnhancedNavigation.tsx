/**
 * Enhanced Navigation System
 * 
 * Apple-grade navigation with spatial awareness, context sensitivity, and
 * smooth transitions. Provides intuitive wayfinding and adaptive layouts
 * that respond to user behavior and content context.
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { cn } from '../../utils/cn';
import { AnimationUtils, MicroInteractions, useAnimation } from '../../design/animation-system';
export interface NavigationItem {
  id: string;
  label: string;
  icon: React.FC<{ className?: string }>;
  path: string;
  badge?: string | number;
  section?: 'primary' | 'secondary' | 'utility';
  contextualActions?: string[];
  quickActions?: Array<{
    id: string;
    label: string;
    icon: React.FC<{ className?: string }>;
    action: () => void;
  }>;
  metadata?: {
    lastAccessed?: Date;
    frequency?: number;
    importance?: 'high' | 'medium' | 'low';
  };
}

export interface SpatialBreadcrumb {
  label: string;
  path: string;
  depth: number;
  icon?: React.FC<{ className?: string }>;
  context?: string;
}

export interface EnhancedNavigationProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  activeView: string;
  onViewChange: (view: string) => void;
  adaptiveWidth?: boolean;
  contextAware?: boolean;
  spatialMemory?: boolean;
  className?: string;
}

// Navigation configuration with enhanced metadata
const navigationItems: NavigationItem[] = [
  // Primary features - most frequently used
  {
    id: 'chat',
    label: 'AI Assistant',
    icon: ChatBubbleOvalLeftIcon,
    path: '/chat',
    section: 'primary',
    contextualActions: ['New Chat', 'Export History', 'Settings'],
    quickActions: [
      { id: 'new-chat', label: 'New Chat', icon: ChatBubbleOvalLeftIcon, action: () => console.log('New chat') },
      { id: 'templates', label: 'Templates', icon: DocumentIcon, action: () => console.log('Templates') }
    ],
    metadata: { importance: 'high', frequency: 10 }
  },
  {
    id: 'documents',
    label: 'Documents',
    icon: DocumentIcon,
    path: '/documents',
    section: 'primary',
    badge: '12',
    contextualActions: ['Upload', 'Organize', 'Search'],
    quickActions: [
      { id: 'upload', label: 'Upload', icon: DocumentIcon, action: () => console.log('Upload') },
      { id: 'scan', label: 'Scan', icon: MagnifyingGlassIcon, action: () => console.log('Scan') }
    ],
    metadata: { importance: 'high', frequency: 8 }
  },
  {
    id: 'research',
    label: 'Legal Research',
    icon: BookOpenIcon,
    path: '/research',
    section: 'primary',
    contextualActions: ['New Research', 'Saved Queries', 'Citations'],
    metadata: { importance: 'high', frequency: 6 }
  },
  {
    id: 'search',
    label: 'Search',
    icon: MagnifyingGlassIcon,
    path: '/search',
    section: 'primary',
    contextualActions: ['Advanced Search', 'Filters', 'History'],
    metadata: { importance: 'medium', frequency: 7 }
  },
  
  // Secondary features - workflow management
  {
    id: 'cases',
    label: 'Case Management',
    icon: FolderIcon,
    path: '/cases',
    section: 'secondary',
    badge: '5',
    contextualActions: ['New Case', 'Calendar', 'Reports'],
    metadata: { importance: 'medium', frequency: 4 }
  },
  {
    id: 'clients',
    label: 'Client Portal',
    icon: UsersIcon,
    path: '/clients',
    section: 'secondary',
    contextualActions: ['Add Client', 'Communications', 'Billing'],
    metadata: { importance: 'medium', frequency: 3 }
  },
  {
    id: 'calendar',
    label: 'Calendar',
    icon: CalendarIcon,
    path: '/calendar',
    section: 'secondary',
    contextualActions: ['New Event', 'Deadlines', 'Sync'],
    metadata: { importance: 'medium', frequency: 5 }
  },
  {
    id: 'reports',
    label: 'Analytics',
    icon: ChartBarIcon,
    path: '/reports',
    section: 'secondary',
    contextualActions: ['Generate Report', 'Export', 'Schedule'],
    metadata: { importance: 'low', frequency: 2 }
  },
  
  // Utility features
  {
    id: 'history',
    label: 'Activity History',
    icon: ClockIcon,
    path: '/history',
    section: 'utility',
    contextualActions: ['Clear History', 'Export', 'Filter'],
    metadata: { importance: 'low', frequency: 1 }
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: CogIcon,
    path: '/settings',
    section: 'utility',
    contextualActions: ['Preferences', 'Account', 'Help'],
    metadata: { importance: 'low', frequency: 1 }
  },
  {
    id: 'help',
    label: 'Help & Support',
    icon: InformationCircleIcon,
    path: '/help',
    section: 'utility',
    contextualActions: ['Documentation', 'Contact', 'Tutorials'],
    metadata: { importance: 'low', frequency: 1 }
  }
];

export const EnhancedNavigation: React.FC<EnhancedNavigationProps> = ({
  collapsed,
  onToggleCollapse,
  activeView,
  onViewChange,
  adaptiveWidth = true,
  contextAware = true,
  spatialMemory = true,
  className
}) => {
  const navigate = useNavigate();
  const location = { pathname: window.location.pathname };
  const navigationRef = useRef<HTMLElement>(null);
  
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [contextualActionsVisible, setContextualActionsVisible] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<SpatialBreadcrumb[]>([]);
  const [adaptedWidth, setAdaptedWidth] = useState<number>(280);
  const [userPreferences, setUserPreferences] = useState<Record<string, any>>({});
  
  const { transitionTo } = useAnimation(navigationRef);
  
  // Generate spatial breadcrumbs based on current location
  const generateBreadcrumbs = useCallback((pathname: string): SpatialBreadcrumb[] => {
    const paths = pathname.split('/').filter(Boolean);
    const breadcrumbs: SpatialBreadcrumb[] = [
      { label: 'Home', path: '/', depth: 0, icon: HomeIcon }
    ];
    
    let currentPath = '';
    paths.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const item = navigationItems.find(item => item.path === currentPath);
      
      if (item) {
        breadcrumbs.push({
          label: item.label,
          path: currentPath,
          depth: index + 1,
          icon: item.icon,
          context: item.section
        });
      }
    });
    
    return breadcrumbs;
  }, []);
  
  // Update breadcrumbs when location changes
  useEffect(() => {
    if (spatialMemory) {
      setBreadcrumbs(generateBreadcrumbs(location.pathname));
    }
  }, [location.pathname, spatialMemory, generateBreadcrumbs]);
  
  // Adaptive width calculation based on content and context
  const calculateAdaptiveWidth = useCallback(() => {
    if (!adaptiveWidth) return;
    
    const baseWidth = 280;
    const contextualWidth = contextualActionsVisible ? 320 : baseWidth;
    const screenWidth = window.innerWidth;
    const maxWidth = Math.min(contextualWidth, screenWidth * 0.3);
    
    setAdaptedWidth(maxWidth);
  }, [adaptiveWidth, contextualActionsVisible]);
  
  useEffect(() => {
    calculateAdaptiveWidth();
    const handleResize = () => calculateAdaptiveWidth();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [calculateAdaptiveWidth]);
  
  // Sort navigation items by importance and frequency
  const sortedNavigationItems = useMemo(() => {
    if (!contextAware) return navigationItems;
    
    return [...navigationItems].sort((a, b) => {
      const aScore = (a.metadata?.frequency || 0) * 
        (a.metadata?.importance === 'high' ? 3 : a.metadata?.importance === 'medium' ? 2 : 1);
      const bScore = (b.metadata?.frequency || 0) * 
        (b.metadata?.importance === 'high' ? 3 : b.metadata?.importance === 'medium' ? 2 : 1);
      
      return bScore - aScore;
    });
  }, [contextAware]);
  
  // Handle navigation with spatial awareness
  const handleNavigation = useCallback((item: NavigationItem) => {
    // Update user preferences and frequency
    if (contextAware) {
      setUserPreferences(prev => ({
        ...prev,
        [item.id]: {
          ...prev[item.id],
          lastAccessed: new Date(),
          accessCount: (prev[item.id]?.accessCount || 0) + 1
        }
      }));
    }
    
    // Animate navigation transition
    transitionTo?.('navigate', MicroInteractions.navigation.itemActive);
    
    onViewChange(item.id);
    navigate(item.path);
  }, [contextAware, transitionTo, onViewChange, navigate]);
  
  // Handle item hover with micro-interactions
  const handleItemHover = useCallback((itemId: string | null) => {
    setHoveredItem(itemId);
    
    if (itemId && !collapsed) {
      const element = document.querySelector(`[data-nav-item="${itemId}"]`);
      if (element) {
        const animation = new (AnimationUtils as any).AnimationStateMachine(element);
        animation.transitionTo('hover', MicroInteractions.navigation.itemHover);
      }
    }
  }, [collapsed]);
  
  // Toggle contextual actions
  const toggleContextualActions = useCallback((itemId: string) => {
    setContextualActionsVisible(prev => prev === itemId ? null : itemId);
  }, []);
  
  // Check if item is active
  const isItemActive = useCallback((item: NavigationItem) => {
    return location.pathname === item.path || 
           (location.pathname === '/' && item.path === '/chat');
  }, [location.pathname]);
  
  // Group items by section
  const groupedItems = useMemo(() => {
    const grouped = sortedNavigationItems.reduce((acc, item) => {
      const section = item.section || 'primary';
      if (!acc[section]) acc[section] = [];
      acc[section].push(item);
      return acc;
    }, {} as Record<string, NavigationItem[]>);
    
    return grouped;
  }, [sortedNavigationItems]);
  
  // Render navigation section
  const renderNavigationSection = (items: NavigationItem[], title?: string) => {
    if (!items.length) return null;
    
    return (
      <div className="space-y-1">
        {title && !collapsed && (
          <h3 className="px-3 py-2 text-label-small text-text-tertiary font-semibold uppercase tracking-wider">
            {title}
          </h3>
        )}
        
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = isItemActive(item);
          const isHovered = hoveredItem === item.id;
          const hasContextualActions = item.contextualActions && item.contextualActions.length > 0;
          
          return (
            <div key={item.id} className="relative">
              <button
                data-nav-item={item.id}
                onClick={() => handleNavigation(item)}
                onMouseEnter={() => handleItemHover(item.id)}
                onMouseLeave={() => handleItemHover(null)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  if (hasContextualActions) {
                    toggleContextualActions(item.id);
                  }
                }}
                className={cn(
                  'nav-item w-full flex items-center px-3 py-2.5 text-label-large font-medium rounded-lg',
                  'transition-all duration-200 ease-out group relative overflow-hidden',
                  'hover:bg-surface-level-1 hover:text-text-primary hover:translate-x-1',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
                  collapsed ? 'justify-center px-2' : 'justify-start',
                  isActive && 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-sm',
                  isActive && 'hover:from-primary-600 hover:to-primary-700 hover:translate-x-0',
                  !isActive && 'text-text-secondary',
                  isHovered && !isActive && 'bg-surface-level-1 text-text-primary transform translate-x-1'
                )}
                title={collapsed ? item.label : undefined}
                aria-current={isActive ? 'page' : undefined}
                aria-expanded={contextualActionsVisible === item.id}
              >
                {/* Ripple effect container */}
                <span className="absolute inset-0 overflow-hidden rounded-lg pointer-events-none" />
                
                {/* Icon */}
                <Icon
                  className={cn(
                    'flex-shrink-0 transition-colors duration-200',
                    collapsed ? 'w-6 h-6' : 'w-5 h-5 mr-3',
                    isActive ? 'text-white' : 'text-current'
                  )}
                />
                
                {/* Label and badge */}
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left truncate">
                      {item.label}
                    </span>
                    
                    {item.badge && (
                      <span className={cn(
                        'ml-2 px-2 py-0.5 text-label-small font-semibold rounded-full',
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-accent-500 text-white'
                      )}>
                        {item.badge}
                      </span>
                    )}
                    
                    {hasContextualActions && (
                      <ChevronRightIcon
                        className={cn(
                          'ml-1 w-4 h-4 transition-transform duration-200',
                          contextualActionsVisible === item.id && 'rotate-90'
                        )}
                      />
                    )}
                  </>
                )}
                
                {/* Active indicator */}
                {isActive && (
                  <span
                    className="absolute left-0 top-1/2 w-1 h-6 bg-white rounded-r-full transform -translate-y-1/2"
                    aria-hidden="true"
                  />
                )}
              </button>
              
              {/* Contextual actions */}
              {contextualActionsVisible === item.id && !collapsed && item.contextualActions && (
                <div className="ml-8 mt-1 space-y-1 animate-slide-down">
                  {item.contextualActions.map((action) => (
                    <button
                      key={action}
                      className="block w-full text-left px-3 py-1.5 text-label-medium text-text-tertiary 
                                 hover:text-text-secondary hover:bg-surface-level-1 rounded-md 
                                 transition-colors duration-150"
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log(`Contextual action: ${action}`);
                      }}
                    >
                      {action}
                    </button>
                  ))}
                </div>
              )}
              
              {/* Quick actions tooltip for collapsed state */}
              {collapsed && isHovered && item.quickActions && (
                <div className="absolute left-full ml-2 top-0 z-50 animate-scale-in">
                  <div className="bg-surface-level-3 border border-border-medium rounded-lg shadow-lg p-2 min-w-48">
                    <div className="text-label-medium font-semibold text-text-primary mb-2">
                      {item.label}
                    </div>
                    <div className="space-y-1">
                      {item.quickActions.map((quickAction) => {
                        const QuickIcon = quickAction.icon;
                        return (
                          <button
                            key={quickAction.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              quickAction.action();
                            }}
                            className="flex items-center w-full px-2 py-1.5 text-label-medium text-text-secondary
                                       hover:text-text-primary hover:bg-surface-level-1 rounded-md 
                                       transition-colors duration-150"
                          >
                            <QuickIcon className="w-4 h-4 mr-2" />
                            {quickAction.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };
  
  return (
    <nav
      ref={navigationRef}
      className={cn(
        'flex flex-col h-full bg-surface-level-0 border-r border-border-subtle shadow-sm',
        'transition-all duration-300 ease-apple transform-gpu',
        collapsed ? 'w-16' : `w-[${adaptedWidth}px]`,
        className
      )}
      style={{ width: collapsed ? 64 : adaptedWidth }}
      aria-label="Main navigation"
    >
      {/* Header */}
      <div className={cn(
        'flex items-center border-b border-border-subtle bg-surface-background',
        collapsed ? 'justify-center h-16 px-2' : 'h-16 px-4 justify-between'
      )}>
        {/* Logo */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-primary-500 to-accent-500 rounded-lg flex-shrink-0">
            <ScaleIcon className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <h1 className="text-title-large font-semibold text-text-primary">
                BEAR AI
              </h1>
              <p className="text-label-small text-text-tertiary">
                Legal Assistant
              </p>
            </div>
          )}
        </div>
        
        {/* Collapse toggle */}
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg hover:bg-surface-level-1 transition-colors duration-150
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
        >
          {collapsed ? (
            <ChevronRightIcon className="w-5 h-5 text-text-secondary" />
          ) : (
            <ChevronLeftIcon className="w-5 h-5 text-text-secondary" />
          )}
        </button>
      </div>
      
      {/* Breadcrumbs */}
      {!collapsed && spatialMemory && breadcrumbs.length > 1 && (
        <div className="px-3 py-2 border-b border-border-subtle bg-surface-level-0">
          <div className="flex items-center space-x-1 text-label-small text-text-tertiary overflow-x-auto scrollbar-thin">
            {breadcrumbs.map((crumb, index) => {
              const CrumbIcon = crumb.icon;
              return (
                <div key={crumb.path}>
                  {index > 0 && (
                    <ChevronRightIcon className="w-3 h-3 flex-shrink-0" />
                  )}
                  <button
                    onClick={() => navigate(crumb.path)}
                    className="flex items-center space-x-1 hover:text-text-secondary transition-colors duration-150 flex-shrink-0"
                  >
                    {CrumbIcon && <CrumbIcon className="w-3 h-3" />}
                    <span className="truncate max-w-24">{crumb.label}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Navigation Items */}
      <div className="flex-1 px-3 py-4 space-y-6 overflow-y-auto scrollbar-thin">
        {renderNavigationSection(groupedItems.primary || [])}
        {renderNavigationSection(groupedItems.secondary || [], collapsed ? undefined : 'Workflow')}
        {renderNavigationSection(groupedItems.utility || [], collapsed ? undefined : 'Tools')}
      </div>
      
      {/* Footer with notifications and user info */}
      <div className="border-t border-border-subtle px-3 py-3 space-y-2">
        {/* Notifications */}
        <button
          className="w-full flex items-center px-2 py-2 text-label-large text-text-secondary
                     hover:text-text-primary hover:bg-surface-level-1 rounded-lg 
                     transition-colors duration-150"
        >
          <BellIcon className={cn('w-5 h-5', collapsed ? '' : 'mr-3')} />
          {!collapsed && (
            <>
              <span className="flex-1 text-left">Notifications</span>
              <span className="ml-2 px-2 py-0.5 text-label-small font-semibold bg-accent-500 text-white rounded-full">
                3
              </span>
            </>
          )}
        </button>
        
        {/* User info placeholder */}
        {!collapsed && (
          <div className="p-3 bg-surface-level-1 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-accent-500 to-primary-500 rounded-full flex items-center justify-center text-white text-label-large font-semibold">
                U
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-label-large font-medium text-text-primary truncate">
                  Legal Professional
                </p>
                <p className="text-label-small text-text-tertiary truncate">
                  Online
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default EnhancedNavigation;