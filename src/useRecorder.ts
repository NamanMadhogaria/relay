import { useEffect, useRef, useState } from 'react';
import { CaptureState, captureError, microphoneError, RecordingClock } from './recorder';
import type { Recording } from './storage';
import { cameraError } from './recorder';
import { createCompositeCapture, type CompositeCapture } from './compositor';
import { FloatingCamera } from './floatingCamera';

export function useRecorder(onComplete: (recording: Recording) => Promise<void>) {
  const [state, setState] = useState<CaptureState>('idle');
  const [micEnabled, setMicEnabled] = useState(true);
  const [micReady, setMicReady] = useState(false);
  const [micChecking, setMicChecking] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [cameraChecking, setCameraChecking] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [floatingOpen, setFloatingOpen] = useState(false);
  const [shareSurface, setShareSurface] = useState('');
  const [level, setLevel] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [countdown, setCountdown] = useState(3);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const mic = useRef<MediaStream | null>(null);
  const display = useRef<MediaStream | null>(null);
  const camera = useRef<MediaStream | null>(null);
  const cameraPending = useRef(false);
  const composite = useRef<CompositeCapture | null>(null);
  const compositeAbort = useRef<AbortController | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const animation = useRef(0);
  const clock = useRef(new RecordingClock());
  const phase = useRef<CaptureState>('idle');
  const pending = useRef(false);
  const micPending = useRef(false);
  const mounted = useRef(true);
  const cancel = useRef(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const floating = useRef<FloatingCamera | null>(null);
  if (!floating.current) {
    floating.current = new FloatingCamera({
      change: setFloatingOpen,
      pause: () => pauseResume(),
      stop: () => stop(),
    });
  }
  const stateChange = (value: CaptureState) => {
    phase.current = value;
    setState(value);
  };

  function releaseMic() {
    cancelAnimationFrame(animation.current);
    mic.current?.getTracks().forEach((track) => track.stop());
    mic.current = null;
    void audioContext.current?.close().catch(() => undefined);
    audioContext.current = null;
    setMicReady(false);
    setLevel(0);
  }

  function releaseCamera(closeWindow = true) {
    if (closeWindow) floating.current?.close();
    camera.current?.getTracks().forEach((track) => track.stop());
    camera.current = null;
    setCameraStream(null);
  }

  function releaseMedia() {
    compositeAbort.current?.abort();
    compositeAbort.current = null;
    composite.current?.dispose();
    composite.current = null;
    display.current?.getTracks().forEach((track) => track.stop());
    display.current = null;
    releaseMic();
    releaseCamera();
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  }

  async function connectCamera() {
    releaseCamera(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30 },
          facingMode: 'user',
        },
        audio: false,
      });
      if (!mounted.current || cancel.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      if (!stream.getVideoTracks().some((track) => track.readyState === 'live')) {
        stream.getTracks().forEach((track) => track.stop());
        throw new Error('No live camera was found. Reconnect it or turn Camera off.');
      }
      camera.current = stream;
      setCameraStream(stream);
      stream.getVideoTracks()[0].onended = () => {
        setNotice(
          'Your camera disconnected. Any active recording has been stopped so you can check the saved clip.',
        );
        releaseCamera();
        stop();
      };
    } catch (failure) {
      releaseCamera();
      throw new Error(cameraError(failure));
    }
  }

  async function checkCamera() {
    if (cameraPending.current || micPending.current || pending.current || phase.current !== 'idle')
      return;
    cameraPending.current = true;
    cancel.current = false;
    setCameraChecking(true);
    setError('');
    showFloatingCamera();
    try {
      await connectCamera();
    } catch (failure) {
      setError(captureError(failure));
    } finally {
      cameraPending.current = false;
      setCameraChecking(false);
    }
  }

  function showFloatingCamera() {
    try {
      void floating.current?.open().catch((failure: unknown) => {
        if (mounted.current) setNotice(captureError(failure));
      });
    } catch (failure) {
      setNotice(captureError(failure));
    }
  }

  function hideFloatingCamera() {
    floating.current?.close();
  }

  function toggleCamera() {
    if (cameraPending.current || micPending.current || pending.current || phase.current !== 'idle')
      return;
    setError('');
    if (cameraEnabled) {
      releaseCamera();
      setCameraEnabled(false);
    } else {
      setCameraEnabled(true);
      void checkCamera();
    }
  }

  function closePreview() {
    if (phase.current !== 'idle') return;
    cancel.current = true;
    releaseMedia();
  }

  async function connectMicrophone() {
    releaseMic();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: false,
      });
      if (!mounted.current || cancel.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      if (!stream.getAudioTracks().some((track) => track.readyState === 'live')) {
        stream.getTracks().forEach((track) => track.stop());
        throw new Error('No live microphone was found. Reconnect it and try again.');
      }
      mic.current = stream;
      const context = new AudioContext();
      audioContext.current = context;
      // The meter must not block recording if autoplay policy suspends AudioContext.
      void context.resume().catch(() => undefined);
      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      context.createMediaStreamSource(stream).connect(analyser);
      const data = new Uint8Array(analyser.fftSize);
      const update = () => {
        analyser.getByteTimeDomainData(data);
        const rms = Math.sqrt(
          data.reduce((sum, value) => sum + ((value - 128) / 128) ** 2, 0) / data.length,
        );
        setLevel(Math.min(1, rms * 6));
        animation.current = requestAnimationFrame(update);
      };
      update();
      stream.getAudioTracks()[0].onended = () => {
        setMicReady(false);
        setNotice(
          'Your microphone disconnected. If recording, the video will continue without microphone audio.',
        );
      };
      setMicReady(true);
    } catch (failure) {
      releaseMic();
      throw new Error(microphoneError(failure));
    }
  }

  async function checkMic() {
    if (micPending.current || cameraPending.current || pending.current || phase.current !== 'idle')
      return;
    micPending.current = true;
    cancel.current = false;
    setMicChecking(true);
    setError('');
    try {
      await connectMicrophone();
    } catch (failure) {
      setError(captureError(failure));
    } finally {
      micPending.current = false;
      setMicChecking(false);
    }
  }

  function toggleMic() {
    if (phase.current !== 'idle' || micPending.current || cameraPending.current) return;
    releaseMic();
    setMicEnabled((value) => !value);
    setError('');
  }

  function stop() {
    if (
      phase.current === 'choosing' ||
      phase.current === 'microphone' ||
      phase.current === 'camera' ||
      phase.current === 'countdown'
    ) {
      cancel.current = true;
      releaseMedia();
      // The pending picker/countdown resolves before another start is allowed.
      return;
    }
    if (recorder.current && recorder.current.state !== 'inactive') {
      clock.current.pause(performance.now());
      setElapsed(clock.current.elapsed(performance.now()));
      stateChange('saving');
      recorder.current.stop();
    }
  }

  async function start() {
    if (pending.current || micPending.current || cameraPending.current || phase.current !== 'idle')
      return;
    if (!navigator.mediaDevices?.getDisplayMedia || typeof MediaRecorder === 'undefined') {
      setError('Open Relay in desktop Chrome to record your screen.');
      return;
    }
    pending.current = true;
    cancel.current = false;
    setError('');
    setNotice('');
    setElapsed(0);
    setShareSurface('');
    stateChange('choosing');
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30 },
        audio: false,
      });
      display.current = stream;
      setShareSurface(stream.getVideoTracks()[0].getSettings?.().displaySurface ?? '');
      if (cancel.current) {
        releaseMedia();
        stateChange('idle');
        return;
      }
      stream.getVideoTracks()[0].onended = stop;
      // Open the screen picker directly from the click: awaiting microphone permission
      // first could consume the transient user activation required by getDisplayMedia.
      if (
        micEnabled &&
        !mic.current?.getAudioTracks().some((track) => track.readyState === 'live')
      ) {
        stateChange('microphone');
        await connectMicrophone();
        if (cancel.current) {
          releaseMedia();
          stateChange('idle');
          return;
        }
      }
      if (cameraEnabled) {
        stateChange('camera');
        if (!camera.current?.getVideoTracks().some((track) => track.readyState === 'live'))
          await connectCamera();
        if (cancel.current) {
          releaseMedia();
          stateChange('idle');
          return;
        }
        if (!camera.current)
          throw new Error('Camera is unavailable. Try again or turn Camera off.');
        compositeAbort.current = new AbortController();
        composite.current = await createCompositeCapture(
          stream,
          camera.current,
          compositeAbort.current.signal,
          () => {
            setError('Camera overlay was interrupted. Check the saved clip before continuing.');
            stop();
          },
        );
        if (cancel.current) {
          releaseMedia();
          stateChange('idle');
          return;
        }
      }
      stateChange('countdown');
      for (let count = 3; count > 0; count--) {
        setCountdown(count);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        if (cancel.current) {
          releaseMedia();
          stateChange('idle');
          return;
        }
      }
      const audioTracks = micEnabled
        ? (mic.current?.getAudioTracks().filter((track) => track.readyState === 'live') ?? [])
        : [];
      if (micEnabled && !audioTracks.length)
        throw new Error(
          'Your microphone disconnected before recording. Reconnect it and try again, or turn the microphone off.',
        );
      const tracks = [...(composite.current?.stream ?? stream).getVideoTracks(), ...audioTracks];
      const mimeType = ['video/webm;codecs=vp8,opus', 'video/webm'].find((type) =>
        MediaRecorder.isTypeSupported(type),
      );
      if (!mimeType)
        throw new Error('This browser cannot record WebM video. Please use desktop Chrome.');
      const capture = new MediaRecorder(new MediaStream(tracks), {
        mimeType,
        videoBitsPerSecond: 2_500_000,
      });
      recorder.current = capture;
      const chunks: Blob[] = [];
      let finishing = false;
      capture.ondataavailable = (event) => {
        if (event.data.size) {
          chunks.push(event.data);
        }
      };
      capture.onerror = () => {
        setError('Recording was interrupted. Check the preview before keeping this clip.');
        stop();
      };
      capture.onstop = async () => {
        if (finishing) return;
        finishing = true;
        clock.current.pause(performance.now());
        const duration = clock.current.elapsed(performance.now());
        stateChange('saving');
        releaseMedia();
        try {
          const blob = new Blob(chunks, { type: mimeType });
          if (!blob.size) throw new Error('No video was captured. Please try another recording.');
          await onComplete({
            id: crypto.randomUUID(),
            title: 'Untitled walkthrough',
            createdAt: Date.now(),
            duration,
            blob,
            microphone: micEnabled,
            camera: cameraEnabled,
          });
        } catch (failure) {
          setError(captureError(failure));
        } finally {
          recorder.current = null;
          stateChange('idle');
        }
      };
      capture.start(1000);
      clock.current.start(performance.now());
      stateChange('recording');
      timer.current = setInterval(() => {
        const value = clock.current.elapsed(performance.now());
        setElapsed(value);
      }, 200);
    } catch (failure) {
      releaseMedia();
      stateChange('idle');
      if (!cancel.current) setError(captureError(failure));
    } finally {
      pending.current = false;
    }
  }

  function pauseResume() {
    const capture = recorder.current;
    if (capture?.state === 'recording') {
      capture.pause();
      clock.current.pause(performance.now());
      stateChange('paused');
    } else if (capture?.state === 'paused') {
      capture.resume();
      clock.current.resume(performance.now());
      stateChange('recording');
    }
  }

  useEffect(() => {
    floating.current?.update({ stream: cameraStream, state, elapsed });
  }, [cameraStream, state, elapsed]);

  useEffect(() => {
    mounted.current = true;
    const guard = (event: BeforeUnloadEvent) => {
      if (phase.current !== 'idle') {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', guard);
    return () => {
      mounted.current = false;
      window.removeEventListener('beforeunload', guard);
      cancel.current = true;
      if (recorder.current) {
        recorder.current.onstop = null;
        if (recorder.current.state !== 'inactive') recorder.current.stop();
      }
      releaseMedia();
    };
  }, []);

  return {
    state,
    micEnabled,
    micReady,
    micChecking,
    cameraEnabled,
    cameraChecking,
    cameraStream,
    floatingOpen,
    shareSurface,
    showFloatingCamera,
    hideFloatingCamera,
    toggleCamera,
    checkCamera,
    closePreview,
    level,
    elapsed,
    countdown,
    error,
    notice,
    checkMic,
    toggleMic,
    start,
    stop,
    pauseResume,
  };
}
