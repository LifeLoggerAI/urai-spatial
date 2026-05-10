import unittest

from privacy_runtime.guard import ConsentState, PrivacyGuard, default_spatial_manifests


class PrivacyRuntimeGuardTests(unittest.TestCase):
    def setUp(self):
        self.guard = PrivacyGuard(default_spatial_manifests())
        self.consent = ConsentState(user_id="user_123")

    def test_missing_consent_blocks_processing(self):
        decision = self.guard.can_process(
            feature="generate-insights",
            consent_state=self.consent,
        )

        self.assertFalse(decision.allowed)
        self.assertEqual(decision.reason, "missing_or_revoked_consent")
        self.assertEqual(decision.missing_scopes, {"C4"})
        self.assertEqual(decision.audit_event.action, "privacy.process.blocked")
        self.assertEqual(decision.audit_event.result, "blocked")

    def test_granted_consent_allows_processing(self):
        self.consent.grant("C4")

        decision = self.guard.can_process(
            feature="generate-insights",
            consent_state=self.consent,
        )

        self.assertTrue(decision.allowed)
        self.assertEqual(decision.reason, "consent_valid")
        self.assertEqual(decision.missing_scopes, set())
        self.assertEqual(decision.audit_event.action, "privacy.process.allowed")
        self.assertEqual(decision.audit_event.result, "allowed")

    def test_revocation_blocks_future_processing(self):
        self.consent.grant("C4")
        allowed = self.guard.can_process(
            feature="generate-insights",
            consent_state=self.consent,
        )
        self.assertTrue(allowed.allowed)

        revocation = self.consent.revoke("C4")
        self.assertFalse(revocation.granted)

        blocked = self.guard.can_process(
            feature="generate-insights",
            consent_state=self.consent,
        )
        self.assertFalse(blocked.allowed)
        self.assertEqual(blocked.missing_scopes, {"C4"})

    def test_process_new_memory_requires_basic_memory_consent(self):
        blocked = self.guard.can_process(
            feature="process-new-memory",
            consent_state=self.consent,
        )
        self.assertFalse(blocked.allowed)
        self.assertEqual(blocked.missing_scopes, {"C2"})

        self.consent.grant("C2")
        allowed = self.guard.can_process(
            feature="process-new-memory",
            consent_state=self.consent,
        )
        self.assertTrue(allowed.allowed)

    def test_explanation_supported_only_for_mapped_features(self):
        self.guard.require_explanation_supported("generate-insights")

        with self.assertRaises(PermissionError):
            self.guard.require_explanation_supported("process-new-memory")

    def test_voice_requires_biometric_consent_and_deletion_support(self):
        blocked = self.guard.can_process(
            feature="voice-events",
            consent_state=self.consent,
        )
        self.assertFalse(blocked.allowed)
        self.assertEqual(blocked.missing_scopes, {"C5"})

        self.consent.grant("C5")
        allowed = self.guard.can_process(
            feature="voice-events",
            consent_state=self.consent,
        )
        self.assertTrue(allowed.allowed)

        self.guard.require_biometric_deletion_supported("voice-events")

    def test_biometric_deletion_rejected_for_non_biometric_feature(self):
        with self.assertRaises(PermissionError):
            self.guard.require_biometric_deletion_supported("generate-insights")

    def test_data_sharing_requires_c8(self):
        from privacy_runtime.guard import PrivacyManifest

        guard = PrivacyGuard([
            PrivacyManifest(
                feature="shared-analytics",
                required_consent_tiers={"C4"},
                data_sharing=True,
            )
        ])
        self.consent.grant("C4")

        blocked = guard.can_process(
            feature="shared-analytics",
            consent_state=self.consent,
        )
        self.assertFalse(blocked.allowed)
        self.assertEqual(blocked.reason, "missing_data_sharing_opt_in")
        self.assertEqual(blocked.missing_scopes, {"C8"})

        self.consent.grant("C8")
        allowed = guard.can_process(
            feature="shared-analytics",
            consent_state=self.consent,
        )
        self.assertTrue(allowed.allowed)


if __name__ == "__main__":
    unittest.main()
