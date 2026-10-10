import unittest
from build_template import template


class RetirementTests(unittest.TestCase):
    def test_only_private_data_remains(self):
        resources = template()["Resources"]
        self.assertEqual(set(resources), {"UploadBucket", "BucketPolicy", "JobsTable", "UserPool"})
        for name in ["UploadBucket", "JobsTable", "UserPool"]:
            self.assertEqual(resources[name]["DeletionPolicy"], "Retain")
            self.assertEqual(resources[name]["UpdateReplacePolicy"], "Retain")
        self.assertTrue(all(resources["UploadBucket"]["Properties"]["PublicAccessBlockConfiguration"].values()))
        self.assertTrue(resources["UserPool"]["Properties"]["AdminCreateUserConfig"]["AllowAdminCreateUserOnly"])

    def test_temporary_data_keeps_expiring(self):
        properties = template()["Resources"]["UploadBucket"]["Properties"]
        rules = properties["LifecycleConfiguration"]["Rules"]
        self.assertEqual({rule["Prefix"] for rule in rules}, {"inputs/", "transcripts/", "captions/"})
        self.assertTrue(all(rule["ExpirationInDays"] == 1 for rule in rules))
        self.assertTrue(template()["Resources"]["JobsTable"]["Properties"]["TimeToLiveSpecification"]["Enabled"])


if __name__ == "__main__":
    unittest.main()
