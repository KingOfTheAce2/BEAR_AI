import { VoiceSettings } from '../../types/chat';

export type VoiceCommandAction = 'send_message' | 'new_thread' | 'search';

export interface VoiceCommand {
  action: VoiceCommandAction;
  parameter?: string;
  originalText: string;
}

// Minimal interfaces to avoid relying on browser type definitions
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  abort?: () => void;
  onaudiostart: ((event: unknown) => void) | null;
  onsoundstart: ((event: unknown) => void) | null;
  onspeechstart: ((event: unknown) => void) | null;
  onspeechend: ((event: unknown) => void) | null;
  onsoundend: ((event: unknown) => void) | null;
  onaudioend: ((event: unknown) => void) | null;
  onend: ((event: unknown) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: Array<{
    isFinal: boolean;
    0?: {
      transcript: string;
    };
  }>;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

const getSpeechRecognitionConstructor = (): SpeechRecognitionConstructor | null => {
  if (typeof window === 'undefined') return null;

  const speechRecognition =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  return speechRecognition ?? null;
};

export default class VoiceService {
  private recognition: SpeechRecognitionLike | null = null;
  private settings: VoiceSettings;
  private isListening = false;

  public onTranscript: (finalTranscript: string, interimTranscript: string) => void = () => {};
  public onError: (message: string) => void = () => {};

  constructor(settings: VoiceSettings) {
    this.settings = settings;
    this.initializeRecognition();
  }

  private initializeRecognition() {
    const RecognitionConstructor = getSpeechRecognitionConstructor();
    if (!RecognitionConstructor) {
      return;
    }

    try {
      this.recognition = new RecognitionConstructor();
      if (!this.recognition) return;

      this.recognition.lang = this.settings.language;
      this.recognition.interimResults = true;
      this.recognition.continuous = true;

      this.recognition.onresult = (event: SpeechRecognitionEventLike) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (!result) continue;
          const transcript = result[0]?.transcript ?? '';
          if (result.isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript || interimTranscript) {
          this.onTranscript(finalTranscript.trim(), interimTranscript.trim());
        }
      };

      this.recognition.onerror = (event: { error?: string }) => {
        if (event?.error === 'not-allowed' || event?.error === 'service-not-allowed') {
          this.onError('Microphone access denied. Please enable microphone permissions.');
        } else if (event?.error) {
          this.onError(event.error);
        } else {
          this.onError('An unknown error occurred with speech recognition.');
        }
      };

      this.recognition.onend = () => {
        this.isListening = false;
      };
    } catch (error) {
      // Error logging disabled for production
      this.onError('Voice recognition is not supported in this browser.');
      this.recognition = null;
    }
  }

  public updateSettings(settings: VoiceSettings) {
    this.settings = settings;
    if (this.recognition) {
      this.recognition.lang = settings.language;
    }
  }

  public startListening() {
    if (!this.settings.enabled) {
      this.onError('Voice input is disabled in settings.');
      return;
    }

    if (!this.recognition) {
      this.onError('Voice recognition is not supported in this environment.');
      return;
    }

    if (this.isListening) {
      return;
    }

    try {
      this.recognition.start();
      this.isListening = true;
    } catch (error) {
      // Error logging disabled for production
      this.onError('Unable to start voice recognition.');
    }
  }

  public stopListening() {
    if (!this.recognition) return;

    try {
      this.recognition.stop();
    } catch {
      this.recognition.abort?.();
    } finally {
      this.isListening = false;
    }
  }

  public speak(text: string) {
    if (typeof window === 'undefined') {
      return;
    }

    if (!('speechSynthesis' in window)) {
      this.onError('Speech synthesis is not supported in this browser.');
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = this.settings.language;
    utterance.rate = this.settings.rate;
    utterance.pitch = this.settings.pitch;
    utterance.volume = this.settings.volume;

    if (this.settings.voice) {
      utterance.voice = this.settings.voice;
    }

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  public processVoiceCommand(transcript: string): VoiceCommand | null {
    const normalized = transcript.trim();
    if (!normalized) {
      return null;
    }

    const lowerCase = normalized.toLowerCase();

    if (lowerCase.startsWith('send message')) {
      const parameter = normalized.slice('send message'.length).trim();
      return {
        action: 'send_message',
        ...(parameter ? { parameter } : {}),
        originalText: normalized
      };
    }

    if (
      lowerCase.startsWith('create new thread') ||
      lowerCase.startsWith('new thread') ||
      lowerCase.startsWith('start new thread')
    ) {
      return {
        action: 'new_thread',
        originalText: normalized
      };
    }

    if (lowerCase.startsWith('search for')) {
      const parameter = normalized.replace(/search for/i, '').trim();
      return {
        action: 'search',
        ...(parameter ? { parameter } : {}),
        originalText: normalized
      };
    }

    return null;
  }
}
