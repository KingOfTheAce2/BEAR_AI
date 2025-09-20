import React from 'react';
import { cn } from '../../utils/cn';
import { useApp } from '../../contexts/AppContext';
import { useTheme } from '../../contexts/ThemeContext';

interface UnifiedSidebarProps {
  collapsed: boolean;
  activeView: string;
  onViewChange: (view: string) => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  badge?: string | number;
  section?: 'main' | 'secondary' | 'settings';
}

const navItems: NavItem[] = [
  // Main features (always visible)
  { id: 'chat', label: 'AI Chat', icon: ChatBubbleOvalLeftIcon, path: '/chat', section: 'main' },
  { id: 'documents', label: 'Documents', icon: DocumentIcon, path: '/documents', section: 'main' },
  { id: 'research', label: 'Research', icon: BookOpenIcon, path: '/research', section: 'main' },
  { id: 'search', label: 'Search', icon: MagnifyingGlassIcon, path: '/search', section: 'main' },
  { id: 'history', label: 'History', icon: ClockIcon, path: '/history', section: 'main' },
  
  // Secondary features
  { id: 'cases', label: 'Cases', icon: FolderIcon, path: '/cases', section: 'secondary' },
  { id: 'clients', label: 'Clients', icon: UsersIcon, path: '/clients', section: 'secondary' },
  { id: 'calendar', label: 'Calendar', icon: CalendarIcon, path: '/calendar', section: 'secondary' },
  { id: 'reports', label: 'Reports', icon: ChartBarIcon, path: '/reports', section: 'secondary' },
  
  // Settings
  { id: 'settings', label: 'Settings', icon: CogIcon, path: '/settings', section: 'settings' },
  { id: 'help', label: 'Help', icon: InformationCircleIcon, path: '/help', section: 'settings' }
];

export const UnifiedSidebar: React.FC<UnifiedSidebarProps> = ({
  collapsed,
  activeView,
  onViewChange
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state } = useApp();
  const { config } = useTheme();

  const handleNavClick = (item: NavItem) => {
    onViewChange(item.id);
    navigate(item.path);
  };

  const isActive = (item: NavItem) => {
    return location.pathname === item.path || 
           (location.pathname === '/' && item.path === '/chat');
  };

  const renderNavSection = (items: NavItem[], title?: string) => {
    if (items.length === 0) return null;

    return (
      <div className="space-y-1">
        {title && !collapsed && (
          <h3 className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
            {title}
          </h3>
        )}
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);
          
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item)}
              className={cn(
                'w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 group',
                active
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-text-secondary hover:bg-surface hover:text-text-primary',
                collapsed ? 'justify-center px-2' : 'justify-start'
              )}
              style={active ? { backgroundColor: `var(--color-primary)` } : {}}
              title={collapsed ? item.label : undefined}
            >
              <Icon 
                className={cn(
                  'flex-shrink-0 transition-colors',
                  collapsed ? 'w-6 h-6' : 'w-5 h-5 mr-3',
                  active ? 'text-white' : 'text-current'
                )} 
              />
              {!collapsed && (
                <>
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge && (
                    <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-accent text-white rounded-full">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </button>
          );
        })}
      </div>
    );
  };

  const mainItems = navItems.filter(item => item.section === 'main');
  const secondaryItems = navItems.filter(item => item.section === 'secondary');
  const settingsItems = navItems.filter(item => item.section === 'settings');

  return (
    <div className="flex flex-col h-full">
      {/* Logo/Brand */}
      <div className={cn(
        'flex items-center border-b border-border',
        collapsed ? 'justify-center h-16 px-2' : 'h-16 px-4'
      )}>
        <div className="flex items-center space-x-2">
          <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex-shrink-0">
            <ScaleIcon className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <h1 className="text-lg font-bold text-text-primary">BEAR AI</h1>
              <p className="text-xs text-text-muted">Legal Assistant</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-8 overflow-y-auto">
        {renderNavSection(mainItems)}
        {renderNavSection(secondaryItems, collapsed ? undefined : 'Management')}
      </nav>

      {/* User info and settings */}
      <div className="border-t border-border px-3 py-4 space-y-2">
        {renderNavSection(settingsItems)}
        
        {!collapsed && state.user && (
          <div className="mt-4 p-3 bg-surface rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-accent to-primary rounded-full flex items-center justify-center text-white text-sm font-semibold">
                {state.user.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">
                  {state.user.name}
                </p>
                <p className="text-xs text-text-muted truncate">
                  {state.user.role}
                </p>
              </div>
            </div>
            {state.user.firm && (
              <p className="mt-2 text-xs text-text-muted truncate">
                {state.user.firm}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};