export interface Capabilities {
  secureContext: boolean;
  getUserMedia: boolean;
  mediaRecorder: boolean;
  recorderMimeType: string | null;
  audioContext: boolean;
  speechRecognition: boolean;
  speechSynthesis: boolean;
  voicesAvailable: boolean;
  imageCapture: boolean;
  screenCapture: boolean;
  wakeLock: boolean;
  vibrate: boolean;
  notifications: boolean;
  online: boolean;
}

export function detectCapabilities(): Capabilities {
  const secureContext = typeof window !== 'undefined' ? window.isSecureContext : false;
  const hasNavigator = typeof navigator !== 'undefined';
  const getUserMedia = Boolean(hasNavigator && navigator.mediaDevices?.getUserMedia);
  const mediaRecorder = typeof window !== 'undefined' && 'MediaRecorder' in window;

  // Find preferred supported audio mime type
  let recorderMimeType: string | null = null;
  if (mediaRecorder) {
    const preferences = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
      'audio/wav',
    ];
    for (const mime of preferences) {
      if (MediaRecorder.isTypeSupported(mime)) {
        recorderMimeType = mime;
        break;
      }
    }
  }

  const audioContext = typeof window !== 'undefined' && ('AudioContext' in window || 'webkitAudioContext' in window);
  const speechRecognition = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
  const speechSynthesis = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const imageCapture = typeof window !== 'undefined' && 'ImageCapture' in window;
  const screenCapture = Boolean(hasNavigator && navigator.mediaDevices?.getDisplayMedia);
  const wakeLock = Boolean(hasNavigator && 'wakeLock' in navigator);
  const vibrate = Boolean(hasNavigator && 'vibrate' in navigator);
  const notifications = typeof window !== 'undefined' && 'Notification' in window;
  const online = typeof navigator !== 'undefined' ? navigator.onLine : true;

  return {
    secureContext,
    getUserMedia,
    mediaRecorder,
    recorderMimeType,
    audioContext,
    speechRecognition,
    speechSynthesis,
    voicesAvailable: speechSynthesis ? window.speechSynthesis.getVoices().length > 0 : false,
    imageCapture,
    screenCapture,
    wakeLock,
    vibrate,
    notifications,
    online,
  };
}
