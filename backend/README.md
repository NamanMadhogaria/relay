# Retired AWS processing

Relay 0.3.0 runs locally. Do not deploy AWS resources to install or review it.

At the owner's request, caption generation and audio uploads were removed. `build_template.py` now produces a retention-only maintenance template for the **existing** `relay-dev` stack in `ap-south-1`. It contains the existing private S3 bucket, DynamoDB table, Cognito user pool, and bucket policy. It has no Lambda functions, API Gateway, EventBridge processing, application clients, or IAM execution roles.

The three stateful resources retain their physical identities and `Retain` policies to avoid deleting existing data. The extension cannot access them. Previous temporary audio, transcript, and caption objects keep their one-day expiry policy; DynamoDB TTL remains enabled. Retention is not a promise of zero AWS charges.

Do not create a new stack from this maintenance template. Any later deletion of retained data should be a separate, explicitly scoped decision.

Validation:

```sh
python backend/build_template.py
python -m unittest discover -s backend -p 'test_*.py'
```

See `DEPLOYMENT.md` for live retirement status. The old AI pipeline was never verified end to end because the account returned `SubscriptionRequiredException`; the current submission makes no AI caption claim.
