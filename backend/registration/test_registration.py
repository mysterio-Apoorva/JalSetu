import copy
import os
import unittest
from unittest.mock import patch, Mock
from handler import handler


class RegistrationTests(unittest.TestCase):
    def setUp(self):
        self.env = patch.dict(os.environ, USER_POOL_ID='pool', APP_CLIENT_ID='client')
        self.env.start()
        self.addCleanup(self.env.stop)
        self.event = {'userPoolId':'pool','userName':'user','callerContext':{'clientId':'client'},
                      'triggerSource':'PostConfirmation_ConfirmSignUp',
                      'request':{'userAttributes':{'email':'user@example.org','email_verified':'true','custom:registration_role':'Citizen'}},'response':{}}

    @patch('handler.boto3.client')
    def test_only_residents_can_self_register(self, client):
        for role in ('Citizen',):
            self.event['request']['userAttributes']['custom:registration_role'] = role
            self.assertEqual(handler(self.event,None),self.event)
            client.return_value.admin_add_user_to_group.assert_called_with(UserPoolId='pool',Username='user',GroupName=role)
        for role in ('Driver','Dispatcher','Auditor'):
            self.event['request']['userAttributes']['custom:registration_role'] = role
            with self.assertRaises(ValueError): handler(self.event, None)

    @patch('handler.boto3.client')
    def test_presignup_does_not_assign_or_auto_confirm(self, client):
        self.event['triggerSource']='PreSignUp_SignUp'
        result=handler(self.event,None)
        self.assertEqual(result['response'],{})
        client.assert_not_called()

    @patch('handler.boto3.client')
    def test_invalid_identity_role_and_unverified_email_fail_closed(self, client):
        for field,value in (('email_verified','false'),('custom:registration_role','Admin'),('email','')):
            event=copy.deepcopy(self.event)
            event['request']['userAttributes'][field]=value
            with self.assertRaises(ValueError): handler(event,None)
        for field,value in (('userPoolId','other'),('triggerSource','unknown')):
            event=copy.deepcopy(self.event); event[field]=value
            with self.assertRaises(ValueError): handler(event,None)
        event=copy.deepcopy(self.event); event['callerContext']['clientId']='other'
        with self.assertRaises(ValueError): handler(event,None)
        client.assert_not_called()

    @patch('handler.boto3.client')
    def test_password_reset_does_not_restore_revoked_role(self, client):
        self.event['triggerSource']='PostConfirmation_ConfirmForgotPassword'
        handler(self.event,None)
        client.assert_not_called()

    @patch('handler.boto3.client')
    def test_group_assignment_failure_is_not_swallowed(self, client):
        client.return_value.admin_add_user_to_group.side_effect=RuntimeError('AWS unavailable')
        with self.assertRaises(RuntimeError): handler(self.event,None)

if __name__=='__main__': unittest.main()
