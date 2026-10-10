// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FloatingCamera } from './floatingCamera';

function fixture() {
  const pip = new EventTarget() as EventTarget & {
    document: Document;
    close: () => void;
    focus: () => void;
    closed: boolean;
  };
  pip.document = document.implementation.createHTMLDocument('');
  pip.closed = false;
  pip.close = vi.fn(() => {
    pip.closed = true;
    pip.dispatchEvent(new Event('pagehide'));
  });
  pip.focus = vi.fn();
  const requestWindow = vi.fn().mockResolvedValue(pip);
  Object.defineProperty(window, 'documentPictureInPicture', {
    configurable: true,
    value: { requestWindow },
  });
  const callbacks = { change: vi.fn(), pause: vi.fn(), stop: vi.fn() };
  return { pip, requestWindow, callbacks, floating: new FloatingCamera(callbacks) };
}

afterEach(() => {
  Reflect.deleteProperty(window, 'documentPictureInPicture');
  vi.restoreAllMocks();
});

describe('floating camera window', () => {
  it('requests a window synchronously, attaches the stream, and wires recording controls', async () => {
    const { floating, pip, callbacks, requestWindow } = fixture();
    const stream = new MediaStream();
    floating.update({ stream, state: 'recording', elapsed: 14000 });
    const pending = floating.open();
    expect(requestWindow).toHaveBeenCalledTimes(1);
    await pending;
    expect(pip.document.querySelector('video')?.srcObject).toBe(stream);
    expect(pip.document.body.textContent).toContain('Recording · 00:14');
    const buttons = pip.document.querySelectorAll('button');
    buttons[0].click();
    buttons[1].click();
    expect(callbacks.pause).toHaveBeenCalledOnce();
    expect(callbacks.stop).toHaveBeenCalledOnce();
    floating.update({ stream, state: 'paused', elapsed: 14000 });
    expect(buttons[0].textContent).toBe('Resume');
  });

  it('reuses the window and coalesces simultaneous open requests', async () => {
    const { floating, requestWindow, pip } = fixture();
    await Promise.all([floating.open(), floating.open()]);
    await floating.open();
    expect(requestWindow).toHaveBeenCalledOnce();
    expect(pip.focus).toHaveBeenCalledOnce();
  });

  it('closing the preview releases its reference without stopping source tracks', async () => {
    const { floating, pip, callbacks } = fixture();
    const stop = vi.fn();
    const stream = new MediaStream();
    Object.defineProperty(stream, 'getTracks', {
      value: () => [{ stop } as unknown as MediaStreamTrack],
    });
    floating.update({
      stream,
      state: 'recording',
      elapsed: 0,
    });
    await floating.open();
    const video = pip.document.querySelector('video');
    pip.close();
    expect(video?.srcObject).toBeNull();
    expect(callbacks.change).toHaveBeenLastCalledWith(false);
    expect(callbacks.stop).not.toHaveBeenCalled();
    expect(stop).not.toHaveBeenCalled();
  });

  it('closes a late-opened window after recording cleanup', async () => {
    const { floating, pip, requestWindow } = fixture();
    let resolve!: (value: unknown) => void;
    requestWindow.mockImplementation(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
    const pending = floating.open();
    floating.close();
    resolve(pip);
    await pending;
    expect(pip.close).toHaveBeenCalledOnce();
    expect(pip.document.querySelector('video')).toBeNull();
  });

  it('closes on explicit cleanup and disables recording controls in preflight', async () => {
    const { floating, pip } = fixture();
    await floating.open();
    expect(pip.document.querySelector('button')?.disabled).toBe(true);
    floating.close();
    expect(pip.close).toHaveBeenCalledOnce();
  });

  it('returns actionable errors when unavailable or denied', async () => {
    const { floating, requestWindow } = fixture();
    requestWindow.mockRejectedValue(new DOMException('Gesture required', 'NotAllowedError'));
    await expect(floating.open()).rejects.toThrow('Gesture required');
    Reflect.deleteProperty(window, 'documentPictureInPicture');
    await expect(floating.open()).rejects.toThrow('desktop Chrome');
  });
});
