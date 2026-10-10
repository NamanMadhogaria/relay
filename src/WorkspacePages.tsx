import { useState } from 'react';
import {
  ArrowDownToLine,
  ArrowDown,
  ArrowUp,
  CalendarDays,
  Check,
  Film,
  FolderOpen,
  Heart,
  Play,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import type { Recording } from './storage';
import { formatTime } from './recorder';
import {
  downloadFile,
  matchesRecording,
  meetingCalendar,
  pageNames,
  type Page,
  type WorkspaceController,
  type WorkspaceData,
} from './workspace';

type Props = {
  page: Page;
  workspace: WorkspaceController;
  recordings: Recording[];
  open: (recording: Recording) => void;
  download: (recording: Recording) => void;
  remove: (id: string) => Promise<boolean>;
  rename: (recording: Recording, title: string) => Promise<boolean>;
  navigate: (page: Page) => void;
  newRecording: () => void;
  theme: string;
  setTheme: (theme: 'light' | 'dark') => void;
};

function Empty({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="workspace-empty">
      <FolderOpen size={30} />
      <h2>{title}</h2>
      <p>{children}</p>
    </div>
  );
}

export function ClipList({
  recordings,
  workspace,
  open,
  download,
}: Pick<Props, 'recordings' | 'workspace' | 'open' | 'download'>) {
  if (!recordings.length)
    return (
      <Empty title="Nothing here yet">Record a video or adjust your search to get started.</Empty>
    );
  return (
    <div className="workspace-clips">
      {recordings.map((recording) => (
        <article key={recording.id} className="workspace-clip">
          <button
            className="clip-play"
            aria-label={`Play ${recording.title}`}
            onClick={() => open(recording)}
          >
            <Play size={20} />
          </button>
          <button className="clip-name" onClick={() => open(recording)}>
            <strong>{recording.title}</strong>
            <small>
              {formatTime(recording.duration)} ·{' '}
              {new Date(recording.createdAt).toLocaleDateString()}{' '}
              {workspace.data.clips[recording.id]?.folder &&
                `· ${workspace.data.clips[recording.id].folder}`}
            </small>
          </button>
          <button
            className="icon-button"
            aria-label={`Favorite ${recording.title}`}
            aria-pressed={!!workspace.data.clips[recording.id]?.favorite}
            onClick={() =>
              workspace.update((data) => ({
                ...data,
                clips: {
                  ...data.clips,
                  [recording.id]: {
                    ...data.clips[recording.id],
                    favorite: !data.clips[recording.id]?.favorite,
                  },
                },
              }))
            }
          >
            <Heart
              size={17}
              fill={workspace.data.clips[recording.id]?.favorite ? 'currentColor' : 'none'}
            />
          </button>
          <button
            className="icon-button"
            aria-label={`Download ${recording.title}`}
            onClick={() => download(recording)}
          >
            <ArrowDownToLine size={17} />
          </button>
        </article>
      ))}
    </div>
  );
}

function Insights({ recordings, data }: { recordings: Recording[]; data: WorkspaceData }) {
  const [range, setRange] = useState('30');
  const now = Date.now();
  const cutoff = range === 'all' ? 0 : now - Number(range) * 86400000;
  const clips = recordings.filter((r) => r.createdAt >= cutoff);
  const ids = new Set(recordings.map((r) => r.id));
  const plays = data.plays.filter((p) => p.at >= cutoff && ids.has(p.recordingId));
  const beginning =
    range === 'all'
      ? Math.min(now - 86400000, ...recordings.map((r) => r.createdAt), ...plays.map((p) => p.at))
      : cutoff;
  const buckets = Array.from({ length: 7 }, (_, i) => {
    const start = beginning + ((now - beginning) * i) / 7;
    const end = beginning + ((now - beginning) * (i + 1)) / 7;
    return {
      date: new Date(end).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      clips: clips.filter(
        (r) => r.createdAt >= start && (i === 6 ? r.createdAt <= end : r.createdAt < end),
      ).length,
      plays: plays.filter((p) => p.at >= start && (i === 6 ? p.at <= end : p.at < end)).length,
    };
  });
  return (
    <>
      <div className="workspace-toolbar">
        <label>
          Time period{' '}
          <select value={range} onChange={(e) => setRange(e.target.value)}>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="all">All time</option>
          </select>
        </label>
        <button
          className="secondary"
          onClick={() =>
            downloadFile(
              'relay-insights.csv',
              'Period,Recordings,Local playback sessions\r\n' +
                buckets.map((b) => `"${b.date}",${b.clips},${b.plays}`).join('\r\n'),
              'text/csv',
            )
          }
        >
          Export CSV
        </button>
      </div>
      <div className="metric-grid">
        <Metric label="Videos created" value={clips.length} />
        <Metric label="Local playback sessions" value={plays.length} />
        <Metric
          label="Recorded time"
          value={formatTime(clips.reduce((sum, r) => sum + r.duration, 0))}
        />
      </div>
      <div className="workspace-panel">
        <h2>Your recording activity</h2>
        <p className="muted">
          Actual activity on this device. Playback sessions count once per preview session, not
          unique people or public views.
        </p>
        <div className="chart-pair">
          {(['clips', 'plays'] as const).map((key) => (
            <section key={key}>
              <h3>{key === 'clips' ? 'Videos created' : 'Local playback sessions'}</h3>
              <div
                className={`activity-chart ${key}`}
                role="img"
                aria-label={buckets.map((b) => `${b.date}: ${b[key]}`).join('; ')}
              >
                {buckets.map((b, i) => (
                  <div key={i} className="chart-column">
                    <span>{b[key]}</span>
                    <div
                      style={{
                        height: `${Math.max(2, (b[key] / Math.max(1, ...buckets.map((item) => item[key]))) * 130)}px`,
                      }}
                    />
                    <small>{b.date}</small>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
      <div className="workspace-panel">
        <h2>Playback by recording</h2>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Recording</th>
                <th>Sessions</th>
                <th>Duration</th>
              </tr>
            </thead>
            <tbody>
              {recordings.map((r) => (
                <tr key={r.id}>
                  <td>{r.title}</td>
                  <td>{plays.filter((p) => p.recordingId === r.id).length}</td>
                  <td>{formatTime(r.duration)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!recordings.length && <p>No activity yet. Your first recording will appear here.</p>}
      </div>
    </>
  );
}
function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="metric">
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  );
}

function Meetings({
  workspace,
  recordings,
  open,
  newRecording,
}: Pick<Props, 'workspace' | 'recordings' | 'open' | 'newRecording'>) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [editing, setEditing] = useState<string>();
  return (
    <>
      <div className="workspace-panel">
        <h2>{editing ? 'Edit meeting' : 'Plan a meeting'}</h2>
        <p className="muted">
          Keep an agenda, export a calendar event, and link a recording afterward. Relay does not
          join calls or send invitations.
        </p>
        <form
          className="workspace-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (!title.trim() || !Number.isFinite(new Date(date).getTime())) return;
            const meeting = {
              id: editing ?? crypto.randomUUID(),
              title: title.trim(),
              startsAt: new Date(date).toISOString(),
              notes,
              recordingId: workspace.data.meetings.find((m) => m.id === editing)?.recordingId ?? '',
            };
            if (
              workspace.update((d) => ({
                ...d,
                meetings: [...d.meetings.filter((m) => m.id !== editing), meeting],
              }))
            ) {
              setTitle('');
              setDate('');
              setNotes('');
              setEditing(undefined);
            }
          }}
        >
          <label>
            Meeting title
            <input
              required
              maxLength={100}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label>
            Date and time (your local time)
            <input
              required
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <label className="span-two">
            Agenda
            <textarea
              maxLength={5000}
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
          <button className="primary" type="submit">
            {editing ? 'Save meeting' : 'Add meeting'}
          </button>
          {editing && (
            <button
              type="button"
              className="secondary"
              onClick={() => {
                setEditing(undefined);
                setTitle('');
                setDate('');
                setNotes('');
              }}
            >
              Cancel edit
            </button>
          )}
        </form>
      </div>
      {!workspace.data.meetings.length && (
        <Empty title="Make room for a better meeting">
          Add your first agenda above. All meeting details stay on this device.
        </Empty>
      )}
      {[...workspace.data.meetings]
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
        .map((m) => (
          <article className="workspace-panel" key={m.id}>
            <div className="workspace-toolbar">
              <div>
                <h2>
                  <CalendarDays size={19} /> {m.title}
                </h2>
                <p className="muted">{new Date(m.startsAt).toLocaleString()}</p>
              </div>
              <button
                className="secondary"
                onClick={() => {
                  setEditing(m.id);
                  setTitle(m.title);
                  const d = new Date(m.startsAt);
                  setDate(
                    new Date(d.getTime() - d.getTimezoneOffset() * 60000)
                      .toISOString()
                      .slice(0, 16),
                  );
                  setNotes(m.notes);
                }}
              >
                Edit meeting
              </button>
            </div>
            <p className="meeting-notes">{m.notes || 'No agenda added.'}</p>
            <div className="workspace-toolbar">
              <label>
                Linked recording{' '}
                <select
                  aria-label={`Recording for ${m.title}`}
                  value={m.recordingId}
                  onChange={(e) =>
                    workspace.update((d) => ({
                      ...d,
                      meetings: d.meetings.map((item) =>
                        item.id === m.id ? { ...item, recordingId: e.target.value } : item,
                      ),
                    }))
                  }
                >
                  <option value="">No recording linked</option>
                  {recordings.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title}
                    </option>
                  ))}
                </select>
              </label>
              {m.recordingId && recordings.some((r) => r.id === m.recordingId) ? (
                <button
                  className="secondary"
                  onClick={() => open(recordings.find((r) => r.id === m.recordingId)!)}
                >
                  Play recording
                </button>
              ) : (
                <button className="secondary" onClick={newRecording}>
                  Record a video
                </button>
              )}
              <button
                className="secondary"
                onClick={() =>
                  downloadFile('relay-meeting.ics', meetingCalendar(m), 'text/calendar')
                }
              >
                Export calendar event
              </button>
              <button
                className="danger-text"
                onClick={() => {
                  if (window.confirm(`Delete meeting “${m.title}”? Its video will be kept.`))
                    workspace.update((d) => ({
                      ...d,
                      meetings: d.meetings.filter((item) => item.id !== m.id),
                    }));
                }}
              >
                Delete meeting
              </button>
            </div>
          </article>
        ))}
    </>
  );
}

function Playlists(props: Pick<Props, 'workspace' | 'recordings' | 'open' | 'download'>) {
  const { workspace, recordings } = props;
  const [name, setName] = useState('');
  const [selected, setSelected] = useState('');
  const playlist = workspace.data.playlists.find((p) => p.id === selected);
  const [rename, setRename] = useState('');
  function changeIds(ids: string[]) {
    workspace.update((d) => ({
      ...d,
      playlists: d.playlists.map((p) => (p.id === selected ? { ...p, recordingIds: ids } : p)),
    }));
  }
  return (
    <>
      <form
        className="workspace-toolbar workspace-panel"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          const id = crypto.randomUUID();
          if (
            workspace.update((d) => ({
              ...d,
              playlists: [...d.playlists, { id, name: name.trim(), recordingIds: [] }],
            }))
          ) {
            setSelected(id);
            setRename(name.trim());
            setName('');
          }
        }}
      >
        <label>
          Playlist name
          <input
            required
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Product walkthroughs"
          />
        </label>
        <button className="primary" type="submit">
          <Plus size={16} />
          Create playlist
        </button>
      </form>
      <div className="playlist-tabs" aria-label="Your playlists">
        {workspace.data.playlists.map((p) => (
          <button
            key={p.id}
            className={selected === p.id ? 'secondary selected' : 'secondary'}
            aria-pressed={selected === p.id}
            onClick={() => {
              setSelected(p.id);
              setRename(p.name);
            }}
          >
            {p.name}
            <span className="nav-count">
              {p.recordingIds.filter((id) => recordings.some((r) => r.id === id)).length}
            </span>
          </button>
        ))}
      </div>
      {!playlist ? (
        <Empty
          title={
            workspace.data.playlists.length ? 'Choose a playlist' : 'A little order for your ideas'
          }
        >
          Create a playlist, then add videos and arrange their order.
        </Empty>
      ) : (
        <div className="workspace-panel">
          <form
            className="workspace-toolbar"
            onSubmit={(e) => {
              e.preventDefault();
              if (rename.trim())
                workspace.update((d) => ({
                  ...d,
                  playlists: d.playlists.map((p) =>
                    p.id === selected ? { ...p, name: rename.trim() } : p,
                  ),
                }));
            }}
          >
            <label>
              Rename playlist
              <input
                required
                maxLength={80}
                value={rename}
                onChange={(e) => setRename(e.target.value)}
              />
            </label>
            <button className="secondary">Save name</button>
            <button
              className="danger-text"
              type="button"
              onClick={() => {
                if (
                  window.confirm('Delete this playlist? Its recordings will be kept.') &&
                  workspace.update((d) => ({
                    ...d,
                    playlists: d.playlists.filter((p) => p.id !== selected),
                  }))
                )
                  setSelected('');
              }}
            >
              Delete playlist
            </button>
          </form>
          <h3>Videos in this playlist</h3>
          {playlist.recordingIds
            .filter((id) => recordings.some((r) => r.id === id))
            .map((id, i) => (
              <div key={id} className="playlist-row">
                <button
                  className="text-button"
                  onClick={() => props.open(recordings.find((r) => r.id === id)!)}
                >
                  <Play size={16} />
                  {recordings.find((r) => r.id === id)!.title}
                </button>
                <div>
                  <button
                    aria-label={`Move video ${i + 1} up`}
                    className="icon-button"
                    disabled={i === 0}
                    onClick={() => {
                      const ids = [...playlist.recordingIds];
                      [ids[i - 1], ids[i]] = [ids[i], ids[i - 1]];
                      changeIds(ids);
                    }}
                  >
                    <ArrowUp size={16} />
                  </button>
                  <button
                    aria-label={`Move video ${i + 1} down`}
                    className="icon-button"
                    disabled={i === playlist.recordingIds.length - 1}
                    onClick={() => {
                      const ids = [...playlist.recordingIds];
                      [ids[i], ids[i + 1]] = [ids[i + 1], ids[i]];
                      changeIds(ids);
                    }}
                  >
                    <ArrowDown size={16} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label={`Remove video ${i + 1} from playlist`}
                    onClick={() => changeIds(playlist.recordingIds.filter((item) => item !== id))}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          {!playlist.recordingIds.length && (
            <p className="muted">Select videos below to add them.</p>
          )}
          <h3>Add recordings</h3>
          <div className="playlist-picker">
            {recordings
              .filter((r) => !playlist.recordingIds.includes(r.id))
              .map((r) => (
                <button
                  key={r.id}
                  className="secondary"
                  onClick={() => changeIds([...playlist.recordingIds, r.id])}
                >
                  <Plus size={15} />
                  {r.title}
                </button>
              ))}
            {!recordings.length && <p>Record your first video to add it here.</p>}
          </div>
        </div>
      )}
    </>
  );
}

function ClipEditor({
  recording,
  workspace,
  rename,
}: Pick<Props, 'workspace' | 'rename'> & { recording: Recording }) {
  const meta = workspace.data.clips[recording.id];
  const [title, setTitle] = useState(recording.title);
  const [folder, setFolder] = useState(meta?.folder ?? '');
  const [tags, setTags] = useState(meta?.tags?.join(', ') ?? '');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  return (
    <details className="clip-editor">
      <summary>Edit details</summary>
      <form
        className="workspace-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setSaving(true);
          try {
            if (
              (await rename(recording, title.trim())) &&
              workspace.update((d) => ({
                ...d,
                clips: {
                  ...d.clips,
                  [recording.id]: {
                    ...d.clips[recording.id],
                    folder: folder.trim(),
                    tags: [
                      ...new Set(
                        tags
                          .split(',')
                          .map((t) => t.trim())
                          .filter(Boolean),
                      ),
                    ].slice(0, 12),
                  },
                },
              }))
            )
              setMessage('Details saved.');
            else setMessage('Could not save all details. Please retry.');
          } finally {
            setSaving(false);
          }
        }}
      >
        <label>
          Title
          <input
            required
            maxLength={100}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label>
          Folder
          <input maxLength={60} value={folder} onChange={(e) => setFolder(e.target.value)} />
        </label>
        <label>
          Tags (comma separated)
          <input maxLength={300} value={tags} onChange={(e) => setTags(e.target.value)} />
        </label>
        <button className="secondary" disabled={saving}>
          {saving ? 'Saving…' : 'Save details'}
        </button>
        {message && <p role="status">{message}</p>}
      </form>
    </details>
  );
}

function Manage(props: Props) {
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const clips = props.recordings.filter((r) => matchesRecording(r, props.workspace.data, query));
  const selectedIds = selected.filter((id) => props.recordings.some((r) => r.id === id));
  async function removeSelected() {
    if (
      !window.confirm(
        `Delete ${selectedIds.length} recording(s)? Download copies first. This cannot be undone.`,
      )
    )
      return;
    setBusy(true);
    let count = 0;
    try {
      for (const id of selectedIds) if (await props.remove(id)) count++;
      setSelected([]);
      setMessage(`Deleted ${count} of ${selectedIds.length} recordings.`);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="workspace-toolbar">
        <label className="workspace-search">
          <Search size={16} />
          <input
            aria-label="Search recordings to manage"
            placeholder="Search titles, tags or folders"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <button
          className="secondary"
          disabled={busy || !clips.length}
          onClick={() =>
            setSelected(clips.every((r) => selected.includes(r.id)) ? [] : clips.map((r) => r.id))
          }
        >
          Select / clear visible
        </button>
        <button
          className="danger-text"
          disabled={busy || !selectedIds.length}
          onClick={() => void removeSelected()}
        >
          Delete selected ({selectedIds.length})
        </button>
      </div>
      {message && <p role="status">{message}</p>}
      <div className="workspace-panel">
        {clips.map((r) => (
          <article className="manage-row" key={r.id}>
            <div className="workspace-toolbar">
              <label>
                <input
                  type="checkbox"
                  disabled={busy}
                  checked={selected.includes(r.id)}
                  aria-label={`Select ${r.title}`}
                  onChange={(e) =>
                    setSelected((items) =>
                      e.target.checked ? [...items, r.id] : items.filter((id) => id !== r.id),
                    )
                  }
                />{' '}
                <strong>{r.title}</strong>
              </label>
              <span className="muted">{(r.blob.size / 1048576).toFixed(1)} MB</span>
              <button className="secondary" onClick={() => props.download(r)}>
                Download
              </button>
              <button className="secondary" onClick={() => props.open(r)}>
                Open
              </button>
            </div>
            <ClipEditor recording={r} workspace={props.workspace} rename={props.rename} />
          </article>
        ))}
        {!clips.length && (
          <Empty title="No recordings to manage">Create a recording or change your search.</Empty>
        )}
      </div>
    </>
  );
}

function Tools({ workspace, recordings }: Pick<Props, 'workspace' | 'recordings'>) {
  const [storage, setStorage] = useState('Not checked');
  async function checkStorage() {
    try {
      if (!navigator.storage?.estimate) throw new Error();
      const estimate = await navigator.storage.estimate();
      setStorage(
        `${((estimate.usage ?? 0) / 1048576).toFixed(1)} MB used of approximately ${((estimate.quota ?? 0) / 1073741824).toFixed(1)} GB available to this browser origin.`,
      );
    } catch {
      setStorage('Storage estimates are unavailable in this browser.');
    }
  }
  return (
    <>
      <div className="workspace-panel">
        <h2>Local by design</h2>
        <p>
          Relay records, previews, and saves videos directly in this Chrome profile. No account, AWS
          connection, or subscription is needed to use the recorder and workspace tools.
        </p>
        <ol className="architecture-list">
          <li>Choose a screen, window, or browser tab.</li>
          <li>Add microphone audio and a camera overlay if you want.</li>
          <li>Save and organize the video in your browser library.</li>
          <li>Download the WebM file to share it yourself.</li>
        </ol>
        <p className="muted">
          Workspace tools are open to everyone using this installation. Data is not shared between
          devices.
        </p>
      </div>
      <div className="workspace-panel">
        <h2>Storage and exports</h2>
        <p role="status">{storage}</p>
        <div className="workspace-toolbar">
          <button className="secondary" onClick={() => void checkStorage()}>
            Check browser storage
          </button>
          <button
            className="secondary"
            onClick={() =>
              downloadFile(
                'relay-workspace-metadata.json',
                JSON.stringify(
                  {
                    ...workspace.data,
                    recordings: recordings.map(({ blob, ...r }) => ({
                      ...r,
                      sizeBytes: blob.size,
                    })),
                    exportedAt: new Date().toISOString(),
                  },
                  null,
                  2,
                ),
              )
            }
          >
            Export workspace metadata
          </button>
        </div>
        <p className="muted">
          The metadata export contains names, playlists, agendas, tags, and local analytics.
          Download videos from Library or Manage separately. Clearing Chrome storage removes local
          data.
        </p>
      </div>
      <div className="workspace-panel">
        <h2>About Relay</h2>
        <p>Version 0.3.0 · Screen, camera, and microphone recorder</p>
        <p>
          Local recording has no fixed time cap. Very long recordings depend on available memory and
          disk space. Download important videos to keep a separate copy.
        </p>
      </div>
    </>
  );
}

export default function WorkspacePages(props: Props) {
  const { page, workspace, recordings } = props;
  const [status, setStatus] = useState('');
  const [recentMode, setRecentMode] = useState('created');
  const [profile, setProfile] = useState(workspace.data.displayName);
  const [name, setName] = useState(workspace.data.name);
  const [description, setDescription] = useState(workspace.data.description);
  return (
    <section className="workspace-page" aria-label={pageNames[page]}>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            {['overview', 'manage', 'insights', 'workspace', 'tools'].includes(page)
              ? 'ADMIN TOOLS · OPEN TO EVERYONE'
              : 'YOUR WORKSPACE'}
          </div>
          <h1>
            {page === 'home' ? `A little clarity, ${workspace.data.displayName}.` : pageNames[page]}
          </h1>
          <p>
            {page === 'insights'
              ? 'See how your recording habits are growing.'
              : page === 'manage'
                ? 'Organize your videos and keep the good takes.'
                : 'Your recordings and workspace, saved on this device.'}
          </p>
        </div>
        <button className="primary small" onClick={props.newRecording}>
          <Plus size={17} />
          New recording
        </button>
      </div>
      {status && (
        <p role="status" className="message">
          {status}
        </p>
      )}
      {page === 'home' && (
        <>
          <div className="welcome-panel">
            <div>
              <span className="eyebrow">MAKE YOUR NEXT IDEA CLEAR</span>
              <h2>
                Show more.
                <br />
                Schedule less.
              </h2>
              <p>A walkthrough, a quick update, a moment of clarity.</p>
              <button className="primary" onClick={props.newRecording}>
                <Plus size={17} />
                Start a recording
              </button>
            </div>
            <div className="welcome-art" aria-hidden="true">
              <Film size={68} />
              <span>YOUR NEXT GREAT TAKE</span>
            </div>
          </div>
          <div className="section-heading">
            <h2>Picked by you</h2>
            <button className="text-button" onClick={() => props.navigate('library')}>
              Open library
            </button>
          </div>
          <ClipList
            {...props}
            recordings={recordings.filter((r) => workspace.data.clips[r.id]?.favorite)}
          />
          <div className="section-heading">
            <h2>Fresh from your studio</h2>
          </div>
          <ClipList {...props} recordings={recordings.slice(0, 4)} />
        </>
      )}
      {page === 'recent' && (
        <>
          <div className="workspace-toolbar">
            <label>
              Show{' '}
              <select value={recentMode} onChange={(e) => setRecentMode(e.target.value)}>
                <option value="created">Recently recorded</option>
                <option value="played">Recently played</option>
              </select>
            </label>
          </div>
          <ClipList
            {...props}
            recordings={
              recentMode === 'created'
                ? recordings
                : [...new Set([...workspace.data.plays].reverse().map((p) => p.recordingId))]
                    .map((id) => recordings.find((r) => r.id === id))
                    .filter((r): r is Recording => !!r)
            }
          />
        </>
      )}
      {page === 'meetings' && <Meetings {...props} />}
      {page === 'playlists' && <Playlists {...props} />}
      {page === 'manage' && <Manage {...props} />}
      {page === 'insights' && <Insights recordings={recordings} data={workspace.data} />}
      {page === 'overview' && (
        <>
          <div className="metric-grid">
            <Metric label="Recordings" value={recordings.length} />
            <Metric label="Playlists" value={workspace.data.playlists.length} />
            <Metric
              label="Video storage"
              value={`${(recordings.reduce((n, r) => n + r.blob.size, 0) / 1048576).toFixed(1)} MB`}
            />
          </div>
          <div className="workspace-panel">
            <h2>Everything in one place</h2>
            <p>
              All workspace tools are available to anyone using this installation. There are no
              roles or account requirements. Each device keeps its own library.
            </p>
            <div className="overview-links">
              {(['manage', 'insights', 'workspace', 'tools'] as Page[]).map((p) => (
                <button className="secondary" key={p} onClick={() => props.navigate(p)}>
                  {pageNames[p]}
                </button>
              ))}
            </div>
          </div>
          <h2>Latest recordings</h2>
          <ClipList {...props} recordings={recordings.slice(0, 5)} />
        </>
      )}
      {page === 'settings' && (
        <div className="workspace-panel">
          <h2>Your preferences</h2>
          <form
            className="workspace-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (
                profile.trim() &&
                workspace.update((d) => ({ ...d, displayName: profile.trim() }))
              )
                setStatus('Personal settings saved.');
            }}
          >
            <label>
              Display name
              <input
                required
                maxLength={60}
                value={profile}
                onChange={(e) => setProfile(e.target.value)}
              />
            </label>
            <button className="primary">Save name</button>
          </form>
          <div className="preference-row">
            <label htmlFor="theme-setting">Appearance</label>
            <select
              id="theme-setting"
              value={props.theme}
              onChange={(e) => props.setTheme(e.target.value as 'light' | 'dark')}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
        </div>
      )}
      {page === 'workspace' && (
        <div className="workspace-panel">
          <h2>Workspace details</h2>
          <form
            className="workspace-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (
                name.trim() &&
                workspace.update((d) => ({
                  ...d,
                  name: name.trim(),
                  description: description.trim(),
                }))
              )
                setStatus('Workspace saved.');
            }}
          >
            <label className="span-two">
              Workspace name
              <input
                required
                maxLength={80}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className="span-two">
              Description
              <textarea
                rows={3}
                maxLength={500}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
            <button className="primary">
              <Check size={16} />
              Save workspace
            </button>
          </form>
          <div className="workspace-access">
            <h3>Everyone has access</h3>
            <p>
              No admin role or sign-in is required. Settings and recordings belong to this Chrome
              profile. They do not sync to other devices, and Relay does not send teammate
              invitations.
            </p>
          </div>
        </div>
      )}
      {page === 'tools' && <Tools {...props} />}
    </section>
  );
}
