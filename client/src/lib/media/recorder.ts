import { streamManager } from './streamManager.js';
import { detectCapabilities } from './capabilities.js';

export interface RecorderOptions {
  maxDurationSeconds?: number;
  onLevelChange?: (level: number) => void;
  onSilenceDetected?: () => void;
  onTimeUpdate?: (secondsRemaining: number) => void;
}

export class VoiceRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private animFrameId: number | null = null;
  private chunks: Blob[] = [];
  private startTime: number = 0;
  private timerInterval: any = null;
  private isRecording = false;

  constructor(private options: RecorderOptions = {}) {}

  async start(): Promise<void> {
    const caps = detectCapabilities();
    const stream = await streamManager.acquire(
      'audio',
      {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      },
      'voice-recorder'
    );

    this.chunks = [];
    const mimeType = caps.recorderMimeType || undefined;
    this.mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        this.chunks.push(e.data);
      }
    };

    // Setup Web Audio Analyser for live level meter
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.audioContext = new AudioCtx();
        const source = this.audioContext.createMediaStreamSource(stream);
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        source.connect(this.analyser);
        this.trackLevel();
      }
    } catch (err) {
      console.warn('Audio level analyser not supported:', err);
    }

    this.mediaRecorder.start(1000); // 1s timeslice
    this.isRecording = true;
    this.startTime = Date.now();

    const maxSecs = this.options.maxDurationSeconds || 120;
    this.timerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
      const remaining = Math.max(0, maxSecs - elapsed);
      if (this.options.onTimeUpdate) {
        this.options.onTimeUpdate(remaining);
      }
      if (remaining <= 0) {
        this.stop();
      }
    }, 1000);
  }

  private trackLevel() {
    if (!this.analyser) return;
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);

    const update = () => {
      if (!this.isRecording || !this.analyser) return;
      this.analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const avg = sum / dataArray.length;
      const level = Math.min(100, Math.round((avg / 128) * 100));

      if (this.options.onLevelChange) {
        this.options.onLevelChange(level);
      }

      this.animFrameId = requestAnimationFrame(update);
    };

    this.animFrameId = requestAnimationFrame(update);
  }

  async stop(): Promise<Blob> {
    this.isRecording = false;
    clearInterval(this.timerInterval);
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);

    return new Promise((resolve) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        const blob = new Blob(this.chunks, { type: 'audio/webm' });
        streamManager.release('voice-recorder');
        resolve(blob);
        return;
      }

      this.mediaRecorder.onstop = () => {
        const mime = this.mediaRecorder?.mimeType || 'audio/webm';
        const finalBlob = new Blob(this.chunks, { type: mime });
        streamManager.release('voice-recorder');
        if (this.audioContext) {
          this.audioContext.close().catch(() => {});
        }
        resolve(finalBlob);
      };

      this.mediaRecorder.stop();
    });
  }

  cancel() {
    this.isRecording = false;
    clearInterval(this.timerInterval);
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch {}
    }
    streamManager.release('voice-recorder');
    this.chunks = [];
  }
}
