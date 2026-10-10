import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ArrowDownToLine,
  Home,
  CalendarDays,
  ListVideo,
  Settings,
  Globe,
  LayoutList,
  ChartNoAxesCombined,
  Wrench,
  Search,
  Heart,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Circle,
  Clapperboard,
  Clock3,
  Film,
  HardDrive,
  Loader2,
  Mic,
  MicOff,
  Monitor,
  Moon,
  Pause,
  Play,
  Plus,
  Radio,
  ShieldCheck,
  Square,
  Sun,
  Trash2,
  Video,
  VideoOff,
  X,
} from 'lucide-react';
import WorkspacePages from './WorkspacePages';
import {
  useWorkspace,
  withoutRecording,
  matchesRecording,
  pageNames,
  type Page,
} from './workspace';
import { useRecorder } from './useRecorder';
import CameraPreview from './CameraPreview';
import { applyTheme, readTheme } from './theme';
import { formatTime } from './recorder';
import { deleteRecording, listRecordings, Recording, saveRecording } from './storage';

export default function App() {
  const [theme, setTheme] = useState(readTheme);
  useLayoutEffect(() => applyTheme(theme), [theme]);
  const [view, setView] = useState<Page>('studio');
  const workspace = useWorkspace();
  const [search, setSearch] = useState('');
  const [folder, setFolder] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [sort, setSort] = useState('newest');
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [selected, setSelected] = useState<Recording | null>(null);
  const [url, setUrl] = useState('');
  const [message, setMessage] = useState('');
  const [saved, setSaved] = useState(true);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [titleBusy, setTitleBusy] = useState(false);
  const [focusRecordButton, setFocusRecordButton] = useState(false);
  const reviewRef = useRef<HTMLDivElement>(null);
  const recordButtonRef = useRef<HTMLButtonElement>(null);
  const capture = useRecorder(async (recording) => {
    setSelected(recording);
    setTitle(recording.title);
    setSaved(false);
    setView('studio');
    try {
      await saveRecording(recording);
      setRecordings((items) => [recording, ...items]);
      setSaved(true);
      setMessage('Recording saved on this device.');
    } catch {
      setMessage('Local save failed. Download this recording now before closing the page.');
    }
  });
  const busy = capture.state !== 'idle';

  useEffect(() => {
    if (view !== 'studio' || selected) capture.closePreview();
  }, [view, selected?.id]);

  useEffect(() => {
    listRecordings()
      .then((items) => {
        setRecordings(items.sort((a, b) => b.createdAt - a.createdAt));
      })
      .catch(() =>
        setMessage('Your local library could not be opened. Check browser storage settings.'),
      );
  }, []);
  useEffect(() => {
    if (!selected) {
      setUrl('');
      return;
    }
    const nextUrl = URL.createObjectURL(selected.blob);
    setUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [selected]);
  useEffect(() => {
    if (selected) reviewRef.current?.focus();
  }, [selected?.id]);
  useEffect(() => {
    if (
      !focusRecordButton ||
      view !== 'studio' ||
      selected ||
      busy ||
      capture.cameraChecking ||
      capture.micChecking
    )
      return;
    const button = recordButtonRef.current;
    if (!button) return;
    button.focus({ preventScroll: true });
    button.scrollIntoView({
      block: 'nearest',
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });
    setFocusRecordButton(false);
  }, [focusRecordButton, view, selected, busy, capture.cameraChecking, capture.micChecking]);
  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => {
      if (selected && !saved) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [selected, saved]);

  function openRecording(recording: Recording) {
    setSelected(recording);
    setTitle(recording.title);
    setSaved(true);
    setView('studio');
    setMessage('');
  }
  function newRecording() {
    if (busy) return;
    if (
      !saved &&
      selected &&
      !window.confirm('This clip has not been saved. Download it before continuing. Discard it?')
    )
      return;
    setSelected(null);
    setSaved(true);
    setView('studio');
    setMessage('');
    setFocusRecordButton(true);
    if (capture.cameraEnabled) void capture.checkCamera();
  }
  async function rename() {
    if (!selected || !title.trim() || titleBusy) return;
    setTitleBusy(true);
    const updated = { ...selected, title: title.trim().slice(0, 100) };
    try {
      await saveRecording(updated);
      setRecordings((items) =>
        [updated, ...items.filter((item) => item.id !== updated.id)].sort(
          (a, b) => b.createdAt - a.createdAt,
        ),
      );
      setSelected(updated);
      setSaved(true);
      setMessage('Title saved.');
    } catch {
      setMessage('Could not save the title. Your video is still available to download.');
    } finally {
      setTitleBusy(false);
    }
  }
  async function remove(id: string) {
    try {
      await deleteRecording(id);
      setRecordings((items) => items.filter((item) => item.id !== id));
      workspace.update((data) => withoutRecording(data, id));
      if (selected?.id === id) setSelected(null);
      setPendingDelete(null);
      setMessage('Recording deleted from this device.');
      return true;
    } catch {
      setMessage('Could not delete the recording. Please try again.');
      return false;
    }
  }
  function download(recording: Recording | null) {
    if (!recording) return;
    const anchor = document.createElement('a');
    const downloadUrl = URL.createObjectURL(recording.blob);
    anchor.href = downloadUrl;
    anchor.download = `${recording.title.replace(/[^a-z0-9\s_-]/gi, '').trim() || 'recording'}.webm`;
    document.body.append(anchor);
    try {
      anchor.click();
    } finally {
      anchor.remove();
      // Allow Chrome to begin reading the blob before releasing the download URL.
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 10000);
    }
  }

  function navigate(page: Page) {
    if (!busy) {
      setView(page);
      setMessage('');
    }
  }
  async function renameFromManage(recording: Recording, nextTitle: string) {
    if (!nextTitle) return false;
    const updated = { ...recording, title: nextTitle.slice(0, 100) };
    try {
      await saveRecording(updated);
      setRecordings((items) => items.map((r) => (r.id === updated.id ? updated : r)));
      if (selected?.id === updated.id) {
        setSelected(updated);
        setTitle(updated.title);
      }
      return true;
    } catch {
      setMessage('Could not save the recording title.');
      return false;
    }
  }
  const visibleRecordings = recordings
    .filter(
      (r) =>
        matchesRecording(r, workspace.data, search) &&
        (!folder || workspace.data.clips[r.id]?.folder === folder) &&
        (!favoritesOnly || workspace.data.clips[r.id]?.favorite),
    )
    .sort((a, b) =>
      sort === 'title'
        ? a.title.localeCompare(b.title)
        : sort === 'oldest'
          ? a.createdAt - b.createdAt
          : b.createdAt - a.createdAt,
    );
  const folders = [
    ...new Set(
      Object.values(workspace.data.clips)
        .map((m) => m.folder)
        .filter((f): f is string => !!f),
    ),
  ].sort();
  const navItems = [
    ['home', Home],
    ['library', Film],
    ['meetings', CalendarDays],
    ['playlists', ListVideo],
    ['recent', Clock3],
    ['settings', Settings],
  ] as const;
  const adminItems = [
    ['overview', Globe],
    ['manage', LayoutList],
    ['insights', ChartNoAxesCombined],
    ['workspace', Settings],
    ['tools', Wrench],
  ] as const;
  function navItem([page, Icon]: (typeof navItems)[number] | (typeof adminItems)[number]) {
    return (
      <button
        key={page}
        disabled={busy}
        className={view === page ? 'nav-item active' : 'nav-item'}
        aria-current={view === page ? 'page' : undefined}
        aria-label={page === 'library' ? 'My recordings' : pageNames[page]}
        onClick={() => navigate(page)}
      >
        <Icon size={18} />
        {pageNames[page]}
        {page === 'library' && <span className="nav-count">{recordings.length}</span>}
      </button>
    );
  }
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(event) => {
            event.preventDefault();
            if (!busy) setView('studio');
          }}
          aria-label="Relay studio"
        >
          <span className="brand-icon">
            <Radio size={24} />
          </span>
          relay<span className="brand-dot">.</span>
        </a>
        <div className="workspace">
          <span className="avatar">{workspace.data.displayName.slice(0, 1).toUpperCase()}</span>
          <div>
            {workspace.data.name}
            <small>Local workspace · open access</small>
          </div>
        </div>
        <nav aria-label="Main navigation">
          <button
            className={view === 'studio' ? 'nav-item active' : 'nav-item'}
            onClick={() => {
              if (!busy) newRecording();
              else setView('studio');
            }}
          >
            <Video size={18} />
            Recording studio
            <span className="nav-dot" />
          </button>
          {navItems.map(navItem)}
        </nav>
        <div className="nav-label admin-label">
          Admin tools
        </div>
        <nav aria-label="Admin tools">{adminItems.map(navItem)}</nav>
        <div className="sidebar-bottom">
          <button className="primary sidebar-record" disabled={busy} onClick={newRecording}>
            <Plus size={17} />
            Record a video
          </button>
          <div className="profile">
            <span className="avatar profile-avatar">
              {workspace.data.displayName.slice(0, 1).toUpperCase()}
            </span>
            <div>
              {workspace.data.displayName}
              <small>Relay · v0.3.0</small>
            </div>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div>
            Workspace <span>/</span> <strong>{pageNames[view]}</strong>
          </div>
          <form
            className="global-search"
            onSubmit={(event) => {
              event.preventDefault();
              if (!busy) {
                setFolder('');
                setFavoritesOnly(false);
                setView('library');
              }
            }}
          >
            <Search size={17} />
            <input
              aria-label="Search library"
              placeholder="Search recordings, tags, folders"
              disabled={busy}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <button type="submit" disabled={busy} aria-label="Search">
              Search
            </button>
          </form>
          <div className="topbar-actions">
            <button
              className="theme-toggle"
              onClick={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
              <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
            </button>
            <span className="private-pill">
              <ShieldCheck size={14} /> Video saved on your device
            </span>
          </div>
        </header>
        <main>
          {workspace.error && (
            <p role="alert" className="error">
              {workspace.error}
            </p>
          )}
          {view !== 'studio' && view !== 'library' ? (
            <WorkspacePages
              key={view}
              page={view}
              workspace={workspace}
              recordings={recordings}
              open={openRecording}
              download={download}
              remove={remove}
              rename={renameFromManage}
              navigate={navigate}
              newRecording={newRecording}
              theme={theme}
              setTheme={setTheme}
            />
          ) : (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">A LITTLE LESS MEETING. A LITTLE MORE CLARITY.</div>
                  <h1>
                    {view === 'library'
                      ? 'Your ideas, on record.'
                      : selected
                        ? 'Give your idea a second look.'
                        : 'Show it. Say it. Send it.'}
                  </h1>
                  <p>
                    {view === 'library'
                      ? 'A home for your walkthroughs, quick updates, and lightbulb moments.'
                      : selected
                        ? 'Your recording is ready. Take a look, give it a name, and keep a copy.'
                        : 'Turn what’s on your screen into something worth sharing.'}
                  </p>
                </div>
                <button
                  className="primary small"
                  onClick={newRecording}
                  disabled={busy || capture.cameraChecking || capture.micChecking}
                >
                  <Plus size={17} />
                  New recording
                </button>
              </div>
              {(message || capture.notice) && (
                <div className="message" role="status">
                  <CheckCircle2 size={18} />
                  <span>{message || capture.notice}</span>
                  <button
                    className="icon-button"
                    aria-label="Dismiss message"
                    onClick={() => setMessage('')}
                    hidden={!message}
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
              {capture.error && (
                <div className="error" role="alert">
                  {capture.error}
                </div>
              )}
              {view === 'library' ? (
                <>
                  <div className="section-heading">
                    <h2>
                      All recordings <span>{recordings.length}</span>
                    </h2>
                    <span className="muted">Saved in this browser</span>
                  </div>
                  <div className="workspace-toolbar library-filters">
                    <label>
                      Folder{' '}
                      <select value={folder} onChange={(e) => setFolder(e.target.value)}>
                        <option value="">All folders</option>
                        {folders.map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Sort{' '}
                      <select value={sort} onChange={(e) => setSort(e.target.value)}>
                        <option value="newest">Newest first</option>
                        <option value="oldest">Oldest first</option>
                        <option value="title">Title</option>
                      </select>
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={favoritesOnly}
                        onChange={(e) => setFavoritesOnly(e.target.checked)}
                      />{' '}
                      Favorites only
                    </label>
                    {(search || folder || favoritesOnly) && (
                      <button
                        className="text-button"
                        onClick={() => {
                          setSearch('');
                          setFolder('');
                          setFavoritesOnly(false);
                        }}
                      >
                        Clear filters
                      </button>
                    )}
                    <span className="muted">{visibleRecordings.length} results</span>
                  </div>
                  {visibleRecordings.length ? (
                    <div className="recording-grid">
                      {visibleRecordings.map((recording) => (
                        <article className="recording-card" key={recording.id}>
                          <button
                            className="recording-thumb"
                            onClick={() => openRecording(recording)}
                            aria-label={`Play ${recording.title}`}
                          >
                            <Monitor size={40} />
                            <span className="play-circle">
                              <Play size={19} fill="currentColor" />
                            </span>
                            <span className="duration">{formatTime(recording.duration)}</span>
                          </button>
                          <div className="recording-info">
                            <button
                              className="recording-title"
                              onClick={() => openRecording(recording)}
                            >
                              {recording.title}
                            </button>
                            <p>
                              {new Date(recording.createdAt).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                              })}{' '}
                              · {(recording.blob.size / 1024 / 1024).toFixed(1)} MB
                            </p>
                            {pendingDelete === recording.id ? (
                              <div className="delete-confirm">
                                <span>Delete local copy?</span>
                                <button onClick={() => void remove(recording.id)}>Delete</button>
                                <button onClick={() => setPendingDelete(null)}>Keep</button>
                              </div>
                            ) : (
                              <div className="card-footer">
                                <span>
                                  <HardDrive size={12} />
                                  On this device
                                </span>
                                <div className="card-actions">
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
                                      size={15}
                                      fill={
                                        workspace.data.clips[recording.id]?.favorite
                                          ? 'currentColor'
                                          : 'none'
                                      }
                                    />
                                  </button>
                                  <button
                                    className="icon-button"
                                    onClick={() => download(recording)}
                                    aria-label={`Download ${recording.title}`}
                                    title="Download video"
                                  >
                                    <ArrowDownToLine size={15} />
                                  </button>
                                  <button
                                    className="icon-button"
                                    onClick={() => setPendingDelete(recording.id)}
                                    aria-label={`Delete ${recording.title}`}
                                    title="Delete recording"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-library">
                      <div className="empty-icon">
                        <Film size={32} />
                      </div>
                      <h2>
                        {recordings.length
                          ? 'No matching recordings.'
                          : 'Your first great explanation starts here.'}
                      </h2>
                      <p>
                        {recordings.length
                          ? 'Try another search or clear your filters.'
                          : 'Record something. We’ll keep it right here for you.'}
                      </p>
                      <button className="primary" onClick={newRecording}>
                        <Plus size={17} />
                        Make your first recording
                      </button>
                    </div>
                  )}
                </>
              ) : selected ? (
                <section
                  className="review-card"
                  ref={reviewRef}
                  tabIndex={-1}
                  aria-label="Recording preview"
                >
                  <div className="card-header">
                    <span>
                      <CheckCircle2 size={17} />
                      Recording complete
                    </span>
                    <button className="secondary" onClick={newRecording} disabled={busy}>
                      <Plus size={16} />
                      New recording
                    </button>
                  </div>
                  <div className="video-wrap">
                    <video
                      key={selected.id}
                      src={url || undefined}
                      controls
                      playsInline
                      preload="metadata"
                      onPlay={(event) => {
                        if (event.currentTarget.dataset.counted) return;
                        event.currentTarget.dataset.counted = 'true';
                        workspace.update((data) => ({
                          ...data,
                          plays: [
                            ...data.plays,
                            { recordingId: selected.id, at: Date.now() },
                          ].slice(-10000),
                        }));
                      }}
                    />
                  </div>
                  <div className="review-body">
                    <label htmlFor="clip-title">Recording title</label>
                    <div className="title-editor">
                      <input
                        id="clip-title"
                        maxLength={100}
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') void rename();
                        }}
                      />
                      <button
                        className="secondary"
                        onClick={() => void rename()}
                        disabled={!title.trim() || titleBusy}
                      >
                        {titleBusy ? 'Saving…' : 'Save title'}
                      </button>
                    </div>
                    <div className="review-meta">
                      <span>
                        <Clock3 size={15} />
                        {formatTime(selected.duration)}
                      </span>
                      <span>
                        <HardDrive size={15} />
                        {(selected.blob.size / 1024 / 1024).toFixed(1)} MB
                      </span>
                      <span>
                        {selected.microphone ? <Mic size={15} /> : <MicOff size={15} />}
                        {selected.microphone ? 'With microphone' : 'No microphone'}
                      </span>
                      {selected.camera && (
                        <span>
                          <Video size={15} />
                          With camera overlay
                        </span>
                      )}
                    </div>
                    <div className="review-actions">
                      <span className={saved ? 'saved-status' : 'unsaved-status'}>
                        {saved ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                        {saved ? 'Saved on this device' : 'Not saved — download before leaving'}
                      </span>
                      <button className="primary" onClick={() => download(selected)}>
                        <ArrowDownToLine size={17} />
                        Download video
                      </button>
                    </div>
                  </div>
                </section>
              ) : (
                <div className="studio-layout">
                  <section className="studio-card">
                    <div className="card-header">
                      <span>
                        <span className={busy ? 'red-dot' : 'green-dot'} />
                        {busy
                          ? capture.state === 'paused'
                            ? 'Recording paused'
                            : capture.state === 'recording'
                              ? 'Recording in progress'
                              : capture.state === 'camera'
                                ? 'Preparing camera overlay…'
                                : capture.state === 'microphone'
                                  ? 'Connecting your microphone'
                                  : capture.state === 'countdown'
                                    ? 'Get ready'
                                    : capture.state === 'saving'
                                      ? 'Saving your recording'
                                      : 'Choose what to share'
                          : 'Your recording studio'}
                      </span>
                      <span className="tag">
                        {capture.cameraEnabled ? 'SCREEN + CAMERA' : 'SCREEN + VOICE'}
                      </span>
                    </div>
                    <div className={busy ? 'stage is-live' : 'stage'}>
                      {busy ? (
                        <div className="live-display">
                          <span className="live-orbit">
                            <Radio size={40} />
                          </span>
                          <div className="recording-time">
                            {capture.state === 'countdown'
                              ? capture.countdown
                              : formatTime(capture.elapsed)}
                          </div>
                          <h2>
                            {capture.state === 'countdown'
                              ? 'Make yourself heard.'
                              : capture.state === 'paused'
                                ? 'Take your time.'
                                : capture.state === 'camera'
                                  ? 'Preparing camera overlay…'
                                  : capture.state === 'microphone'
                                    ? 'Allow your microphone in Chrome.'
                                    : capture.state === 'choosing'
                                      ? 'Choose a tab, window, or screen.'
                                      : capture.state === 'saving'
                                        ? 'Keeping your idea safe…'
                                        : 'You’re on. Make it clear.'}
                          </h2>
                          <p>
                            {capture.state === 'paused'
                              ? 'Your timer is paused, too. Resume when you’re ready.'
                              : 'Keep this studio tab open while you record.'}
                          </p>
                        </div>
                      ) : (
                        <>
                          <div className="illustration">
                            <div className="floating-chip chip-top">
                              <span className="red-dot" />
                              REC <span>00:00</span>
                            </div>
                            <div className="mock-window">
                              <div className="mock-title">
                                <i />
                                <i />
                                <i />
                                <span>your next big idea</span>
                              </div>
                              <div className="mock-content">
                                <div className="mock-sidebar">
                                  <i />
                                  <i />
                                  <i />
                                </div>
                                <div className="mock-document">
                                  <div className="mock-line long" />
                                  <div className="mock-line" />
                                  <div className="mock-chart">
                                    <span />
                                    <span />
                                    <span />
                                    <span />
                                    <span />
                                  </div>
                                </div>
                              </div>
                              <div className="cursor-arrow">
                                <ArrowLeft size={23} fill="currentColor" />
                              </div>
                            </div>
                            <div className="floating-chip chip-bottom">
                              <span className="wave-bars">
                                <i />
                                <i />
                                <i />
                                <i />
                                <i />
                                <i />
                                <i />
                              </span>
                              Your voice. Your story.
                            </div>
                          </div>
                          <h2>Big ideas deserve a clear picture.</h2>
                          <p>A quick walkthrough can say what a long message can’t.</p>
                          <div className="stage-badges">
                            <span>
                              <Monitor size={14} />
                              Screen, window, or tab
                            </span>
                            <span>
                              <Clock3 size={14} />
                              No fixed time limit
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                    <div className="studio-controls">
                      <div className="microphone-row">
                        <span className="device-icon">
                          {capture.micEnabled ? <Mic size={20} /> : <MicOff size={20} />}
                        </span>
                        <div className="device-label">
                          <strong>
                            {capture.micEnabled ? 'Microphone' : 'Record without audio'}
                          </strong>
                          <small>
                            {capture.micEnabled
                              ? capture.micReady
                                ? 'Connected · speak to check your level'
                                : 'Permission requested when you start'
                              : 'Your video will have no microphone audio'}
                          </small>
                        </div>
                        <button
                          role="switch"
                          aria-checked={capture.micEnabled}
                          aria-label="Microphone"
                          className={`toggle ${capture.micEnabled ? 'on' : ''}`}
                          disabled={busy || capture.micChecking || capture.cameraChecking}
                          onClick={capture.toggleMic}
                        >
                          <span />
                        </button>
                      </div>
                      {capture.micEnabled && (
                        <div className="mic-check">
                          <div
                            className="level-meter"
                            role="meter"
                            aria-label="Microphone input level"
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={Math.round(capture.level * 100)}
                          >
                            {Array.from({ length: 28 }, (_, index) => (
                              <i key={index} className={capture.level * 28 > index ? 'lit' : ''} />
                            ))}
                          </div>
                          <button
                            className="text-button"
                            disabled={busy || capture.micChecking || capture.cameraChecking}
                            onClick={() => void capture.checkMic()}
                          >
                            {capture.micChecking ? (
                              <Loader2 className="spin" size={14} />
                            ) : capture.micReady ? (
                              <Check size={14} />
                            ) : (
                              <Mic size={14} />
                            )}
                            {capture.micChecking
                              ? 'Connecting…'
                              : capture.micReady
                                ? 'Check again'
                                : 'Check microphone'}
                          </button>
                        </div>
                      )}
                      <div className="camera-controls">
                        <div className="microphone-row">
                          <span className="device-icon">
                            {capture.cameraEnabled ? <Video size={20} /> : <VideoOff size={20} />}
                          </span>
                          <div className="device-label">
                            <strong>Camera</strong>
                            <small>
                              {capture.cameraChecking
                                ? 'Allow camera access in Chrome…'
                                : capture.cameraStream
                                  ? 'Connected · your face is included in the video'
                                  : 'Add your face to the recording'}
                            </small>
                          </div>
                          <button
                            role="switch"
                            aria-checked={capture.cameraEnabled}
                            aria-label="Camera"
                            className={`toggle ${capture.cameraEnabled ? 'on' : ''}`}
                            disabled={busy || capture.cameraChecking || capture.micChecking}
                            onClick={capture.toggleCamera}
                          >
                            <span />
                          </button>
                        </div>
                        {capture.cameraStream ? (
                          <>
                            <CameraPreview stream={capture.cameraStream} />
                            <div className="floating-camera-controls">
                              <button
                                className="secondary"
                                onClick={
                                  capture.floatingOpen
                                    ? capture.hideFloatingCamera
                                    : capture.showFloatingCamera
                                }
                              >
                                <Video size={16} />
                                {capture.floatingOpen
                                  ? 'Hide floating camera'
                                  : 'Show floating camera'}
                              </button>
                              <p>
                                {capture.floatingOpen
                                  ? 'Your camera stays above other windows. Drag it to the bottom-right.'
                                  : 'Keep your face visible while you work in another tab or app.'}
                              </p>
                              {capture.floatingOpen && capture.shareSurface === 'monitor' && (
                                <p>
                                  Entire-screen capture may also capture this floating window. Use
                                  Hide floating camera to avoid an extra preview in the recording.
                                </p>
                              )}
                            </div>
                          </>
                        ) : capture.cameraEnabled && !capture.cameraChecking && !busy ? (
                          <button
                            className="text-button camera-retry"
                            onClick={() => void capture.checkCamera()}
                            disabled={capture.micChecking}
                          >
                            Connect camera
                          </button>
                        ) : null}
                      </div>
                      <div className="main-action">
                        {!busy ? (
                          <button
                            ref={recordButtonRef}
                            className="primary record-button"
                            disabled={capture.micChecking || capture.cameraChecking}
                            onClick={() => void capture.start()}
                          >
                            <span className="record-circle" />
                            Choose screen & record
                            <ArrowRight size={18} />
                          </button>
                        ) : capture.state === 'recording' || capture.state === 'paused' ? (
                          <div className="live-actions">
                            <button className="secondary" onClick={capture.pauseResume}>
                              {capture.state === 'paused' ? (
                                <Play size={17} />
                              ) : (
                                <Pause size={17} />
                              )}
                              {capture.state === 'paused' ? 'Resume' : 'Pause'}
                            </button>
                            <button className="stop-button" onClick={capture.stop}>
                              <Square size={14} fill="currentColor" />
                              Finish recording
                            </button>
                          </div>
                        ) : capture.state === 'countdown' ? (
                          <button className="secondary full-width" onClick={capture.stop}>
                            Cancel countdown
                          </button>
                        ) : (
                          <button className="primary full-width" disabled>
                            <Loader2 size={18} className="spin" />
                            {capture.state === 'saving'
                              ? 'Saving…'
                              : capture.state === 'camera'
                                ? 'Preparing camera overlay…'
                                : capture.state === 'microphone'
                                  ? 'Waiting for microphone permission…'
                                  : 'Waiting for screen selection…'}
                          </button>
                        )}
                      </div>
                      <p className="control-note">
                        <ShieldCheck size={13} />
                        {busy
                          ? 'Do not close this tab until your preview is ready.'
                          : 'Your video and audio stay on this device. Nothing uploads.'}
                      </p>
                    </div>
                  </section>
                  <aside className="studio-aside">
                    <div className="steps-card">
                      <span className="mini-eyebrow">FROM THOUGHT TO WALKTHROUGH</span>
                      <h2>
                        Less setup.
                        <br />
                        More showing.
                      </h2>
                      <div className="step">
                        <span>01</span>
                        <div>
                          <strong>Find your frame</strong>
                          <p>Pick a tab, a window, or your entire screen.</p>
                        </div>
                      </div>
                      <div className="step">
                        <span>02</span>
                        <div>
                          <strong>Make it personal</strong>
                          <p>Check your mic. Walk someone through your thinking.</p>
                        </div>
                      </div>
                      <div className="step">
                        <span>03</span>
                        <div>
                          <strong>Keep the good stuff</strong>
                          <p>Preview it, name it, and download your recording.</p>
                        </div>
                      </div>
                      <div className="tip">
                        <span>✦</span>
                        <p>
                          <strong>A little recording tip</strong>One idea per video. Short and
                          focused wins every time.
                        </p>
                      </div>
                    </div>
                    <div className="privacy-note">
                      <HardDrive size={18} />
                      <p>
                        <strong>A home for every take.</strong>Your finished recordings are saved in
                        this browser’s local library.
                      </p>
                    </div>
                  </aside>
                </div>
              )}
              {view === 'studio' && !selected && (
                <section className="recent-section">
                  <div className="section-heading">
                    <h2>Recent recordings</h2>
                    <button
                      disabled={busy}
                      className="text-button"
                      onClick={() => setView('library')}
                    >
                      View library
                      <ArrowRight size={15} />
                    </button>
                  </div>
                  {recordings.length ? (
                    <div className="recent-list">
                      {recordings.slice(0, 3).map((recording) => (
                        <button
                          disabled={busy}
                          key={recording.id}
                          onClick={() => openRecording(recording)}
                        >
                          <span className="recent-icon">
                            <Play size={17} />
                          </span>
                          <span>
                            <strong>{recording.title}</strong>
                            <small>{formatTime(recording.duration)} · Saved on this device</small>
                          </span>
                          <ArrowRight size={17} />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="recent-empty">
                      <span>
                        <Clapperboard size={23} />
                      </span>
                      <div>
                        <strong>A blank canvas, for now.</strong>
                        <p>Your first recording will appear here. Make it a good one.</p>
                      </div>
                      <span className="empty-dashes">— — —</span>
                    </div>
                  )}
                </section>
              )}
            </>
          )}
          <footer>
            <span>Made for clear communication.</span>
            <span>Record locally. Share intentionally.</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
