# URAI Spatial Tier 1-5 Lock

Canonical version: `2026-05-09.urai-spatial.locked.v1`

URAI Spatial Home, Life Map, and replay/focus unwind behavior are governed by five release locks.

## Tier 1 — Home Entry Lock

- Home renders first.
- Orb/body/sky/ground scene appears before Life Map.
- No debug UI or placeholders are visible.
- Orb and Sky can route toward Life Map.

## Tier 2 — LifeMap Surface Lock

- Life Map renders full-screen.
- Starfield and node surface are visible.
- Home scene is not visible while Life Map is active.
- Mobile and reduced-motion states are supported.

## Tier 3 — Camera + React Focus State Lock

- Selecting a node/star enters focus mode.
- Camera and state snapshots are reversible.
- Focus detail renders only for selected star/node.
- Escape restores Life Map.

## Tier 4 — Replay Stream Lock

- Replay starts only from valid focus state.
- Locked or unavailable nodes do not trigger replay.
- Replay overlay owns progress.
- Escape restores focus.

## Tier 5 — ESC Unwind Lock

- Escape uses one shared unwind handler.
- Replay unwinds to focus.
- Focus unwinds to Life Map.
- Life Map unwinds to home.
- Repeated Escape does not corrupt state.
- Escape during transition is safe.

## Runtime endpoint

```txt
/api/system/urai-spatial-lock
```

The endpoint must return:

```json
{
  "ok": true,
  "service": "urai-spatial",
  "status": "locked",
  "done": true,
  "version": "2026-05-09.urai-spatial.locked.v1"
}
```

The response also includes five tiers, tier-level assertions, and tier-level test references.

## Validation

Run:

```bash
pnpm lock:static
pnpm lock:build
HOST=http://127.0.0.1:3001 pnpm smoke
```

Full lock validation also runs Playwright:

```bash
pnpm lock:all
```

If Playwright cannot launch because Linux shared libraries such as `libXext.so.6` are missing, run the E2E tier in CI or a root-capable Debian/Ubuntu environment with Chromium system dependencies installed. Do not mark the Playwright E2E run as passing in an environment where Chromium cannot launch.
