import { useEffect, useState } from 'react';
import type { Recording } from './storage';

export type Page =
  | 'studio'
  | 'library'
  | 'cloud'
  | 'home'
  | 'meetings'
  | 'playlists'
  | 'recent'
  | 'settings'
  | 'overview'
  | 'manage'
  | 'insights'
  | 'workspace'
  | 'tools';
export const pageNames: Record<Page, string> = {
  studio: 'Recording studio',
  library: 'Library',
  cloud: 'Cloud backups',
  home: 'For you',
  meetings: 'Meetings',
  playlists: 'Playlists',
  recent: 'Recent',
  settings: 'Personal settings',
  overview: 'Overview',
  manage: 'Manage',
  insights: 'Insights',
  workspace: 'Workspace',
  tools: 'Relay Tools',
};
export type ClipMetadata = { favorite?: boolean; folder?: string; tags?: string[] };
export type Playlist = { id: string; name: string; recordingIds: string[] };
export type Meeting = {
  id: string;
  title: string;
  startsAt: string;
  notes: string;
  recordingId: string;
};
export type WorkspaceData = {
  version: 1;
  name: string;
  displayName: string;
  description: string;
  clips: Record<string, ClipMetadata>;
  playlists: Playlist[];
  meetings: Meeting[];
  plays: { recordingId: string; at: number }[];
};
const KEY = 'relay-workspace-v1';
export function emptyWorkspace(): WorkspaceData {
  return {
    version: 1,
    name: 'Personal workspace',
    displayName: 'You',
    description: 'A home for clear communication.',
    clips: {},
    playlists: [],
    meetings: [],
    plays: [],
  };
}
function readWorkspace(): WorkspaceData {
  const raw = localStorage.getItem(KEY);
  if (!raw) return emptyWorkspace();
  const data = JSON.parse(raw) as WorkspaceData;
  if (
    data.version !== 1 ||
    typeof data.name !== 'string' ||
    typeof data.displayName !== 'string' ||
    typeof data.description !== 'string' ||
    !data.clips ||
    typeof data.clips !== 'object' ||
    !Array.isArray(data.playlists) ||
    !Array.isArray(data.meetings) ||
    !Array.isArray(data.plays)
  )
    throw new Error('Workspace data could not be read. Your video files are unaffected.');
  return data;
}
export function useWorkspace() {
  const [error, setError] = useState('');
  const [data, setData] = useState<WorkspaceData>(() => {
    try {
      return readWorkspace();
    } catch {
      return emptyWorkspace();
    }
  });
  useEffect(() => {
    function refresh() {
      try {
        setData(readWorkspace());
      } catch {
        setError(
          'Workspace data could not be read. Your videos are unaffected. Export your browser data before resetting storage.',
        );
      }
    }
    refresh();
    const listener = (event: StorageEvent) => {
      if (event.key === KEY) refresh();
    };
    window.addEventListener('storage', listener);
    return () => window.removeEventListener('storage', listener);
  }, []);
  function update(change: (current: WorkspaceData) => WorkspaceData): boolean {
    try {
      // Read immediately before writing so other open studio tabs are not silently overwritten.
      const next = change(readWorkspace());
      localStorage.setItem(KEY, JSON.stringify(next));
      setData(next);
      setError('');
      return true;
    } catch {
      setError('Could not save workspace changes. Browser storage may be full or unavailable.');
      return false;
    }
  }
  return { data, update, error };
}
export type WorkspaceController = ReturnType<typeof useWorkspace>;
export function matchesRecording(recording: Recording, data: WorkspaceData, query: string) {
  const meta = data.clips[recording.id];
  return [recording.title, meta?.folder, ...(meta?.tags ?? [])]
    .join(' ')
    .toLocaleLowerCase()
    .includes(query.trim().toLocaleLowerCase());
}
export function withoutRecording(data: WorkspaceData, id: string): WorkspaceData {
  const clips = { ...data.clips };
  delete clips[id];
  return {
    ...data,
    clips,
    playlists: data.playlists.map((p) => ({
      ...p,
      recordingIds: p.recordingIds.filter((item) => item !== id),
    })),
    meetings: data.meetings.map((m) => (m.recordingId === id ? { ...m, recordingId: '' } : m)),
    plays: data.plays.filter((p) => p.recordingId !== id),
  };
}
export function downloadFile(name: string, contents: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
export function meetingCalendar(meeting: Meeting) {
  const escape = (value: string) =>
    value.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
  const timestamp = (date: Date) =>
    date
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}Z/, 'Z');
  const start = new Date(meeting.startsAt);
  // RFC 5545 lines must be folded at 75 octets, including for Hindi text.
  function fold(line: string) {
    let output = '',
      width = 0;
    for (const character of line) {
      const bytes = new TextEncoder().encode(character).length;
      if (width + bytes > 75) {
        output += '\r\n ';
        width = 1;
      }
      output += character;
      width += bytes;
    }
    return output;
  }
  return (
    [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Relay//Meeting planner//EN',
      'BEGIN:VEVENT',
      `UID:${meeting.id}@relay.local`,
      `DTSTAMP:${timestamp(new Date())}`,
      `DTSTART:${timestamp(start)}`,
      `DTEND:${timestamp(new Date(start.getTime() + 30 * 60000))}`,
      `SUMMARY:${escape(meeting.title)}`,
      `DESCRIPTION:${escape(meeting.notes)}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ]
      .map(fold)
      .join('\r\n') + '\r\n'
  );
}
