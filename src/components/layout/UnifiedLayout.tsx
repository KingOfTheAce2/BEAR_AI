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
    <div className=\"flex h-screen bg-surface font-primary overflow-hidden\">\n      {/* Sidebar */}\n      <aside\n        className={cn(\n          'bg-surface border-r border-border shadow-lg transition-all duration-300 ease-in-out flex-shrink-0',\n          state.sidebarCollapsed ? 'w-16' : 'w-64'\n        )}\n        style={{\n          backgroundColor: `var(--color-surface)`,\n          borderColor: `var(--color-border)`\n        }}\n      >\n        <UnifiedSidebar\n          collapsed={state.sidebarCollapsed}\n          activeView={state.currentView}\n          onViewChange={setCurrentView}\n        />\n      </aside>\n\n      {/* Main Content Area */}\n      <div className=\"flex-1 flex flex-col min-w-0\">\n        {/* Top Bar */}\n        <header \n          className=\"h-16 bg-background border-b border-border shadow-sm flex-shrink-0\"\n          style={{\n            backgroundColor: `var(--color-background)`,\n            borderColor: `var(--color-border)`\n          }}\n        >\n          <UnifiedTopBar\n            user={state.user}\n            onToggleSidebar={toggleSidebar}\n            searchQuery={state.searchQuery}\n            sidebarCollapsed={state.sidebarCollapsed}\n          />\n        </header>\n\n        {/* Main Content */}\n        <main className=\"flex-1 overflow-hidden\">\n          <div className=\"h-full\">\n            <Routes>\n              <Route path=\"/\" element={<ChatInterface />} />\n              <Route path=\"/chat\" element={<ChatInterface />} />\n              <Route path=\"/documents\" element={<DocumentGrid />} />\n              <Route path=\"/research\" element={<ResearchPage />} />\n              <Route path=\"/history\" element={<HistoryPage />} />\n              <Route path=\"/search\" element={<SearchPage />} />\n              <Route path=\"/settings\" element={<SettingsPage />} />\n              {/* Placeholder routes for future pages */}\n              <Route path=\"/cases\" element={<div className=\"p-6\">Cases Page (Coming Soon)</div>} />\n              <Route path=\"/clients\" element={<div className=\"p-6\">Clients Page (Coming Soon)</div>} />\n              <Route path=\"/calendar\" element={<div className=\"p-6\">Calendar Page (Coming Soon)</div>} />\n              <Route path=\"/reports\" element={<div className=\"p-6\">Reports Page (Coming Soon)</div>} />\n              <Route path=\"/help\" element={<div className=\"p-6\">Help Page (Coming Soon)</div>} />\n            </Routes>\n          </div>\n        </main>\n\n        {/* Status Bar */}\n        <footer \n          className=\"h-8 bg-surface border-t border-border flex-shrink-0\"\n          style={{\n            backgroundColor: `var(--color-surface)`,\n            borderColor: `var(--color-border)`\n          }}\n        >\n          <UnifiedStatusBar systemStatus={state.systemStatus} />\n        </footer>\n      </div>\n    </div>\n  );\n};