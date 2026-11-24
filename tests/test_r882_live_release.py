import json
from pathlib import Path
import subprocess
from tempfile import TemporaryDirectory
import unittest

from scripts.R882_PROVIDER_LIVE_SITE_COLLECTOR import (
    BASE, HOSTING_TARGET, MANAGEMENT_HOST, MANAGEMENT_PATH, PROJECT, SOURCE_ROOT, TARGET_DOMAIN,
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
    def test_explicit_target_matches_the_custom_domain_on_a_multisite_project(self):
        other = 'synthetic-second-site'
        sites = f'{BASE}/projects/{PROJECT}/sites'
        resource = f'projects/{PROJECT}/sites/{PROJECT}'
        event = {**release(NEW), 'name': f'sites/{PROJECT}/channels/live/releases/test-release'}
        pages = {
            f'https://{MANAGEMENT_HOST}{MANAGEMENT_PATH}': {'projectId': PROJECT, 'projectNumber': '123456'},
            f'{sites}?pageSize=100': {'sites': [
                {'name': resource, 'type': 'DEFAULT_SITE'},
                {'name': f'projects/{PROJECT}/sites/{other}', 'type': 'USER_SITE'},
            ]},
            f'{sites}/{PROJECT}/customDomains?pageSize=100': {'customDomains': [{
                'name': f'{resource}/customDomains/{TARGET_DOMAIN}', 'hostState': 'HOST_ACTIVE',
                'ownershipState': 'OWNERSHIP_ACTIVE', 'cert': {'state': 'CERT_ACTIVE'},
            }]},
            f'{sites}/{other}/customDomains?pageSize=100': {'customDomains': []},
            f'{BASE}/sites/{PROJECT}/channels/live/releases?pageSize=100': {'releases': [event]},
        }
        result = collect(pages.__getitem__)
        self.assertEqual(result['classification'], 'READBACK_ONLY_NO_PRODUCTION_GO')
        self.assertEqual(result['sourceConfig']['hostingTarget'], HOSTING_TARGET)
        self.assertEqual(result['selectedSiteId'], result['sourceConfig']['configuredSiteId'])
        self.assertEqual(result['latestLiveRelease']['versionName'], event['version']['name'])
        self.assertFalse(result['productionGO'])
        for filename, field in [('firebase.static.json', 'pinnedConfigBlob'), ('.firebaserc', 'pinnedRcBlob')]:
            actual = subprocess.check_output(['git', 'hash-object', filename], cwd=SOURCE_ROOT, text=True).strip()
            self.assertEqual(result['sourceConfig'][field], actual)

        domain = pages[f'{sites}/{PROJECT}/customDomains?pageSize=100']['customDomains'].pop()
        domain['name'] = f'projects/{PROJECT}/sites/{other}/customDomains/{TARGET_DOMAIN}'
        pages[f'{sites}/{other}/customDomains?pageSize=100']['customDomains'].append(domain)
        pages[f'{BASE}/sites/{other}/channels/live/releases?pageSize=100'] = {'releases': []}
        moved = collect(pages.__getitem__)
        self.assertEqual(moved['classification'], 'HOLD')
        self.assertIn('custom domain owner differs from the configured Hosting target', moved['holdReasons'])

    def test_invalid_source_mapping_stops_before_any_provider_read(self):
        good = {'target': HOSTING_TARGET}
        other = 'synthetic-secondary'
        cases = [({}, [PROJECT]), ([good], [PROJECT]), ({**good, 'site': PROJECT}, [PROJECT]),
                 (good, []), (good, [other]), (good, [PROJECT, other])]
        with TemporaryDirectory() as folder:
            root = Path(folder)
            for hosting, sites in cases:
                with self.subTest(hosting=hosting, sites=sites):
                    (root / 'firebase.static.json').write_text(json.dumps({'hosting': hosting}))
                    targets = {PROJECT: {'hosting': {HOSTING_TARGET: sites}}}
                    (root / '.firebaserc').write_text(json.dumps({'targets': targets}))
                    with self.assertRaises(EvidenceError):
                        collect(lambda url: self.fail('unexpected provider request'), source_root=root)

    def test_rollback_version_and_release_names_are_bound_to_the_live_site(self):
        event = {**release(NEW), 'name': f'sites/{PROJECT}/releases/good'}
        self.assertEqual(choose_live_release([event], expected_site_id=PROJECT)[0]['name'], event['name'])
        invalid = [
            {**event, 'name': f'sites/{PROJECT}/channels/preview/releases/other'},
            {**event, 'name': 'sites/synthetic-other/releases/other'},
            {**event, 'version': {'name': 'sites/synthetic-other/versions/one'}},
            {**event, 'version': {'name': f'sites/{PROJECT}/versions/..'}},
            {**event, 'version': {'name': f'sites/{PROJECT}/versions/one?source=other'}},
            release(NEW),
        ]
        for wrong in invalid:
            with self.subTest(wrong=wrong):
                self.assertEqual(choose_live_release([wrong], expected_site_id=PROJECT),
                                 (None, 'HOLD_LIVE_RELEASE_RESOURCE_MISMATCH'))
        for tied in ([event, invalid[0]], [invalid[0], event]):
            self.assertEqual(choose_live_release(tied, expected_site_id=PROJECT),
                             (None, 'HOLD_LIVE_RELEASE_RESOURCE_MISMATCH'))

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
