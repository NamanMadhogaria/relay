import json
import unittest
from build_cloud_template import template


class CloudTests(unittest.TestCase):
    def test_guest_cannot_access_another_identity_prefix(self):
        role = template()['Resources']['GuestRole']['Properties']
        trust = role['AssumeRolePolicyDocument']['Statement'][0]['Condition']
        self.assertEqual(trust['StringEquals']['cognito-identity.amazonaws.com:aud'], {'Ref': 'GuestIdentities'})
        self.assertEqual(trust['ForAnyValue:StringLike']['cognito-identity.amazonaws.com:amr'], 'unauthenticated')
        statements = role['Policies'][0]['PolicyDocument']['Statement']
        self.assertEqual(statements[0]['Condition']['StringLike']['s3:prefix'],
                         ['recordings/${cognito-identity.amazonaws.com:sub}/*'])
        self.assertIn('recordings/${cognito-identity.amazonaws.com:sub}/', json.dumps(statements[1]['Resource']))
        self.assertNotIn('s3:*', statements[1]['Action'])
        self.assertNotIn('s3:DeleteObjectVersion', statements[1]['Action'])

    def test_buckets_private_encrypted_and_retained(self):
        resources = template()['Resources']
        for name in ['RecordingsBucket', 'AccessLogs']:
            props = resources[name]['Properties']
            self.assertTrue(all(props['PublicAccessBlockConfiguration'].values()))
            self.assertTrue(props['BucketEncryption'])
            self.assertEqual(resources[name]['DeletionPolicy'], 'Retain')
            self.assertEqual(resources[name]['UpdateReplacePolicy'], 'Retain')
        for name in ['RecordingsPolicy', 'AccessLogsPolicy']:
            deny = resources[name]['Properties']['PolicyDocument']['Statement'][0]
            self.assertEqual(deny['Effect'], 'Deny')
            self.assertIs(deny['Condition']['Bool']['aws:SecureTransport'], False)

    def test_live_recordings_do_not_expire_and_failed_parts_do(self):
        bucket = template()['Resources']['RecordingsBucket']['Properties']
        self.assertEqual(bucket['VersioningConfiguration']['Status'], 'Enabled')
        rule = bucket['LifecycleConfiguration']['Rules'][0]
        self.assertNotIn('ExpirationInDays', rule)
        self.assertEqual(rule['AbortIncompleteMultipartUpload']['DaysAfterInitiation'], 1)
        self.assertEqual(rule['NoncurrentVersionExpiration']['NoncurrentDays'], 7)

    def test_no_captions_or_shared_data_permissions(self):
        self.assertNotIn('transcribe:', json.dumps(template()))
        self.assertNotIn('translate:', json.dumps(template()))
        self.assertLess(len(json.dumps(template()).encode()), 51200)


if __name__ == '__main__':
    unittest.main()
