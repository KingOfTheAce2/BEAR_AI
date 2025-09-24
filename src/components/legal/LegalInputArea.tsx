import type { KeyboardEvent, ChangeEvent } from 'react';
import './LegalInputArea.css';
import { PracticeArea, Jurisdiction } from '../../types/legal';

interface LegalInputAreaProps {
  onSendMessage: (content: string, messageType?: string) => Promise<void>;
  isStreaming: boolean;
  practiceArea: PracticeArea;
  jurisdiction: Jurisdiction;
  placeholder?: string;
  confidentialityLevel: 'public' | 'attorney-client' | 'work-product' | 'confidential';
  disabled?: boolean;
  className?: string;
}

interface LegalQuickAction {
  id: string;
  label: string;
  prompt: string;
  icon: string;
  category: 'research' | 'analysis' | 'drafting' | 'review';
  practiceAreas: PracticeArea[];
}

const legalQuickActions: LegalQuickAction[] = [
  {
    id: 'contract-review',
    label: 'Contract Review',
    prompt: 'Please review this contract and identify key terms, potential issues, and risks.',
    icon: '📄',
    category: 'review',
    practiceAreas: ['corporate', 'general']
  },
  {
    id: 'case-research',
    label: 'Case Research',
    prompt: 'Find relevant case law and precedents for this legal issue.',
    icon: '📚',
    category: 'research',
    practiceAreas: ['litigation', 'general']
  },
  {
    id: 'statute-analysis',
    label: 'Statute Analysis',
    prompt: 'Analyze the applicable statutes and regulations for this matter.',
    icon: '📜',
    category: 'analysis',
    practiceAreas: ['general']
  },
  {
    id: 'legal-memo',
    label: 'Legal Memo',
    prompt: 'Help me draft a legal memorandum analyzing this issue.',
    icon: '📝',
    category: 'drafting',
    practiceAreas: ['general']
  },
  {
    id: 'motion-draft',
    label: 'Motion Drafting',
    prompt: 'Assist me in drafting a motion with proper legal citations and arguments.',
    icon: '⚖️',
    category: 'drafting',
    practiceAreas: ['litigation']
  },
  {
    id: 'due-diligence',
    label: 'Due Diligence',
    prompt: 'Guide me through due diligence checklist and key areas to investigate.',
    icon: '🔍',
    category: 'analysis',
    practiceAreas: ['corporate']
  },
  {
    id: 'compliance-check',
    label: 'Compliance Check',
    prompt: 'Review compliance requirements and identify potential regulatory issues.',
    icon: '✅',
    category: 'review',
    practiceAreas: ['corporate', 'healthcare', 'environmental']
  },
  {
    id: 'risk-assessment',
    label: 'Risk Assessment',
    prompt: 'Conduct a legal risk assessment for this situation.',
    icon: '⚠️',
    category: 'analysis',
    practiceAreas: ['general']
  }
];

export const LegalInputArea = forwardRef<HTMLTextAreaElement, LegalInputAreaProps>(({
  onSendMessage,
  isStreaming,
  practiceArea,
  jurisdiction,
  placeholder = "Ask a legal question or describe your legal issue...",
  confidentialityLevel,
  disabled = false,
  className = ''
}, ref) => {
  const [inputValue, setInputValue] = useState('');
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [selectedQuickAction, setSelectedQuickAction] = useState<LegalQuickAction | null>(null);
  const [inputMode, setInputMode] = useState<'text' | 'voice' | 'document'>('text');
  const [isRecording, setIsRecording] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useImperativeHandle(ref, () => textareaRef.current!);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [inputValue]);

  // Filter quick actions by practice area
  const relevantQuickActions = legalQuickActions.filter(action =>
    action.practiceAreas.includes(practiceArea) || action.practiceAreas.includes('general')
  );

  // Handle send message
  const handleSend = async () => {
    if (!inputValue.trim() || isStreaming || disabled) return;

    const messageType = selectedQuickAction ? selectedQuickAction.category : 'legal-query';
    const content = selectedQuickAction
      ? `${selectedQuickAction.prompt}\n\n${inputValue}`
      : inputValue;

    try {
      await onSendMessage(content, messageType);
      setInputValue('');
      setSelectedQuickAction(null);
      setShowQuickActions(false);
    } catch (error) {
      // Error logging disabled for production
    }
  };

  // Handle key press
  const handleKeyPress = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  // Handle quick action selection
  const handleQuickActionSelect = (action: LegalQuickAction) => {
    setSelectedQuickAction(action);
    setInputValue(action.prompt);
    setShowQuickActions(false);
    textareaRef.current?.focus();
  };

  // Handle voice recording
  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        // Here you would typically send the audio to a transcription service
        // For now, we'll just simulate transcription
        setInputValue(prev => prev + '[Voice input transcribed]');
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      // Error logging disabled for production
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Handle file upload
  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      setInputValue(prev => prev + `[Document uploaded: ${file.name}] `);
    }
  };

  return (
    <div className={`legal-input-area ${className}`}>
      {/* Confidentiality warning */}
      {confidentialityLevel !== 'public' && (
        <div className="confidentiality-warning">
          <span className="warning-icon">🔒</span>
          <span className="warning-text">
            {confidentialityLevel === 'attorney-client' && 'This conversation is protected by attorney-client privilege'}
            {confidentialityLevel === 'work-product' && 'This conversation contains attorney work product'}
            {confidentialityLevel === 'confidential' && 'This conversation contains confidential information'}
          </span>
        </div>
      )}

      {/* Quick Actions Bar */}
      {showQuickActions && (
        <div className="quick-actions-panel">
          <div className="quick-actions-header">
            <h4>Legal Quick Actions</h4>
            <button
              className="close-quick-actions"
              onClick={() => setShowQuickActions(false)}
            >
              ✕
            </button>
          </div>
          <div className="quick-actions-grid">
            {relevantQuickActions.map((action) => (
              <button
                key={action.id}
                className="quick-action-button"
                onClick={() => handleQuickActionSelect(action)}
              >
                <span className="action-icon">{action.icon}</span>
                <span className="action-label">{action.label}</span>
                <span className="action-category">{action.category}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Selected Quick Action Indicator */}
      {selectedQuickAction && (
        <div className="selected-action-indicator">
          <span className="action-icon">{selectedQuickAction.icon}</span>
          <span className="action-text">Using: {selectedQuickAction.label}</span>
          <button
            className="clear-action"
            onClick={() => {
              setSelectedQuickAction(null);
              setInputValue('');
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Input Mode Selector */}
      <div className="input-mode-selector">
        <button
          className={`mode-button ${inputMode === 'text' ? 'active' : ''}`}
          onClick={() => setInputMode('text')}
        >
          💬 Text
        </button>
        <button
          className={`mode-button ${inputMode === 'voice' ? 'active' : ''}`}
          onClick={() => setInputMode('voice')}
        >
          🎤 Voice
        </button>
        <button
          className={`mode-button ${inputMode === 'document' ? 'active' : ''}`}
          onClick={() => setInputMode('document')}
        >
          📄 Document
        </button>
      </div>

      {/* Main Input Area */}
      <div className="input-container">
        {/* Text Input */}
        {inputMode === 'text' && (
          <div className="text-input-wrapper">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={placeholder}
              disabled={disabled || isStreaming}
              className="legal-textarea"
              rows={1}
            />
          </div>
        )}

        {/* Voice Input */}
        {inputMode === 'voice' && (
          <div className="voice-input-wrapper">
            <button
              className={`voice-record-button ${isRecording ? 'recording' : ''}`}
              onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
              disabled={disabled || isStreaming}
            >
              {isRecording ? (
                <>
                  <span className="recording-icon">⏹️</span>
                  <span>Stop Recording</span>
                </>
              ) : (
                <>
                  <span className="mic-icon">🎤</span>
                  <span>Start Voice Input</span>
                </>
              )}
            </button>
            {isRecording && (
              <div className="recording-indicator">
                <div className="recording-animation"></div>
                <span>Recording... Click to stop</span>
              </div>
            )}
          </div>
        )}

        {/* Document Input */}
        {inputMode === 'document' && (
          <div className="document-input-wrapper">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              accept=".pdf,.doc,.docx,.txt"
              className="hidden-file-input"
            />
            <button
              className="document-upload-button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || isStreaming}
            >
              <span className="upload-icon">📎</span>
              <span>Upload Legal Document</span>
            </button>
            <div className="supported-formats">
              Supported: PDF, DOC, DOCX, TXT
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="input-actions">
          <button
            className="quick-actions-toggle"
            onClick={() => setShowQuickActions(!showQuickActions)}
            disabled={disabled || isStreaming}
            title="Show quick actions"
          >
            ⚡
          </button>

          <button
            className="send-button"
            onClick={handleSend}
            disabled={!inputValue.trim() || disabled || isStreaming}
          >
            {isStreaming ? (
              <>
                <span className="loading-spinner"></span>
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span className="send-icon">➤</span>
                <span>Send</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Context Info */}
      <div className="input-context-info">
        <span className="practice-area-indicator">
          {practiceArea.charAt(0).toUpperCase() + practiceArea.slice(1)} Law
        </span>
        <span className="jurisdiction-indicator">
          {jurisdiction.charAt(0).toUpperCase() + jurisdiction.slice(1)}
        </span>
        <span className="character-count">
          {inputValue.length}/2000
        </span>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileUpload}
        accept=".pdf,.doc,.docx,.txt,.rtf"
        multiple
      />
    </div>
  );
});

LegalInputArea.displayName = 'LegalInputArea';

export default LegalInputArea;