import { PaperAirplaneIcon } from '@heroicons/react/24/outline';
import React, { useState, useRef, useEffect } from 'react';
import { ChatInput } from './ChatInput';
import { ChatSession, Message } from '../../types';
import { MessageBubble } from './MessageBubble';
import { QuickActions } from './QuickActions';

interface ChatInterfaceProps {
  activeChat: ChatSession | null;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ activeChat }) => {
  const [messages, setMessages] = useState<Message[]>(activeChat?.messages || []);
  const [isTyping, setIsTyping] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Mock messages for demonstration
  const mockMessages: Message[] = [
    {
      id: '1',
      content: 'Hello! I\'m BEAR AI, your legal assistant. How can I help you today?',
      sender: 'ai',
      timestamp: new Date(Date.now() - 300000),
      status: 'delivered',
      type: 'text'
    },
    {
      id: '2',
      content: 'I need help analyzing a contract for potential liability issues.',
      sender: 'user',
      timestamp: new Date(Date.now() - 240000),
      status: 'delivered',
      type: 'text'
    },
    {
      id: '3',
      content: 'I\'d be happy to help you analyze the contract for liability issues. Please upload the contract document, and I\'ll review it for:\n\n• Indemnification clauses\n• Limitation of liability provisions\n• Force majeure conditions\n• Termination penalties\n• Insurance requirements\n\nYou can drag and drop the file here or use the upload button.',
      sender: 'ai',
      timestamp: new Date(Date.now() - 180000),
      status: 'delivered',
      type: 'text',
      metadata: {
        confidence: 0.95
      }
    }
  ];

  useEffect(() => {
    if (messages.length === 0) {
      setMessages(mockMessages);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      sender: 'user',
      timestamp: new Date(),
      status: 'sending',
      type: 'text'
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Update message status to sent
    setTimeout(() => {
      setMessages(prev => 
        prev.map(msg => 
          msg.id === userMessage.id 
            ? { ...msg, status: 'sent' as const }
            : msg
        )
      );
    }, 500);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: generateMockAIResponse(content),
        sender: 'ai',
        timestamp: new Date(),
        status: 'delivered',
        type: 'text',
        metadata: {
          confidence: Math.random() * 0.3 + 0.7, // Random confidence between 0.7-1.0
          sources: ['Legal Database', 'Case Law', 'Regulations']
        }
      };

      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
    }, 2000);
  };

  const generateMockAIResponse = (userInput: string): string => {
    const responses = [
      "I understand you're looking for legal guidance. Based on my analysis, here are the key points to consider...",
      "This is a complex legal matter. Let me break down the relevant statutes and precedents...",
      "I've reviewed similar cases and found several important considerations...",
      "Based on current legal standards and recent case law, I recommend..."
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  };

  const handleQuickAction = (prompt: string) => {
    handleSendMessage(prompt);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Chat Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-bear-navy">Legal Assistant Chat</h2>
            <p className="text-sm text-gray-600">
              Ask questions, analyze documents, or get legal research assistance
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-bear-green rounded-full animate-pulse" />
            <span className="text-sm text-gray-600">AI Active</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex-shrink-0 px-6 py-3 border-b border-gray-100">
        <QuickActions onActionClick={handleQuickAction} />
      </div>

      {/* Messages Container */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-6 py-4 space-y-4"
      >
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        
        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-bear-green rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-medium">AI</span>
            </div>
            <div className="bg-gray-100 rounded-2xl px-4 py-3 max-w-xs">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input */}
      <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 bg-gray-50">
        <ChatInput
          value={inputValue}
          onChange={setInputValue}
          onSend={handleSendMessage}
          disabled={isTyping}
          placeholder="Ask a legal question or request document analysis..."
        />
      </div>
    </div>
  );
};