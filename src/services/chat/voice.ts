import { VoiceSettings } from '../../types/chat';

class VoiceService {
  private recognition: SpeechRecognition | null = null;
  private synthesis: SpeechSynthesis;
  private voices: SpeechSynthesisVoice[] = [];
  private settings: VoiceSettings;
  private isListening = false;
  private isSupported = false;

  constructor(settings: VoiceSettings) {
    this.settings = settings;
    this.synthesis = window.speechSynthesis;
    this.isSupported = this.checkSupport();
    
    if (this.isSupported) {
      this.initializeRecognition();
      this.loadVoices();
    }
  }

  private checkSupport(): boolean {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition) && 
           !!window.speechSynthesis;
  }

  private initializeRecognition(): void {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = this.settings.language;
    
    this.recognition.onstart = () => {
      this.isListening = true;
      this.onListeningStart?.();
    };
    
    this.recognition.onend = () => {
      this.isListening = false;
      this.onListeningEnd?.();
    };
    
    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      this.onError?.(event.error);
    };
    
    this.recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }
      
      this.onTranscript?.(finalTranscript, interimTranscript);
    };
  }

  private loadVoices(): void {
    const loadVoicesImpl = () => {
      this.voices = this.synthesis.getVoices();
      this.onVoicesLoaded?.(this.voices);
    };

    loadVoicesImpl();
    
    if (this.synthesis.onvoiceschanged !== undefined) {
      this.synthesis.onvoiceschanged = loadVoicesImpl;
    }
  }

  startListening(): void {
    if (!this.isSupported || !this.recognition || this.isListening) {
      return;
    }

    try {
      this.recognition.start();
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      this.onError?.(error.message);
    }
  }

  stopListening(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
  }

  speak(text: string, options?: Partial<VoiceSettings>): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.isSupported || !text.trim()) {
        resolve();
        return;
      }

      // Cancel any ongoing speech
      this.synthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      const settings = { ...this.settings, ...options };

      utterance.rate = settings.rate;
      utterance.pitch = settings.pitch;
      utterance.volume = settings.volume;
      utterance.lang = settings.language;

      if (settings.voice) {
        utterance.voice = settings.voice;
      } else {
        // Find a voice that matches the language
        const matchingVoice = this.voices.find(voice => 
          voice.lang.startsWith(settings.language.split('-')[0])
        );
        if (matchingVoice) {
          utterance.voice = matchingVoice;
        }
      }

      utterance.onend = () => resolve();
      utterance.onerror = (event) => reject(event.error);

      this.synthesis.speak(utterance);
    });
  }

  stopSpeaking(): void {
    this.synthesis.cancel();
  }

  updateSettings(settings: Partial<VoiceSettings>): void {
    this.settings = { ...this.settings, ...settings };
    
    if (this.recognition) {
      this.recognition.lang = this.settings.language;
    }
  }

  getAvailableVoices(): SpeechSynthesisVoice[] {
    return this.voices;
  }

  getLanguages(): string[] {
    const languages = new Set<string>();
    this.voices.forEach(voice => {
      languages.add(voice.lang);
    });
    return Array.from(languages).sort();
  }

  isRecognitionSupported(): boolean {
    return this.isSupported && !!this.recognition;
  }

  isSynthesisSupported(): boolean {
    return this.isSupported && !!this.synthesis;
  }

  isCurrentlyListening(): boolean {
    return this.isListening;
  }

  isSpeaking(): boolean {
    return this.synthesis.speaking;
  }

  // Event handlers - can be overridden
  onListeningStart?: () => void;
  onListeningEnd?: () => void;
  onTranscript?: (finalTranscript: string, interimTranscript: string) => void;
  onError?: (error: string) => void;
  onVoicesLoaded?: (voices: SpeechSynthesisVoice[]) => void;

  // Voice commands processing
  processVoiceCommand(transcript: string): VoiceCommand | null {
    const commands: VoiceCommandPattern[] = [
      { pattern: /^send message/i, action: 'send_message' },
      { pattern: /^new thread/i, action: 'new_thread' },
      { pattern: /^search for (.+)/i, action: 'search', parameter: 1 },
      { pattern: /^switch to (.+)/i, action: 'switch_thread', parameter: 1 },
      { pattern: /^delete message/i, action: 'delete_message' },
      { pattern: /^edit message/i, action: 'edit_message' },
      { pattern: /^add reaction (.+)/i, action: 'add_reaction', parameter: 1 },
      { pattern: /^export chat/i, action: 'export_chat' },
      { pattern: /^clear chat/i, action: 'clear_chat' },
      { pattern: /^read message/i, action: 'read_message' },
      { pattern: /^stop reading/i, action: 'stop_reading' }
    ];

    for (const cmd of commands) {
      const match = transcript.match(cmd.pattern);
      if (match) {
        return {
          action: cmd.action,
          parameter: cmd.parameter ? match[cmd.parameter] : undefined,
          originalText: transcript
        };
      }
    }

    return null;
  }
}

interface VoiceCommandPattern {
  pattern: RegExp;
  action: string;
  parameter?: number;
}

interface VoiceCommand {
  action: string;
  parameter?: string;
  originalText: string;
}

// Extend Window interface for Speech API
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

export default VoiceService;
export type { VoiceCommand };