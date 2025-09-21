import React, { useState, useEffect } from 'react';
import './VoiceControls.css';

interface VoiceControlsProps {
  onStartListening: () => void;
  onStopListening: () => void;
  onSpeak: (text: string) => void;
  isListening: boolean;
  onClose: () => void;
}

const VoiceControls: React.FC<VoiceControlsProps> = ({
  onStartListening,
  onStopListening,
  onSpeak,
  isListening,
  onClose
}) => {
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [speakRate, setSpeakRate] = useState(1);
  const [speakPitch, setSpeakPitch] = useState(1);
  const [speakVolume, setSpeakVolume] = useState(1);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    // Check for speech synthesis support
    setIsSupported('speechSynthesis' in window);
    
    // Load voices
    const loadVoices = () => {
      const availableVoices = speechSynthesis.getVoices();
      setVoices(availableVoices);
      
      // Set default voice (English)
      const englishVoice = availableVoices.find(voice => 
        voice.lang.startsWith('en') && voice.default
      );
      if (englishVoice) {
        setSelectedVoice(englishVoice.name);
      }
    };

    loadVoices();
    speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      speechSynthesis.onvoiceschanged = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleListenToggle = () => {
    if (isListening) {
      onStopListening();
    } else {
      onStartListening();
    }
  };

  const handleSpeakText = () => {
    if (!transcript.trim()) return;

    const utterance = new SpeechSynthesisUtterance(transcript);
    
    const voice = voices.find(v => v.name === selectedVoice);
    if (voice) {
      utterance.voice = voice;
    }
    
    utterance.rate = speakRate;
    utterance.pitch = speakPitch;
    utterance.volume = speakVolume;
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    speechSynthesis.speak(utterance);
    onSpeak(transcript);
  };

  const handleStopSpeaking = () => {
    speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  const voiceCommands = [
    { text: '/help', description: 'Show help' },
    { text: '/clear', description: 'Clear chat' },
    { text: '/export', description: 'Export chat' },
    { text: 'send message [text]', description: 'Send a message' },
    { text: 'new thread', description: 'Create new thread' },
    { text: 'search [query]', description: 'Search messages' }
  ];

  if (!isSupported) {
    return (
      <div className="voice-controls">
        <div className="voice-header">
          <h3>Voice Controls</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="voice-unsupported">
          <p>Voice features are not supported in this browser.</p>
          <p>Please use Chrome, Edge, or Firefox for voice functionality.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="voice-controls">
      <div className="voice-header">
        <h3>🎤 Voice Controls</h3>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>

      <div className="voice-content">
        {/* Speech Recognition */}
        <div className="voice-section">
          <h4>Speech to Text</h4>
          
          <div className="voice-controls-row">
            <button
              className={`voice-btn ${isListening ? 'listening' : ''}`}
              onClick={handleListenToggle}
              disabled={!isSupported}
            >
              {isListening ? (
                <>
                  <span className="pulse-icon">🎤</span>
                  Listening...
                </>
              ) : (
                <>
                  🎤 Start Listening
                </>
              )}
            </button>
          </div>

          <div className="transcript-area">
            <div className="transcript-label">Recognized speech:</div>
            <div className="transcript-text">
              {transcript && (
                <span className="final-transcript">{transcript}</span>
              )}
              {interimTranscript && (
                <span className="interim-transcript">{interimTranscript}</span>
              )}
              {!transcript && !interimTranscript && (
                <span className="placeholder">Start speaking...</span>
              )}
            </div>
            
            {transcript && (
              <div className="transcript-actions">
                <button onClick={() => setTranscript('')} className="clear-btn">
                  Clear
                </button>
                <button onClick={() => navigator.clipboard.writeText(transcript)} className="copy-btn">
                  Copy
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Text to Speech */}
        <div className="voice-section">
          <h4>Text to Speech</h4>
          
          <div className="voice-settings">
            <div className="setting-row">
              <label htmlFor="voice-select">Voice:</label>
              <select
                id="voice-select"
                value={selectedVoice}
                onChange={(e) => setSelectedVoice(e.target.value)}
              >
                {voices.map((voice) => (
                  <option key={voice.name} value={voice.name}>
                    {voice.name} ({voice.lang})
                  </option>
                ))}
              </select>
            </div>

            <div className="setting-row">
              <label htmlFor="rate-slider">Rate: {speakRate.toFixed(1)}</label>
              <input
                id="rate-slider"
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={speakRate}
                onChange={(e) => setSpeakRate(parseFloat(e.target.value))}
              />
            </div>

            <div className="setting-row">
              <label htmlFor="pitch-slider">Pitch: {speakPitch.toFixed(1)}</label>
              <input
                id="pitch-slider"
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={speakPitch}
                onChange={(e) => setSpeakPitch(parseFloat(e.target.value))}
              />
            </div>

            <div className="setting-row">
              <label htmlFor="volume-slider">Volume: {Math.round(speakVolume * 100)}%</label>
              <input
                id="volume-slider"
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={speakVolume}
                onChange={(e) => setSpeakVolume(parseFloat(e.target.value))}
              />
            </div>
          </div>

          <div className="voice-controls-row">
            <button
              className="voice-btn"
              onClick={handleSpeakText}
              disabled={!transcript.trim() || isSpeaking}
            >
              🔊 Speak Text
            </button>
            
            {isSpeaking && (
              <button
                className="voice-btn stop-btn"
                onClick={handleStopSpeaking}
              >
                ⏹️ Stop
              </button>
            )}
          </div>

          <div className="test-speech">
            <button
              className="test-btn"
              onClick={() => {
                const testText = "Hello! This is a test of the text to speech functionality.";
                const utterance = new SpeechSynthesisUtterance(testText);
                const voice = voices.find(v => v.name === selectedVoice);
                if (voice) utterance.voice = voice;
                utterance.rate = speakRate;
                utterance.pitch = speakPitch;
                utterance.volume = speakVolume;
                speechSynthesis.speak(utterance);
              }}
            >
              🧪 Test Voice
            </button>
          </div>
        </div>

        {/* Voice Commands Help */}
        <div className="voice-section">
          <h4>Voice Commands</h4>
          <div className="commands-list">
            {voiceCommands.map((command, index) => (
              <div key={index} className="command-item">
                <code>{command.text}</code>
                <span>{command.description}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="voice-footer">
        <div className="voice-status">
          {isListening && (
            <div className="status-indicator listening">
              <span className="status-dot"></span>
              Listening for voice input
            </div>
          )}
          
          {isSpeaking && (
            <div className="status-indicator speaking">
              <span className="status-dot"></span>
              Speaking
            </div>
          )}
          
          {!isListening && !isSpeaking && (
            <div className="status-indicator ready">
              <span className="status-dot"></span>
              Ready
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VoiceControls;