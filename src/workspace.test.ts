// @vitest-environment happy-dom
import { act, renderHook, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  emptyWorkspace,
  matchesRecording,
  meetingCalendar,
  useWorkspace,
  withoutRecording,
} from './workspace';
import type { Recording } from './storage';

beforeEach(() => localStorage.clear());
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
const recording: Recording = {
  id: 'clip',
  title: 'Release walkthrough',
  createdAt: 1,
  duration: 1000,
  microphone: true,
  blob: new Blob(),
};
describe('local workspace', () => {
  it('persists changes and merges updates from another open tab', () => {
    const one = renderHook(useWorkspace);
    const two = renderHook(useWorkspace);
    act(() => {
      one.result.current.update((d) => ({ ...d, name: 'Product team' }));
    });
    act(() => {
      two.result.current.update((d) => ({ ...d, displayName: 'Naman' }));
    });
    const reloaded = renderHook(useWorkspace);
    expect(reloaded.result.current.data.name).toBe('Product team');
    expect(reloaded.result.current.data.displayName).toBe('Naman');
  });
  it('does not claim a save when storage is full', () => {
    const { result } = renderHook(useWorkspace);
    const storage = localStorage;
    vi.stubGlobal('localStorage', {
      getItem: storage.getItem.bind(storage),
      setItem: () => {
        throw new DOMException('Full', 'QuotaExceededError');
      },
    });
    act(() => {
      expect(result.current.update((d) => ({ ...d, name: 'Unsaved' }))).toBe(false);
    });
    expect(result.current.data.name).toBe('Personal workspace');
    expect(result.current.error).toContain('Could not save');
  });
  it('preserves malformed storage instead of overwriting it', () => {
    localStorage.setItem('relay-workspace-v1', '{broken');
    const { result } = renderHook(useWorkspace);
    act(() => {
      expect(result.current.update((d) => ({ ...d, name: 'New' }))).toBe(false);
    });
    expect(localStorage.getItem('relay-workspace-v1')).toBe('{broken');
  });
  it('removes deleted recording references while preserving unrelated content', () => {
    const data = {
      ...emptyWorkspace(),
      clips: { clip: { favorite: true }, kept: { folder: 'Demo' } },
      playlists: [{ id: 'p', name: 'Launch', recordingIds: ['clip', 'kept'] }],
      meetings: [
        { id: 'm', title: 'Sync', startsAt: '', notes: 'Keep agenda', recordingId: 'clip' },
      ],
      plays: [
        { recordingId: 'clip', at: 1 },
        { recordingId: 'kept', at: 2 },
      ],
    };
    const result = withoutRecording(data, 'clip');
    expect(result.playlists[0].recordingIds).toEqual(['kept']);
    expect(result.meetings[0]).toMatchObject({ recordingId: '', notes: 'Keep agenda' });
    expect(result.plays).toEqual([{ recordingId: 'kept', at: 2 }]);
    expect(data.clips.clip.favorite).toBe(true);
  });
  it('searches saved title, folder and tags without case sensitivity', () => {
    const data = { ...emptyWorkspace(), clips: { clip: { folder: 'Design', tags: ['Sprint'] } } };
    for (const query of ['RELEASE', ' design ', 'sprint'])
      expect(matchesRecording(recording, data, query)).toBe(true);
    expect(matchesRecording(recording, data, 'unrelated')).toBe(false);
  });
  it('exports a timezone-independent calendar event and escapes line injection', () => {
    const calendar = meetingCalendar({
      id: 'm',
      title: 'Review, launch; next',
      startsAt: '2026-10-11T10:00:00+05:30',
      notes: 'Agenda\nEND:VEVENT\n' + 'हिन्दी'.repeat(30),
      recordingId: '',
    });
    expect(calendar).toContain('DTSTART:20261011T043000Z');
    expect(calendar).toContain('DTEND:20261011T050000Z');
    expect(calendar).toContain('SUMMARY:Review\\, launch\\; next');
    expect(calendar.split('\r\n').filter((line) => line === 'END:VEVENT')).toHaveLength(1);
    expect(
      calendar.split('\r\n').every((line) => new TextEncoder().encode(line).length <= 75),
    ).toBe(true);
  });
});
