// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import CloudBackups from './CloudBackups';
import * as cloud from './cloud';
import { saveRecording } from './storage';

vi.mock('./cloud', () => ({
  cloudConfigured: true,
  cloudConfig: { region: 'ap-south-1', bucket: 'test' },
  listCloudRecordings: vi.fn(),
  backupRecording: vi.fn(),
  restoreCloudRecording: vi.fn(),
  deleteCloudRecording: vi.fn(),
  cloudError: (error: Error) => error.message,
}));
vi.mock('./storage', () => ({ saveRecording: vi.fn() }));
const clip = {
  id: 'test-clip',
  title: 'Test clip',
  createdAt: 1,
  duration: 1000,
  microphone: true,
  blob: new Blob(['video']),
};
const backup = { ...clip, key: 'recordings/guest/test-clip.webm', size: 5, backedUpAt: 1 };
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(cloud.listCloudRecordings).mockResolvedValue([backup]);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it('makes no AWS request until the user connects or uploads', () => {
  render(<CloudBackups recordings={[clip]} onRestore={vi.fn()} />);
  expect(cloud.listCloudRecordings).not.toHaveBeenCalled();
  expect(cloud.backupRecording).not.toHaveBeenCalled();
});
it('uploads explicitly then refreshes the actual cloud list', async () => {
  render(<CloudBackups recordings={[clip]} onRestore={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Back up Test clip' }));
  await screen.findByText('Backed up “Test clip” to AWS. Your local copy is unchanged.');
  expect(cloud.backupRecording).toHaveBeenCalledWith(
    clip,
    expect.any(Function),
    expect.any(AbortSignal),
  );
  expect(screen.getByRole('button', { name: 'Restore Test clip' })).toBeTruthy();
});
it('saves the restored video before updating the local library', async () => {
  vi.mocked(cloud.restoreCloudRecording).mockResolvedValue(clip);
  const restored = vi.fn();
  render(<CloudBackups recordings={[]} onRestore={restored} />);
  fireEvent.click(screen.getByRole('button', { name: 'Connect to AWS' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Restore Test clip' }));
  await waitFor(() => expect(restored).toHaveBeenCalledWith(clip));
  expect(saveRecording).toHaveBeenCalledWith(clip);
});
it('does not claim restore succeeded when IndexedDB fails', async () => {
  vi.mocked(cloud.restoreCloudRecording).mockResolvedValue(clip);
  vi.mocked(saveRecording).mockRejectedValueOnce(new Error('Local storage is full.'));
  const restored = vi.fn();
  render(<CloudBackups recordings={[]} onRestore={restored} />);
  fireEvent.click(screen.getByRole('button', { name: 'Connect to AWS' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Restore Test clip' }));
  expect((await screen.findByRole('alert')).textContent).toContain('Local storage is full.');
  expect(restored).not.toHaveBeenCalled();
});
it('requires confirmation before cloud deletion', async () => {
  vi.stubGlobal(
    'confirm',
    vi.fn(() => false),
  );
  render(<CloudBackups recordings={[clip]} onRestore={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Connect to AWS' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Delete cloud backup Test clip' }));
  expect(cloud.deleteCloudRecording).not.toHaveBeenCalled();
});
