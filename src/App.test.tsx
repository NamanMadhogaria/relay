// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { listRecordings, saveRecording } from './storage';
import { useRecorder } from './useRecorder';
vi.mock('./storage', () => ({
  listRecordings: vi.fn(),
  saveRecording: vi.fn(),
  deleteRecording: vi.fn(),
}));
vi.mock('./useRecorder', () => ({ useRecorder: vi.fn() }));

const clip = {
  id: 'saved-video',
  title: 'Existing video',
  createdAt: 1,
  duration: 1000,
  blob: new Blob(['video']),
  microphone: false,
};
let capture: ReturnType<typeof useRecorder>;

beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
  vi.mocked(listRecordings).mockResolvedValue([clip]);
  vi.mocked(saveRecording).mockResolvedValue(clip.id);
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:preview');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  capture = {
    state: 'idle',
    micEnabled: false,
    micReady: false,
    micChecking: false,
    cameraEnabled: false,
    cameraChecking: false,
    cameraStream: null,
    floatingOpen: false,
    shareSurface: '',
    level: 0,
    elapsed: 0,
    countdown: 3,
    error: '',
    notice: '',
    closePreview: vi.fn(),
    checkCamera: vi.fn(),
    toggleCamera: vi.fn(),
    checkMic: vi.fn(),
    toggleMic: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    pauseResume: vi.fn(),
    showFloatingCamera: vi.fn(),
    hideFloatingCamera: vi.fn(),
  };
  vi.mocked(useRecorder).mockReturnValue(capture);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('starting the next recording', () => {
  it('keeps New recording visible after a completed recording and preserves it in the library', async () => {
    vi.mocked(listRecordings).mockResolvedValue([]);
    render(<App />);
    const complete = vi.mocked(useRecorder).mock.calls.at(-1)![0];
    await act(async () => {
      await complete(clip);
    });
    expect(screen.getByRole('region', { name: 'Recording preview' })).toBeTruthy();
    const scroll = vi.spyOn(HTMLElement.prototype, 'scrollIntoView');
    fireEvent.click(screen.getAllByRole('button', { name: 'New recording' })[0]);
    expect(scroll).toHaveBeenCalledWith({ block: 'nearest', behavior: 'smooth' });
    expect(screen.queryByRole('region', { name: 'Recording preview' })).toBeNull();
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Choose screen & record' }),
    );
    expect(screen.getByText('Existing video')).toBeTruthy();
  });

  it('Recording studio navigation opens setup when reviewing an older clip', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Existing video')).toBeTruthy());
    fireEvent.click(screen.getByText('Existing video'));
    expect(screen.getByRole('region', { name: 'Recording preview' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Recording studio' }));
    expect(screen.getByRole('button', { name: 'Choose screen & record' })).toBeTruthy();
    expect(screen.queryByRole('region', { name: 'Recording preview' })).toBeNull();
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Choose screen & record' }),
    );
  });

  it('disables New recording during active capture', async () => {
    capture.state = 'recording';
    render(<App />);
    await waitFor(() => expect(screen.getByText('Existing video')).toBeTruthy());
    expect(
      (screen.getByRole('button', { name: 'New recording' }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });
});

describe('theme preference', () => {
  it('switches themes and remembers the choice when the studio is reopened', async () => {
    const { unmount } = render(<App />);
    await waitFor(() => expect(screen.getByText('Existing video')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Switch to dark mode' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem('relay-theme')).toBe('dark');
    unmount();
    render(<App />);
    await waitFor(() => expect(screen.getByText('Existing video')).toBeTruthy());
    expect(document.documentElement.dataset.theme).toBe('dark');
    fireEvent.click(screen.getByRole('button', { name: 'Switch to light mode' }));
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(localStorage.getItem('relay-theme')).toBe('light');
  });

  it('respects reduced motion when returning to the record button', async () => {
    const matchMedia = window.matchMedia.bind(window);
    vi.spyOn(window, 'matchMedia').mockImplementation((query) => {
      const result = matchMedia(query);
      if (query === '(prefers-reduced-motion: reduce)')
        Object.defineProperty(result, 'matches', { value: true });
      return result;
    });
    const scroll = vi.spyOn(HTMLElement.prototype, 'scrollIntoView');
    render(<App />);
    await waitFor(() => expect(screen.getByText('Existing video')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'New recording' }));
    expect(scroll).toHaveBeenCalledWith({ block: 'nearest', behavior: 'auto' });
  });
});

describe('open workspace tools', () => {
  it('opens every management page without authentication and omits billing', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Existing video')).toBeTruthy());
    for (const name of [
      'For you',
      'Meetings',
      'Playlists',
      'Recent',
      'Personal settings',
      'Overview',
      'Manage',
      'Insights',
      'Workspace',
      'Relay Tools',
    ]) {
      fireEvent.click(screen.getAllByRole('button', { name })[0]);
      expect(screen.getByRole('region', { name })).toBeTruthy();
    }
    expect(screen.queryByRole('button', { name: 'Billing' })).toBeNull();
    expect(screen.queryByRole('button', { name: /sign in/i })).toBeNull();
  });
  it('creates a playlist, adds a video and preserves it when navigating away', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Existing video')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Playlists' }));
    fireEvent.change(screen.getByLabelText('Playlist name'), { target: { value: 'Client demo' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create playlist' }));
    fireEvent.click(screen.getByRole('button', { name: 'Existing video' }));
    fireEvent.click(screen.getByRole('button', { name: 'Overview' }));
    fireEvent.click(screen.getByRole('button', { name: 'Playlists' }));
    fireEvent.click(screen.getByRole('button', { name: /Client demo/ }));
    expect(screen.getByRole('button', { name: 'Existing video' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Remove video 1 from playlist' })).toBeTruthy();
  });
  it('searches the library and recovers from an empty result', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Existing video')).toBeTruthy());
    fireEvent.change(screen.getByLabelText('Search library'), {
      target: { value: 'missing-title' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    expect(screen.getByText('No matching recordings.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(screen.getByRole('button', { name: 'Play Existing video' })).toBeTruthy();
  });
  it('saves workspace and personal preferences without a role', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Existing video')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Workspace' }));
    fireEvent.change(screen.getByLabelText('Workspace name'), {
      target: { value: 'Demo workspace' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save workspace' }));
    expect(screen.getByText('Workspace saved.')).toBeTruthy();
    expect(screen.getByText('Demo workspace')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Personal settings' }));
    fireEvent.change(screen.getByLabelText('Display name'), { target: { value: 'Client' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save name' }));
    expect(JSON.parse(localStorage.getItem('relay-workspace-v1')!).displayName).toBe('Client');
  });
});
