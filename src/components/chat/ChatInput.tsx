import React, { useState, useRef, useEffect } from 'react';
import {
  PaperAirplaneIcon,
  DocumentArrowUpIcon,
  MicrophoneIcon,
  PaperClipIcon,
  FaceSmileIcon
} from '@heroicons/react/24/outline';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  value,
  onChange,
  onSend,
  disabled = false,
  placeholder = 'Type your legal question here...'
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [value]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim() && !disabled) {
      onSend(value.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      // Handle file upload logic here
      const fileName = files[0].name;
      onChange(`${value} [Uploaded: ${fileName}]`);
    }
  };

  const handleVoiceRecording = () => {
    setIsRecording(!isRecording);
    // Voice recording logic would go here
    // For now, just simulate the recording state
    if (!isRecording) {
      setTimeout(() => {
        setIsRecording(false);
        // Simulate transcribed text
        onChange(value + ' [Voice input transcribed]');
      }, 3000);
    }
  };

  const legalPrompts = [
    'Analyze this contract for risks',
    'Research relevant case law',
    'Draft a legal brief outline',
    'Review compliance requirements',
    'Summarize legal document'
  ];

  return (
    <div className="relative">
      {/* Quick Legal Prompts */}
      {!value && (
        <div className="mb-3">
          <div className="flex flex-wrap gap-2">
            {legalPrompts.slice(0, 3).map((prompt, index) => (
              <button
                key={index}
                onClick={() => onChange(prompt)}
                className="px-3 py-1 text-xs bg-bear-navy text-white rounded-full hover:bg-bear-green transition-colors duration-200"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="relative">
        <div className="flex items-end space-x-2 p-3 bg-white border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-bear-green focus-within:border-bear-green">
          {/* Attachment Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowAttachments(!showAttachments)}
              className="p-2 text-gray-500 hover:text-bear-navy rounded-lg hover:bg-gray-100 transition-colors duration-200"
              title="Attach file"
            >
              <PaperClipIcon className="w-5 h-5" />
            </button>
            
            {showAttachments && (
              <div className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-48">
                <div className="p-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
                  >
                    <DocumentArrowUpIcon className="w-4 h-4" />
                    <span>Upload Document</span>
                  </button>
                  <button
                    type="button"
                    className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
                  >
                    <FaceSmileIcon className="w-4 h-4" />
                    <span>Legal Templates</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Text Input */}
          <div className="flex-1">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              className="w-full resize-none border-0 focus:ring-0 placeholder-gray-500 text-gray-900 bg-transparent"
              style={{ minHeight: '24px', maxHeight: '120px' }}
              rows={1}
            />
          </div>

          {/* Voice Input Button */}
          <button
            type="button"
            onClick={handleVoiceRecording}
            className={`p-2 rounded-lg transition-colors duration-200 ${
              isRecording 
                ? 'text-bear-red bg-red-50 hover:bg-red-100' 
                : 'text-gray-500 hover:text-bear-navy hover:bg-gray-100'
            }`}
            title={isRecording ? 'Stop recording' : 'Start voice input'}
          >
            <MicrophoneIcon className={`w-5 h-5 ${isRecording ? 'animate-pulse' : ''}`} />
          </button>

          {/* Send Button */}
          <button
            type="submit"
            disabled={!value.trim() || disabled}
            className={`p-2 rounded-lg transition-all duration-200 ${
              value.trim() && !disabled
                ? 'text-white bg-bear-green hover:bg-bear-green-dark shadow-sm hover:shadow-md'
                : 'text-gray-400 bg-gray-100 cursor-not-allowed'
            }`}
            title="Send message"
          >
            <PaperAirplaneIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Character Counter */}
        {value.length > 500 && (
          <div className="mt-1 text-right">
            <span className={`text-xs ${
              value.length > 1000 ? 'text-bear-red' : 'text-gray-500'
            }`}>
              {value.length} characters
            </span>
          </div>
        )}

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileUpload}
          accept=".pdf,.doc,.docx,.txt"
          className="hidden"
          multiple
        />
      </form>

      {/* Recording Indicator */}
      {isRecording && (
        <div className="absolute -top-12 left-4 bg-bear-red text-white px-3 py-1 rounded-lg text-xs animate-pulse">
          Recording... Speak now
        </div>
      )}
    </div>
  );
};