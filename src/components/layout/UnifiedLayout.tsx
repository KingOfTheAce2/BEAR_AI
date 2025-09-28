import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { ChatInterface } from '../chat/ChatInterface';
import { cn } from '../../utils/cn';
import { DocumentGrid } from '../documents/DocumentGrid';
import { HistoryPage } from '../pages/HistoryPage';
import { ResearchPage } from '../pages/ResearchPage';
import { SearchPage } from '../pages/SearchPage';
import { SettingsPage } from '../pages/SettingsPage';
import { UnifiedSidebar } from './UnifiedSidebar';
import { UnifiedStatusBar } from './UnifiedStatusBar';
import { UnifiedTopBar } from './UnifiedTopBar';
import { useApp } from '../../contexts/AppContext';
import { useTheme } from '../../contexts/ThemeContext';

export const UnifiedLayout: React.FC = () => {

  const { state, toggleSidebar, setCurrentView } = useApp();
  const { config } = useTheme();

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--apple-background-primary)' }}>
      {/* Sidebar */}
      <aside
        className={cn(
          'glass-regular border-r transition-all duration-300 ease-in-out flex-shrink-0',
          state.sidebarCollapsed ? 'w-16' : 'w-64'
        )}
        style={{
          borderColor: 'var(--apple-separator)'
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
          className="h-16 border-b flex-shrink-0 glass-ultra-thin"
          style={{
            borderColor: 'var(--apple-separator)'
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
              <Route path="/" element={<ChatInterface activeChat={state.activeChat} />} />
              <Route path="/chat" element={<ChatInterface activeChat={state.activeChat} />} />
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
          className="h-8 border-t flex-shrink-0 glass-ultra-thin"
          style={{
            borderColor: 'var(--apple-separator)'
          }}
        >
          <UnifiedStatusBar systemStatus={state.systemStatus} />
        </footer>
      </div>
    </div>
  );
};