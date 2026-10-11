// @vitest-environment happy-dom
import { expect, it } from 'vitest';
import { decodeMetadata, encodeMetadata, backupRecording, MAX_BACKUP_BYTES } from './cloud';

it('preserves Hindi and English titles in S3 ASCII metadata', () => {
  const recording = {
    id: 'clip-1',
    title: 'मेरी recording',
    duration: 1250,
    createdAt: 123,
    microphone: true,
    camera: true,
    blob: new Blob(['test']),
  };
  const { blob, ...expected } = recording;
  expect(decodeMetadata(encodeMetadata(recording))).toEqual(expected);
});
it('rejects malformed or untrusted metadata', () => {
  for (const value of [
    undefined,
    '',
    'not-base64',
    btoa('{}'),
    btoa(JSON.stringify({ id: '../other' })),
  ]) {
    expect(() => decodeMetadata(value)).toThrow();
  }
});
it('rejects oversized or empty uploads before requesting AWS access', async () => {
  const recording = {
    id: 'clip',
    title: 'Clip',
    duration: 100,
    createdAt: 1,
    microphone: false,
    blob: { size: MAX_BACKUP_BYTES + 1 } as Blob,
  };
  await expect(backupRecording(recording, () => {}, new AbortController().signal)).rejects.toThrow(
    '1 GB',
  );
  await expect(
    backupRecording({ ...recording, blob: new Blob([]) }, () => {}, new AbortController().signal),
  ).rejects.toThrow('empty');
});
