import React, { useState, useEffect, useRef } from 'react';
import { Message, Thread, User, TypingIndicator } from '../../../types/chat';
import { useChat } from '../../../hooks/chat/useChat';
import ThreadSidebar from './ThreadSidebar';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import SearchPanel from './SearchPanel';
import VoiceControls from './VoiceControls';
import FileUpload from './FileUpload';
import TypingIndicatorComponent from './TypingIndicator';
import './ChatContainer.css';

interface ChatContainerProps {
  userId: string;
  username: string;
  className?: string;
}

const ChatContainer: React.FC<ChatContainerProps> = ({ userId, username, className = '' }) => {
  const [showSearch, setShowSearch] = useState(false);
  const [showVoiceControls, setShowVoiceControls] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const messageListRef = useRef<HTMLDivElement>(null);

  const {
    threads,
    currentThread,
    messages,
    users,
    typingIndicators,
    isLoading,
    settings,
    searchResults,
    isSearching,
    switchThread,
    createThread,
    sendMessage,
    editMessage,
    addReaction,
    removeReaction,
    searchMessages,
    startTyping,
    stopTyping,
    startVoiceInput,
    stopVoiceInput,
    speakMessage,
    exportChat,
    importChat
  } = useChat({ userId, username });

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setSidebarCollapsed(true);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [messages]);

  // Touch gestures for mobile
  useEffect(() => {
    if (!isMobile || !chatContainerRef.current) return;

    let startX = 0;
    let startY = 0;
    const threshold = 50;

    const handleTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const diffX = endX - startX;
      const diffY = endY - startY;

      // Swipe right to open sidebar
      if (diffX > threshold && Math.abs(diffY) < threshold && startX < 50) {
        setSidebarCollapsed(false);
      }
      // Swipe left to close sidebar
      else if (diffX < -threshold && Math.abs(diffY) < threshold && !sidebarCollapsed) {
        setSidebarCollapsed(true);
      }
    };

    const container = chatContainerRef.current;
    container.addEventListener('touchstart', handleTouchStart);
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isMobile, sidebarCollapsed]);

  const handleSendMessage = async (content: string, type: Message['type'] = 'text', attachments: any[] = []) => {
    await sendMessage(content, type, attachments);
    stopTyping();
  };

  const handleThreadSelect = async (threadId: string) => {
    await switchThread(threadId);
    if (isMobile) {
      setSidebarCollapsed(true);
    }
  };

  const handleNewThread = async () => {
    const title = `Thread ${threads.length + 1}`;
    await createThread(title);
    if (isMobile) {
      setSidebarCollapsed(true);
    }
  };

  const handleSearch = async (query: string, filters?: any) => {
    await searchMessages(query, filters);
    setShowSearch(true);
  };

  const handleVoiceToggle = () => {
    setShowVoiceControls(!showVoiceControls);
  };

  const handleFileUpload = (files: FileList) => {
    Array.from(files).forEach(file => {
      const attachment = {
        id: Date.now().toString(),
        name: file.name,
        type: file.type.startsWith('image/') ? 'image' as const : 'file' as const,
        size: file.size,
        url: URL.createObjectURL(file),
        mimeType: file.type
      };
      
      sendMessage(`Uploaded file: ${file.name}`, 'file', [attachment]);
    });
  };

  const handleExport = async () => {
    await exportChat('json', currentThread ? [currentThread.id] : undefined);
  };

  if (isLoading) {
    return (
      <div className="chat-loading">
        <div className="loading-spinner"></div>
        <p>Loading chat...</p>
      </div>
    );
  }

  return (
    <div 
      ref={chatContainerRef}
      className={`chat-container ${className} ${isMobile ? 'mobile' : 'desktop'} ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}
    >
      {/* Sidebar */}
      <div className={`chat-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <ThreadSidebar
          threads={threads}
          currentThread={currentThread}
          users={users}
          onThreadSelect={handleThreadSelect}
          onNewThread={handleNewThread}
          onSearch={handleSearch}
          onExport={handleExport}
          isMobile={isMobile}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* Main Chat Area */}
      <div className="chat-main">
        {/* Header */}
        <div className="chat-header">
          {isMobile && (
            <button 
              className="sidebar-toggle"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            >
              ☰
            </button>
          )}
          
          <div className="chat-header-info">
            <h2>{currentThread?.title || 'Select a thread'}</h2>
            {currentThread && (
              <span className="participant-count">
                {currentThread.participants.length} participants
              </span>
            )}
          </div>

          <div className="chat-header-actions">
            <button 
              className={`voice-toggle ${showVoiceControls ? 'active' : ''}`}
              onClick={handleVoiceToggle}
              title="Voice controls"
            >
              🎤
            </button>
            
            <button 
              className={`search-toggle ${showSearch ? 'active' : ''}`}
              onClick={() => setShowSearch(!showSearch)}
              title="Search messages"
            >
              🔍
            </button>
            
            <FileUpload onFileUpload={handleFileUpload}>
              <button className="file-upload-trigger" title="Upload files">
                📎
              </button>
            </FileUpload>
          </div>
        </div>

        {/* Search Panel */}
        {showSearch && (
          <SearchPanel
            searchResults={searchResults}
            isSearching={isSearching}
            onSearch={handleSearch}
            onClose={() => setShowSearch(false)}
            onMessageClick={(messageId) => {
              // Scroll to message
              const messageElement = document.getElementById(`message-${messageId}`);
              messageElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }}
          />
        )}

        {/* Voice Controls */}
        {showVoiceControls && (
          <VoiceControls
            onStartListening={startVoiceInput}
            onStopListening={stopVoiceInput}
            onSpeak={(text) => speakMessage({ content: text } as Message)}
            isListening={false} // This would come from voice service state
            onClose={() => setShowVoiceControls(false)}
          />
        )}

        {/* Messages */}
        <div ref={messageListRef} className="chat-messages">
          {currentThread ? (
            <>
              <MessageList
                messages={messages}
                currentUserId={userId}
                onReaction={addReaction}
                onRemoveReaction={removeReaction}
                onEdit={editMessage}
                onSpeak={speakMessage}
                isMobile={isMobile}
              />
              
              {/* Typing Indicators */}
              {typingIndicators.length > 0 && (
                <TypingIndicatorComponent
                  indicators={typingIndicators}
                  currentUserId={userId}
                />
              )}
            </>
          ) : (
            <div className="no-thread-selected">
              <p>Select a thread to start chatting</p>
              <button onClick={handleNewThread} className="create-thread-btn">
                Create New Thread
              </button>
            </div>
          )}
        </div>

        {/* Message Input */}
        {currentThread && (
          <MessageInput
            onSendMessage={handleSendMessage}
            onTyping={startTyping}
            onStopTyping={stopTyping}
            placeholder="Type a message..."
            isMobile={isMobile}
            disabled={!currentThread}
          />
        )}
      </div>

      {/* Mobile overlay when sidebar is open */}
      {isMobile && !sidebarCollapsed && (
        <div 
          className="mobile-overlay"
          onClick={() => setSidebarCollapsed(true)}
        />
      )}
    </div>
  );
};

export default ChatContainer;