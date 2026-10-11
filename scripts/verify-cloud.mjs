// Integration test: creates only synthetic objects in fresh guest identities.
// Never prints credentials, identity identifiers, or request headers.
import { readFileSync } from 'node:fs';
import { CognitoIdentityClient, GetIdCommand, GetCredentialsForIdentityCommand } from '@aws-sdk/client-cognito-identity';
import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import assert from 'node:assert/strict';
const config = JSON.parse(readFileSync(new URL('../src/cloud-config.json', import.meta.url)));
const cognito = new CognitoIdentityClient({ region: config.region });
async function guest() {
  const { IdentityId } = await cognito.send(new GetIdCommand({ IdentityPoolId: config.identityPoolId }));
  const { Credentials: c } = await cognito.send(new GetCredentialsForIdentityCommand({ IdentityId }));
  return { prefix: `recordings/${IdentityId}/`, client: new S3Client({ region: config.region,
    credentials: { accessKeyId: c.AccessKeyId, secretAccessKey: c.SecretKey, sessionToken: c.SessionToken } }) };
}
const a = await guest();
const b = await guest();
const key = `${a.prefix}relay-integration-${Date.now()}.webm`;
const data = Buffer.alloc(9 * 1024 * 1024, 41);
try {
  await new Upload({ client: a.client, params: { Bucket: config.bucket, Key: key, Body: data },
    partSize: 5 * 1024 * 1024, queueSize: 2 }).done();
  const response = await a.client.send(new GetObjectCommand({ Bucket: config.bucket, Key: key }));
  assert.deepEqual(Buffer.from(await response.Body.transformToByteArray()), data);
  console.log('PASS: multipart upload and exact-byte restore');
  assert.equal((await a.client.send(new ListObjectsV2Command({ Bucket: config.bucket, Prefix: a.prefix }))).Contents.length, 1);
  for (const command of [new GetObjectCommand({ Bucket: config.bucket, Key: key }),
    new PutObjectCommand({ Bucket: config.bucket, Key: key, Body: 'forbidden' }),
    new DeleteObjectCommand({ Bucket: config.bucket, Key: key }),
    new ListObjectsV2Command({ Bucket: config.bucket, Prefix: a.prefix }),
    new ListObjectsV2Command({ Bucket: config.bucket })]) {
    await assert.rejects(b.client.send(command), (error) => error.$metadata?.httpStatusCode === 403);
  }
  console.log('PASS: another guest cannot read, overwrite, delete, list this prefix, or list the bucket');
} finally {
  await a.client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }));
}
assert.equal((await a.client.send(new ListObjectsV2Command({ Bucket: config.bucket, Prefix: a.prefix }))).KeyCount, 0);
console.log('PASS: deleted test backup; retained versions expire after seven days');
