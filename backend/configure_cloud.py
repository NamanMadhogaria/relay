"""Write public AWS identifiers and exact extension host permissions from stack outputs."""
import argparse
import json
import re
import subprocess
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--profile', default='naman-madhogaria')
parser.add_argument('--region', default='ap-south-1')
parser.add_argument('--stack', default='relay-cloud')
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
response = json.loads(subprocess.check_output([
    'aws', 'cloudformation', 'describe-stacks', '--stack-name', args.stack,
    '--profile', args.profile, '--region', args.region, '--output', 'json', '--no-cli-pager'], text=True))
stack = response['Stacks'][0]
if stack['StackStatus'] not in ['CREATE_COMPLETE', 'UPDATE_COMPLETE']:
    raise SystemExit('Stack is not successfully deployed: ' + stack['StackStatus'])
outputs = {o['OutputKey']: o['OutputValue'] for o in stack['Outputs']}
config = dict(region=outputs['Region'], bucket=outputs['Bucket'], identityPoolId=outputs['IdentityPoolId'])
if not re.fullmatch(r'[a-z]{2}-[a-z]+-\d', config['region']) or not re.fullmatch(r'[a-z0-9-]+', config['bucket']):
    raise SystemExit('Unexpected AWS output format.')
if not re.fullmatch(re.escape(config['region']) + r':[a-f0-9-]{36}', config['identityPoolId']):
    raise SystemExit('Unexpected identity pool format.')
(root / 'src/cloud-config.json').write_text(json.dumps(config, indent=2) + '\n', encoding='utf-8')
path = root / 'public/manifest.json'
manifest = json.loads(path.read_text(encoding='utf-8'))
origins = [f"https://cognito-identity.{config['region']}.amazonaws.com",
           f"https://{config['bucket']}.s3.{config['region']}.amazonaws.com"]
manifest['host_permissions'] = [origin + '/*' for origin in origins]
manifest['content_security_policy']['extension_pages'] = "script-src 'self'; object-src 'none'; connect-src 'self' " + ' '.join(origins)
path.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
print('Updated public cloud configuration and exact host permissions. Run npm run build.')
