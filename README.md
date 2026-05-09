# URAI Spatial

URAI Spatial is the immersive spatial interface layer of URAI: a cinematic, passive, privacy-aware web shell for Home, LifeMap, body/avatar zoom, sky, ground/world, orb companion navigation, biometric fallback panels, replay, and future AR/VR/WebXR expansion.

The current release-lock branch keeps the existing spatial engine intact and adds a standalone release shell with stable smoke/E2E markers, typed fallback APIs, system contract routes, and launch documentation.

## App root

- Monorepo root: `.`
- App root: `urai-tier1`
- Package manager: `pnpm`
- Framework: Next.js / React / TypeScript
- Spatial stack: React Three Fiber, Three.js, deterministic fallback UI layers
- Runtime target: Node 22+

## Local setup

Use pnpm for this monorepo. npm is tolerated for workstation bootstrap compatibility, but pnpm is the locked installer and script runner.

```bash
pnpm install
pnpm dev
```

Open:

```txt
http://127.0.0.1:3000
http://127.0.0.1:3000/u/adamclamp
http://127.0.0.1:3000/life-map
http://127.0.0.1:3000/spatial
```

## Validation commands

```bash
pnpm check:spatial
pnpm typecheck
pnpm build
HOST=http://127.0.0.1:3000 pnpm smoke
pnpm test:e2e
pnpm launch:check
pnpm audit:tier-one
```

`pnpm launch:check` runs the spatial invariant check, typecheck, production build, smoke route checks, and E2E lock runner.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Polished URAI Spatial home shell |
| `/u/adamclamp` | Public-safe V1 demo handle route |
| `/spatial` | Standalone spatial shell alias |
| `/life-map` | Full-screen LifeMap starfield, focus, replay, and ESC unwind surface |
| `/privacy` | Privacy-safe fallback and provider language |
| `/terms` | Demo/fallback and provider terms language |

## API routes

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/system/health` | GET | Service health and version |
| `/api/system/manifest` | GET | Routes, APIs, capabilities |
| `/api/system/capabilities` | GET | URAI Spatial capabilities and system targets |
| `/api/system/integration-contract` | GET | Full system-of-systems contract |
| `/api/body-biometric` | POST | Privacy-safe body biometric fallback snapshots |
| `/api/orb-companion` | POST | Orb route hints and local fallback replies |

## Environment

URAI Spatial runs without live Firebase or biometric providers in local fallback mode. Optional variables are documented in `ENVIRONMENT.md`.

## Deployment notes

Firebase Hosting/App Hosting may be used once the project config is selected. Deployment scripts intentionally run `pnpm launch:check` first:

```bash
pnpm frb
pnpm deploy:staging
pnpm deploy:prod
```

Do not claim live AR, WebXR, wearable, biometric, or memory-grounded providers are active unless those providers are connected, consented, and validated.
