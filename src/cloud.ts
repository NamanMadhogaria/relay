import {
  CognitoIdentityClient,
  GetIdCommand,
  GetCredentialsForIdentityCommand,
} from '@aws-sdk/client-cognito-identity';
import {
  S3Client,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
  paginateListObjectsV2,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import config from './cloud-config.json';
import type { Recording } from './storage';

export const cloudConfig = config;
export const cloudConfigured = Boolean(config.bucket && config.identityPoolId);
export type CloudRecording = Omit<Recording, 'blob'> & {
  key: string;
  size: number;
  backedUpAt: number;
};
export const MAX_BACKUP_BYTES = 1024 * 1024 * 1024;
const identityKey = `relay-cloud-identity:${config.identityPoolId}`;
type Credentials = {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
  expiration: Date;
};
let identity = '';
let credentials: Credentials | undefined;
let refreshing: Promise<Credentials> | undefined;
const cognito = new CognitoIdentityClient({
  region: config.region,
  maxAttempts: 3,
  requestHandler: { requestTimeout: 20000 },
});

async function refreshCredentials(): Promise<Credentials> {
  if (!cloudConfigured) throw new Error('Cloud backup has not been configured for this build.');
  identity = identity || localStorage.getItem(identityKey) || '';
  if (!identity) {
    const result = await cognito.send(new GetIdCommand({ IdentityPoolId: config.identityPoolId }));
    if (!result.IdentityId)
      throw new Error('AWS could not create this installation’s cloud space.');
    // Persist before uploading: losing this identifier would lose in-app access to backups.
    localStorage.setItem(identityKey, result.IdentityId);
    identity = result.IdentityId;
  }
  const result = await cognito.send(new GetCredentialsForIdentityCommand({ IdentityId: identity }));
  const next = result.Credentials;
  if (!next?.AccessKeyId || !next.SecretKey || !next.SessionToken || !next.Expiration) {
    throw new Error('AWS did not return temporary cloud access. Try again.');
  }
  credentials = {
    accessKeyId: next.AccessKeyId,
    secretAccessKey: next.SecretKey,
    sessionToken: next.SessionToken,
    expiration: next.Expiration,
  };
  return credentials;
}

async function getCredentials(): Promise<Credentials> {
  if (credentials && credentials.expiration.getTime() > Date.now() + 300_000) return credentials;
  if (!refreshing)
    refreshing = refreshCredentials().finally(() => {
      refreshing = undefined;
    });
  return refreshing;
}

const s3 = new S3Client({
  region: config.region,
  credentials: getCredentials,
  maxAttempts: 3,
  requestHandler: { requestTimeout: 180000 },
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
});

async function prefix() {
  await getCredentials();
  return `recordings/${identity}/`;
}

async function assertOwnKey(key: string) {
  const own = await prefix();
  if (!key.startsWith(own) || !/^[a-zA-Z0-9_-]+\.webm$/.test(key.slice(own.length))) {
    throw new Error('This backup does not belong to the current cloud space.');
  }
}

export function encodeMetadata(recording: Recording): string {
  const data = {
    id: recording.id,
    title: recording.title.slice(0, 100),
    createdAt: recording.createdAt,
    duration: recording.duration,
    microphone: recording.microphone,
    camera: !!recording.camera,
  };
  return btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(data))));
}

export function decodeMetadata(raw: string | undefined): Omit<Recording, 'blob'> {
  if (!raw || raw.length > 1900) throw new Error('This cloud recording has invalid metadata.');
  const data = JSON.parse(
    new TextDecoder().decode(Uint8Array.from(atob(raw), (c) => c.charCodeAt(0))),
  );
  if (
    !data ||
    typeof data.id !== 'string' ||
    !/^[a-zA-Z0-9_-]+$/.test(data.id) ||
    typeof data.title !== 'string' ||
    data.title.length > 100 ||
    !Number.isFinite(data.createdAt) ||
    data.createdAt < 0 ||
    !Number.isFinite(data.duration) ||
    data.duration < 0 ||
    typeof data.microphone !== 'boolean' ||
    typeof data.camera !== 'boolean'
  ) {
    throw new Error('This cloud recording has invalid metadata.');
  }
  return {
    id: data.id,
    title: data.title,
    createdAt: data.createdAt,
    duration: data.duration,
    microphone: data.microphone,
    camera: data.camera,
  };
}

export async function listCloudRecordings(signal?: AbortSignal): Promise<CloudRecording[]> {
  const own = await prefix();
  const recordings: CloudRecording[] = [];
  for await (const page of paginateListObjectsV2(
    { client: s3, pageSize: 100 },
    { Bucket: config.bucket, Prefix: own },
    { abortSignal: signal },
  )) {
    // Bound metadata requests per batch instead of starting one request per entire library.
    const objects = (page.Contents ?? []).filter((item) => item.Key?.endsWith('.webm'));
    for (let i = 0; i < objects.length; i += 4) {
      const batch = await Promise.all(
        objects.slice(i, i + 4).map(async (item) => {
          const head = await s3.send(
            new HeadObjectCommand({ Bucket: config.bucket, Key: item.Key }),
            { abortSignal: signal },
          );
          const data = decodeMetadata(head.Metadata?.relay);
          if (item.Key !== `${own}${data.id}.webm`)
            throw new Error('Cloud recording metadata does not match its file.');
          return {
            ...data,
            key: item.Key,
            size: head.ContentLength ?? 0,
            backedUpAt: head.LastModified?.getTime() ?? 0,
          };
        }),
      );
      recordings.push(...batch);
    }
  }
  return recordings.sort((a, b) => b.createdAt - a.createdAt);
}

export async function backupRecording(
  recording: Recording,
  progress: (percent: number) => void,
  signal: AbortSignal,
) {
  if (recording.blob.size > MAX_BACKUP_BYTES)
    throw new Error(
      'Cloud backup supports up to 1 GB per video. Local recording has no fixed time limit.',
    );
  if (!recording.blob.size) throw new Error('This recording is empty.');
  if (!/^[a-zA-Z0-9_-]+$/.test(recording.id)) throw new Error('Invalid recording ID.');
  const own = await prefix();
  signal.throwIfAborted();
  const upload = new Upload({
    client: s3,
    params: {
      Bucket: config.bucket,
      Key: `${own}${recording.id}.webm`,
      Body: recording.blob,
      ContentType: 'video/webm',
      Metadata: { relay: encodeMetadata(recording) },
    },
    queueSize: 2,
    partSize: 8 * 1024 * 1024,
    leavePartsOnError: false,
  });
  const abort = () => {
    void upload.abort();
  };
  signal.addEventListener('abort', abort, { once: true });
  upload.on('httpUploadProgress', (event) =>
    progress(Math.min(99, Math.round(((event.loaded ?? 0) / recording.blob.size) * 100))),
  );
  try {
    await upload.done();
    progress(100);
  } finally {
    signal.removeEventListener('abort', abort);
  }
}

export async function restoreCloudRecording(
  clip: CloudRecording,
  signal: AbortSignal,
): Promise<Recording> {
  await assertOwnKey(clip.key);
  if (clip.size > MAX_BACKUP_BYTES)
    throw new Error('This cloud video exceeds the 1 GB restore limit.');
  const result = await s3.send(new GetObjectCommand({ Bucket: config.bucket, Key: clip.key }), {
    abortSignal: signal,
  });
  if (!result.Body) throw new Error('The cloud video could not be downloaded.');
  const data = decodeMetadata(result.Metadata?.relay);
  if (data.id !== clip.id) throw new Error('Cloud video identity does not match.');
  const bytes = await result.Body.transformToByteArray();
  signal.throwIfAborted();
  if (bytes.length !== clip.size)
    throw new Error('The cloud video changed. Refresh the list and try again.');
  return { ...data, blob: new Blob([new Uint8Array(bytes)], { type: 'video/webm' }) };
}

export async function deleteCloudRecording(key: string, signal?: AbortSignal) {
  await assertOwnKey(key);
  await s3.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }), {
    abortSignal: signal,
  });
}

export function cloudError(error: unknown): string {
  const name = error instanceof Error ? error.name : '';
  if (name === 'AbortError')
    return 'Transfer cancelled. Refresh to check whether AWS completed the upload.';
  if (name === 'AccessDenied' || name === 'NotAuthorizedException')
    return 'AWS denied access. Your local recordings are safe. Check the cloud deployment and guest permissions.';
  if (name === 'TypeError' || name === 'TimeoutError')
    return 'Could not reach AWS. Check your connection and try again. Your local recordings are safe.';
  return error instanceof Error ? error.message : 'Cloud request failed. Please try again.';
}
