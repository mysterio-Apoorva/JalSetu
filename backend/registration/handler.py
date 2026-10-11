"""Public registration grants resident access only. Staff roles are administrator-managed."""
import os
import boto3

ROLES = frozenset(('Citizen',))


def handler(event, context):
    if event.get('userPoolId') != os.environ['USER_POOL_ID']:
        raise ValueError('Unexpected user pool')
    source = event.get('triggerSource')
    # Password recovery must never restore a removed group or change staff access.
    if source == 'PostConfirmation_ConfirmForgotPassword':
        return event
    if source == 'PreSignUp_AdminCreateUser':
        return event
    if source not in ('PreSignUp_SignUp', 'PostConfirmation_ConfirmSignUp'):
        raise ValueError('Unsupported registration event')
    if event.get('callerContext', {}).get('clientId') != os.environ['APP_CLIENT_ID']:
        raise ValueError('Unsupported application client')
    attributes = event.get('request', {}).get('userAttributes', {})
    role = attributes.get('custom:registration_role')
    if role not in ROLES:
        raise ValueError('Public registration is for Citizen accounts. Staff access requires an administrator.')
    if not attributes.get('email'):
        raise ValueError('Email is required')
    if source == 'PostConfirmation_ConfirmSignUp':
        if attributes.get('email_verified') != 'true':
            raise ValueError('Verify your email before activating your workspace')
        boto3.client('cognito-idp').admin_add_user_to_group(
            UserPoolId=event['userPoolId'], Username=event['userName'], GroupName=role)
    return event
