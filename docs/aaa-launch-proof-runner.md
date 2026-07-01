# AAA Launch Proof Runner

Script: `scripts/aaa-launch-proof.mjs`

This runner creates a timestamped final proof receipt under:

```text
$HOME/urai-final-receipts/aaa-launch-proof-<commit>-<timestamp>/
```

It is intentionally conservative. It records evidence and does not deploy unless `--deploy` is passed.

## Standard proof pass

Run from repo root:

```bash
node scripts/aaa-launch-proof.mjs
```

This records:

- git branch, commit, and working-tree state
- `pnpm install --frozen-lockfile`
- `pnpm typecheck`
- `pnpm run --if-present test`
- `pnpm build:static`
- live route matrix for `https://urai.app`
- asset receipt summary from `docs/final-asset-receipt.md`
- foundation DNS/HTTPS status for `uraifoundation.org`
- final report at `final-report.md`

## Deploy proof pass

Only use when Firebase credentials are available and you intend to deploy:

```bash
node scripts/aaa-launch-proof.mjs --deploy
```

This adds:

```bash
firebase deploy --config firebase.static.json --only hosting --project "${FIREBASE_PROJECT_ID:-urai-4dc1d}"
```

## Screenshot attempt

Only use when Playwright and browser deps are available:

```bash
node scripts/aaa-launch-proof.mjs --screenshots
```

Screenshots are attempted for desktop and mobile widths across:

```text
/home
/ground
/life-map
/focus?memoryId=quiet-reset
/replay?memoryId=quiet-reset&manifestId=replay-recovery-thread
/mirror
/passport
/status
/privacy-controls
/location-map
/spatial/ar-vr
/demo/replay-film
```

If Playwright is missing or browser launch fails, the runner records the skip honestly instead of failing silently.

## Full public-preview receipt

```bash
node scripts/aaa-launch-proof.mjs --deploy --screenshots
```

## Useful skip flags

```bash
--skip-install
--skip-typecheck
--skip-test
--skip-build
```

These should only be used when the same receipt folder already has trusted logs for those steps or the environment cannot run them.

## Custom live base URL

```bash
node scripts/aaa-launch-proof.mjs --base=https://urai.app
```

## Honest proof boundaries

The runner does not and cannot prove:

- Quest 2 physical-device verification
- `uraifoundation.org` DNS completion unless DNS and HTTPS actually resolve
- bespoke final art completion while assets remain `placeholder-final`
- production backend/provider/auth readiness

Correct wording before Quest hardware proof:

> URAI XR preview is live with Quest Browser instructions and WebXR fallback language. Physical Quest 2 proof is still pending.

Correct wording before foundation DNS proof:

> Foundation source is ready, but `uraifoundation.org` DNS/HTTPS remains a separate custom-domain verification gate.
