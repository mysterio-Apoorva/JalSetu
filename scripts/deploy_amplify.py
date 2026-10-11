"""Manually deploy the reviewed static build to Amplify in the backend's AWS account.

--prepare creates/reuses the named app/branch and saves its HTTPS origin, but uploads no site.
--publish uploads only frontend/dist after backend CORS/namespace readiness checks.
"""
import argparse
import json
from pathlib import Path
import urllib.request
from urllib.parse import urlparse
import zipfile
import boto3
from botocore.config import Config

ROOT = Path(__file__).resolve().parents[1]
STATE = ROOT / '.runtime/amplify-release.json'

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['inspect', 'prepare', 'publish', 'status'])
    args = parser.parse_args()
    config = dict(line.split('=', 1) for line in (ROOT/'.env').read_text().splitlines() if '=' in line and not line.startswith('#'))
    session = boto3.Session(profile_name=config.get('AWS_PROFILE') or None, region_name=config['AWS_REGION'])
    options = Config(connect_timeout=10, read_timeout=60, retries={'max_attempts':2})
    amplify = session.client('amplify', config=options)
    identity = session.client('sts').get_caller_identity()
    stack = session.client('cloudformation').describe_stacks(StackName=config['STACK_NAME'])['Stacks'][0]
    assert stack['StackId'].split(':')[4] == identity['Account'], 'Backend and hosting accounts must match'
    if args.action == 'inspect':
        print(json.dumps({'account':identity['Account'], 'region':config['AWS_REGION'], 'apps':[{'id':a['appId'],'name':a['name']} for a in amplify.list_apps()['apps']]})); return
    if args.action == 'prepare':
        apps = [a for a in amplify.list_apps()['apps'] if a['name'] == 'jalsetu-operations']
        assert len(apps) <= 1, 'Ambiguous Amplify app name'
        api = config['VITE_API_BASE_URL'].rstrip('/')
        cognito = 'https://' + urlparse(config['JWT_ISSUER']).netloc
        csp = f"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https://tile.openstreetmap.org https://*.tile.openstreetmap.org; connect-src 'self' {api} {cognito}; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; upgrade-insecure-requests"
        headers = {'customHeaders':[{'pattern':'**/*','headers':[{'key':k,'value':v} for k,v in {
            'Content-Security-Policy':csp, 'X-Content-Type-Options':'nosniff', 'Referrer-Policy':'strict-origin-when-cross-origin',
            'Strict-Transport-Security':'max-age=31536000; includeSubDomains', 'Permissions-Policy':'geolocation=(self), camera=(self), microphone=()',
            'Cache-Control':'no-cache'}.items()]}]}
        properties = dict(customHeaders=json.dumps(headers), customRules=[{'source':'/public','target':'/index.html','status':'200'}])
        if apps:
            app = amplify.update_app(appId=apps[0]['appId'], **properties)['app']
        else:
            app = amplify.create_app(name='jalsetu-operations', platform='WEB', description='JAL-SETU operational frontend; uses existing AWS backend',
                tags={'Project':'JAL-SETU','ManagedBy':'workspace-release'}, **properties)['app']
        branch = 'main'
        try: amplify.get_branch(appId=app['appId'], branchName=branch)
        except amplify.exceptions.NotFoundException: amplify.create_branch(appId=app['appId'], branchName=branch, stage='PRODUCTION', enableAutoBuild=False)
        state = {'account':identity['Account'], 'region':config['AWS_REGION'], 'appId':app['appId'], 'branch':branch, 'origin':f'https://{branch}.{app["defaultDomain"]}'}
        STATE.parent.mkdir(exist_ok=True); STATE.write_text(json.dumps(state, indent=2)); print(json.dumps(state)); return
    state = json.loads(STATE.read_text())
    assert state['account'] == identity['Account'], 'Hosting state belongs to another AWS account'
    if args.action == 'publish':
        from verify_production_build import verify
        verify()
        params = {p['ParameterKey']:p['ParameterValue'] for p in stack.get('Parameters',[])}
        assert params.get('AllowedOrigin') == state['origin'], 'Deploy exact Amplify CORS origin first'
        assert params.get('DataNamespace') == 'LIVE', 'Deploy clean operational data namespace first'
        assert stack['StackStatus'] in ['CREATE_COMPLETE','UPDATE_COMPLETE'], 'Backend update is not complete'
        public = json.load(urllib.request.urlopen(config['VITE_API_BASE_URL'].rstrip('/')+'/api/v1/public', timeout=30))
        assert isinstance(public.get('wards'), list), 'Public endpoint contract failed'
        dist = ROOT / 'frontend/dist'
        assert (dist/'index.html').is_file(), 'Build frontend before publishing'
        archive = ROOT / '.runtime/amplify-site.zip'
        with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as zipped:
            for file in dist.rglob('*'):
                if file.is_file():
                    assert file.suffix not in ['.map','.env'], 'Do not publish source maps or environment files'
                    zipped.write(file, file.relative_to(dist).as_posix())
        deployment = amplify.create_deployment(appId=state['appId'], branchName=state['branch'])
        request = urllib.request.Request(deployment['zipUploadUrl'], data=archive.read_bytes(), method='PUT', headers={'Content-Type':'application/zip'})
        with urllib.request.urlopen(request, timeout=90) as response: assert response.status == 200
        job = amplify.start_deployment(appId=state['appId'], branchName=state['branch'], jobId=deployment['jobId'])['jobSummary']
        state['jobId'] = job['jobId']; STATE.write_text(json.dumps(state,indent=2))
        print(json.dumps({'status':job['status'],'origin':state['origin'],'jobId':job['jobId']})); return
    result = amplify.get_job(appId=state['appId'], branchName=state['branch'], jobId=state['jobId'])['job']['summary']
    print(json.dumps({'status':result['status'],'origin':state['origin']}))

if __name__ == '__main__': main()
