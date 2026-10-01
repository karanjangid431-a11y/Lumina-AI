export type PermissionState =
  | 'unknown'
  | 'prompt'
  | 'requesting'
  | 'granted'
  | 'denied'
  | 'dismissed'
  | 'no_device'
  | 'device_busy'
  | 'overconstrained'
  | 'insecure_context'
  | 'unsupported'
  | 'error';

export interface PermissionResolution {
  state: PermissionState;
  message: string;
  actionGuidance: string;
  canRetry: boolean;
}

export function mapMediaError(error: any): PermissionResolution {
  if (!error) {
    return {
      state: 'unknown',
      message: 'Unknown state',
      actionGuidance: '',
      canRetry: true,
    };
  }

  const name = error.name || '';

  switch (name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return {
        state: 'denied',
        message: 'Microphone or camera access was blocked by your browser settings.',
        actionGuidance:
          'Click the lock/tune icon in your browser address bar, set Microphone/Camera permissions to "Allow", and try again. You can always use typing or file upload below.',
        canRetry: false,
      };

    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return {
        state: 'no_device',
        message: 'No microphone or camera hardware was detected on your system.',
        actionGuidance: 'Please plug in a microphone or external webcam, or continue by typing your query.',
        canRetry: true,
      };

    case 'NotReadableError':
    case 'TrackStartError':
      return {
        state: 'device_busy',
        message: 'Your microphone or camera is currently in use by another application or browser tab.',
        actionGuidance: 'Close other tabs (e.g. Zoom, Teams, Meet) using your media devices and retry.',
        canRetry: true,
      };

    case 'OverconstrainedError':
      return {
        state: 'overconstrained',
        message: 'Requested device constraints could not be satisfied.',
        actionGuidance: 'Default system device will be used instead.',
        canRetry: true,
      };

    case 'SecurityError':
      return {
        state: 'insecure_context',
        message: 'Media capture requires a secure HTTPS connection or localhost.',
        actionGuidance: 'Please open this application over HTTPS.',
        canRetry: false,
      };

    default:
      return {
        state: 'error',
        message: error.message || 'An unexpected error occurred while accessing your device.',
        actionGuidance: 'You can continue seamlessly using text typing or file upload.',
        canRetry: true,
      };
  }
}
