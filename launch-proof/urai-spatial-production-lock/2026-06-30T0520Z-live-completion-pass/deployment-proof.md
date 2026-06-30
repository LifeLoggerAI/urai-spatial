# Deployment proof — URAI Spatial live completion pass

## Deployment targets identified

| Target | Source/config | Status |
| --- | --- | --- |
| Firebase Hosting dynamic/source mode | `firebase.json`, hosting source `urai-tier1` | Configured. Freshness not proven. |
| Firebase Hosting static export | `firebase.static.json`, public `urai-tier1/out` | Configured. Freshness not proven. |
| Custom domain | `https://urai.app` | Live public preview observed. Commit freshness not proven. |
| Firebase default web app | `https://urai-4dc1d.web.app` | Live but stale placeholder observed. |

## Live observations

### `https://urai.app`

Observed live root rendered/redirected to `/home` and showed public-safe, gated copy:

- Public-safe spatial surface.
- Private data, autonomous actions, and headset entry stay gated until proof passes.
- 3D Home stays normal until real VR is supported.
- Enter VR is hidden when the browser/device does not report `immersive-vr` support.

Status route observed:

- Static launch preview.
- Dynamic service wiring waits for next backend pass.
- Private actions and live service calls remain off on public preview.

Life Map route observed:

- `Loading latest owner-safe demo data. The local Life Map fallback is already visible.`
- Replay and Passport stay owner-gated on the public surface.

Ground route observed:

- Public, sample-data world preview.
- No autonomous action, passive sensing, medical inference, or private account access claim.

### `https://urai-4dc1d.web.app`

Observed stale placeholder:

```text
Launch build is compiling successfully. Full app deployment is being finalized.
```

This exact stale copy is forbidden by the repository live smoke scripts.

## Deployment conclusion

Custom domain is a truthful public preview but commit freshness is not proven. Firebase default hosting is stale and fails production readiness. Overall live deployment readiness is `58/100` until both targets are redeployed from latest main and live smoke/deploy-proof markers pass.
