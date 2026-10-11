"""Read-only live authentication smoke test; never prints credentials or tokens."""
import json
from pathlib import Path
import urllib.request
import urllib.error
import base64
import sys

ENDPOINT = 'https://cognito-idp.us-east-1.amazonaws.com/'
CLIENT = '16ploao82gc7qg4djtua5sdbuh'

def call(operation, body):
    request = urllib.request.Request(ENDPOINT, json.dumps(body).encode(), {
        'Content-Type': 'application/x-amz-json-1.1',
        'X-Amz-Target': 'AWSCognitoIdentityProviderService.' + operation,
    })
    with urllib.request.urlopen(request, timeout=20) as response:
        return json.load(response)

def main():
    root = Path(__file__).resolve().parents[1]
    accounts = json.loads((root / 'scratch_cognito.json').read_text())['users']
    settings = dict(line.split('=', 1) for line in (root / '.env').read_text().splitlines()
                    if '=' in line and not line.startswith('#'))
    with urllib.request.urlopen(settings['VITE_API_BASE_URL'].rstrip('/') + '/api/v1/public', timeout=25) as response:
        public = json.load(response)
    evidence_id = (public.get('deliveries') or [{}])[0].get('id')
    preflight = urllib.request.Request(settings['VITE_API_BASE_URL'].rstrip('/') + '/api/v1/snapshot',
        method='OPTIONS', headers={'Origin': settings.get('ALLOWED_ORIGIN', 'http://localhost:5174'),
            'Access-Control-Request-Method': 'GET',
            'Access-Control-Request-Headers': 'authorization,content-type'})
    with urllib.request.urlopen(preflight, timeout=20) as response:
        print('API allowed browser origin: ' + str(response.headers.get('Access-Control-Allow-Origin', '(none)')))
    for account in accounts:
        if len(sys.argv) > 1 and account['role'] not in sys.argv[1:]:
            continue
        refresh = None
        try:
            result = call('InitiateAuth', {'ClientId': CLIENT, 'AuthFlow': 'USER_PASSWORD_AUTH',
                'AuthParameters': {'USERNAME': account['username'], 'PASSWORD': account['password']}})['AuthenticationResult']
            refresh = result['RefreshToken']
            claims = json.loads(base64.urlsafe_b64decode(result['IdToken'].split('.')[1] + '==='))
            assert account['role'] in claims['cognito:groups']
            renewed = call('InitiateAuth', {'ClientId': CLIENT, 'AuthFlow': 'REFRESH_TOKEN_AUTH',
                'AuthParameters': {'REFRESH_TOKEN': refresh}})['AuthenticationResult']
            assert renewed['IdToken'] and renewed['AccessToken']
            request = urllib.request.Request(settings['VITE_API_BASE_URL'].rstrip('/') + '/api/v1/snapshot',
                headers={'Authorization': 'Bearer ' + renewed['IdToken']})
            with urllib.request.urlopen(request, timeout=25) as response:
                assert response.status == 200
            print(account['role'] + ': sign-in, group, refresh, API snapshot PASS')
            if evidence_id and account['role'] in ('Citizen', 'Auditor'):
                evidence_request = urllib.request.Request(settings['VITE_API_BASE_URL'].rstrip('/') + '/api/v1/evidence?requestId=' + evidence_id,
                    headers={'Authorization': 'Bearer ' + renewed['IdToken']})
                try:
                    with urllib.request.urlopen(evidence_request, timeout=25) as response:
                        evidence = json.load(response)
                    assert account['role'] == 'Auditor' and evidence['integrityVerified'] and evidence['photoBase64']
                    print('Auditor: private evidence integrity PASS')
                except urllib.error.HTTPError as error:
                    if account['role'] != 'Citizen' or error.code != 403:
                        raise
                    print('Citizen: private evidence access denied PASS')
        except urllib.error.HTTPError as error:
            print(account['role'] + ': FAIL HTTP ' + str(error.code))
            raise SystemExit(1) from None
        finally:
            if refresh:
                call('RevokeToken', {'ClientId': CLIENT, 'Token': refresh})

if __name__ == '__main__':
    main()
