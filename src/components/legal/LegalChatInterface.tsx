import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LegalStreamingOptions, LegalContext, PracticeArea, Jurisdiction, LegalCitation, CaseReference, StatuteReference, LegalConversationMetrics } from '../../types/legal';
import { Message, ChatSession } from '../../types';
import { legalChatService } from '../../services/legalChatService';
import { LegalMessageBubble } from './LegalMessageBubble';
import { LegalCitationPanel } from './LegalCitationPanel';
import { LegalContextPanel } from './LegalContextPanel';
import { LegalInputArea } from './LegalInputArea';
import { LegalToolbar } from './LegalToolbar';
import { LegalSettingsPanel } from './LegalSettingsPanel';
import { TypingIndicator } from '../streaming';
import './LegalChatInterface.css';

interface LegalChatInterfaceProps {
  initialPracticeArea?: PracticeArea;
  initialJurisdiction?: Jurisdiction;
  clientMatter?: string;
  confidentialityLevel?: 'public' | 'attorney-client' | 'work-product' | 'confidential';
  className?: string;
  onSessionCreated?: (sessionId: string) => void;
  onMessageSent?: (message: Message) => void;
  onCitationClick?: (citation: LegalCitation) => void;
}

export const LegalChatInterface: React.FC<LegalChatInterfaceProps> = ({
  initialPracticeArea = 'general',
  initialJurisdiction = 'federal',
  clientMatter,
  confidentialityLevel = 'attorney-client',
  className = '',
  onSessionCreated,
  onMessageSent,
  onCitationClick
}) => {
  // State management
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [currentStreamData, setCurrentStreamData] = useState<{
    citations?: LegalCitation[];
    cases?: CaseReference[];
    statutes?: StatuteReference[];
    metadata?: any;
  }>({});
  
  // Panel states
  const [showCitations, setShowCitations] = useState(true);
  const [showContext, setShowContext] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Legal context and settings
  const [legalContext, setLegalContext] = useState<LegalContext | null>(null);
  const [streamingOptions, setStreamingOptions] = useState<LegalStreamingOptions>({
    enableCitations: true,
    enableCaseSearch: true,
    enableStatuteSearch: true,
    autoLegalAnalysis: true,
    confidentialityMode: confidentialityLevel !== 'public',
    practiceAreaFilter: initialPracticeArea,
    jurisdictionFilter: initialJurisdiction,
    citationStyle: 'bluebook',
    responseDepth: 'detailed',
    includeAlternativeArguments: false,
    riskAssessment: true
  });
  const [metrics, setMetrics] = useState<LegalConversationMetrics | null>(null);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const streamingMessageRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 1024) {
        setSidebarCollapsed(true);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Initialize legal session
  useEffect(() => {
    const initializeSession = async () => {
      try {
        const newSessionId = await legalChatService.createLegalSession(
          initialPracticeArea,
          initialJurisdiction,
          clientMatter,
          confidentialityLevel
        );
        
        setSessionId(newSessionId);
        onSessionCreated?.(newSessionId);
        
        // Load initial context and metrics
        const context = legalChatService.getLegalContext(newSessionId);
        const sessionMetrics = legalChatService.getConversationMetrics(newSessionId);
        
        setLegalContext(context || null);
        setMetrics(sessionMetrics || null);
        
      } catch (error) {
        console.error('Failed to initialize legal session:', error);
      }
    };
    
    initializeSession();
  }, [initialPracticeArea, initialJurisdiction, clientMatter, confidentialityLevel, onSessionCreated]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  // Handle sending legal query
  const handleSendMessage = useCallback(async (content: string, messageType: string = 'legal-query') => {
    if (!sessionId || !content.trim() || isStreaming) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content: content.trim(),
      sender: 'user',
      timestamp: new Date(),
      status: 'sent',
      type: messageType as any,
      metadata: {
        practiceArea: legalContext?.practiceArea,
        jurisdiction: legalContext?.jurisdiction
      }
    };

    setMessages(prev => [...prev, userMessage]);
    onMessageSent?.(userMessage);
    setIsStreaming(true);
    setStreamingContent('');
    setCurrentStreamData({});

    try {
      // Stream legal response
      const responseStream = await legalChatService.streamLegalResponse(
        sessionId,
        content,
        streamingOptions
      );

      let accumulatedContent = '';
      let finalStreamData = {};

      for await (const chunk of responseStream) {
        accumulatedContent = chunk.content;
        setStreamingContent(accumulatedContent);
        
        // Update stream data
        const newStreamData = {
          citations: chunk.citations,
          cases: chunk.cases,
          statutes: chunk.statutes,
          metadata: chunk.metadata
        };
        setCurrentStreamData(newStreamData);
        
        if (chunk.isComplete) {
          finalStreamData = newStreamData;
          break;
        }
      }

      // Create final AI message
      const aiMessage: Message = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        content: accumulatedContent,
        sender: 'ai',
        timestamp: new Date(),
        status: 'delivered',
        type: 'text',
        metadata: {
          ...(finalStreamData as any).metadata,
          citations: (finalStreamData as any).citations,
          caseReferences: (finalStreamData as any).cases,
          statutes: (finalStreamData as any).statutes
        }
      };

      setMessages(prev => [...prev, aiMessage]);
      
      // Update metrics
      const updatedMetrics = legalChatService.getConversationMetrics(sessionId);
      setMetrics(updatedMetrics || null);

    } catch (error) {
      console.error('Error sending legal message:', error);
      
      const errorMessage: Message = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        content: 'I apologize, but I encountered an error processing your legal query. Please try again or contact support.',
        sender: 'ai',
        timestamp: new Date(),
        status: 'error',
        type: 'text'
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsStreaming(false);
      setStreamingContent('');
      setCurrentStreamData({});
    }
  }, [sessionId, isStreaming, legalContext, streamingOptions, onMessageSent]);

  // Handle citation click
  const handleCitationClick = useCallback((citation: LegalCitation) => {
    onCitationClick?.(citation);
    // Could also open citation details modal or navigate to source
  }, [onCitationClick]);

  // Handle context updates
  const handleContextUpdate = useCallback(async (updates: Partial<LegalContext>) => {
    if (!sessionId) return;
    
    await legalChatService.updateLegalContext(sessionId, updates);
    const updatedContext = legalChatService.getLegalContext(sessionId);
    setLegalContext(updatedContext || null);
  }, [sessionId]);

  // Render loading state
  if (!sessionId) {
    return (
      <div className="legal-chat-loading">
        <div className="loading-spinner"></div>
        <p>Initializing legal consultation session...</p>
      </div>
    );
  }

  return (
    <div className={`legal-chat-interface ${className} ${isMobile ? 'mobile' : 'desktop'} ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Legal Toolbar */}
      <LegalToolbar
        practiceArea={legalContext?.practiceArea || initialPracticeArea}
        jurisdiction={legalContext?.jurisdiction || initialJurisdiction}
        confidentialityLevel={confidentialityLevel}
        metrics={metrics}
        onToggleCitations={() => setShowCitations(!showCitations)}
        onToggleContext={() => setShowContext(!showContext)}
        onToggleSettings={() => setShowSettings(!showSettings)}
        onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
        showCitations={showCitations}
        showContext={showContext}
        showSettings={showSettings}
        isMobile={isMobile}
      />

      <div className="legal-chat-main">
        {/* Sidebar */}
        <div className={`legal-chat-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
          {/* Legal Context Panel */}
          {showContext && legalContext && (
            <LegalContextPanel
              context={legalContext}
              onUpdateContext={handleContextUpdate}
              isCollapsed={sidebarCollapsed}
            />
          )}

          {/* Citations Panel */}
          {showCitations && (
            <LegalCitationPanel
              citations={currentStreamData.citations || []}
              cases={currentStreamData.cases || []}
              statutes={currentStreamData.statutes || []}
              onCitationClick={handleCitationClick}
              isCollapsed={sidebarCollapsed}
            />
          )}
        </div>

        {/* Chat Area */}
        <div className="legal-chat-content">
          <div className="legal-chat-messages">
            {messages.map((message) => (
              <LegalMessageBubble
                key={message.id}
                message={message}
                onCitationClick={handleCitationClick}
                showTimestamp={true}
                confidentialityLevel={confidentialityLevel}
              />
            ))}

            {/* Streaming message */}
            {isStreaming && streamingContent && (
              <div ref={streamingMessageRef}>
                <LegalMessageBubble
                  message={{
                    id: 'streaming',
                    content: streamingContent,
                    sender: 'ai',
                    timestamp: new Date(),
                    status: 'sending',
                    type: 'text',
                    metadata: currentStreamData.metadata
                  }}
                  onCitationClick={handleCitationClick}
                  showTimestamp={false}
                  isStreaming={true}
                  confidentialityLevel={confidentialityLevel}
                />
              </div>
            )}

            {/* Typing indicator */}
            {isStreaming && !streamingContent && (
              <TypingIndicator 
                show={true} 
                userName="BEAR AI Legal"
                className="legal-typing-indicator"
              />
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Legal Input Area */}
          <LegalInputArea
            ref={inputRef}
            onSendMessage={handleSendMessage}
            isStreaming={isStreaming}
            practiceArea={legalContext?.practiceArea || initialPracticeArea}
            jurisdiction={legalContext?.jurisdiction || initialJurisdiction}
            placeholder={
              isStreaming
                ? "BEAR AI is analyzing your legal query..."
                : "Ask a legal question or describe your legal issue..."
            }
            confidentialityLevel={confidentialityLevel}
            disabled={isStreaming}
          />
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <LegalSettingsPanel
          options={streamingOptions}
          onOptionsChange={setStreamingOptions}
          onClose={() => setShowSettings(false)}
          practiceArea={legalContext?.practiceArea || initialPracticeArea}
          jurisdiction={legalContext?.jurisdiction || initialJurisdiction}
        />
      )}

      {/* Mobile overlay */}
      {isMobile && !sidebarCollapsed && (
        <div 
          className="mobile-overlay"
          onClick={() => setSidebarCollapsed(true)}
        />
      )}

      {/* Confidentiality notice */}
      <div className="legal-confidentiality-notice">
        <div className="confidentiality-badge ${confidentialityLevel}">
          <span className="confidentiality-icon">🔒</span>
          <span className="confidentiality-text">
            {confidentialityLevel === 'attorney-client' && 'Attorney-Client Privileged'}
            {confidentialityLevel === 'work-product' && 'Work Product Protected'}
            {confidentialityLevel === 'confidential' && 'Confidential Information'}
            {confidentialityLevel === 'public' && 'General Legal Information'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default LegalChatInterface;
