# Legacy Firebase Hosting Recovery Bootstrap

Status: source-only proposal. No production mutation is authorized by this document.

## Problem

The legacy Blue Fog runtime predates the current release fingerprint contract. Its exact Git commit cannot be proven from the public site, so the release process must not invent or infer a rollback SHA.

## Recovery identity

Firebase Hosting releases expose the exact deployed Hosting version resource. The recovery tool records the newest default live-channel release and its exact `sites/SITE_ID/versions/VERSION_ID` identity. Firebase Hosting can later create a release that points to that same version.

Official API references:

- Firebase Hosting `sites.releases.list`
- Firebase Hosting `sites.releases.create`
- Firebase Hosting `sites.versions.get`

## Repository tool

`scripts/firebase-hosting-recovery.mjs` provides:

```bash
node scripts/firebase-hosting-recovery.mjs --self-test
node scripts/firebase-hosting-recovery.mjs discover
node scripts/firebase-hosting-recovery.mjs restore
```

The discovery command lists Hosting releases, ignores preview-channel and disabled releases, selects the newest default live release, and writes a private receipt inside the runner temporary directory. It performs no deployment.

The restore command requires the retained discovery receipt and the explicit confirmation value `RESTORE_EXACT_HOSTING_VERSION`. It revalidates the site and version resource, restores that exact Hosting version, verifies the response, and writes a restore result beside the discovery receipt.

## Integration gate

This source tool must receive independent review before canonical workflow integration. Any later integration must:

- execute only from protected merged `main`;
- capture and retain the exact legacy live Hosting version before the first fingerprinted deployment;
- never substitute a guessed Git SHA for legacy recovery;
- restore the captured Hosting version if deployment or strict public smoke fails;
- retain discovery, deployment, smoke, and restore receipts;
- require normal SHA-based rollback after the first fingerprinted release succeeds;
- permanently disable the one-time legacy bootstrap path after transition.

## Current boundary

This proposal adds discovery and exact-version restore source code plus tests only. It does not change the canonical deployment workflow, query live Hosting, deploy, restore, or alter `urai.app`.
