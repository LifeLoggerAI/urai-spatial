# Completion plan to 100% — DONE-DONE pass

Starting SHA: `01702862d81da8708611dd5f1a5499397bbcc460`
Ending SHA: recorded in final response after proof commits land.
Branch: `main`

## Immediate next commands

```bash
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

## Deploy workflow

Run `Firebase XR Deploy` manually:

- `deploy_target`: `hosting`
- `live_url`: `https://urai-4dc1d.web.app`

Do not deploy functions unless intentionally included and safe.

## Post-deploy verification

Run `URAI Spatial Post Deploy Verify` twice:

- `live_url`: `https://urai-4dc1d.web.app`
- `live_url`: `https://urai.app`

Then run local or CI smoke:

```bash
URAI_DEPLOY_URL=https://urai.app pnpm smoke:live
URAI_DEPLOY_URL=https://urai-4dc1d.web.app pnpm smoke:live
URAI_DEPLOY_URL=https://urai.app pnpm smoke:home-xr:live
URAI_DEPLOY_URL=https://urai-4dc1d.web.app pnpm smoke:home-xr:live
```

## Quest/WebXR physical validation

Use Meta Quest Browser after fresh deploy:

1. Confirm HTTPS.
2. Confirm `navigator.xr.isSessionSupported('immersive-vr')`.
3. Press Enter VR.
4. Confirm `requestSession` succeeds.
5. Confirm scene renders.
6. Confirm exit works.
7. Capture screenshot/video/log.

## Fallback QA

Verify Chrome desktop, Edge, Safari desktop, Chrome Android, Safari iOS, no-WebXR simulation, and unsupported browsers.

## Life Map persistence/data lock

Either keep all public Life Map as owner-safe demo/local fallback, or prove authenticated CRUD/export/delete/owner-scope persistence.

## Production launch gate

READY only when:

- Latest main build/test/XR gates pass.
- Custom domain and Firebase default host are fresh and route-parity safe.
- Live commit SHA matches audited source.
- No stale placeholder copy exists.
- Quest/WebXR physical proof is attached or public claims remain explicitly unverified.
- Life Map demo/persistence boundary is truthful.
