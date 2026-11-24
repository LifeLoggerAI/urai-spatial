import unittest

from scripts.R882_PROVIDER_LIVE_SITE_COLLECTOR import (
    BASE, MANAGEMENT_HOST, MANAGEMENT_PATH, PROJECT, TARGET_DOMAIN,
    EvidenceError, choose_live_release, collect,
)


def release(when, kind="DEPLOY", version="one"):
    event = {"releaseTime": when, "type": kind}
    if version is not None:
        event["version"] = {"name": f"sites/{PROJECT}/versions/{version}"}
    return event


OLD = "2026-11-01T10:00:00Z"
NEW = "2026-11-02T10:00:00Z"


class LiveChannelTest(unittest.TestCase):
    def test_disabled_live_channel_with_an_older_version(self):
        site = f"projects/{PROJECT}/sites/{PROJECT}"
        channel = f"{BASE}/sites/{PROJECT}/channels/live/releases?pageSize=100"
        pages = {
            f"https://{MANAGEMENT_HOST}{MANAGEMENT_PATH}": {
                "projectId": PROJECT, "projectNumber": "123456",
            },
            f"{BASE}/projects/{PROJECT}/sites?pageSize=100": {
                "sites": [{"name": site, "type": "DEFAULT_SITE"}],
            },
            f"{BASE}/{site}/customDomains?pageSize=100": {"customDomains": [{
                "name": f"{site}/customDomains/{TARGET_DOMAIN}",
                "hostState": "HOST_ACTIVE", "ownershipState": "OWNERSHIP_ACTIVE",
                "cert": {"state": "CERT_ACTIVE"},
            }]},
            channel: {"releases": [release(OLD)], "nextPageToken": "next"},
            f"{channel}&pageToken=next": {"releases": [release(NEW, "SITE_DISABLE", None)]},
        }
        result = collect(pages.__getitem__)
        self.assertEqual(result["liveReleasePageCount"], 2)
        self.assertEqual(result["classification"], "HOLD")
        self.assertIn("HOLD_SITE_DISABLED", result["holdReasons"])
        self.assertIsNone(result["latestLiveRelease"])
        self.assertFalse(result["productionGO"])

    def test_newer_rollback_reenables_live_content(self):
        active = release(NEW, "ROLLBACK", "restored")
        disabled = release(OLD, "SITE_DISABLE", None)
        for events in ([active, disabled], [disabled, active]):
            selected, status = choose_live_release(events)
            self.assertEqual(status, "READBACK_LIVE_RELEASE_METADATA_ONLY")
            self.assertEqual(selected["versionName"], active["version"]["name"])

    def test_all_events_at_the_latest_instant_are_considered(self):
        same = release(NEW)
        for other in (release(NEW, "SITE_DISABLE", None), release(NEW, version="other")):
            for events in ([same, same, other], [other, same, same]):
                self.assertEqual(choose_live_release(events), (None, "HOLD_AMBIGUOUS_LIVE_RELEASE"))

    def test_one_nanosecond_decides_the_active_state(self):
        earlier = "2026-11-02T10:00:00.123456001Z"
        later = "2026-11-02T09:00:00.123456002-01:00"
        selected, status = choose_live_release([release(earlier, "SITE_DISABLE", None), release(later)])
        self.assertEqual(status, "READBACK_LIVE_RELEASE_METADATA_ONLY")
        self.assertEqual(selected["releaseTime"], later)
        self.assertEqual(choose_live_release([release(earlier), release(later, "SITE_DISABLE", None)]),
                         (None, "HOLD_SITE_DISABLED"))

    def test_disable_only_and_empty_histories(self):
        self.assertEqual(choose_live_release([release(NEW, "SITE_DISABLE", None)]),
                         (None, "HOLD_SITE_DISABLED"))
        self.assertEqual(choose_live_release([]), (None, "HOLD_NO_LIVE_RELEASE"))

    def test_invalid_metadata_never_selects_an_older_version(self):
        for invalid in (release("invalid", "SITE_DISABLE", None), release(NEW, version=None), release(NEW, 42)):
            with self.assertRaises(EvidenceError):
                choose_live_release([release(OLD), invalid])
        self.assertEqual(choose_live_release([release(OLD), release(NEW, "FUTURE_TYPE")]),
                         (None, "HOLD_UNKNOWN_LIVE_RELEASE_TYPE"))

    def test_compatible_default_type_and_duplicate_version(self):
        default = release(NEW, "TYPE_UNSPECIFIED")
        omitted = release(NEW)
        del omitted["type"]
        selected, status = choose_live_release([default, omitted])
        self.assertEqual(status, "READBACK_LIVE_RELEASE_METADATA_ONLY")
        self.assertEqual(selected["versionName"], default["version"]["name"])
