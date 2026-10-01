export interface ReadAloudOptions {
  rate?: number;
  pitch?: number;
  language?: string;
  onSentenceChange?: (sentenceIndex: number) => void;
  onEnd?: () => void;
}

// Convert markdown & citation tokens into clean spoken words (e.g. "[E1]" -> "evidence 1")
export function renderSpokenText(text: string): string {
  return text
    .replace(/\[E(\d+)\]/g, ' evidence $1 ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Markdown links [text](url) -> text
    .replace(/[#*_`~>]/g, '') // Markdown punctuation
    .replace(/https?:\/\/\S+/g, '') // Strip raw URLs
    .replace(/\s+/g, ' ')
    .trim();
}

// Split text into sentence-sized utterances to avoid browser stall on long speech
export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export class TextToSpeechSpeaker {
  private currentUtteranceIndex = 0;
  private sentences: string[] = [];
  private isSpeaking = false;
  private isPaused = false;

  speak(text: string, options: ReadAloudOptions = {}) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      console.warn('SpeechSynthesis is not supported in this browser.');
      return;
    }

    this.stop();
    const cleanText = renderSpokenText(text);
    this.sentences = splitSentences(cleanText);
    if (this.sentences.length === 0) return;

    this.currentUtteranceIndex = 0;
    this.isSpeaking = true;
    this.isPaused = false;
    this.playNext(options);
  }

  private playNext(options: ReadAloudOptions) {
    if (this.currentUtteranceIndex >= this.sentences.length || !this.isSpeaking) {
      this.isSpeaking = false;
      if (options.onEnd) options.onEnd();
      return;
    }

    const sentence = this.sentences[this.currentUtteranceIndex];
    const utterance = new SpeechSynthesisUtterance(sentence);
    utterance.rate = options.rate || 1.0;
    utterance.pitch = options.pitch || 1.0;

    // Pick matching voice
    const voices = window.speechSynthesis.getVoices();
    const lang = options.language || 'en';
    const matchingVoice = voices.find((v) => v.lang.startsWith(lang));
    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }

    if (options.onSentenceChange) {
      options.onSentenceChange(this.currentUtteranceIndex);
    }

    utterance.onend = () => {
      this.currentUtteranceIndex++;
      this.playNext(options);
    };

    utterance.onerror = (e) => {
      console.warn('SpeechSynthesis error:', e);
      this.currentUtteranceIndex++;
      this.playNext(options);
    };

    window.speechSynthesis.speak(utterance);
  }

  pause() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.pause();
      this.isPaused = true;
    }
  }

  resume() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.resume();
      this.isPaused = false;
    }
  }

  stop() {
    this.isSpeaking = false;
    this.isPaused = false;
    this.currentUtteranceIndex = 0;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  getSpeakingState(): { isSpeaking: boolean; isPaused: boolean; currentIndex: number } {
    return {
      isSpeaking: this.isSpeaking,
      isPaused: this.isPaused,
      currentIndex: this.currentUtteranceIndex,
    };
  }
}

export const speechSpeaker = new TextToSpeechSpeaker();
