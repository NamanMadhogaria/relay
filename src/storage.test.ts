import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { deleteRecording, listRecordings, saveRecording } from './storage';

describe('local recording library', () => {
  it('persists media, updates a title without duplication, and deletes the clip', async () => {
    const recording = {
      id: 'clip-1',
      title: 'First',
      createdAt: 1,
      duration: 5000,
      blob: new Blob(['media'], { type: 'video/webm' }),
      microphone: true,
    };
    await saveRecording(recording);
    const first = await listRecordings();
    expect(first).toHaveLength(1);
    expect(await first[0].blob.text()).toBe('media');
    await saveRecording({ ...recording, title: 'A clear walkthrough' });
    const updated = await listRecordings();
    expect(updated).toHaveLength(1);
    expect(updated[0].title).toBe('A clear walkthrough');
    await deleteRecording('clip-1');
    expect(await listRecordings()).toEqual([]);
  });
});
