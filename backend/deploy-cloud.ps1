param(
    [string]$Profile = 'naman-madhogaria',
    [string]$Region = 'ap-south-1',
    [string]$Stack = 'relay-cloud',
    [string]$Guard = 'E:\Tools\cfn-guard\cfn-guard.exe'
)
$ErrorActionPreference = 'Stop'
Push-Location (Split-Path $PSScriptRoot -Parent)
try {
    python backend/build_cloud_template.py
    if ($LASTEXITCODE -ne 0) { throw 'Template generation failed.' }
    cfn-lint backend/generated/cloud-template.json
    if ($LASTEXITCODE -ne 0) { throw 'CloudFormation lint failed or cfn-lint is not on PATH.' }
    & $Guard validate --rules backend/security/rules --data backend/generated/cloud-template.json --output-format json --show-summary none
    if ($LASTEXITCODE -ne 0) { throw 'Security checks failed.' }
    aws cloudformation deploy --stack-name $Stack --template-file backend/generated/cloud-template.json --capabilities CAPABILITY_IAM --profile $Profile --region $Region --no-fail-on-empty-changeset --no-cli-pager
    if ($LASTEXITCODE -ne 0) { throw 'AWS deployment failed.' }
    python backend/configure_cloud.py --profile $Profile --region $Region --stack $Stack
    if ($LASTEXITCODE -ne 0) { throw 'Could not configure the extension.' }
} finally { Pop-Location }
