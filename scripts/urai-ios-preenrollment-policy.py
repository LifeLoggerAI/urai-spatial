#!/usr/bin/env python3
"""Fail-closed source-only permission preparation for original UrAi Capacitor iOS.

Never sets Apple team, provisioning, background execution, or provider approval.
No privacy manifest is fabricated: final SDK required-reason API audit stays open.
"""
import argparse
import tempfile
import hashlib
import json
import os
from pathlib import Path
import plistlib
import re
import sys

PURPOSES = {
    'NSCameraUsageDescription': 'UrAi accesses your camera only when you choose to capture a memory. Camera access can be denied or revoked.',
    'NSMicrophoneUsageDescription': 'UrAi accesses your microphone only when you choose to record or speak. Microphone access can be denied or revoked.',
    'NSLocationWhenInUseUsageDescription': 'UrAi uses your location during an active session only with your permission and applicable UrAi consent.',
    'NSPhotoLibraryUsageDescription': 'UrAi reads photos you choose to import into your private memories.',
    'NSPhotoLibraryAddUsageDescription': 'UrAi saves media to your photo library only when you ask it to.',
}
RESTRICTED = {'NSLocationAlwaysUsageDescription', 'NSLocationAlwaysAndWhenInUseUsageDescription'}
# Unconfigured pre-enrollment shells have no approved native background capability.
# Each new mode requires its own platform/consent review; no implicit allowlist.
UNAPPROVED_BACKGROUND = {'audio', 'location', 'remote-notification', 'processing', 'fetch', 'voip', 'bluetooth-central'}


def require(ok, code):
    if not ok:
        raise ValueError('IOS_PRE_ENROLLMENT_' + code)


def regular_file(path):
    require(path.is_file() and not path.is_symlink(), 'REGULAR_FILE_REQUIRED')
    return path.read_bytes()


def validated(project, source_sha):
    require(bool(re.fullmatch(r'[0-9a-f]{40}', source_sha)), 'EXACT_SHA_REQUIRED')
    root = Path(project).resolve()
    require(root.is_dir() and not Path(project).is_symlink(), 'PROJECT_REQUIRED')
    info = root / 'App' / 'App' / 'Info.plist'
    data = plistlib.loads(regular_file(info))
    require(isinstance(data, dict), 'PLIST_DICT_REQUIRED')
    ats = data.get('NSAppTransportSecurity')
    require(isinstance(ats, dict) and ats.get('NSAllowsArbitraryLoads') is False, 'ATS_MUST_STAY_ENFORCED')
    # The embedded WebView must never regain cleartext network access via a more
    # specific ATS exception even if NSAllowsArbitraryLoads remains false.
    for bypass in ('NSAllowsArbitraryLoadsForMedia', 'NSAllowsArbitraryLoadsInWebContent', 'NSAllowsLocalNetworking'):
        require(ats.get(bypass) is not True, 'ATS_MUST_STAY_ENFORCED')
    require(not ats.get('NSExceptionDomains'), 'ATS_MUST_STAY_ENFORCED')
    require(not any(key in data for key in RESTRICTED), 'ALWAYS_LOCATION_NOT_ADMITTED')
    require('NSUserTrackingUsageDescription' not in data, 'TRACKING_NOT_APPROVED')
    modes = data.get('UIBackgroundModes', [])
    # No background modes were authorized for the unsigned original UrAi shell.
    # Unknown / new modes must fail too; a partial denylist is not a guard.
    require(isinstance(modes, list) and not modes, 'UNAPPROVED_BACKGROUND_MODE')
    return root, info, data


def run(project, source_sha, apply=False):
    root, info, data = validated(project, source_sha)
    project_file = root / 'App' / 'App.xcodeproj' / 'project.pbxproj'
    pbx = regular_file(project_file).decode('utf-8')
    require('PRODUCT_BUNDLE_IDENTIFIER = com.urailabs.urai;' in pbx, 'PROPOSED_BUNDLE_CHANGED')
    ipad = bool(re.search(r'TARGETED_DEVICE_FAMILY\s*=\s*"?1,2"?\s*;', pbx))
    # Check *all* local admission conditions before modifying generated source.
    # A rejected project must retain its original plist bytes.
    require(ipad, 'IPAD_DEVICE_FAMILY_REQUIRED')
    if apply:
        # Purpose strings do not request permission; consent and user-triggered
        # UI/OS prompts still need verified runtime behavior.
        for key, value in PURPOSES.items():
            if key not in data:
                data[key] = value
        for key in PURPOSES:
            require(isinstance(data[key], str) and len(data[key].strip()) >= 24, 'PURPOSE_INVALID')
        content = plistlib.dumps(data, fmt=plistlib.FMT_XML, sort_keys=True)
        # Replace as a complete validated plist, not as a partially written file.
        # Keep temporary bytes in the original generated app directory.
        with tempfile.NamedTemporaryFile(dir=info.parent, prefix='.urai-info-', suffix='.plist', delete=False) as tmp:
            temporary = Path(tmp.name)
            try:
                tmp.write(content)
                tmp.flush()
                import os
                os.fsync(tmp.fileno())
            except BaseException:
                temporary.unlink(missing_ok=True)
                raise
        try:
            temporary.replace(info)
        finally:
            temporary.unlink(missing_ok=True)
    else:
        for key in PURPOSES:
            require(isinstance(data.get(key), str) and len(data[key].strip()) >= 24, 'PURPOSE_MISSING')
    # Re-verify secure transport after write, not only before.
    _, _, changed = validated(root, source_sha)
    require(all(changed.get(k) == data[k] for k in PURPOSES), 'PURPOSE_VERIFICATION_FAILED')
    receipt = {
        'schemaVersion': 'urai-ios-preenrollment-permissions-v1',
        'sourceSha': source_sha,
        'status': 'SOURCE_ONLY_PERMISSIONS_CONFIGURED_NOT_DEVICE_ACCEPTED',
        'infoPlistSha256': hashlib.sha256(info.read_bytes()).hexdigest(),
        'purposeKeys': sorted(PURPOSES),
        'atsArbitraryLoads': False,
        'alwaysLocationAllowed': False,
        'backgroundModesAuthorized': False,
        'ipadTargetConfigured': ipad,
        'permissionPromptsRuntimeAccepted': False,
        'privacyManifestSdkInventoryAccepted': False,
        'simulatorAccepted': False,
        'physicalDeviceAccepted': False,
        'appleAccountApproved': False,
        'signed': False,
        'appStoreReady': False,
    }
    return receipt


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--project', type=Path, required=True)
    ap.add_argument('--source-sha', required=True)
    ap.add_argument('--apply', action='store_true')
    ap.add_argument('--receipt', type=Path, required=True)
    args = ap.parse_args()
    try:
        result = run(args.project, args.source_sha, args.apply)
        if args.receipt.exists():
            require(args.receipt.is_file() and not args.receipt.is_symlink(), 'RECEIPT_PATH_UNSAFE')
        args.receipt.parent.mkdir(parents=True, exist_ok=True)
        args.receipt.write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
        print(result['status'])
    except Exception as e:
        print(str(e), file=sys.stderr)
        raise SystemExit(1)

if __name__ == '__main__':
    main()
