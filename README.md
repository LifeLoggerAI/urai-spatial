# URAI Spatial

URAI Spatial is the immersive spatial interface layer of URAI: a cinematic, passive, privacy-aware web shell for Home, LifeMap, body/avatar zoom, sky, ground/world, orb companion navigation, fallback panels, replay, and future spatial expansion.

See `REPO_PURPOSE.md` for this repository's source-of-truth boundary, ownership rules, and confusion guards. See `LIVE_RELEASE.md` for the gated live-release and Firebase publish path.

The current release-lock branch keeps the existing spatial engine intact and adds a standalone release shell with stable smoke/E2E markers, typed fallback APIs, system contract routes, and launch documentation.

## App root

- Monorepo root: `.`
- App root: `urai-tier1`
- Package manager: `pnpm@10.0.0`
- Framework: Next.js / React / TypeScript
- Spatial stack: React Three Fiber, Three.js, deterministic fallback UI layers
- Runtime target: Node 22+

## Local setup

Use pnpm for this monorepo. npm is tolerated only for workstation bootstrap compatibility; pnpm is the locked installer and script runner.

Run from the monorepo root:

```bash
nvm use
corepack enable
corepack prepare pnpm@10.0.0 --activate
corepack pnpm install
corepack pnpm bootstrap:check
corepack pnpm dev
```

If you do not use nvm, select Node 22+ with your preferred version manager before enabling Corepack. The repo includes both `.nvmrc` and `.node-version` so common Node version managers can select the same runtime.

If `bootstrap:check`, `typecheck`, `lint`, `build`, or `test:unit` says dependencies are missing, run the install sequence above before debugging source files. Missing dependencies can otherwise look like `next/link`, `next/server`, `next/navigation`, `tsx`, or styled-jsx TypeScript failures.

Open:

```txt
http://127.0.0.1:3000
http://127.0.0.1:3000/u/adamclamp
http://127.0.0.1:3000/life-map
http://127.0.0.1:3000/spatial
```

## Validation commands

```bash
corepack pnpm bootstrap:check
corepack pnpm check:spatial
corepack pnpm check:types
corepack pnpm lint
corepack pnpm test:unit
corepack pnpm test:rules
corepack pnpm build
corepack pnpm release:p1
```

Full local launch gate:

```bash
corepack pnpm launch:check
```

`pnpm launch:check` runs the spatial invariant check, typecheck, production build, smoke route checks, and E2E lock runner. `pnpm live:check` runs the full live-release gate without deploying.

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
| `/api/body-biometric` | POST | Privacy-safe body fallback snapshots |
| `/api/orb-companion` | POST | Orb route hints and local fallback replies |

## Environment

URAI Spatial runs without live providers in local fallback mode. Optional variables are documented in `ENVIRONMENT.md`.

## Deployment notes

Firebase Hosting/App Hosting may be used once the project config is selected. Deployment scripts intentionally run release gates first:

```bash
corepack pnpm frb
corepack pnpm deploy:staging
corepack pnpm deploy:prod
FIREBASE_PROJECT_ID=<project-id> corepack pnpm live:deploy
```

Do not claim future provider features are active unless those providers are connected, consented, and validated.