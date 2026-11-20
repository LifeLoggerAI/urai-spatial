#!/usr/bin/env python3
"""Disposable loopback-only acceptance; no credential or live Firebase project required."""
import json
import os
from pathlib import Path
import subprocess
import sys

root = Path(__file__).resolve().parents[1]
project = 'demo-urai-r1591-policy'
evidence = root.parent / 'spatial-privacy-bootstrap-evidence'
fixture = evidence / 'emulator-fixture'
functions = fixture / 'functions'
functions.mkdir(parents=True, exist_ok=True)
compiled = root / 'apps/functions/lib/apps/functions/src/privacyOperations.js'
if not compiled.is_file():
    raise SystemExit('Build the exact Functions source before running this acceptance.')
(functions / 'package.json').write_text(json.dumps({
    'name': 'urai-operational-policy-emulator-fixture', 'private': True, 'main': 'index.js',
    'engines': {'node': '22'},
    'dependencies': {'firebase-admin': '^13.7.0', 'firebase-functions': '^6.0.1'},
}))
(functions / 'index.js').write_text('module.exports = require(' + json.dumps(str(compiled)) + ')\n')
modules = functions / 'node_modules'
dependency_root = next((candidate for candidate in [root / 'apps/functions/node_modules', root / 'node_modules']
                        if all((candidate / package).is_dir() for package in ['firebase-admin', 'firebase-functions'])), None)
if dependency_root is None:
    raise SystemExit('Frozen Firebase Admin and Functions dependencies are unavailable.')
if modules.is_symlink() and modules.resolve() != dependency_root.resolve():
    modules.unlink()
if not modules.exists():
    modules.symlink_to(dependency_root, target_is_directory=True)
(fixture / 'firestore.rules').write_text("rules_version = '2'; service cloud.firestore { match /databases/{database}/documents { match /{document=**} { allow read, write: if false; } } }\n")
config = {
    'functions': [{'source': 'functions', 'codebase': 'operational-policy', 'runtime': 'nodejs22'}],
    'firestore': {'rules': 'firestore.rules'},
    'emulators': {
        'auth': {'host': '127.0.0.1', 'port': 21099},
        'firestore': {'host': '127.0.0.1', 'port': 28080, 'websocketPort': 28150},
        'functions': {'host': '127.0.0.1', 'port': 25001},
        'hub': {'host': '127.0.0.1', 'port': 24400},
        'logging': {'host': '127.0.0.1', 'port': 24500},
        'eventarc': {'host': '127.0.0.1', 'port': 29299},
        'tasks': {'host': '127.0.0.1', 'port': 29499},
        'ui': {'enabled': False}, 'singleProjectMode': True,
    },
}
config_path = fixture / 'firebase.json'
config_path.write_text(json.dumps(config, indent=2))
env = os.environ.copy()
for name in ['GOOGLE_APPLICATION_CREDENTIALS', 'CLOUDSDK_CONFIG', 'FIREBASE_TOKEN']:
    env.pop(name, None)
env.update({'GCLOUD_PROJECT': project, 'GOOGLE_CLOUD_PROJECT': project,
            'FIREBASE_AUTH_EMULATOR_HOST': '127.0.0.1:21099',
            'FIRESTORE_EMULATOR_HOST': '127.0.0.1:28080',
            'NODE_PATH': str(dependency_root),
            'CI': '1', 'FIREBASE_CLI_DISABLE_UPDATE_CHECK': '1'})
firebase = root / 'node_modules/firebase-tools/lib/bin/firebase.js'
if not firebase.is_file():
    raise SystemExit('Install the frozen repository dependencies before running this acceptance.')
command = ['node', str(firebase), 'emulators:exec', '--project', project, '--config', str(config_path),
           '--only', 'auth,firestore,functions',
           'node ' + str(root / 'urai-tier1/tests/r1591-operational-policy.emulator.cjs')]
with (evidence / 'policy-emulator.log').open('w') as log:
    result = subprocess.run(command, cwd=fixture, env=env, stdout=log, stderr=subprocess.STDOUT)
(evidence / 'policy-emulator.exit').write_text(str(result.returncode))
sys.exit(result.returncode)
