import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import { useTheme } from '../../contexts/ThemeContext';
import { UnifiedSidebar } from './UnifiedSidebar';
import { UnifiedTopBar } from './UnifiedTopBar';
import { UnifiedStatusBar } from './UnifiedStatusBar';
import { ChatInterface } from '../chat/ChatInterface';
import { DocumentGrid } from '../documents/DocumentGrid';
import { SettingsPage } from '../pages/SettingsPage';
import { SearchPage } from '../pages/SearchPage';
import { HistoryPage } from '../pages/HistoryPage';
import { ResearchPage } from '../pages/ResearchPage';
import { cn } from '../../utils/cn';

export const UnifiedLayout: React.FC = () => {
  const { state, toggleSidebar, setCurrentView } = useApp();
  const { config } = useTheme();

  return (
    <div className="flex h-screen bg-surface font-primary overflow-hidden">
      {/* Sidebar */}
      <aside
        className={cn(
          'bg-surface border-r border-border shadow-lg transition-all duration-300 ease-in-out flex-shrink-0',
          state.sidebarCollapsed ? 'w-16' : 'w-64'
        )}
        style={{
          backgroundColor: `var(--color-surface)`,
          borderColor: `var(--color-border)`
        }}
      >
        <UnifiedSidebar
          collapsed={state.sidebarCollapsed}
          activeView={state.currentView}
          onViewChange={setCurrentView}
        />
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header 
          className="h-16 bg-background border-b border-border shadow-sm flex-shrink-0"
          style={{
            backgroundColor: `var(--color-background)`,
            borderColor: `var(--color-border)`
          }}
        >
          <UnifiedTopBar
            user={state.user}
            onToggleSidebar={toggleSidebar}
            searchQuery={state.searchQuery}
            sidebarCollapsed={state.sidebarCollapsed}
          />
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-hidden">
          <div className="h-full">
            <Routes>
              <Route path="/" element={<ChatInterface />} />
              <Route path="/chat" element={<ChatInterface />} />
              <Route path="/documents" element={<DocumentGrid />} />
              <Route path="/research" element={<ResearchPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              {/* Placeholder routes for future pages */}
              <Route path="/cases" element={<div className="p-6">Cases Page (Coming Soon)</div>} />
              <Route path="/clients" element={<div className="p-6">Clients Page (Coming Soon)</div>} />
              <Route path="/calendar" element={<div className="p-6">Calendar Page (Coming Soon)</div>} />
              <Route path="/reports" element={<div className="p-6">Reports Page (Coming Soon)</div>} />
              <Route path="/help" element={<div className="p-6">Help Page (Coming Soon)</div>} />
            </Routes>
          </div>
        </main>

        {/* Status Bar */}
        <footer 
          className="h-8 bg-surface border-t border-border flex-shrink-0"
          style={{
            backgroundColor: `var(--color-surface)`,
            borderColor: `var(--color-border)`
          }}
        >
          <UnifiedStatusBar systemStatus={state.systemStatus} />
        </footer>
      </div>
    </div>
  );
};