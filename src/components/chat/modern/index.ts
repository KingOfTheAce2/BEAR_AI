// Modern Chat Interface Components Export
export { default as ChatContainer } from './ChatContainer';
export { default as ThreadSidebar } from './ThreadSidebar';
export { default as MessageList } from './MessageList';
export { default as MessageComponent } from './MessageComponent';
export { default as MessageThread } from './MessageThread';
export { default as MessageInput } from './MessageInput';
export { default as SearchPanel } from './SearchPanel';
export { default as VoiceControls } from './VoiceControls';
export { default as FileUpload } from './FileUpload';
export { default as TypingIndicator } from './TypingIndicator';

// Re-export types for convenience
export type {
  Message,
  Thread,
  User,
  Reaction,
  Attachment,
  EditHistory,
  TypingIndicator as TypingIndicatorType,
  SearchFilter,
  VoiceSettings,
  ChatSettings,
  WebSocketMessage,
  CodeExecutionResult,
  ExportOptions,
  MessageType,
  AttachmentType,
  PresenceStatus,
  WebSocketMessageType,
  ExportFormat,
  AttachmentMetadata,
  MessageMetadata
} from '../../../types/chat';

// Export hook
export { useChat } from '../../../hooks/chat/useChat';

// Export services
export { chatStorage } from '../../../services/chat/storage';
export { default as ChatWebSocketService } from '../../../services/chat/websocket';
export { default as VoiceService } from '../../../services/chat/voice';
export { default as CodeExecutionService } from '../../../utils/chat/codeExecution';