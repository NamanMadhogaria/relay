export type CaptureState =
  | 'idle'
  | 'choosing'
  | 'microphone'
  | 'camera'
  | 'countdown'
  | 'recording'
  | 'paused'
  | 'saving';

export function formatTime(milliseconds: number) {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const shortTime = `${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60)
    .toString()
    .padStart(2, '0')}`;
  return minutes >= 60 ? `${Math.floor(minutes / 60)}:${shortTime}` : shortTime;
}

export function captureError(error: unknown) {
  const name = error instanceof Error ? error.name : '';
  if (name === 'NotAllowedError')
    return 'Permission was not granted. Try again and choose what to share, or turn off the microphone.';
  if (name === 'NotFoundError')
    return 'No microphone was found. Connect one or record without a microphone.';
  if (name === 'NotReadableError')
    return 'The device could not be opened. Check system permissions and whether another app is using it.';
  return error instanceof Error ? error.message : 'Recording could not start. Please try again.';
}

export function microphoneError(error: unknown) {
  if (
    error instanceof Error &&
    (error.name === 'NotAllowedError' || error.name === 'SecurityError')
  ) {
    return 'Microphone access is blocked. Allow microphone access for Relay in Chrome and check Windows microphone privacy settings, then try again. You can also turn the microphone off to record only your screen.';
  }
  return `Microphone: ${captureError(error)}`;
}

export function cameraError(error: unknown) {
  const name = error instanceof Error ? error.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError')
    return 'Camera access is blocked. Allow camera access for Relay in Chrome and check Windows camera privacy settings, or turn Camera off to record your screen.';
  if (name === 'NotFoundError')
    return 'No camera was found. Connect a webcam or turn Camera off to continue.';
  if (name === 'NotReadableError')
    return 'Your camera could not be opened. Close other apps using it, check the laptop privacy shutter, and try again.';
  return error instanceof Error
    ? error.message
    : 'Camera could not start. Try again or turn Camera off.';
}

export class RecordingClock {
  private accumulated = 0;
  private startedAt: number | null = null;
  start(now: number) {
    this.accumulated = 0;
    this.startedAt = now;
  }
  pause(now: number) {
    if (this.startedAt !== null) {
      this.accumulated += now - this.startedAt;
      this.startedAt = null;
    }
  }
  resume(now: number) {
    if (this.startedAt === null) this.startedAt = now;
  }
  elapsed(now: number) {
    return this.accumulated + (this.startedAt === null ? 0 : now - this.startedAt);
  }
}
