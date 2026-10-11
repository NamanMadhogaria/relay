# Relay AWS backend

Relay 0.4.0 uses AWS for private recording backups, independently of captions. The deployed stack is **relay-cloud**, region **ap-south-1**, maintenance profile **naman-madhogaria**. Reviewers do not need AWS Console access.

## Runtime flow

1. User chooses Connect or Back up in Cloud backups.
2. Cognito creates/reuses this installation's guest identity and issues temporary credentials.
3. The browser signs direct S3 requests. IAM restricts each guest to `recordings/<guest-identity>/`.
4. Selected video and recording metadata upload together; larger transfers use multipart upload.
5. Restore downloads and saves the video to IndexedDB. Local and cloud deletion are independent.

S3 and Cognito are the managed backend. This flow needs no Lambda, API Gateway, or DynamoDB. `src/cloud-config.json` contains public identifiers, not AWS keys. The guest identifier stays local and credentials stay in memory. Losing the identifier can lose in-app access to backups. This is not authenticated recovery, public sharing, or full workspace synchronization.

## Where to see the AWS data

- [S3 recordings](https://s3.console.aws.amazon.com/s3/buckets/relay-cloud-recordingsbucket-jzlkl1tjyyjg?region=ap-south-1&tab=objects): open recordings/ and an identity folder. Objects appear after explicit upload.
- [CloudFormation](https://ap-south-1.console.aws.amazon.com/cloudformation/home?region=ap-south-1#/stacks): relay-cloud > Resources or Outputs.
- [Cognito](https://ap-south-1.console.aws.amazon.com/cognito/home?region=ap-south-1): Identity pools. This is guest access, not user-pool sign-in.

The app shows its bucket and region under Cloud backups > AWS connection details. Do not publish individual guest identifiers.

## Deploy

`build_cloud_template.py` builds the independent backup stack. `build_template.py` remains a legacy retention-only template: do not deploy it as a new application backend.

```powershell
python backend/build_cloud_template.py
python -m unittest discover -s backend -p 'test_*.py'
cfn-lint backend/generated/cloud-template.json
& 'E:\Tools\cfn-guard\cfn-guard.exe' validate --rules backend/security/rules --data backend/generated/cloud-template.json --output-format json --show-summary none
```

With AWS CLI authenticated and cfn-lint on PATH, run `backend/deploy-cloud.ps1` to validate, deploy, and configure. Parameters: Profile, Region, Stack, Guard. To configure an existing deployment:

```powershell
python backend/configure_cloud.py --profile naman-madhogaria --region ap-south-1 --stack relay-cloud
npm run build
```

Reload the same dist folder in Chrome. Chrome may ask you to accept the two new AWS host permissions. Different unpacked installations can have different extension IDs; CORS allows extension origins, while IAM enforces the actual identity boundary.

## Security, cost, and limits

- Public access blocked, ACLs disabled, HTTPS enforced, SSE-S3 encryption, versioning, stateful data retained on stack deletion.
- Current videos do not expire automatically. Previous versions expire after seven days; deleting a cloud copy hides the current version first. Failed multipart uploads expire after one day.
- Encrypted S3 access logs expire after 30 days. Default storage metrics are available. Durable CloudTrail/data-event logging and targeted request metrics/alarms are recommended before wider production use. These additional controls add costs and are not configured; the account has no dedicated CloudTrail trail.
- Storage, requests, logs, versions, and data transfer can consume AWS credits or incur charges. There is no permanent-free guarantee.
- The 1 GB/video app limit is not an AWS-enforced quota or spending cap. Guest identity issuance is public. Broad public distribution requires enforced quotas, abuse controls, budget monitoring, and authenticated recovery. CORS is not authorization.
- The client never receives administrator credentials. Live tests verified that guest credentials cannot read, overwrite, delete, or list another guest's files, or list the entire bucket.

## Retired caption stack

relay-dev reached UPDATE_COMPLETE after processing retirement. Its retained S3 bucket, DynamoDB table, and Cognito user pool are not used by this extension. Their prior retention and expiry policies remain. Do not delete this data when deploying backups.

See DEPLOYMENT.md and ../docs/testing.md for verified status and tests.
