import { useEffect, useRef } from 'react';

export default function CameraPreview({ stream }: { stream: MediaStream }) {
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const element = video.current;
    if (!element) return;
    element.srcObject = stream;
    void element.play().catch(() => undefined);
    return () => {
      element.srcObject = null;
    };
  }, [stream]);

  return (
    <div className="camera-preview">
      <div className="camera-bubble">
        <video ref={video} autoPlay playsInline muted aria-label="Live camera preview" />
        <span className="camera-ready-dot" aria-hidden="true" />
      </div>
      <div className="camera-preview-copy">
        <span className="camera-preview-label">Camera connected</span>
        <strong>Ready for your close-up.</strong>
        <p>Your camera bubble appears at the bottom-right of your recording.</p>
      </div>
    </div>
  );
}
