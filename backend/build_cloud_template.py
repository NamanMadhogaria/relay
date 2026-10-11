"""Independent recording-backup stack. Does not modify retained caption data."""
import json
from pathlib import Path


def sub(value):
    return {"Fn::Sub": value}


def resource(kind, properties, why, must, retain=False):
    result = {"Type": kind, "Properties": properties, "Metadata": {
        "com.aws.cloudformation.Context": {"why": why, "must": must}}}
    if retain:
        result.update(DeletionPolicy="Retain", UpdateReplacePolicy="Retain")
    return result


def template():
    block = dict(BlockPublicAcls=True, BlockPublicPolicy=True,
                 IgnorePublicAcls=True, RestrictPublicBuckets=True)
    encryption = {"ServerSideEncryptionConfiguration": [
        {"ServerSideEncryptionByDefault": {"SSEAlgorithm": "AES256"}}]}
    own_prefix = "recordings/${cognito-identity.amazonaws.com:sub}/"
    resources = {}
    resources["AccessLogs"] = resource("AWS::S3::Bucket", {
        "PublicAccessBlockConfiguration": block, "BucketEncryption": encryption,
        "OwnershipControls": {"Rules": [{"ObjectOwnership": "BucketOwnerEnforced"}]},
        "LifecycleConfiguration": {"Rules": [{"Id": "ExpireAccessLogs", "Status": "Enabled", "ExpirationInDays": 30}]},
    }, "Encrypted access-log destination with 30-day retention.", ["No guest access to audit logs."], True)
    resources["RecordingsBucket"] = resource("AWS::S3::Bucket", {
        "PublicAccessBlockConfiguration": block, "BucketEncryption": encryption,
        "OwnershipControls": {"Rules": [{"ObjectOwnership": "BucketOwnerEnforced"}]},
        "VersioningConfiguration": {"Status": "Enabled"},
        "LoggingConfiguration": {"DestinationBucketName": {"Ref": "AccessLogs"}, "LogFilePrefix": "recordings/"},
        "CorsConfiguration": {"CorsRules": [{
            "AllowedOrigins": ["chrome-extension://*", "http://127.0.0.1:5173", "http://localhost:5173"],
            "AllowedMethods": ["GET", "HEAD", "PUT", "POST", "DELETE"],
            "AllowedHeaders": ["*"], "ExposedHeaders": ["ETag", "x-amz-meta-relay", "x-amz-version-id"], "MaxAge": 600}]},
        "LifecycleConfiguration": {"Rules": [{"Id": "CleanIncompleteAndOldVersions", "Status": "Enabled",
            "AbortIncompleteMultipartUpload": {"DaysAfterInitiation": 1},
            "NoncurrentVersionExpiration": {"NoncurrentDays": 7}}]},
    }, "Private WebM backups, separate from the retired captions stack.",
       ["Never grant public object access.", "IAM must scope guests to their own identity prefix.",
        "Retain current recordings until explicitly deleted; previous versions expire after seven days."], True)
    for name, bucket in [("RecordingsPolicy", "RecordingsBucket"), ("AccessLogsPolicy", "AccessLogs")]:
        statements = [{"Sid": "DenyInsecureTransport", "Effect": "Deny", "Principal": "*", "Action": "s3:*",
            "Resource": [sub("${" + bucket + ".Arn}"), sub("${" + bucket + ".Arn}/*")],
            "Condition": {"Bool": {"aws:SecureTransport": False}}}]
        if bucket == "AccessLogs":
            statements.append({"Sid": "S3AccessLogs", "Effect": "Allow", "Principal": {"Service": "logging.s3.amazonaws.com"},
                "Action": "s3:PutObject", "Resource": sub("${AccessLogs.Arn}/recordings/*"),
                "Condition": {"StringEquals": {"aws:SourceAccount": {"Ref": "AWS::AccountId"}},
                              "ArnEquals": {"aws:SourceArn": sub("${RecordingsBucket.Arn}")}}})
        resources[name] = resource("AWS::S3::BucketPolicy", {"Bucket": {"Ref": bucket},
            "PolicyDocument": {"Version": "2012-10-17", "Statement": statements}},
            "Enforce HTTPS and scope service log delivery.", ["No public Allow statements."])
    resources["GuestIdentities"] = resource("AWS::Cognito::IdentityPool", {
        "AllowUnauthenticatedIdentities": True, "AllowClassicFlow": False,
    }, "No-sign-in guest identity for each installation.",
       ["Guest identity IDs must remain local; losing one loses in-app access to its backups.",
        "This is not authenticated account recovery or a shared team workspace."], True)
    resources["GuestRole"] = resource("AWS::IAM::Role", {
        "AssumeRolePolicyDocument": {"Version": "2012-10-17", "Statement": [{
            "Effect": "Allow", "Principal": {"Federated": "cognito-identity.amazonaws.com"},
            "Action": "sts:AssumeRoleWithWebIdentity", "Condition": {
                "StringEquals": {"cognito-identity.amazonaws.com:aud": {"Ref": "GuestIdentities"}},
                "ForAnyValue:StringLike": {"cognito-identity.amazonaws.com:amr": "unauthenticated"}}}]},
        "Policies": [{"PolicyName": "OwnRecordingBackups", "PolicyDocument": {
            "Version": "2012-10-17", "Statement": [
                {"Effect": "Allow", "Action": "s3:ListBucket", "Resource": sub("${RecordingsBucket.Arn}"),
                 "Condition": {"StringLike": {"s3:prefix": [own_prefix + "*"]}}},
                {"Effect": "Allow", "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject",
                    "s3:AbortMultipartUpload", "s3:ListMultipartUploadParts"],
                 "Resource": {"Fn::Join": ["", [{"Fn::GetAtt": ["RecordingsBucket", "Arn"]}, "/", own_prefix, "*"]]}}
            ]}}],
    }, "Short-lived credentials limited to the current guest's recording objects.",
       ["Bind trust to this pool and guest authentication method.", "Never use bucket-wide object permissions."])
    resources["GuestRoleAttachment"] = resource("AWS::Cognito::IdentityPoolRoleAttachment", {
        "IdentityPoolId": {"Ref": "GuestIdentities"}, "Roles": {"unauthenticated": {"Fn::GetAtt": ["GuestRole", "Arn"]}},
    }, "Attach only the guest role required by the extension.", ["No administrative or authenticated role is exposed."])
    return {"AWSTemplateFormatVersion": "2010-09-09",
        "Description": "Relay optional private recording backups using S3 and Cognito guest identities. No captions or sign-in UI.",
        "Metadata": {"AWSToolsMetrics": {"AWSAgentToolkit": "aws-cloudformation@3"}},
        "Resources": resources, "Outputs": {
            "Bucket": {"Description": "Private recording backup bucket", "Value": {"Ref": "RecordingsBucket"}},
            "IdentityPoolId": {"Description": "Public guest identity pool identifier", "Value": {"Ref": "GuestIdentities"}},
            "Region": {"Description": "Deployment region", "Value": {"Ref": "AWS::Region"}},
        }}


if __name__ == "__main__":
    path = Path(__file__).parent / "generated" / "cloud-template.json"
    path.parent.mkdir(exist_ok=True)
    path.write_text(json.dumps(template(), indent=2) + "\n", encoding="utf-8")
    print(f"Generated {path} ({path.stat().st_size} bytes)")
