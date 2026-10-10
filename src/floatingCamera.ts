import { formatTime, type CaptureState } from './recorder';
import cameraFontUrl from '@fontsource-variable/open-sans/files/open-sans-latin-wght-normal.woff2?url';

type PictureInPictureApi = {
  requestWindow: (options: { width: number; height: number }) => Promise<Window>;
};

export type FloatingCameraState = {
  stream: MediaStream | null;
  state: CaptureState;
  elapsed: number;
};

export function pictureInPictureApi(): PictureInPictureApi | undefined {
  return (window as Window & { documentPictureInPicture?: PictureInPictureApi })
    .documentPictureInPicture;
}

// Owns only the preview window. Closing it must never stop the recording tracks.
export class FloatingCamera {
  private window: Window | null = null;
  private video: HTMLVideoElement | null = null;
  private status: HTMLElement | null = null;
  private pauseButton: HTMLButtonElement | null = null;
  private stopButton: HTMLButtonElement | null = null;
  private opening: Promise<void> | null = null;
  private generation = 0;
  private themeObserver: MutationObserver | null = null;
  private current: FloatingCameraState = { stream: null, state: 'idle', elapsed: 0 };

  constructor(
    private callbacks: {
      change: (open: boolean) => void;
      pause: () => void;
      stop: () => void;
    },
  ) {}

  open(): Promise<void> {
    if (this.window && !this.window.closed) {
      this.window.focus();
      return Promise.resolve();
    }
    if (this.opening) return this.opening;
    const api = pictureInPictureApi();
    if (!api)
      return Promise.reject(
        new Error(
          'Floating camera is not supported here. Open Relay in an up-to-date desktop Chrome browser. Your face can still be included in the saved video.',
        ),
      );
    const generation = this.generation;
    // Must run synchronously from a user click, before camera permission awaits.
    const request = api.requestWindow({ width: 264, height: 338 });
    const pending = request
      .then((pip) => {
        if (generation !== this.generation) {
          pip.close();
          return;
        }
        this.window = pip;
        const doc = pip.document;
        doc.title = 'Relay camera';
        const syncTheme = () => {
          doc.documentElement.dataset.theme = document.documentElement.dataset.theme ?? 'light';
        };
        syncTheme();
        this.themeObserver = new MutationObserver(syncTheme);
        this.themeObserver.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ['data-theme'],
        });
        const style = doc.createElement('style');
        style.textContent = `
        @font-face { font-family: 'Open Sans'; src: url('${new URL(cameraFontUrl, window.location.href).href}') format('woff2'); font-style: normal; font-weight: 300 800; font-display: swap; }
        * { box-sizing: border-box; }
        body { margin: 0; padding: 14px 16px 10px; background: #f4f3f7; color: #292731; font: 13px/1.5 'Open Sans', 'Segoe UI', sans-serif; text-align: center; -webkit-font-smoothing: antialiased; }
        video { display: block; width: min(100%, 202px); aspect-ratio: 1; border-radius: 50%; object-fit: cover; margin: 0 auto 12px; background: #282630; border: 3px solid white; box-shadow: 0 8px 26px #24202e24, 0 0 0 1px #24202e0a; }
        p { margin: 8px 0; }
        [role='status'] { display: flex; align-items: center; justify-content: center; gap: 7px; min-height: 20px; font-size: 12px; font-weight: 550; font-variant-numeric: tabular-nums; }
        [role='status']::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: #39a97c; flex-shrink: 0; }
        [data-state='recording']::before { background: #ed5764; }
        [data-state='paused']::before { background: #da9f38; }
        .hint { color: #777380; font-size: 10px; margin: 9px 0 0; }
        .controls { display: flex; justify-content: center; gap: 5px; width: fit-content; max-width: 100%; margin: 0 auto; padding: 5px; border-radius: 28px; background: #24222c; box-shadow: 0 4px 12px #24202e1f; }
        button { display: inline-flex; align-items: center; justify-content: center; gap: 7px; min-height: 36px; border: 0; border-radius: 22px; background: transparent; color: #fff; padding: 7px 13px; font: 550 12px 'Open Sans', sans-serif; cursor: pointer; }
        button:hover:not(:disabled) { background: #403b4d; }
        button::before { content: ''; width: 10px; height: 12px; border-left: 3px solid currentColor; border-right: 3px solid currentColor; }
        button[data-paused='true']::before { width: 0; height: 0; border: 6px solid transparent; border-left: 9px solid currentColor; border-right: 0; }
        .finish { background: #f26473; color: #24141a; }
        .finish:hover:not(:disabled) { background: #ff8190; }
        .finish::before { width: 10px; height: 10px; border: 0; border-radius: 2px; background: currentColor; }
        button:disabled { opacity: .4; cursor: default; }
        button:focus-visible { outline: 2px solid #a79afa; outline-offset: 2px; }
        @media (max-width: 220px) { body { padding: 10px; } button { padding: 7px 9px; } }
        :root { color-scheme: light; }
        :root[data-theme='dark'] { color-scheme: dark; }
        [data-theme='dark'] body { background: #151a22; color: #edf1f7; }
        [data-theme='dark'] .hint { color: #adb7c6; }
        [data-theme='dark'] .controls { background: #303949; }
        [data-theme='dark'] video { border-color: #637185; }
      `;
        doc.head.append(style);
        const video = doc.createElement('video');
        video.muted = true;
        video.autoplay = true;
        video.playsInline = true;
        video.setAttribute('aria-label', 'Floating live camera');
        const status = doc.createElement('p');
        status.setAttribute('role', 'status');
        const hint = doc.createElement('p');
        hint.className = 'hint';
        hint.textContent = 'Drag the title bar to move your bubble';
        const controls = doc.createElement('div');
        controls.className = 'controls';
        const pauseButton = doc.createElement('button');
        pauseButton.addEventListener('click', () => this.callbacks.pause());
        const stopButton = doc.createElement('button');
        stopButton.className = 'finish';
        stopButton.textContent = 'Finish';
        stopButton.addEventListener('click', () => this.callbacks.stop());
        controls.append(pauseButton, stopButton);
        doc.body.append(video, status, controls, hint);
        this.video = video;
        this.status = status;
        this.pauseButton = pauseButton;
        this.stopButton = stopButton;
        pip.addEventListener(
          'pagehide',
          () => {
            video.srcObject = null;
            if (this.window !== pip) return;
            this.clearReferences();
            this.callbacks.change(false);
          },
          { once: true },
        );
        this.update(this.current);
        this.callbacks.change(true);
      })
      .finally(() => {
        if (this.opening === pending) this.opening = null;
      });
    this.opening = pending;
    return pending;
  }

  update(next: FloatingCameraState) {
    this.current = next;
    if (!this.video || !this.status) return;
    if (this.video.srcObject !== next.stream) {
      this.video.srcObject = next.stream;
      if (next.stream) void this.video.play().catch(() => undefined);
    }
    const active = next.state === 'recording' || next.state === 'paused';
    this.status.dataset.state = next.state;
    this.status.textContent = active
      ? `${next.state === 'paused' ? 'Paused' : 'Recording'} · ${formatTime(next.elapsed)}`
      : next.state === 'countdown'
        ? 'Starting recording…'
        : next.stream
          ? 'Camera ready'
          : 'Waiting for camera permission…';
    if (this.pauseButton) {
      this.pauseButton.disabled = !active;
      this.pauseButton.textContent = next.state === 'paused' ? 'Resume' : 'Pause';
      this.pauseButton.dataset.paused = String(next.state === 'paused');
    }
    if (this.stopButton) this.stopButton.disabled = !active;
  }

  close() {
    this.generation++;
    this.opening = null;
    const pip = this.window;
    if (this.video) this.video.srcObject = null;
    this.clearReferences();
    pip?.close();
    this.callbacks.change(false);
  }

  private clearReferences() {
    this.themeObserver?.disconnect();
    this.themeObserver = null;
    this.window = null;
    this.video = null;
    this.status = null;
    this.pauseButton = null;
    this.stopButton = null;
  }
}
