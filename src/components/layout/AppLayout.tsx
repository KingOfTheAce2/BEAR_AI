import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { StatusBar } from './StatusBar';
import { ChatInterface } from '../chat/ChatInterface';
import { DocumentGrid } from '../documents/DocumentGrid';
import { AppState, User, SystemStatus } from '../../types';

interface AppLayoutProps {
  initialUser?: User;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ initialUser }) => {
  const [appState, setAppState] = useState<AppState>({
    user: initialUser || null,
    sidebarCollapsed: false,
    currentView: 'chat',
    systemStatus: {
      connection: 'online',
      security: 'secure',
      operations: { active: 0, queued: 0 },
      version: '1.0.0'
    },
    searchQuery: '',
    activeChat: null
  });

  const toggleSidebar = () => {
    setAppState(prev => ({
      ...prev,
      sidebarCollapsed: !prev.sidebarCollapsed
    }));
  };

  const handleViewChange = (view: string) => {
    setAppState(prev => ({
      ...prev,
      currentView: view
    }));
  };

  const handleSearch = (query: string) => {
    setAppState(prev => ({
      ...prev,
      searchQuery: query
    }));
  };

  const renderMainContent = () => {
    switch (appState.currentView) {
      case 'chat':
        return <ChatInterface activeChat={appState.activeChat} />;
      case 'documents':
        return <DocumentGrid searchQuery={appState.searchQuery} />;
      case 'research':
        return <div className="p-6">Research Module - Coming Soon</div>;
      case 'history':
        return <div className="p-6">History Module - Coming Soon</div>;
      case 'settings':
        return <div className="p-6">Settings Module - Coming Soon</div>;
      default:
        return <ChatInterface activeChat={appState.activeChat} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 font-inter">
      {/* Sidebar */}
      <aside
        className={`${
          appState.sidebarCollapsed ? 'w-16' : 'w-64'
        } transition-all duration-300 ease-in-out bg-bear-navy shadow-lg border-r border-gray-200`}
      >
        <Sidebar
          collapsed={appState.sidebarCollapsed}
          activeView={appState.currentView}
          onViewChange={handleViewChange}
        />
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="h-16 bg-white border-b border-gray-200 shadow-sm">
          <TopBar
            user={appState.user}
            onToggleSidebar={toggleSidebar}
            onSearch={handleSearch}
            searchQuery={appState.searchQuery}
          />
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="h-full p-6 space-y-6">
            {renderMainContent()}
          </div>
        </main>

        {/* Status Bar */}
        <footer className="h-8 bg-gray-100 border-t border-gray-200">
          <StatusBar systemStatus={appState.systemStatus} />
        </footer>
      </div>
    </div>
  );
};