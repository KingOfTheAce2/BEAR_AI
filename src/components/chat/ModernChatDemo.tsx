import React from 'react';
import { ChatContainer } from './modern';

/**
 * Demo component showcasing the modern chat interface
 * This is a standalone demo that can be used to test and showcase
 * all the chat features including:
 * 
 * - Threading and conversation branching
 * - Message reactions and editing
 * - File attachments with drag-and-drop
 * - Code syntax highlighting and execution
 * - Real-time collaboration features
 * - Message search and filtering
 * - Voice input/output
 * - Mobile-responsive design
 */
const ModernChatDemo: React.FC = () => {
  // Generate a demo user ID and username
  const userId = 'user-demo-' + Math.random().toString(36).substr(2, 9);
  const username = 'Demo User';

  return (
    <div style={{ height: '100vh', width: '100%' }}>
      <ChatContainer
        userId={userId}
        username={username}
        className="modern-chat-demo"
      />
    </div>
  );
};

export default ModernChatDemo;