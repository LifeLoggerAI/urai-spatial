# URAI Spatial Done-Done Lock

Status: canonical spatial release hardening contract
Repository: `LifeLoggerAI/urai-spatial`
Canonical runtime root: `urai-tier1`
Runtime: Node `>=22`, pnpm `10.0.0`
Deploy target: Firebase Hosting / App Hosting plus Firestore rules, indexes, and functions when configured

This file defines what it means for URAI Spatial to be complete, polished, clean, and live-verifiable across V1 through V5. It prevents the repo from drifting into claiming AR, VR, XR, device, provider, biometric, or memory-grounded capabilities that have not been validated with evidence.

## 1. Canonical production surface

The canonical production surface is:

- `urai-tier1` - Next.js spatial runtime and launch-safe home/spatial/life-map routes.
- `apps/functions` - Firebase functions owned by the spatial runtime.
- `packages/tier-locks` - tier governance locks.
- `packages/release-tools` - release utilities.
- `scripts` - verification, release, smoke, and deploy helpers.
- `tests` - spatial lock, browser, replay, and release tests.
- `firebase` - Firestore rules/indexes and collection contracts.
- `release` - live manifest, live status, and Tier/XR release matrix.
- `.github/workflows/spatial-live-deploy.yml` - CI verify/deploy workflow.

Everything outside this surface is non-canonical unless the release manifest or runtime authority explicitly includes it.

## 2. V1-V5 spatial completion gates

### V1 Genesis spatial home

Done only when:

- `/`, `/home`, and `/spatial` render the living spatial shell.
- The shell includes sky, ground, orb, mood weather, companion reflection, chat entry, loading state, empty state, and Firestore fallback.
- The experience does not require private passive data, raw audio, camera capture, private media, ads, or third-party tracking.
- User-facing routes contain no debug, placeholder, test-mode, or internal release-lock copy.

### V2 mirror, memory, and timeline surface

Done only when:

- `/life-map` and supported adjacent routes remain buildable and isolated from the V1 spine.
- Memory stars, replay panels, and reflection surfaces are typed, fallback-safe, and privacy-safe.
- Every insight-like spatial surface uses cautious pattern language and does not claim diagnosis or certainty.

### V3 relationship, shadow, and pattern surfaces

Done only when:

- Relationship fields, recovery fields, social constellations, and shadow-pattern visuals are display-safe and consent-aware.
- No route claims deception detection, trust certainty, crisis certainty, or mental-health diagnosis.
- Sensitive overlays are framed as reflective pattern support.

### V4 WebXR / AR / VR pathway

Done only when:

- Web spatial is live-validated before any broader XR claim.
- WebXR is disabled until provider/browser validation exists.
- Quest VR is disabled until device-lab evidence exists.
- VisionOS is disabled until device or simulator evidence exists.
- Handheld AR is disabled until provider validation and privacy review exist.
- The Tier/XR release matrix is the source of truth for current evidence status.

### V5 Mirror of Becoming / legacy spatial release

Done only when:

- Legacy, replay, and Mirror-style spatial exports have typed contracts and release tests.
- V5 features remain gated until privacy, consent, export, and runtime evidence exist.
- V5 never blocks V1 deploy readiness unless the release manifest explicitly promotes it to the active release scope.

## 3. Live claim policy

Production may only claim what the release manifest proves:

- `web-spatial` may be active when live smoke passes.
- `webxr`, `quest-vr`, `visionos`, and `ar-handheld` remain not-live until device/provider evidence is committed and the release matrix is updated.
- Biometrics and memory grounding remain fallback-safe until provider validation, privacy signoff, and data contracts are complete.

## 4. Required release gates

Before a live deploy, run:

```bash
corepack enable
corepack prepare pnpm@10.0.0 --activate
pnpm install --frozen-lockfile
pnpm live:check
```

To deploy from an environment with Firebase credentials:

```bash
FIREBASE_PROJECT_ID=<project-id> pnpm live:deploy
```

After deploy:

```bash
HOST=https://<live-host> pnpm smoke
```

## 5. GitHub Actions path

Use `.github/workflows/spatial-live-deploy.yml`:

- Push to `main` runs verify when relevant files change.
- Manual dispatch with `deploy=CHECK_ONLY` verifies release gates.
- Manual dispatch with `deploy=DEPLOY` deploys only after verify passes.
- `live_url` should be supplied for post-deploy smoke.

## 6. Done-done verification standard

URAI Spatial is live-working verified only when all are true:

1. `pnpm live:check` passes on the deployed commit.
2. The deploy workflow or hosting provider confirms the live build was deployed from that commit or equivalent artifact.
3. `HOST=<live-url> pnpm smoke` passes after deploy.
4. Firebase rules and indexes deploy successfully.
5. Functions build and deploy successfully where functions are in scope.
6. The release manifest and Tier/XR matrix match current evidence.
7. No unvalidated AR/VR/XR/provider claims are exposed in live copy.
8. No live route exposes debug, placeholder, test-mode, secret, or internal lock language.

## 7. Current blocker language

If any gate above is missing, say:

> URAI Spatial is release-hardened and deploy-ready, but not yet live-working verified for done-done status.

Do not claim live-working verified until the required workflow evidence exists.
