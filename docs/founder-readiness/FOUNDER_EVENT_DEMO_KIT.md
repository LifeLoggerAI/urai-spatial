# URAI Founder Event Demo Kit

Owner: `LifeLoggerAI` repository owner / founder-event operator  
Release dependency owner: canonical release-control owner tracked in issue `#461`  
Operational tracker: issue `#495`

## Intended destination

- Canonical event URL: `https://urai.app/event`
- QR source: `urai-tier1/public/media/event/urai-event-qr.svg`
- QR target receipt: `urai-tier1/public/media/event/QR_TARGET.txt`

The route is designed to remain stable while the linked sample journey evolves. Do not print, publish, or display the QR until the publication gate below passes.

## Current safety boundary

The event route and capture path use the repository's synthetic `lifeMapDemoData` and the deterministic sample memory `quiet-reset`. The kit must not show:

- customer, account, production, or third-party data;
- credentials, tokens, environment values, or private URLs;
- Firebase, cloud, admin, analytics, debug, or console surfaces;
- medical, diagnostic, surveillance, lie-detection, autonomous-action, provider-active, device-certified, or production-certified claims.

The visible disclosure must remain:

> This destination and the linked walkthrough use synthetic sample content only. Production certification and exact deployed-SHA proof remain pending until the Status page and release receipts confirm them.

## QR publication gate

All items must be true before the QR is used at an event:

1. The canonical workflow deploys one frozen `main` SHA.
2. The live HTML exposes that exact SHA.
3. `/status` matches current source and says `Launch locked. Proof before expansion.`
4. `/status` marks production as `Pending proof` unless receipts prove otherwise.
5. `/event` and `/event/` return the event destination, not a rewrite or stale shell.
6. `/life-map`, `/focus?memoryId=quiet-reset`, `/replay?memoryId=quiet-reset&manifestId=replay-recovery-thread`, `/mirror`, `/passport`, `/privacy-controls`, and `/status` pass custom-domain smoke.
7. Desktop and mobile captures show only synthetic sample content.
8. The capture manifest contains no PII, credential, admin/internal-link, console-error, or missing-marker failures.
9. A distinct rollback SHA and rollback command are recorded.

Until then, use the offline kit and describe the live route as deployment-pending.

## Event operator: 60-second run

1. Open `/event` before the conversation and turn off device notifications.
2. Say: “URAI turns memories, relationships, goals, and life chapters into a private spatial world instead of another feed or dashboard.”
3. Point out the sample-data disclosure.
4. Open the sample Life Map.
5. Select or reference `The Quiet Reset`.
6. Move to Focus and then Replay.
7. Close with: “This is a substantial sample-data experience. Exact deployment and production certification remain evidence-gated.”
8. Ask for one next step: follow-up demo, beta test, design-partner conversation, or investment milestone discussion.

Target duration: 45-75 seconds. Do not improvise broader completion claims.

## Three-minute run

Use the same route order:

`/event` -> `/home` -> `/life-map` -> `/focus?memoryId=quiet-reset` -> `/replay?memoryId=quiet-reset&manifestId=replay-recovery-thread` -> `/mirror` -> `/passport` -> `/status`

Explain one purpose per route. End on Status so the evidence boundary is visible.

## Offline fallback

### Repository-stored video

Open this file directly in a browser:

`urai-tier1/public/media/event/offline-video.html`

It reconstructs and plays the committed 72-second silent WebM entirely in the browser. The payload is stored under `urai-tier1/public/media/event/video/`, verified by exact byte length and SHA-256, and makes no network requests. It covers Event, Home, Life Map, Focus, Replay, Mirror, Passport, and Status using synthetic route-storyboard frames.

### Timed walkthrough

Open:

`urai-tier1/public/media/event/offline-demo.html`

It is a self-contained 64-second timed walkthrough. Press **Pause** at any point and speak over the current frame. It has no external assets, accounts, network calls, or private data.

### Screenshot/storyboard fallback

Open:

`urai-tier1/public/media/event/founder-event-storyboard.svg`

This is the repository-native eight-panel visual fallback. It is usable directly from disk without a network connection.

### Exact-head generated capture

From a verified local or deployed build:

```bash
URAI_EVENT_BASE_URL=http://127.0.0.1:3001 \
URAI_EVENT_OUT_DIR=founder-event-kit-output \
URAI_EVENT_SOURCE_SHA=<exact-40-character-head> \
node scripts/capture-founder-event-kit.mjs
```

Generated output:

- `founder-event-kit-output/video/urai-founder-event-demo.webm`
- `founder-event-kit-output/screenshots/01-event.png`
- `founder-event-kit-output/screenshots/02-home.png`
- `founder-event-kit-output/screenshots/03-life-map.png`
- `founder-event-kit-output/screenshots/04-focus.png`
- `founder-event-kit-output/screenshots/05-replay.png`
- `founder-event-kit-output/screenshots/06-mirror.png`
- `founder-event-kit-output/screenshots/07-passport.png`
- `founder-event-kit-output/screenshots/08-status.png`
- `founder-event-kit-output/index.html`
- `founder-event-kit-output/manifest.json`

The dedicated GitHub workflow uploads this directory as `urai-founder-event-kit-<exact-sha>`. The generated capture is supplemental evidence; the committed offline video and storyboard remain usable even when Actions runners are unavailable.

## Verification

Static safety and completeness check:

```bash
node --check scripts/capture-founder-event-kit.mjs
node --check scripts/verify-founder-event-kit.mjs
node --check scripts/verify-embedded-event-video.mjs
node scripts/verify-embedded-event-video.mjs
node scripts/verify-founder-event-kit.mjs
node scripts/check-spatial-copy.mjs
node scripts/check-production-route-exposure.mjs
```

Repository validation:

```bash
node scripts/run-pnpm.mjs check:types
node scripts/run-pnpm.mjs test:unit
node scripts/run-pnpm.mjs build
```

Capture validation:

```bash
NEXT_PUBLIC_ALLOW_PUBLIC_DEMO_ROUTES=true node scripts/run-pnpm.mjs dev:3001
# In another shell:
URAI_EVENT_BASE_URL=http://127.0.0.1:3001 \
URAI_EVENT_SOURCE_SHA=<exact-40-character-head> \
node scripts/capture-founder-event-kit.mjs
```

Review `manifest.json`; `failures` must be empty and `sourceSha` must match the reviewed commit.

## Event-device checklist

- Laptop and phone fully charged.
- Browser profile contains no logged-in personal or customer sessions.
- Notifications and password-manager overlays disabled.
- `/event` preloaded only after the QR publication gate passes.
- `offline-video.html`, `offline-demo.html`, and `founder-event-storyboard.svg` opened once with Wi-Fi disabled.
- Embedded WebM playback tested in the event browser.
- Storyboard fallback bookmarked.
- QR printed only from the committed SVG.
- Post-event follow-up text available from `EVENT_QUICK_CARD.md`.

## Failure instructions

- If the live route is stale, unknown, or lacks exact-SHA proof: stop using it and switch to `offline-video.html`.
- If any private or unexpected data appears: stop the demo, close the browser, preserve a safe redacted incident note, and open a P0 report.
- If WebGL fails: use the committed offline video, then the storyboard.
- If the embedded video fails: open `offline-demo.html` or `founder-event-storyboard.svg`.
- If all visual fallbacks fail: use `EVENT_QUICK_CARD.md` and schedule a verified follow-up.

## Ownership

| Responsibility | Owner | Evidence |
| --- | --- | --- |
| Event copy and spoken claims | Founder / claims owner (`#497`) | Approved claims matrix and current Status source |
| Exact deployment and rollback | Release-control owner (`#461`) | Deployment, rollback, and live-smoke receipts |
| Sample-data safety | Demo-kit owner (`#495`) | `verify-founder-event-kit.mjs`, `verify-embedded-event-video.mjs`, and capture manifest |
| QR publication | Founder-event operator | Completed QR publication gate |
| Committed offline assets | Demo-kit owner | `public/media/event/**` plus exact payload hash |
| Exact-head capture artifact | Demo-kit workflow owner | `urai-founder-event-kit-<exact-sha>` workflow artifact |
| Event device rehearsal | Founder-event operator | Offline/network-disabled rehearsal note |

## Known external blockers

### Live destination approval

- **Blocked task:** approve `https://urai.app/event` and distribute the QR.
- **Why blocked:** the currently known public deployment is stale relative to source and lacks a public exact deployed-SHA receipt and current Status parity.
- **Owner:** canonical release-control owner tracked in `#461`.
- **Smallest unblock:** merge all required release changes, restore required Actions execution, then manually dispatch `URAI Canonical Production Release` on the frozen `main` SHA with a proven rollback SHA and attach the deployment/smoke receipts.
- **Already complete:** event source, QR source, sample-safe offline video, timed walkthrough, storyboard, verification scripts, workflow, and operator instructions.
- **Immediate follow-up:** run custom-domain route/query smoke, exact-head sample-safety capture, and approve QR publication only if every gate passes.

### Exact-head generated screenshots and runtime video

- **Blocked task:** produce the workflow artifact from the exact PR head.
- **Why blocked:** repository Actions jobs are queued and not receiving runner capacity.
- **Owner:** repository or organization Actions/billing/runner administrator.
- **Smallest unblock:** restore runner capacity so the queued `Founder Event Demo Kit` job executes.
- **Already complete:** deterministic capture code, exact-SHA checkout proof, artifact naming, committed offline video, and committed storyboard fallback.
- **Immediate follow-up:** inspect the exact-head manifest and screenshots, fix any branch-caused failure, and merge only after required checks pass.
