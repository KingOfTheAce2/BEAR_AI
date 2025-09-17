import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Message } from '../../../types/chat';
import './MessageInput.css';

interface MessageInputProps {
  onSendMessage: (content: string, type?: Message['type'], attachments?: any[]) => void;
  onTyping: () => void;
  onStopTyping: () => void;
  placeholder?: string;
  isMobile: boolean;
  disabled?: boolean;
}

const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  onTyping,
  onStopTyping,
  placeholder = 'Type a message...',
  isMobile,
  disabled = false
}) => {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showCommands, setShowCommands] = useState(false);
  const [commandFilter, setCommandFilter] = useState('');
  const [showEmojis, setShowEmojis] = useState(false);
  const [showFormatting, setShowFormatting] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const commandsRef = useRef<HTMLDivElement>(null);

  const commands = [
    { name: '/code', description: 'Insert code block', template: '```javascript\n\n```' },
    { name: '/table', description: 'Insert table', template: '| Column 1 | Column 2 |\n|----------|----------|\n| Row 1    | Row 1    |' },
    { name: '/quote', description: 'Insert quote', template: '> ' },
    { name: '/help', description: 'Show help', template: '/help' },
    { name: '/clear', description: 'Clear chat', template: '/clear' },
    { name: '/export', description: 'Export chat', template: '/export' }
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

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
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
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      onStopTyping();
    }, 2000);

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
  }, [isTyping, onTyping, onStopTyping]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || disabled) return;

    // Handle special commands
    const trimmedMessage = message.trim();
    if (trimmedMessage.startsWith('/')) {
      handleCommand(trimmedMessage);
      return;
    }

    // Determine message type
    let messageType: Message['type'] = 'text';
    if (message.includes('```')) {
      messageType = 'code';
    }

    onSendMessage(trimmedMessage, messageType);
    setMessage('');
    setIsTyping(false);
    onStopTyping();

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  }, [message, disabled, onSendMessage, onStopTyping]);

  const handleCommand = (command: string) => {
    const [cmd] = command.split(' ');
    
    switch (cmd.toLowerCase()) {
      case '/help':
        onSendMessage('Available commands:\n' + commands.map(c => `${c.name} - ${c.description}`).join('\n'), 'system');
        break;
      case '/clear':
        // This would trigger a clear action in parent
        console.log('Clear command');
        break;
      case '/export':
        // This would trigger export in parent
        console.log('Export command');
        break;
      default:
        onSendMessage(message.trim());
    }
    
    setMessage('');
    setShowCommands(false);
  };

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isMobile) {
      e.preventDefault();
      handleSubmit(e as any);
    } else if (e.key === 'Escape') {
      setShowCommands(false);
      setShowEmojis(false);
      setShowFormatting(false);
    } else if (e.key === 'Tab' && showCommands) {
      e.preventDefault();
      // Auto-complete first command
      const filtered = commands.filter(cmd => cmd.name.toLowerCase().includes(commandFilter.slice(1)));
      if (filtered.length > 0) {
        insertCommand(filtered[0]);
      }
    }
  }, [handleSubmit, isMobile, showCommands, commandFilter]);

  const insertCommand = (command: typeof commands[0]) => {
    const lines = message.split('\n');
    lines[lines.length - 1] = command.template;
    setMessage(lines.join('\n'));
    setShowCommands(false);
    
    // Focus and position cursor
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const cursorPos = command.template.indexOf('\n\n');
        if (cursorPos > -1) {
          textareaRef.current.setSelectionRange(cursorPos + 1, cursorPos + 1);
        }
      }
    }, 0);
  };

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
    setTimeout(() => {
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

    setTimeout(() => {
      textarea.setSelectionRange(start + text.length, start + text.length);
      textarea.focus();
    }, 0);
  };

  const insertEmoji = (emoji: string) => {
    insertAtCursor(emoji);
    setShowEmojis(false);
  };

  return (
    <div className={`message-input-container ${disabled ? 'disabled' : ''}`}>
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
        </div>
        
        {isTyping && (
          <div className="typing-status">
            Typing...
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageInput;