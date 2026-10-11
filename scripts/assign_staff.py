"""Assign an existing email-verified account to an approved staff role. Sends no email.
Usage: python scripts/assign_staff.py person@example.org Dispatcher --execute
"""
import argparse
import json
from pathlib import Path
import boto3

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('email'); parser.add_argument('role', choices=['Driver','Dispatcher','Auditor'])
    parser.add_argument('--execute', action='store_true'); args = parser.parse_args()
    settings = dict(line.split('=',1) for line in (Path(__file__).resolve().parents[1]/'.env').read_text().splitlines() if '=' in line and not line.startswith('#'))
    client = boto3.Session(profile_name=settings.get('AWS_PROFILE') or None, region_name=settings['AWS_REGION']).client('cognito-idp')
    pool = settings['JWT_ISSUER'].rstrip('/').split('/')[-1]
    user = client.admin_get_user(UserPoolId=pool,Username=args.email)
    attributes = {a['Name']:a['Value'] for a in user['UserAttributes']}
    assert attributes.get('email','').lower() == args.email.lower() and attributes.get('email_verified') == 'true' and user['Enabled'], 'User must first register and verify their own email'
    assert not args.email.lower().endswith('@jalsetu.local'), 'Test accounts cannot become production staff'
    if args.execute: client.admin_add_user_to_group(UserPoolId=pool,Username=user['Username'],GroupName=args.role)
    print(json.dumps({'role':args.role,'emailVerified':True,'assigned':args.execute,'nextStep':'Sign out and sign in to refresh role claims' if args.execute else 'Review the intended account and role before --execute'}))

if __name__=='__main__': main()
