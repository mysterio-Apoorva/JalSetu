import boto3, json

cognito = boto3.client('cognito-idp', region_name='us-east-1')

print("1. Creating Cognito User Pool...")
pool_res = cognito.create_user_pool(
    PoolName='JalSetuUserPool',
    AutoVerifiedAttributes=['email'],
    Policies={
        'PasswordPolicy': {
            'MinimumLength': 8,
            'RequireUppercase': False,
            'RequireLowercase': False,
            'RequireNumbers': False,
            'RequireSymbols': False
        }
    }
)
pool_id = pool_res['UserPool']['Id']
print(f"UserPool ID: {pool_id}")

print("2. Creating App Client...")
client_res = cognito.create_user_pool_client(
    UserPoolId=pool_id,
    ClientName='jalsetu-web-client',
    GenerateSecret=False,
    ExplicitAuthFlows=[
        'ALLOW_USER_PASSWORD_AUTH',
        'ALLOW_REFRESH_TOKEN_AUTH',
        'ALLOW_USER_SRP_AUTH'
    ]
)
client_id = client_res['UserPoolClient']['ClientId']
print(f"App Client ID: {client_id}")

print("3. Creating Groups...")
groups = ['Citizen', 'Driver', 'Dispatcher', 'Auditor']
for g in groups:
    cognito.create_group(
        GroupName=g,
        UserPoolId=pool_id,
        Description=f'JalSetu role: {g}'
    )
    print(f"Created group: {g}")

print("4. Creating Users and assigning to groups...")
users = [
    ('citizen@jalsetu.local', 'CitizenPass123!', 'Citizen'),
    ('driver@jalsetu.local', 'DriverPass123!', 'Driver'),
    ('dispatcher@jalsetu.local', 'DispatcherPass123!', 'Dispatcher'),
    ('auditor@jalsetu.local', 'AuditorPass123!', 'Auditor'),
]

driver_sub = None
for username, password, role in users:
    u = cognito.admin_create_user(
        UserPoolId=pool_id,
        Username=username,
        UserAttributes=[{'Name': 'email', 'Value': username}, {'Name': 'email_verified', 'Value': 'true'}],
        MessageAction='SUPPRESS'
    )
    cognito.admin_set_user_password(
        UserPoolId=pool_id,
        Username=username,
        Password=password,
        Permanent=True
    )
    cognito.admin_add_user_to_group(
        UserPoolId=pool_id,
        Username=username,
        GroupName=role
    )
    # get sub
    sub = [attr['Value'] for attr in u['User']['Attributes'] if attr['Name'] == 'sub'][0]
    print(f"Created user {username} ({role}), sub: {sub}")
    if role == 'Driver':
        driver_sub = sub

result = {
    'pool_id': pool_id,
    'client_id': client_id,
    'issuer': f"https://cognito-idp.us-east-1.amazonaws.com/{pool_id}",
    'driver_sub': driver_sub,
    'users': [
        {'username': u[0], 'password': u[1], 'role': u[2]} for u in users
    ]
}

with open('scratch_cognito.json', 'w') as f:
    json.dump(result, f, indent=2)
print("SUCCESS! Output written to scratch_cognito.json")
