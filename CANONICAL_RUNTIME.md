# URAI Spatial Canonical Runtime

Status: Phase 0 runtime-boundary lock.

## Authority

The canonical repository for this execution phase is `LifeLoggerAI/urai-spatial`.

The canonical production runtime root is `urai-tier1`.

Evidence:

- `SYSTEM_MAP.md` names `Repository: LifeLoggerAI/urai-spatial`, `Runtime app root: urai-tier1`, package manager `pnpm`, and framework `Next.js / React / TypeScript`.
- `pnpm-workspace.yaml` includes `urai-tier1`, `apps/functions`, and `packages/tier-locks`, and excludes audit and generated Next output.
- `firebase.json` sets Hosting `source` to `urai-tier1`, Firestore rules to `firebase/firestore.rules`, indexes to `firebase/firestore.indexes.json`, and Functions source to `apps/functions`.
- Root `package.json` routes runtime commands through `pnpm --filter urai-tier1` or `pnpm --dir urai-tier1`.

## Runtime directories

Production runtime:

- `urai-tier1/src/app`
- `urai-tier1/src/components`
- `urai-tier1/src/lib`
- `urai-tier1/src/scene`
- `urai-tier1/src/spatial`

Runtime support:

- `apps/functions`
- `firebase/firestore.rules`
- `firebase/firestore.indexes.json`
- root `scripts`
- root `tests`
- `.github/workflows`

Non-runtime or generated paths:

- `.next`
- `urai-tier1/.next`
- `node_modules`
- any `_audit` directory
- root-level `src` or `app` directories unless a future migration explicitly wires them into root scripts, Firebase hosting, and this document

## Boundary rule

Do not create a parallel runtime root.

Do not patch root-level `src` or `app` as production runtime unless this document, `pnpm-workspace.yaml`, `firebase.json`, and CI all change together.

Product UX work belongs under `urai-tier1` unless the file is a root script, workflow, Firebase rule, Firebase index, or documentation artifact.

## Required validation

Run from repo root:

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm run check:runtime-boundary
pnpm run runtime:authority
pnpm run check:source-integrity
pnpm run typecheck
pnpm run build
```

If `--frozen-lockfile` fails after intentional dependency edits, regenerate and commit the lockfile before claiming the boundary is green.

## Release posture

This document does not certify production-live launch.

URAI Spatial remains fallback-demo/private-beta until CI, launch gates, Firebase deploy proof, route smoke, provider gates, and production release evidence pass.
