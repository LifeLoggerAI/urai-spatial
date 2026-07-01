# URAI live visual audit

Base URL: https://urai.app
Created: 2026-06-30T18:30:00-05:00
Scope: AAA+++ final-proof pass from ChatGPT/GitHub connector environment.

## Summary

- Repo inspected: `LifeLoggerAI/urai-spatial`
- Main app path: `urai-tier1`
- Package manager: `pnpm@10.0.0`
- Node engine: `>=22`
- Static hosting config: `firebase.static.json`, public dir `urai-tier1/out`, project fallback `${FIREBASE_PROJECT_ID:-urai-4dc1d}`
- Latest inspected source state includes the final CSS stack where `aaa-real-world-final-pass.css` loads after `screenshot-audit-fixes.css` and before `urai-canon-camera-transitions.css`.
- Route source for `/privacy-controls` is correct in `urai-tier1/src/app/privacy-controls/page.tsx` with the expected `URAI Privacy Controls` / `Choose what the world can hold.` copy.
- Route source for `/location-map` is correct in `urai-tier1/src/spatial/places/LocationMapScene.tsx` with the expected `Emotional weather over private places.` copy.

## Live text audit from available browser fetch

Routes with live text proof available in this environment:

- `/`: PASS text fingerprint. Live page contains `Own your life. Step inside yourself.`, Home threshold copy, Ground and Life Map links.
- `/ground/`: PASS text fingerprint. Live page contains `Your real life has a place.`, reception, privacy sanctuary, work console, memory archive, wellness, workforce helpers, and inspectable objects.
- `/life-map/`: PASS text fingerprint. Live page contains `Life Map`, camera/zoom/orbit instructions, memory star language, and orb companion copy.
- `/focus/`: PASS text fingerprint. Live page contains `Selected memory chamber`, `The Quiet Reset.`, and `Enter Replay`.
- `/replay/`: PASS text fingerprint. Live page contains `Cinematic memory film`, `Replay the thread.`, and film beats.
- `/mirror/`: PASS text fingerprint. Live page contains `URAI Mirror`, reflection stack, pattern intelligence, orb reflection, consent layer, and return paths.
- `/passport/`: PASS text fingerprint. Live page contains `URAI Passport`, `Your life stays yours.`, vault layers, identity, consent, provenance, and portability.
- `/status/`: PASS text fingerprint. Live page contains `URAI Status · Live Control Room`, route matrix, launch spine, trust/place routes, and XR preview state.

Routes requiring newest deploy or full proof runner confirmation:

- `/privacy-controls/`: FAIL live text fingerprint on current `https://urai.app`; it rendered Home-threshold copy instead of the correct Privacy Controls source. This matches the previously documented warning and should be treated as stale deploy/fallback until redeployed and re-smoked.
- `/location-map/`: LIVE appears stale against current source. Browser fetch returned older `Places below the stars.` copy, while latest source says `Emotional weather over private places.`. Redeploy latest main and re-smoke.
- `/spatial/ar-vr/`: Browser fetch in this environment returned a cache miss through the web fetcher. Must be verified by proof runner and real browser after deploy.
- `/demo`, `/demo/replay-film`, `/asset-audit`, `/tier3`, `/tier4`, `/tier5`: Not fully fetched by this environment. They remain in the proof-runner route matrix and must be verified by `scripts/aaa-launch-proof.mjs` after deploy.

## Human visual audit status

A true screenshot/human visual audit was not completed in this connector-only environment because local clone/build/browser automation was blocked by DNS and no Firebase/browser runtime was available here. The route text evidence above is useful, but it is not a substitute for screenshot proof.

Required screenshot routes remain:

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
/demo
/demo/replay-film
/asset-audit
/tier3
/tier4
/tier5
```

For every screenshot, judge:

- Does it feel like a world, not a dashboard?
- Does it look premium and coherent?
- Is it mobile-safe?
- Are panels/text too large?
- Are tap targets and route rails usable?
- Is Home still sky/ground/orb/avatar threshold?
- Is Ground a private operations floor, not a sky/galaxy reuse?
- Is Life Map a private memory galaxy?
- Are Focus/Replay/Mirror/Passport distinct realms?
- Does XR copy honestly say physical Quest Browser proof is pending?

## Asset status

Current committed asset receipt remains:

```text
RESULT=GREEN
TOTAL_ASSETS=147
CORE_REQUIRED=51
CORE_MISSING=0
EXPANSION_TARGETS=40
EXPANSION_MISSING=0
```

This means the preview is asset-present and fallback-safe. It does not mean the art is all bespoke final. Major surfaces still need replacement from `placeholder-final` to true `bespoke-final` before claiming final production art.

Highest-impact placeholder-final buckets still needing bespoke replacement:

- Home world art and mobile crop
- Ground operations floor art and mobile crop
- Life Map galaxy / image-in-star visuals
- Focus selected-memory chamber
- Replay cinematic memory-film frames
- Mirror reflection realm
- Passport ownership vault
- Privacy Controls trust/control artwork
- Location emotional-weather map artwork
- Orb states
- Avatar/body/workforce/council art
- OG/social/press launch images
- Quest placeholder GLTF models

## Quest / XR status

Do not claim Quest 2 proof yet.

Honest claim:

> XR preview can be live after `/spatial/ar-vr` passes route proof. Physical Quest Browser proof is still pending until opened and recorded on actual Quest hardware.

## Required final run commands

```bash
set -euo pipefail

if [ -d "$HOME/urai-spatial/.git" ]; then
  cd "$HOME/urai-spatial"
elif [ -d "$HOME/urai-work/urai-spatial/.git" ]; then
  cd "$HOME/urai-work/urai-spatial"
else
  git clone https://github.com/LifeLoggerAI/urai-spatial.git "$HOME/urai-spatial"
  cd "$HOME/urai-spatial"
fi

git checkout main
git pull --ff-only origin main
git log -1 --oneline

corepack enable || true
pnpm install --frozen-lockfile
pnpm typecheck
pnpm build:static

firebase deploy --config firebase.static.json --only hosting --project "${FIREBASE_PROJECT_ID:-urai-4dc1d}"

node scripts/aaa-launch-proof.mjs --skip-install --skip-typecheck --skip-test --skip-build --screenshots --base=https://urai.app
node scripts/live-visual-audit.mjs
```

## Manual live smoke fallback

```bash
BASE=https://urai.app
for route in / /home /ground /life-map /focus /replay /mirror /passport /status /privacy-controls /location-map /spatial/ar-vr /demo /demo/replay-film /asset-audit /tier3 /tier4 /tier5; do
  curl -sSL "$BASE$route" | tee "/tmp/urai-${route//\//_}.html" >/dev/null
  echo "checked $BASE$route"
done

grep -qi "URAI Privacy Controls" /tmp/urai-_privacy-controls.html
grep -qi "Choose what the world can hold" /tmp/urai-_privacy-controls.html
grep -qi "Home threshold\|Click the sky\|Click the ground" /tmp/urai-_privacy-controls.html && echo "STALE_PRIVACY_ROUTE" && exit 1 || true

grep -qi "Emotional weather over private places" /tmp/urai-_location-map.html
grep -qi "Quest" /tmp/urai-_spatial_ar-vr.html
```

## Honest claim after current inspection

Can claim now:

- Repo has the final public-preview spatial Life OS shell wired.
- Current `main` source contains the correct final-polish route code for Privacy Controls and Location Map.
- The asset matrix is green/present/fallback-safe.
- Live text proof for Home, Ground, Life Map, Focus, Replay, Mirror, Passport, and Status is readable and canon-aligned.

Cannot claim yet:

- Latest `main` has been deployed to `https://urai.app` after this proof pass.
- `/privacy-controls` live is correct; current browser evidence shows stale Home-threshold content.
- `/location-map` live is latest; current browser evidence shows older copy than source.
- Full desktop/mobile screenshot audit is complete.
- All visual assets are bespoke-final.
- Physical Quest Browser proof is complete.
