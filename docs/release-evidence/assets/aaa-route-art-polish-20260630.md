# URAI AAA+++ Route Art Polish Receipt

Date: 2026-06-30
Repo: `LifeLoggerAI/urai-spatial`
Surface: main URAI launch chain

## Result

AAA route-art shell polish committed.

This pass does not claim that every generated placeholder is now bespoke hand-painted final art. It upgrades the launch experience so the existing 103-file deterministic asset pack is actually carried by the runtime shell with route-aware cinematic grading, depth, atmosphere, mobile crops, and reduced-motion safety.

## Commits in this pass

- `226f68b04e68fd1347ef49c0407c7c7660fec60b` — wired route-aware desktop/mobile art variables into `UraiCinematicBackdrop`.
- `bee328545b1742abd63fac0113b58d632b093f1b` — upgraded `urai-cinematic-backdrop.css` with premium depth, atmosphere, grain, route-specific grading, and mobile handling.
- `e96ff5fad80daa3fd4dd27c71364509d290f7f37` — imported the cinematic backdrop CSS into the root layout so the mounted shell actually uses it.
- `6a390d6254a663fdf4c24589ba7c6e8cbfb7ed29` — normalized launch-route asset lookup so `/home`, route variants, replay descendants, privacy aliases, and place routes resolve to the correct art surface.

## Routes covered

- `/`
- `/home`
- `/ground`
- `/life-map`
- `/focus`
- `/replay`
- `/mirror`
- `/passport`
- `/status`
- `/privacy-controls`
- `/location-map`
- `/place/[placeId]`
- `/spatial/life-map`

## What changed visually

- Home: stronger threshold atmosphere; less gray landing-page read; home asset now grades the shell.
- Ground: deeper private-ops-room grading; warmer floor/room feel; less sky-reuse read.
- Life Map: backdrop stays subtle so the 3D constellation remains the owner.
- Focus: more memory-chamber depth around the selected memory surface.
- Replay: darker cinematic letterbox grade for memory-film feel.
- Mirror: stronger reflection-field atmosphere.
- Passport/Status: more premium vault/control-room density.
- Mobile: route shell switches to mobile WebP crops through `--urai-cinematic-mobile-image`.
- Accessibility: backdrop motion honors `prefers-reduced-motion`.

## Asset state after this pass

- Required asset files missing: `0`.
- Generated asset files previously present: `103`.
- Bespoke art replacements still optional/remaining for full non-placeholder provenance: `14` core surfaces.
- Current launch state: acceptable AAA-polished placeholder-final shell, ready for build/deploy verification.

## Verification commands

Run from repo root after pulling latest main:

```bash
cd urai-tier1
pnpm install --frozen-lockfile
pnpm typecheck
pnpm build
```

Then deploy and smoke the route chain:

```bash
firebase deploy --only hosting
BASE="https://urai.app"
for route in / /home /ground /life-map /focus /replay /mirror /passport /status /privacy-controls /location-map /spatial/life-map; do
  curl -s -o /dev/null -w "%{http_code} $BASE$route\n" -L "$BASE$route"
done
```

## Manual visual proof checklist

- Confirm the root layout loads `UraiCinematicBackdrop` and `urai-cinematic-backdrop.css`.
- Confirm each route has route-specific `data-route` on `.urai-cinematic-backdrop`.
- Confirm mobile screenshots use the mobile crop var instead of stretching desktop art.
- Confirm Life Map stars remain dominant and are not overpainted by the shell.
- Confirm Ground reads as an embodied private operating room, not a flat panel or sky page.
