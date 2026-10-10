// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useRecorder } from './useRecorder';
import { createCompositeCapture } from './compositor';

vi.mock('./compositor', () => ({ createCompositeCapture: vi.fn() }));

class Track {
  readyState = 'live';
  onended: (() => void) | null = null;
  constructor(public kind: string) {}
  stop = vi.fn(() => {
    this.readyState = 'ended';
  });
}
class Stream {
  constructor(private tracks: Track[]) {}
  getTracks() {
    return this.tracks;
  }
  getVideoTracks() {
    return this.tracks.filter((track) => track.kind === 'video');
  }
  getAudioTracks() {
    return this.tracks.filter((track) => track.kind === 'audio');
  }
}
class Recorder {
  static instances: Recorder[] = [];
  static isTypeSupported() {
    return true;
  }
  state = 'inactive';
  onstop: (() => void) | null = null;
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  constructor(public stream: Stream) {
    Recorder.instances.push(this);
  }
  start() {
    this.state = 'recording';
  }
  stop() {
    this.state = 'inactive';
    this.ondataavailable?.({ data: new Blob(['video']) });
    this.onstop?.();
  }
}

let video: Track;
let audio: Track;
let getDisplayMedia: ReturnType<typeof vi.fn>;
let getUserMedia: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.useFakeTimers();
  video = new Track('video');
  audio = new Track('audio');
  getDisplayMedia = vi.fn().mockResolvedValue(new Stream([video]));
  getUserMedia = vi.fn().mockResolvedValue(new Stream([audio]));
  vi.stubGlobal('navigator', { mediaDevices: { getDisplayMedia, getUserMedia } });
  vi.stubGlobal('MediaStream', Stream);
  vi.stubGlobal('MediaRecorder', Recorder);
  vi.stubGlobal(
    'AudioContext',
    class {
      resume() {
        return Promise.resolve();
      }
      close() {
        return Promise.resolve();
      }
      createMediaStreamSource() {
        return { connect() {} };
      }
      createAnalyser() {
        return {
          fftSize: 256,
          getByteTimeDomainData(data: Uint8Array) {
            data.fill(128);
          },
        };
      }
    },
  );
  Recorder.instances = [];
  vi.mocked(createCompositeCapture).mockReset();
});

describe('optional camera recording', () => {
  function setupCamera() {
    const webcam = new Track('video');
    const mixed = new Track('video');
    getUserMedia.mockImplementation((options) =>
      Promise.resolve(new Stream([options.video ? webcam : audio])),
    );
    const dispose = vi.fn(() => mixed.stop());
    vi.mocked(createCompositeCapture).mockResolvedValue({
      stream: new Stream([mixed]) as unknown as MediaStream,
      dispose,
    });
    return { webcam, mixed, dispose };
  }

  it('previews the camera, records composite pixels plus audio, and releases everything on stop', async () => {
    const { webcam, mixed, dispose } = setupCamera();
    const complete = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useRecorder(complete));
    expect(result.current.cameraEnabled).toBe(false);
    await act(async () => {
      result.current.toggleCamera();
    });
    expect(result.current.cameraStream?.getVideoTracks()).toEqual([webcam]);
    await act(async () => {
      const pending = result.current.start();
      await vi.advanceTimersByTimeAsync(3000);
      await pending;
    });
    expect(result.current.state).toBe('recording');
    expect(Recorder.instances[0].stream.getVideoTracks()).toEqual([mixed]);
    expect(Recorder.instances[0].stream.getAudioTracks()).toEqual([audio]);
    await act(async () => result.current.stop());
    expect(complete).toHaveBeenCalledWith(
      expect.objectContaining({ camera: true, microphone: true }),
    );
    expect(dispose).toHaveBeenCalled();
    expect(webcam.stop).toHaveBeenCalled();
    expect(video.stop).toHaveBeenCalled();
    expect(audio.stop).toHaveBeenCalled();
    expect(result.current.cameraStream).toBeNull();
  });

  it('permits screen-only recording after camera permission is denied', async () => {
    getUserMedia.mockRejectedValue(new DOMException('Denied', 'NotAllowedError'));
    const { result } = renderHook(() => useRecorder(vi.fn()));
    await act(async () => result.current.toggleCamera());
    expect(result.current.error).toContain('Camera access is blocked');
    expect(result.current.cameraStream).toBeNull();
    act(() => {
      result.current.toggleCamera();
      result.current.toggleMic();
    });
    await act(async () => {
      const pending = result.current.start();
      await vi.advanceTimersByTimeAsync(3000);
      await pending;
    });
    expect(result.current.state).toBe('recording');
    expect(createCompositeCapture).not.toHaveBeenCalled();
  });

  it('stops and preserves the recording if the camera disconnects', async () => {
    const { webcam } = setupCamera();
    const complete = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useRecorder(complete));
    await act(async () => result.current.toggleCamera());
    await act(async () => {
      const pending = result.current.start();
      await vi.advanceTimersByTimeAsync(3000);
      await pending;
    });
    await act(async () => webcam.onended?.());
    expect(complete).toHaveBeenCalledTimes(1);
    expect(result.current.state).toBe('idle');
    expect(result.current.notice).toContain('camera disconnected');
  });

  it('releases camera, microphone, and screen if compositing fails to start', async () => {
    const { webcam } = setupCamera();
    vi.mocked(createCompositeCapture).mockRejectedValue(new Error('Overlay failed'));
    const { result } = renderHook(() => useRecorder(vi.fn()));
    await act(async () => result.current.toggleCamera());
    await act(async () => {
      await result.current.start();
    });
    expect(result.current.state).toBe('idle');
    expect(result.current.error).toBe('Overlay failed');
    expect(webcam.stop).toHaveBeenCalled();
    expect(audio.stop).toHaveBeenCalled();
    expect(video.stop).toHaveBeenCalled();
  });

  it('releases preview immediately when camera is switched off', async () => {
    const { webcam } = setupCamera();
    const { result } = renderHook(() => useRecorder(vi.fn()));
    await act(async () => result.current.toggleCamera());
    act(() => result.current.toggleCamera());
    expect(webcam.stop).toHaveBeenCalled();
    expect(result.current.cameraStream).toBeNull();
    expect(result.current.cameraEnabled).toBe(false);
  });

  it('releases a permission grant arriving after the studio unmounts', async () => {
    let grant!: (stream: Stream) => void;
    const webcam = new Track('video');
    getUserMedia.mockImplementation(
      () =>
        new Promise((resolve) => {
          grant = resolve;
        }),
    );
    const { result, unmount } = renderHook(() => useRecorder(vi.fn()));
    act(() => result.current.toggleCamera());
    unmount();
    await act(async () => grant(new Stream([webcam])));
    expect(webcam.stop).toHaveBeenCalled();
  });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('microphone setup when starting a recording', () => {
  it('continues beyond the former size and time limits until manually stopped', async () => {
    const now = vi.spyOn(performance, 'now').mockReturnValue(0);
    const complete = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useRecorder(complete));
    act(() => result.current.toggleMic());
    await act(async () => {
      const pending = result.current.start();
      await vi.advanceTimersByTimeAsync(3000);
      await pending;
    });
    // Simulate a large chunk without allocating 101 MB in the test runner.
    const chunk = new Blob(['first-chunk']);
    Object.defineProperty(chunk, 'size', { value: 101 * 1024 * 1024 });
    await act(async () => Recorder.instances[0].ondataavailable?.({ data: chunk }));
    expect(result.current.state).toBe('recording');
    expect(complete).not.toHaveBeenCalled();
    now.mockReturnValue(2 * 60 * 60 * 1000);
    await act(async () => vi.advanceTimersByTimeAsync(200));
    expect(result.current.elapsed).toBe(7200000);
    expect(result.current.state).toBe('recording');
    expect(complete).not.toHaveBeenCalled();
    await act(async () => result.current.stop());
    expect(complete).toHaveBeenCalledOnce();
    expect(complete.mock.calls[0][0].duration).toBe(7200000);
    expect(result.current.state).toBe('idle');
    expect(video.stop).toHaveBeenCalled();
  });

  it('requests the screen immediately and connects audio without a separate mic check', async () => {
    const { result } = renderHook(() => useRecorder(vi.fn()));
    await act(async () => {
      const pending = result.current.start();
      // Must happen before any await, while the original click has activation.
      expect(getDisplayMedia).toHaveBeenCalledTimes(1);
      expect(getUserMedia).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(3000);
      await pending;
    });
    expect(getUserMedia).toHaveBeenCalledTimes(1);
    expect(result.current.state).toBe('recording');
    expect(result.current.error).toBe('');
    expect(Recorder.instances[0].stream.getAudioTracks()).toEqual([audio]);
    expect(Recorder.instances[0].stream.getVideoTracks()).toEqual([video]);
  });

  it('releases screen capture and allows retry when microphone permission is denied', async () => {
    getUserMedia.mockRejectedValueOnce(new DOMException('Denied', 'NotAllowedError'));
    const { result } = renderHook(() => useRecorder(vi.fn()));
    await act(async () => {
      await result.current.start();
    });
    expect(result.current.state).toBe('idle');
    expect(result.current.error).toContain('Microphone access is blocked');
    expect(video.stop).toHaveBeenCalled();
    expect(Recorder.instances).toHaveLength(0);
    video = new Track('video');
    getDisplayMedia.mockResolvedValue(new Stream([video]));
    await act(async () => {
      const pending = result.current.start();
      await vi.advanceTimersByTimeAsync(3000);
      await pending;
    });
    expect(result.current.state).toBe('recording');
  });

  it('does not request microphone permission when the screen picker is cancelled', async () => {
    getDisplayMedia.mockRejectedValue(new DOMException('Cancelled', 'NotAllowedError'));
    const { result } = renderHook(() => useRecorder(vi.fn()));
    await act(async () => {
      await result.current.start();
    });
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(result.current.state).toBe('idle');
  });

  it('keeps screen-only recording available without microphone permission', async () => {
    const { result } = renderHook(() => useRecorder(vi.fn()));
    act(() => result.current.toggleMic());
    await act(async () => {
      const pending = result.current.start();
      await vi.advanceTimersByTimeAsync(3000);
      await pending;
    });
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(Recorder.instances[0].stream.getAudioTracks()).toEqual([]);
    expect(result.current.state).toBe('recording');
  });

  it('reuses the microphone if the optional preflight check has already connected it', async () => {
    const { result } = renderHook(() => useRecorder(vi.fn()));
    await act(async () => {
      await result.current.checkMic();
    });
    await act(async () => {
      const pending = result.current.start();
      await vi.advanceTimersByTimeAsync(3000);
      await pending;
    });
    expect(getUserMedia).toHaveBeenCalledTimes(1);
    expect(result.current.state).toBe('recording');
  });

  it('releases a late microphone grant if screen sharing ended while waiting', async () => {
    let grant!: (stream: Stream) => void;
    getUserMedia.mockImplementation(
      () =>
        new Promise((resolve) => {
          grant = resolve;
        }),
    );
    const { result } = renderHook(() => useRecorder(vi.fn()));
    let pending!: Promise<void>;
    await act(async () => {
      pending = result.current.start();
      await Promise.resolve();
    });
    expect(result.current.state).toBe('microphone');
    await act(async () => {
      video.onended?.();
      grant(new Stream([audio]));
      await pending;
    });
    expect(result.current.state).toBe('idle');
    expect(audio.stop).toHaveBeenCalled();
    expect(video.stop).toHaveBeenCalled();
    expect(Recorder.instances).toHaveLength(0);
  });
});
