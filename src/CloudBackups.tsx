import { useEffect, useRef, useState } from 'react';
import { Cloud, CloudUpload, Download, RefreshCw, Trash2 } from 'lucide-react';
import {
  backupRecording,
  cloudConfig,
  cloudConfigured,
  cloudError,
  deleteCloudRecording,
  listCloudRecordings,
  restoreCloudRecording,
  type CloudRecording,
} from './cloud';
import { saveRecording, type Recording } from './storage';

type Props = { recordings: Recording[]; onRestore: (recording: Recording) => void };

export default function CloudBackups({ recordings, onRestore }: Props) {
  const [clips, setClips] = useState<CloudRecording[]>([]);
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState('');
  const [percent, setPercent] = useState(0);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const controller = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      controller.current?.abort();
    };
  }, []);
  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => {
      if (busy) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [busy]);

  async function run(label: string, action: (signal: AbortSignal) => Promise<string>) {
    if (controller.current) return;
    const next = new AbortController();
    controller.current = next;
    setBusy(label);
    setMessage('');
    setError('');
    setPercent(0);
    try {
      const result = await action(next.signal);
      if (mounted.current) setMessage(result);
    } catch (err) {
      if (mounted.current) setError(cloudError(err));
    } finally {
      controller.current = null;
      if (mounted.current) setBusy('');
    }
  }
  async function refresh(signal: AbortSignal) {
    const result = await listCloudRecordings(signal);
    if (mounted.current) {
      setClips(result);
      setConnected(true);
    }
  }
  function upload(recording: Recording) {
    void run(`Uploading ${recording.title}`, async (signal) => {
      await backupRecording(
        recording,
        (value) => {
          if (mounted.current) setPercent(value);
        },
        signal,
      );
      await refresh(signal);
      return `Backed up “${recording.title}” to AWS. Your local copy is unchanged.`;
    });
  }
  return (
    <section className="workspace-page cloud-page" aria-label="Cloud backups">
      <div className="page-heading">
        <div>
          <div className="eyebrow">POWERED BY AMAZON S3</div>
          <h1>Cloud backups</h1>
          <p>Keep a separate copy of your recordings in AWS Mumbai.</p>
        </div>
        <Cloud size={34} />
      </div>
      <div className="workspace-panel">
        <h2>{connected ? 'Connected to AWS' : 'Your own cloud space'}</h2>
        <p>
          No Relay sign-in needed. Connect to list backups for this Chrome installation. Videos
          upload only when you choose Back up.
        </p>
        <p className="muted">
          Keep this Chrome profile and extension storage. Clearing all extension data or
          reinstalling can lose access to this guest cloud space. This is not cross-device account
          recovery. Download important videos too.
        </p>
        <div className="workspace-toolbar">
          <button
            className="primary"
            disabled={!cloudConfigured || !!busy}
            onClick={() =>
              void run('Connecting to AWS', async (signal) => {
                await refresh(signal);
                return 'Cloud library is up to date.';
              })
            }
          >
            <RefreshCw size={16} />
            {connected ? 'Refresh cloud library' : 'Connect to AWS'}
          </button>
          <span className="muted">
            {cloudConfigured
              ? 'Mumbai · private storage · no captions'
              : 'Deployment configuration needed'}
          </span>
        </div>
        <p className="muted">
          Uploads, storage, and restores can use AWS credits. This app supports backups up to 1 GB
          per video; this is not an account spending limit.
        </p>
      </div>
      {busy && (
        <div className="workspace-panel" role="status">
          <strong>{busy}</strong>
          {busy.startsWith('Uploading') && (
            <>
              <progress aria-label="Upload progress" value={percent} max={100} />
              <span>{percent}%</span>
            </>
          )}
          <p>Keep this page open until the operation finishes.</p>
          <button className="secondary" onClick={() => controller.current?.abort()}>
            Cancel transfer
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="cloud-message">
          {message}
        </p>
      )}
      <div className="workspace-panel">
        <h2>On this device</h2>
        <p>Choose a recording to back up. Backing it up again updates its cloud copy.</p>
        {!recordings.length && (
          <p className="muted">Record a video first, then return here to back it up.</p>
        )}
        <div className="cloud-list">
          {recordings.map((clip) => (
            <article className="cloud-row" key={clip.id}>
              <div>
                <strong>{clip.title}</strong>
                <small>
                  {(clip.blob.size / 1048576).toFixed(1)} MB ·{' '}
                  {clips.some((c) => c.id === clip.id) ? 'Cloud copy available' : 'Local recording'}
                </small>
              </div>
              <button
                className="secondary"
                disabled={!cloudConfigured || !!busy}
                onClick={() => upload(clip)}
                aria-label={`Back up ${clip.title}`}
              >
                <CloudUpload size={16} />
                Back up
              </button>
            </article>
          ))}
        </div>
      </div>
      <div className="workspace-panel">
        <h2>
          In AWS <span className="muted">{connected ? `(${clips.length})` : ''}</span>
        </h2>
        {!connected ? (
          <p className="muted">Connect to load your cloud recordings.</p>
        ) : !clips.length ? (
          <p className="muted">No cloud backups yet. Upload a recording from the list above.</p>
        ) : null}
        <div className="cloud-list">
          {clips.map((clip) => (
            <article className="cloud-row" key={clip.key}>
              <div>
                <strong>{clip.title}</strong>
                <small>
                  {(clip.size / 1048576).toFixed(1)} MB · Backed up{' '}
                  {new Date(clip.backedUpAt).toLocaleString()}
                </small>
              </div>
              <div className="workspace-toolbar">
                <button
                  className="secondary"
                  disabled={!!busy}
                  aria-label={`Restore ${clip.title}`}
                  onClick={() => {
                    if (
                      recordings.some((r) => r.id === clip.id) &&
                      !window.confirm(
                        'Replace the local copy of this recording with the cloud backup?',
                      )
                    )
                      return;
                    void run(`Restoring ${clip.title}`, async (signal) => {
                      const restored = await restoreCloudRecording(clip, signal);
                      signal.throwIfAborted();
                      await saveRecording(restored);
                      onRestore(restored);
                      return `Restored “${clip.title}” to Library. The cloud copy is still available.`;
                    });
                  }}
                >
                  <Download size={16} />
                  Restore to Library
                </button>
                <button
                  className="icon-button"
                  disabled={!!busy}
                  aria-label={`Delete cloud backup ${clip.title}`}
                  onClick={() => {
                    if (
                      !window.confirm(
                        'Delete this cloud backup? Your local copy will stay. Previous S3 versions expire after 7 days.',
                      )
                    )
                      return;
                    void run(`Deleting ${clip.title}`, async (signal) => {
                      await deleteCloudRecording(clip.key, signal);
                      await refresh(signal);
                      return 'Cloud backup deleted. Local recordings were kept.';
                    });
                  }}
                >
                  <Trash2 size={17} />
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
      <details className="workspace-panel">
        <summary>AWS connection details</summary>
        <p>
          Region: {cloudConfig.region}
          <br />
          S3 bucket: {cloudConfig.bucket || 'Not deployed'}
        </p>
        <p>
          Amazon Cognito provides temporary guest access. IAM limits each guest to its own recording
          folder. Access credentials are kept in memory, not bundled in the extension. Backup
          includes video, title, duration, and capture details; folders, playlists, and other
          workspace settings stay local.
        </p>
      </details>
    </section>
  );
}
