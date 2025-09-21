import React, { useState, useRef, useEffect, useCallback } from 'react';
import './MessageInput.css';
import { Message } from '../../../types/chat';
import { usePIIDetection } from '../../../hooks/usePIIDetection';
import PIIWarningOverlay from './PIIWarningOverlay';
import { PIIDetectionResult, PIIMatch } from '../../../services/pii/PIIDetector';

interface EnhancedMessageInputProps {
  onSendMessage: (content: string, type?: Message['type'], attachments?: any[]) => void;
  onTyping: () => void;
  onStopTyping: () => void;
  placeholder?: string;
  isMobile: boolean;
  disabled?: boolean;
  enablePIIDetection?: boolean;
}

const EnhancedMessageInput: React.FC&lt;EnhancedMessageInputProps&gt; = ({
  onSendMessage,
  onTyping,
  onStopTyping,
  placeholder = 'Type a message...',
  isMobile,
  disabled = false,
  enablePIIDetection = true
}) => {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showCommands, setShowCommands] = useState(false);
  const [commandFilter, setCommandFilter] = useState('');
  const [showEmojis, setShowEmojis] = useState(false);
  const [showFormatting, setShowFormatting] = useState(false);
  const [showPIIWarning, setShowPIIWarning] = useState(false);
  const [pendingMessage, setPendingMessage] = useState('');
  const [pendingMessageType, setPendingMessageType] = useState&lt;Message['type']&gt;('text');
  const [realTimePIIMatches, setRealTimePIIMatches] = useState&lt;PIIMatch[]&gt;([]);

  const textareaRef = useRef&lt;HTMLTextAreaElement&gt;(null);
  const typingTimeoutRef = useRef&lt;number | null&gt;(null);
  const commandsRef = useRef&lt;HTMLDivElement&gt;(null);

  // PII Detection Hook
  const [piiState, piiActions] = usePIIDetection({
    enableRealTime: enablePIIDetection,
    debounceMs: 500,
    onPIIDetected: (result: PIIDetectionResult) => {
      console.log('PII detected:', result);
    },
    onHighRiskDetected: (result: PIIDetectionResult) => {
      console.warn('High-risk PII detected:', result);
    },
    config: {
      enableLegalPatterns: true,
      enableDutchCompliance: true,
      sensitivity: 'high'
    }
  });

  const commands = [
    { name: '/code', description: 'Insert code block', template: '```javascript\n\n```' },
    { name: '/table', description: 'Insert table', template: '| Column 1 | Column 2 |\n|----------|----------|\n| Row 1    | Row 1    |' },
    { name: '/quote', description: 'Insert quote', template: '> ' },
    { name: '/help', description: 'Show help', template: '/help' },
    { name: '/clear', description: 'Clear chat', template: '/clear' },
    { name: '/export', description: 'Export chat', template: '/export' },
    { name: '/pii-audit', description: 'View PII audit log', template: '/pii-audit' }
  ];

  const emojis = ['😀', '😂', '❤️', '👍', '👎', '😮', '😢', '😡', '🔥', '💯', '🎉', '👀', '💭', '🤔', '😎', '🙌'];

  const formatCommands = [
    { name: 'Bold', action: () => insertFormatting('**', '**'), icon: 'B' },
    { name: 'Italic', action: () => insertFormatting('*', '*'), icon: 'I' },
    { name: 'Code', action: () => insertFormatting('`', '`'), icon: '</>' },
    { name: 'Strike', action: () => insertFormatting('~~', '~~'), icon: 'S' },
    { name: 'Link', action: () => insertFormatting('[', '](url)'), icon: '🔗' },
    { name: 'List', action: () => insertAtCursor('- '), icon: '•' }
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (commandsRef.current && !commandsRef.current.contains(event.target as Node)) {
        setShowCommands(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent&lt;HTMLTextAreaElement&gt;) => {
    const value = e.target.value;
    setMessage(value);

    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }

    // Handle typing indicator
    if (value.trim() && !isTyping) {
      setIsTyping(true);
      onTyping();
    }

    // Reset typing timeout
    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = window.setTimeout(() => {
      setIsTyping(false);
      onStopTyping();
    }, 2000) as unknown as number;

    // Real-time PII detection
    if (enablePIIDetection && value.trim()) {
      piiActions.scanRealTime(value, (matches: PIIMatch[]) => {
        setRealTimePIIMatches(matches);
      });
    } else {
      setRealTimePIIMatches([]);
    }

    // Handle commands
    const lines = value.split('\n');
    const currentLine = lines[lines.length - 1];

    if (currentLine.startsWith('/')) {
      const command = currentLine.toLowerCase();
      const filtered = commands.filter(cmd => cmd.name.toLowerCase().includes(command.slice(1)));
      setCommandFilter(command);
      setShowCommands(filtered.length > 0);
    } else {
      setShowCommands(false);
    }
  }, [isTyping, onTyping, onStopTyping, enablePIIDetection, piiActions]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim() || disabled) return;

    // Handle special commands
    const trimmedMessage = message.trim();
    if (trimmedMessage.startsWith('/')) {
      await handleCommand(trimmedMessage);
      return;
    }

    // Determine message type
    let messageType: Message['type'] = 'text';
    if (message.includes('```')) {
      messageType = 'code';
    }

    // PII Detection before sending
    if (enablePIIDetection) {
      const piiResult = await piiActions.scanText(trimmedMessage);

      if (piiResult.hasPII) {
        // Show warning overlay
        setPendingMessage(trimmedMessage);
        setPendingMessageType(messageType);
        setShowPIIWarning(true);
        return;
      }
    }

    // Send message directly if no PII detected
    sendMessageDirect(trimmedMessage, messageType);
  }, [message, disabled, enablePIIDetection, piiActions]);

  const handleCommand = async (command: string) => {
    const [cmd] = command.split(' ');

    switch (cmd.toLowerCase()) {
      case '/help':
        onSendMessage('Available commands:\n' + commands.map(c => `${c.name} - ${c.description}`).join('\n'), 'system');
        break;
      case '/clear':
        console.log('Clear command');
        break;
      case '/export':
        console.log('Export command');
        break;
      case '/pii-audit':
        const auditLog = piiActions.getAuditLog();
        const auditReport = `PII Audit Log (${auditLog.length} entries):\n` +
          auditLog.slice(-10).map(entry =>
            `- ${entry.type}: ${entry.hash.substring(0, 8)}... (${Math.round(entry.confidence * 100)}%)`
          ).join('\n');
        onSendMessage(auditReport, 'system');
        break;
      default:
        onSendMessage(message.trim());
    }

    setMessage('');
    setShowCommands(false);
    piiActions.clearWarnings();
  };

  const sendMessageDirect = (content: string, type: Message['type']) => {
    onSendMessage(content, type);
    setMessage('');
    setIsTyping(false);
    onStopTyping();
    setRealTimePIIMatches([]);
    piiActions.clearWarnings();

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }
  };

  const handlePIIWarningContinue = () => {
    setShowPIIWarning(false);
    sendMessageDirect(pendingMessage, pendingMessageType);
    setPendingMessage('');
  };

  const handlePIIWarningCancel = () => {
    setShowPIIWarning(false);
    setPendingMessage('');
    piiActions.clearWarnings();
  };

  const handlePIIWarningRedact = () => {
    const redactedMessage = piiActions.maskText(pendingMessage, piiState.lastResult?.matches || []);
    setShowPIIWarning(false);
    sendMessageDirect(redactedMessage, pendingMessageType);
    setPendingMessage('');
  };

  const handlePIIWarningDetails = () => {
    // Could open a detailed PII analysis modal
    console.log('PII Details:', piiState.lastResult);
  };

  const insertCommand = (command: typeof commands[0]) => {
    const lines = message.split('\n');
    lines[lines.length - 1] = command.template;
    setMessage(lines.join('\n'));
    setShowCommands(false);

    // Focus and position cursor
    window.setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const cursorPos = command.template.indexOf('\n\n');
        if (cursorPos > -1) {
          textareaRef.current.setSelectionRange(cursorPos + 1, cursorPos + 1);
        }
      }
    }, 0);
  };

  const handleKeyDown = useCallback((event: React.KeyboardEvent&lt;HTMLTextAreaElement&gt;) => {
    if (event.key === 'Enter' && !event.shiftKey && !isMobile) {
      event.preventDefault();
      handleSubmit(event as any);
    } else if (event.key === 'Escape') {
      setShowCommands(false);
      setShowEmojis(false);
      setShowFormatting(false);
      piiActions.clearWarnings();
    } else if (event.key === 'Tab' && showCommands) {
      event.preventDefault();
      const filtered = commands.filter(cmd => cmd.name.toLowerCase().includes(commandFilter.slice(1)));
      if (filtered.length > 0) {
        insertCommand(filtered[0]);
      }
    }
  }, [
    commandFilter,
    commands,
    handleSubmit,
    insertCommand,
    isMobile,
    piiActions,
    showCommands
  ]);

  const insertFormatting = (before: string, after: string) => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = message.substring(start, end);
    const beforeText = message.substring(0, start);
    const afterText = message.substring(end);

    const newText = beforeText + before + selectedText + after + afterText;
    setMessage(newText);

    // Restore cursor position
    window.setTimeout(() => {
      if (selectedText) {
        textarea.setSelectionRange(start + before.length, end + before.length);
      } else {
        textarea.setSelectionRange(start + before.length, start + before.length);
      }
      textarea.focus();
    }, 0);
  };

  const insertAtCursor = (text: string) => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const beforeText = message.substring(0, start);
    const afterText = message.substring(start);

    const newText = beforeText + text + afterText;
    setMessage(newText);

    window.setTimeout(() => {
      textarea.setSelectionRange(start + text.length, start + text.length);
      textarea.focus();
    }, 0);
  };

  const insertEmoji = (emoji: string) => {
    insertAtCursor(emoji);
    setShowEmojis(false);
  };

  // Get PII indicator class based on real-time matches
  const getPIIIndicatorClass = () => {
    if (!enablePIIDetection || realTimePIIMatches.length === 0) return '';

    const hasHighRisk = realTimePIIMatches.some(m => m.confidence > 0.9);
    const hasLegalPrivileged = realTimePIIMatches.some(m => m.isLegalPrivileged);

    if (hasLegalPrivileged) return 'pii-critical';
    if (hasHighRisk) return 'pii-high';
    return 'pii-medium';
  };

  return (
    <div className={`message-input-container ${disabled ? 'disabled' : ''} ${getPIIIndicatorClass()}`}>
      {/* PII Warning Overlay */}
      <PIIWarningOverlay
        isVisible={showPIIWarning}
        result={piiState.lastResult}
        onContinue={handlePIIWarningContinue}
        onCancel={handlePIIWarningCancel}
        onRedact={handlePIIWarningRedact}
        onViewDetails={handlePIIWarningDetails}
      />

      {/* Real-time PII indicator */}
      {enablePIIDetection && realTimePIIMatches.length > 0 && (
        <div className="pii-realtime-indicator">
          <span className="pii-icon">🔒</span>
          <span className="pii-text">
            {realTimePIIMatches.length} potential PII element{realTimePIIMatches.length !== 1 ? 's' : ''} detected
          </span>
          <button
            className="pii-clear-btn"
            onClick={() => {
              piiActions.clearWarnings();
              setRealTimePIIMatches([]);
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Commands dropdown */}
      {showCommands && (
        <div ref={commandsRef} className="commands-dropdown">
          {commands
            .filter(cmd => cmd.name.toLowerCase().includes(commandFilter.slice(1)))
            .map((command) => (
              <div
                key={command.name}
                className="command-item"
                onClick={() => insertCommand(command)}
              >
                <span className="command-name">{command.name}</span>
                <span className="command-description">{command.description}</span>
              </div>
            ))}
        </div>
      )}

      {/* Emoji picker */}
      {showEmojis && (
        <div className="emoji-picker">
          {emojis.map((emoji) => (
            <button
              key={emoji}
              className="emoji-option"
              onClick={() => insertEmoji(emoji)}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Formatting toolbar */}
      {showFormatting && (
        <div className="formatting-toolbar">
          {formatCommands.map((format) => (
            <button
              key={format.name}
              className="format-btn"
              onClick={format.action}
              title={format.name}
            >
              {format.icon}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="message-input-form">
        <div className="input-controls">
          <button
            type="button"
            className={`format-toggle ${showFormatting ? 'active' : ''}`}
            onClick={() => setShowFormatting(!showFormatting)}
            title="Formatting options"
          >
            🔧
          </button>

          <button
            type="button"
            className={`emoji-toggle ${showEmojis ? 'active' : ''}`}
            onClick={() => setShowEmojis(!showEmojis)}
            title="Insert emoji"
          >
            😊
          </button>

          {enablePIIDetection && (
            <button
              type="button"
              className={`pii-toggle ${piiState.hasActivePII ? 'active' : ''}`}
              onClick={() => {
                const auditLog = piiActions.exportAuditLog();
                navigator.clipboard?.writeText(auditLog);
              }}
              title="Export PII audit log"
            >
              🔒
            </button>
          )}
        </div>

        <textarea
          ref={textareaRef}
          value={message}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="message-textarea"
          disabled={disabled}
          rows={1}
        />

        <button
          type="submit"
          className="send-button"
          disabled={!message.trim() || disabled}
          title="Send message"
        >
          {isMobile ? '📤' : 'Send'}
        </button>
      </form>

      <div className="input-footer">
        <div className="format-hints">
          <span>**bold** *italic* `code` ~~strike~~ {`>`} quote</span>
          {enablePIIDetection && (
            <span className="pii-hint">🔒 PII protection enabled</span>
          )}
        </div>

        {isTyping && (
          <div className="typing-status">
            Typing...
          </div>
        )}

        {piiState.warningMessage && (
          <div className={`pii-warning-status ${piiState.riskLevel}`}>
            {piiState.warningMessage}
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedMessageInput;