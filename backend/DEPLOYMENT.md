# AWS deployment record

## Active recording backups - 11 October 2026

`relay-cloud` in `ap-south-1` reached CREATE_COMPLETE. Executed change set: `recording-backups-20261011-v2`.

Resources: private recordings S3 bucket, encrypted access-log bucket, HTTPS policies, Cognito guest identity pool, scoped IAM role, and role attachment. The extension uses this stack. No caption services were added.

cfn-lint returned no findings. Selected cfn-guard checks: six PASS, zero FAIL, four SKIP. AWS pre-deployment validation reported no findings. Live multipart upload, exact-byte restore, deletion, and cross-guest denial passed. Chrome upload/restore was checked with synthetic video.

The account has no dedicated CloudTrail trail. Management event history is not durable audit retention; S3 access logging is configured for the new bucket.

## Earlier caption retirement

Requested on 10 October 2026 when the owner removed captions from Relay.

Change set: `retire-caption-processing-20261010` on `relay-dev`, region `ap-south-1`.

The earlier change set removed the API, transcription/translation workers, event rule, execution roles, processing logs, and legacy app authentication client/domain. It preserved the S3 bucket, DynamoDB table and user pool without replacements. Version 0.3.0 removed AWS host permissions; version 0.4.0 adds only the new backup endpoints.

Validation: cfn-lint returned no findings; selected cfn-guard checks returned six PASS, zero FAIL, four SKIP (absent processing resource types). CloudFormation service validation returned no errors. Two retention tests passed.

AWS accepted execution. Initial verification was blocked by credential/network access. On 11 October 2026, describe-stacks confirmed relay-dev UPDATE_COMPLETE. The app does not access its retained resources; the AWS runtime now uses the separate relay-cloud stack.

A subsequent unauthenticated check could no longer resolve the former API endpoint. This is consistent with API removal, but it is not proof that every CloudFormation resource has finished deleting. Confirm the stack status when the AWS sign-in endpoint is reachable again.
