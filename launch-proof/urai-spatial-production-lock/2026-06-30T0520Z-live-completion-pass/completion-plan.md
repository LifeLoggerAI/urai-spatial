# Completion plan to 100% — URAI Spatial

## Immediate next commands

```bash
cd ~/urai-spatial
git fetch origin
git checkout main
git pull --ff-only origin main
corepack enable
pnpm install --frozen-lockfile
pnpm bootstrap:check
pnpm typecheck
pnpm lint
pnpm test:unit
pnpm build
pnpm build:static
pnpm xr:verify
pnpm lock:all
```

If `lock:all` is too heavy for the environment, run and document the reduced gate:

```bash
pnpm lock:static
pnpm lock:build
pnpm test:unit
pnpm xr:verify
```

## Deploy proof gate

```bash
firebase login --reauth
firebase deploy --config firebase.static.json --only hosting --project urai-4dc1d
URAI_DEPLOY_URL=https://urai.app pnpm smoke:live
URAI_DEPLOY_URL=https://urai-4dc1d.web.app pnpm smoke:live
URAI_DEPLOY_URL=https://urai.app pnpm smoke:home-xr:live
URAI_DEPLOY_URL=https://urai-4dc1d.web.app pnpm smoke:home-xr:live
```

Acceptance:

- Both live URLs render the same audited release surface.
- No `Launch build is compiling successfully` copy appears anywhere.
- `/api/system/deploy-proof` returns the release marker and latest commit SHA.
- Route smoke passes across public launch routes.

## Quest/WebXR validation gate

On Meta Quest Browser:

1. Open target live URL.
2. Confirm spatial web fallback/home works before XR.
3. Select route/star if required to expose WebXR overlay.
4. Confirm `navigator.xr.isSessionSupported('immersive-vr')` returns true.
5. Press Enter VR.
6. Confirm `navigator.xr.requestSession('immersive-vr')` succeeds.
7. Confirm scene renders in headset.
8. Confirm exit session works.
9. Capture screenshot/video and console/session logs.

Acceptance:

- Quest support can be claimed only after this proof is attached.

## Fallback QA gate

Run browser/device checks for:

- Chrome desktop without headset runtime.
- Edge desktop.
- Safari desktop.
- Chrome Android.
- Safari iOS.
- No-WebXR simulated browser.

Acceptance:

- Enter XR hidden/disabled unless immersive session support is detected.
- Fallback copy clearly says headset entry is gated/unavailable.
- Home/Life Map/Ground remain usable.

## Life Map data lock

Option A: keep preview/demo mode.

- Ensure all sample data surfaces say sample/demo/public-safe.
- Ensure replay/passport/private routes remain owner-gated.

Option B: production persistence.

- Authenticate user.
- Create memory/world record.
- Persist under owner ID.
- Read into Life Map.
- Replay/focus loads same record.
- Export/delete/revoke work.
- Firestore rules prove ownership isolation.

## Integration tests

- Genesis/core app route handoff.
- Auth/login/session ownership.
- Admin route protection.
- Content record lifecycle.
- Analytics event lifecycle.
- Privacy export/delete lifecycle.
- Asset provenance/versioning.

## Production launch gate

Spatial can move to READY when:

1. Latest main passes build/test/XR validation.
2. Both live targets are fresh and smoke-passing.
3. XR is either physically validated or publicly marked as unverified/beta.
4. Life Map is either real-persisted or clearly demo-labeled.
5. Proof folder contains logs/screenshots/commit/deploy receipts.
