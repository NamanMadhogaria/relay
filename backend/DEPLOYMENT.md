# AWS retirement record

Requested on 10 October 2026 when the owner removed captions from Relay.

Change set: `retire-caption-processing-20261010` on `relay-dev`, region `ap-south-1`.

The reviewed change set removes the API, transcription/translation workers, event rule, execution roles, processing logs, and legacy app authentication client/domain. It preserves the S3 bucket, DynamoDB table and user pool without replacements. The extension has no AWS URLs or host permissions.

Validation: cfn-lint returned no findings; selected cfn-guard checks returned six PASS, zero FAIL, four SKIP (absent processing resource types). CloudFormation service validation returned no errors. Two retention tests passed.

AWS accepted execution of the change set. The following status check was blocked by a connect timeout at the AWS sign-in token refresh endpoint. Final UPDATE_COMPLETE status has not yet been independently confirmed. The application does not depend on these resources and has no AWS host permissions.

A subsequent unauthenticated check could no longer resolve the former API endpoint. This is consistent with API removal, but it is not proof that every CloudFormation resource has finished deleting. Confirm the stack status when the AWS sign-in endpoint is reachable again.
