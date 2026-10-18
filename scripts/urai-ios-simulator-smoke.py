#!/usr/bin/env python3
"""Run a real unsigned UrAi iOS Simulator launch smoke with exact-source proof.

This checks ONLY app launch/screenshot on a simulated iPhone or iPad. It does
NOT certify authentication, permissions, playback, VoiceOver, physical device,
Apple Developer identity, provisioning, TestFlight or App Store readiness.
"""
import argparse
import hashlib
import json
from pathlib import Path
import plistlib
import re
import subprocess
import sys
import time

BUNDLE = 'com.urailabs.urai'
PROJECT = 'urai-4dc1d'
PNG = bytes.fromhex('89504e470d0a1a0a')
MACHO = {bytes.fromhex(x) for x in ('cffaedfe', 'feedfacf', 'cafebabe', 'bebafeca')}


def require(ok, code):
    if not ok:
        raise ValueError('IOS_SIMULATOR_' + code)


def file_bytes(p, max_size=None):
    require(p.is_file() and not p.is_symlink(), 'FILE_INVALID')
    if max_size is not None:
        require(p.stat().st_size <= max_size, 'FILE_TOO_LARGE')
    return p.read_bytes()


def digest(data):
    return hashlib.sha256(data).hexdigest()


def preflight(app, source, run_id):
    app = Path(app)
    require(app.is_dir() and not app.is_symlink(), 'APP_REQUIRED')
    require(re.fullmatch('[0-9a-f]{40}', source) is not None, 'EXACT_SOURCE_REQUIRED')
    require(re.fullmatch('[1-9][0-9]*', str(run_id)) is not None, 'SOURCE_RUN_REQUIRED')
    info = plistlib.loads(file_bytes(app / 'Info.plist', 2 * 1024 * 1024))
    require(info.get('CFBundleIdentifier') == BUNDLE and info.get('DTPlatformName') == 'iphonesimulator', 'SIMULATOR_APP_IDENTITY')
    binary = app / info.get('CFBundleExecutable', '')
    require(file_bytes(binary)[:4] in MACHO, 'MACHO_REQUIRED')
    security = info.get('NSAppTransportSecurity', {})
    require(security.get('NSAllowsArbitraryLoads') is False, 'INSECURE_TRANSPORT')
    require(not any(security.get(k) is True for k in (
        'NSAllowsArbitraryLoadsInWebContent', 'NSAllowsArbitraryLoadsForMedia',
        'NSAllowsLocalNetworking')), 'INSECURE_TRANSPORT')
    require(not security.get('NSExceptionDomains'), 'INSECURE_TRANSPORT')
    for key in ('NSMicrophoneUsageDescription', 'NSCameraUsageDescription', 'NSLocationWhenInUseUsageDescription', 'NSPhotoLibraryUsageDescription', 'NSPhotoLibraryAddUsageDescription'):
        require(isinstance(info.get(key), str) and len(info[key].strip()) >= 24, 'PURPOSE_KEY_REQUIRED')
    require('NSLocationAlwaysAndWhenInUseUsageDescription' not in info and 'NSLocationAlwaysUsageDescription' not in info, 'ALWAYS_LOCATION_NOT_ADMITTED')
    require(isinstance(info.get('UIBackgroundModes', []), list) and not info.get('UIBackgroundModes', []), 'BACKGROUND_NOT_ADMITTED')
    web = app / 'public'
    fp = json.loads(file_bytes(web / 'native-build-fingerprint.json', 64 * 1024))
    require(fp.get('sourceSha') == source and fp.get('workflowRunId') == str(run_id) and fp.get('platform') == 'ios', 'STATIC_SOURCE_IDENTITY')
    require(fp.get('firebaseProject') == PROJECT and fp.get('nativeAcceptance') is False and fp.get('physicalDeviceAcceptance') is False and fp.get('productionAcceptance') is False, 'STATIC_AUTHORITY_BOUNDARY')
    require(digest(file_bytes(web / 'index.html', 5 * 1024 * 1024)) == fp.get('htmlSha256'), 'STATIC_HTML_HASH')
    require(digest(file_bytes(web / 'api/system/deploy-proof', 64 * 1024)) == fp.get('deployProofSha256'), 'STATIC_PROOF_HASH')
    config = json.loads(file_bytes(app / 'capacitor.config.json', 64 * 1024))
    # Pre-enrollment build is deliberately native-provider-unconfigured; a
    # later configured build needs its own independent auth/device acceptance.
    native_auth = config.get('plugins', {}).get('FirebaseAuthentication', {})
    require(not native_auth.get('providers'), 'NATIVE_PROVIDER_MUST_REMAIN_UNCONFIGURED')
    return {'sourceSha': source, 'sourceWorkflowRunId': str(run_id), 'bundleId': BUNDLE,
            'binarySha256': digest(file_bytes(binary)), 'infoPlistSha256': digest(file_bytes(app / 'Info.plist')),
            'htmlSha256': fp['htmlSha256'], 'staticSourceIdentityChecked': True}


def command(*args, allow_failure=False):
    c = subprocess.run(args, capture_output=True, text=True, timeout=180)
    if c.returncode != 0 and not allow_failure:
        raise ValueError('IOS_SIMULATOR_COMMAND_FAILED_' + str(args[2] if len(args) > 2 else 'UNKNOWN'))
    return c.stdout


def choose_simulator(category):
    devices = json.loads(command('xcrun', 'simctl', 'list', '-j', 'devices', 'available'))['devices']
    found = []
    for runtime, entries in devices.items():
        if 'iOS' not in runtime and 'iOS' not in runtime.replace('.', ''):
            continue
        for device in entries:
            if device.get('isAvailable', True) and device.get('name', '').startswith(category) and re.fullmatch(r'[A-Za-z0-9-]{20,64}', device.get('udid','')):
                found.append(device)
    require(bool(found), 'NO_AVAILABLE_' + category.upper() + '_SIMULATOR')
    return found[0]


def smoke(app, source, run_id, category, output):
    data = preflight(app, source, run_id)
    sim = choose_simulator(category)
    udid = sim['udid']
    launched = False
    booted_here = sim.get('state') != 'Booted'
    try:
        if booted_here:
            command('xcrun', 'simctl', 'boot', udid)
        command('xcrun', 'simctl', 'bootstatus', udid, '-b')
        command('xcrun', 'simctl', 'install', udid, str(Path(app).resolve()))
        launched_text = command('xcrun', 'simctl', 'launch', udid, BUNDLE)
        require(BUNDLE in launched_text, 'APP_LAUNCH_UNCONFIRMED')
        launched = True
        time.sleep(2)
        output.mkdir(parents=True, exist_ok=True)
        screenshot = output / ('urai-' + category.lower() + '-simulator-smoke.png')
        command('xcrun', 'simctl', 'io', udid, 'screenshot', '--type=png', str(screenshot))
        png = file_bytes(screenshot)
        require(png.startswith(PNG) and len(png) >= 1024, 'SCREENSHOT_INVALID')
        data.update({'simulatorCategory':category,'simulatorName':sim.get('name'),
                     'simulatorRuntime':sim.get('udid'), 'screenshotSha256':digest(png),
                     'screenshotBytes':len(png), 'smokeAccepted':True})
    finally:
        if launched:
            command('xcrun', 'simctl', 'terminate', udid, BUNDLE, allow_failure=True)
        if booted_here:
            command('xcrun', 'simctl', 'shutdown', udid, allow_failure=True)
    return data


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--app', type=Path, required=True)
    ap.add_argument('--source-sha', required=True)
    ap.add_argument('--source-workflow-run-id', required=True)
    ap.add_argument('--device-category', choices=['iPhone','iPad'], required=True)
    ap.add_argument('--output-directory', type=Path, required=True)
    ap.add_argument('--preflight-only', action='store_true')
    a = ap.parse_args()
    # Never create a forged success receipt in preflight-only mode.
    try:
        if a.preflight_only:
            result = preflight(a.app, a.source_sha, a.source_workflow_run_id)
            result.update({'simulatorCategory':a.device_category,'smokeAccepted':False,'status':'STATIC_PREFLIGHT_ONLY_NO_SIMULATOR_RUN'})
        else:
            result = smoke(a.app, a.source_sha, a.source_workflow_run_id, a.device_category, a.output_directory)
            result['status'] = 'REAL_SIMULATOR_LAUNCH_SMOKE_ONLY_NOT_PRODUCT_ACCEPTANCE'
        result.update({'schemaVersion':'urai-ios-preenrollment-simulator-v1',
                       'signingPerformed':False,'appleTeamVerified':False,'physicalDeviceAccepted':False,
                       'privateMediaAccepted':False,'microphoneAccepted':False,'locationAccepted':False,
                       'voiceOverAccepted':False,'dynamicTypeAccepted':False,'fullJourneyAccepted':False,
                       'testFlightAccepted':False,'appStoreAccepted':False})
        a.output_directory.mkdir(parents=True, exist_ok=True)
        (a.output_directory/'ios-simulator-smoke-receipt.json').write_text(json.dumps(result,indent=2)+'\n')
        print(result['status'])
    except Exception as exc:
        print('FAIL_CLOSED: '+str(exc),file=sys.stderr)
        raise SystemExit(1)

if __name__ == '__main__':
    main()
