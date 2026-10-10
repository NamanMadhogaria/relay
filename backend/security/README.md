# Infrastructure checks

`rules/` contains selected, unmodified AWS Guard Rules Registry checks from commit
`7f7340c26ae5d5e8874651dbffeb12e0e9f505b6`:
https://github.com/aws-cloudformation/aws-guard-rules-registry/tree/7f7340c26ae5d5e8874651dbffeb12e0e9f505b6

See LICENSE for the upstream license. Checks cover S3 public access, encryption
and HTTPS, DynamoDB encryption, unrestricted administrator policies, public Lambda
invocation, and API access logging. Rules can report SKIP when a resource type or
policy pattern is absent; passing these selected rules is not a full security audit.

Use AWS cfn-guard 3.2.1, installed at `E:\Tools\cfn-guard\cfn-guard.exe`:

```powershell
python backend/build_template.py
& 'E:\Tools\cfn-guard\cfn-guard.exe' validate --rules backend/security/rules --data backend/generated/template.json --output-format json --show-summary none
```

The Windows x86_64 release archive was verified against its published SHA-256:
`52af28c02081f1067c6710c08619d359899734ec59d51f17f68e1b4b396a1203`.

The current template is retention-only. S3 versioning is intentionally omitted
for the pre-existing temporary uploads. Input, transcript and caption objects
keep their one-day lifecycle expiry. The app no longer has access to these
resources; there are no API or Lambda logs in the current template.
