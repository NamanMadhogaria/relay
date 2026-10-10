export type CompositeCapture = { stream: MediaStream; dispose: () => void };

export function outputSize(width: number, height: number) {
  const scale = Math.min(1, 1920 / width, 1080 / height);
  return {
    width: Math.max(2, Math.floor((width * scale) / 2) * 2),
    height: Math.max(2, Math.floor((height * scale) / 2) * 2),
  };
}

export function cameraBounds(width: number, height: number) {
  const size = Math.min(width, height) * 0.25;
  const margin = Math.min(width, height) * 0.035;
  return { x: width - size - margin, y: height - size - margin, size };
}

// Composite the face into the actual recorded pixels, not just a UI overlay.
export async function createCompositeCapture(
  screen: MediaStream,
  camera: MediaStream,
  signal: AbortSignal,
  onFailure: () => void,
): Promise<CompositeCapture> {
  const screenVideo = document.createElement('video');
  const cameraVideo = document.createElement('video');
  const canvas = document.createElement('canvas');
  let output: MediaStream | null = null;
  let ticker: Worker | null = null;
  let disposed = false;

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    ticker?.terminate();
    output?.getTracks().forEach((track) => track.stop());
    for (const video of [screenVideo, cameraVideo]) {
      video.pause();
      video.srcObject = null;
    }
    signal.removeEventListener('abort', dispose);
  };
  signal.addEventListener('abort', dispose, { once: true });

  try {
    signal.throwIfAborted();
    screenVideo.muted = cameraVideo.muted = true;
    screenVideo.playsInline = cameraVideo.playsInline = true;
    screenVideo.srcObject = screen;
    cameraVideo.srcObject = camera;

    // Bound startup so a missing camera frame cannot leave capture stuck forever.
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(
        () => finish(new Error('Camera preview could not start. Try again or turn Camera off.')),
        10000,
      );
      const abort = () => finish(new DOMException('Capture cancelled', 'AbortError'));
      function finish(error?: unknown) {
        clearTimeout(timeout);
        signal.removeEventListener('abort', abort);
        if (error) reject(error);
        else resolve();
      }
      signal.addEventListener('abort', abort, { once: true });
      Promise.all([screenVideo.play(), cameraVideo.play()]).then(() => finish(), finish);
    });
    signal.throwIfAborted();
    if (!screenVideo.videoWidth || !cameraVideo.videoWidth)
      throw new Error('Camera or screen frames are unavailable. Try again.');

    const size = outputSize(screenVideo.videoWidth, screenVideo.videoHeight);
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context || !canvas.captureStream)
      throw new Error(
        'Camera overlay is not supported in this browser. Please use desktop Chrome.',
      );

    const draw = () => {
      if (disposed) return;
      // Preserve the screen aspect ratio if a shared window changes dimensions.
      context.fillStyle = '#101610';
      context.fillRect(0, 0, canvas.width, canvas.height);
      const ratio = Math.min(
        canvas.width / screenVideo.videoWidth,
        canvas.height / screenVideo.videoHeight,
      );
      const width = screenVideo.videoWidth * ratio;
      const height = screenVideo.videoHeight * ratio;
      context.drawImage(
        screenVideo,
        (canvas.width - width) / 2,
        (canvas.height - height) / 2,
        width,
        height,
      );
      const face = cameraBounds(canvas.width, canvas.height);
      const crop = Math.min(cameraVideo.videoWidth, cameraVideo.videoHeight);
      context.save();
      context.beginPath();
      context.arc(face.x + face.size / 2, face.y + face.size / 2, face.size / 2, 0, Math.PI * 2);
      context.clip();
      context.drawImage(
        cameraVideo,
        (cameraVideo.videoWidth - crop) / 2,
        (cameraVideo.videoHeight - crop) / 2,
        crop,
        crop,
        face.x,
        face.y,
        face.size,
        face.size,
      );
      context.restore();
      context.strokeStyle = '#ffffff';
      context.lineWidth = Math.max(2, canvas.height / 360);
      context.stroke();
    };

    draw();
    output = canvas.captureStream(30);
    // A worker drives painting instead of requestAnimationFrame, which is paused
    // in hidden tabs. Actual background performance still depends on the browser.
    ticker = new Worker(new URL('./frameTicker.ts', import.meta.url), { type: 'module' });
    ticker.onmessage = () => {
      try {
        draw();
      } catch {
        ticker?.terminate();
        onFailure();
      }
    };
    ticker.onerror = () => {
      ticker?.terminate();
      onFailure();
    };
    return { stream: output, dispose };
  } catch (error) {
    dispose();
    throw error;
  }
}
