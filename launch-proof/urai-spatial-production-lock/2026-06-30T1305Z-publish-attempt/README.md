# URAI Spatial publish attempt receipts — 2026-06-30T1305Z

Repo: `LifeLoggerAI/urai-spatial`
Branch: `main`
Latest inspected SHA: `bb0055b803600c134e84ffa80a9eff4310b4e639`

## Operator request

Request was to push, publish, make live, confirm, verify, and document receipts.

## What this pass could do

- Confirm latest main commit.
- Confirm latest commit has no GitHub combined status entries.
- Confirm latest commit has no workflow runs returned by the available workflow-run inspection tool.
- Confirm custom domain `https://urai.app` is live and truthful public-preview copy remains present.
- Confirm Firebase default host `https://urai-4dc1d.web.app` is still stale and not serving the current hardened build.
- Commit this receipt file.

## Tool boundary

The available GitHub tool surface can inspect commits, statuses, workflow runs, workflow jobs, logs, artifacts, files, and can rerun existing failed workflow jobs. It does not expose a fresh `workflow_dispatch` trigger for `Firebase XR Deploy`, and no prior workflow run exists for latest main to rerun.

## Live receipts

### `https://urai.app`

Observed live and truthful:

- redirects/renders `/home`
- public-safe spatial surface
- private data/autonomous actions/headset entry gated until proof passes
- WebXR fallback says 3D Home stays normal until real VR is supported
- Enter VR hidden when the browser/device does not report immersive-vr support

### `https://urai.app/status`

Observed live and truthful:

- public visual routes are live on `urai.app`
- public preview/static launch mode
- dynamic service wiring waits for backend pass
- private write actions/live service calls remain off

### `https://urai-4dc1d.web.app`

Observed stale:

```text
Launch build is compiling successfully. Full app deployment is being finalized.
```

### `https://urai-4dc1d.web.app/status`

Observed failed fetch/cache miss through web verification.

## Verdict

The repo is pushed and hardened, but it is not freshly published to Firebase default hosting from this environment. Production-ready cannot be claimed until a GitHub Actions/Firebase operator triggers the deploy workflow and the post-deploy workflows pass with live commit SHA proof.

## Exact external action still required

Run GitHub Actions manually:

1. `Firebase XR Deploy`
   - `deploy_target`: `hosting`
   - `live_url`: `https://urai-4dc1d.web.app`
2. `URAI Spatial Post Deploy Verify`
   - `live_url`: `https://urai-4dc1d.web.app`
3. `URAI Spatial Post Deploy Verify`
   - `live_url`: `https://urai.app`

Then attach run IDs, logs, artifacts, Firebase release ID, deploy-proof JSON, and Quest/WebXR physical proof.

FINAL VERDICT: DONE BUT NEEDS EXTERNAL ENV — repo-side work is pushed and custom domain is live/truthful, but Firebase publishing and physical XR validation remain external.
