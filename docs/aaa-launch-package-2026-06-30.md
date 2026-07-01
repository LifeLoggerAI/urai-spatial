# URAI AAA+++ Launch Package — 2026-06-30

Base source state: `fed273409539ac68432f8d82cb176ecac7d5c2e0` (`Finalize static styling pipeline receipt`)

This is the final honest launch package for the public-preview layer of `LifeLoggerAI/urai-spatial`. It is a proof and packaging receipt, not a rebuild.

## Launch posture

URAI is live as a public-preview spatial Life OS shell. The launch chain is Home, Ground, Life Map, Focus, Replay, Mirror, Passport, Status, Privacy Controls, Location Map, XR preview, demo routes, Asset Audit, Tier 3, Tier 4, and Tier 5.

Do not overclaim:

- This is public preview, not a fully dynamic personal backend launch.
- XR preview is live, but Quest 2 physical proof is pending until tested in Quest Browser.
- Asset slots are complete and fallback-safe, but many are still `placeholder-final` rather than bespoke final art.
- `uraifoundation.org` is a separate DNS/custom-domain proof gate and must not be claimed complete until DNS and HTTPS resolve.

## One-line pitch

URAI turns your memories, places, signals, tasks, and consent into a private spatial Life OS you can enter.

## Short public-preview caption

URAI public preview is live: Home, Ground, Life Map, Focus, Replay, Mirror, Passport, Status, Privacy Controls, Location Map, XR preview, and demo film routes are wired into one spatial Life OS shell. It is private-by-default, consent-aware, and honest about preview limits while the next pass moves from placeholder-final art to bespoke production art and physical Quest proof.

## Route proof list

Preserve and smoke these routes after every deploy:

```text
/
/home
/ground
/life-map
/focus
/replay
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

Latest known operator state before this package:

```text
RESULT=GREEN
TOTAL_ASSETS=147
CORE_REQUIRED=51
CORE_MISSING=0
EXPANSION_TARGETS=40
EXPANSION_MISSING=0
```

## Build / deploy / smoke commands

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm run --if-present test
pnpm build:static
firebase deploy --config firebase.static.json --only hosting --project "${FIREBASE_PROJECT_ID:-urai-4dc1d}"

BASE=https://urai.app
for route in / /home /ground /life-map /focus /replay /mirror /passport /status /privacy-controls /location-map /spatial/ar-vr /demo /demo/replay-film /asset-audit /tier3 /tier4 /tier5; do
  curl -s -o /dev/null -w "%{http_code} $BASE$route\n" -L "$BASE$route"
done
```

## Screenshot checklist

Capture desktop and mobile screenshots for:

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

For every shot, judge:

- instant comprehension
- spatial/premium feel
- mobile crop and overflow
- route rail and tap target usability
- readable contrast
- privacy and safety language
- placeholder art visibility

Suggested receipt folder:

```text
$HOME/urai-final-receipts/aaa-launch-proof-fed27340-<timestamp>/screenshots/
```

## Manual visual notes to verify after deploy

- `/privacy-controls` source is a real controls page. If live browser text appears as Home-threshold copy, redeploy and re-smoke before calling the surface visually proven.
- `/spatial/ar-vr` source is an XR portal with honest Quest manual-proof copy and browser capability detection. If a text fetch cache-misses, verify in a real browser after deploy.
- `/location-map` should stay symbolic-precision by default.
- `/status` can show route readiness, but physical-device proof remains separate.

## Quest / WebXR proof state

Acceptable wording before hardware test:

> URAI XR preview is live with Quest Browser instructions and WebXR fallback language. Physical Quest 2 proof is still pending.

Manual Quest script:

1. Open Quest Browser on actual Quest 2 hardware.
2. Visit `https://urai.app/spatial/life-map`.
3. Confirm page load, no crash, and basic navigation.
4. Visit `https://urai.app/spatial/ar-vr`.
5. Confirm XR copy and fallback state are readable.
6. Record device, browser, date/time, and screenshots/video if possible.

## Foundation DNS state

Foundation is separate from `urai.app`.

Do not claim `uraifoundation.org` complete until:

```bash
dig uraifoundation.org +short
dig www.uraifoundation.org +short
curl -I https://uraifoundation.org/
curl -I https://uraifoundation.org/sitemap.xml
```

Expected GitHub Pages DNS records if that remains the target:

```text
A     @     185.199.108.153
A     @     185.199.109.153
A     @     185.199.110.153
A     @     185.199.111.153
CNAME www   lifeloggerai.github.io
```

## Bespoke final art triage

Asset receipt is GREEN because slots exist. That does not mean all art is bespoke final.

Launch-safe for preview:

- route structure
- asset presence
- fallback-safe graphics
- Open Graph/social/demo slots
- orb, avatar, XR, Tier 4, and Tier 5 slots

Placeholder-final but acceptable for preview:

- Home world art
- Ground world art
- Life Map galaxy art
- Focus chamber art
- Replay film visuals
- Mirror realm art
- Passport vault art
- Privacy Controls art
- Location Map art
- Status art
- orb states
- workforce/council avatars

Needs bespoke replacement after preview lock:

- Home instant-understanding hero/world composition
- Ground private operations room
- Life Map image-in-star galaxy
- Focus selected-memory chamber
- Replay cinematic film frames
- Mirror reflection realm
- Passport ownership vault
- workforce/council character art
- social, press, and launch video frames

Quest placeholder 3D assets to replace before calling Quest final:

```text
xr/models/ground-room.placeholder.gltf
xr/models/life-map-star.placeholder.gltf
xr/models/focus-chamber.placeholder.gltf
xr/models/orb-companion.placeholder.gltf
```

## Demo-video shot list

1. Home threshold opens.
2. Orb companion appears.
3. Ground opens as private operating world.
4. Workforce/helpers and real-life stations appear.
5. Life Map opens above the sky.
6. Memory stars appear.
7. `The Quiet Reset` opens in Focus.
8. Replay turns the memory into film beats.
9. Mirror reflects pattern language.
10. Passport shows ownership and consent.
11. Status shows route proof.
12. XR preview is teased honestly.
13. End card: `Own your life. Step inside yourself.`

## Public-preview limitation note

URAI is live as a public-preview spatial Life OS shell. Routes and asset slots are wired for preview. Production auth/onboarding, live personal data actions, provider automation, physical Quest proof, foundation DNS cutover, and bespoke final art replacement are separate proof gates.
