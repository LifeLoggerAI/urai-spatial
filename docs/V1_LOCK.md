# URAI Spatial V1 Lock

V1 is locked around the public-safe spatial demo shell and its release gates.

## Locked V1 surfaces

- `/` renders the Tier-1 home spatial shell.
- `/u/adamclamp` renders the public-safe demo handle route.
- `/life-map` renders the Life Map surface.
- `/spatial` renders the standalone spatial shell alias.
- `/privacy` and `/terms` remain available for public fallback language.
- System API, biometric fallback API, orb companion fallback API, Stripe guard routes, and webhook guard routes remain smoke-tested.

## V1 safety boundary

V1 must not expose private memory, passive signal, relationship, biometric, entitlement, waitlist, or account data publicly. The public handle route is demo-only and must stay backed by safe local/spatial presentation until authenticated user data and consent flows are implemented.

## Required V1 validation

Run these before treating any V1 commit as releasable:

```bash
pnpm audit:tier-one
pnpm launch:check
HOST=http://127.0.0.1:3000 pnpm smoke
```

For deploy commands, use:

```bash
pnpm frb
# or
pnpm deploy:staging
pnpm deploy:prod
```

`pnpm frb` is intentionally an alias for the staging deployment path and must continue to run launch gates before deploy.

## V2 handoff boundary

V2 work may extend authenticated memory, companion, replay, consent, and deeper spatial modules, but must not redefine Tier-1 canon or weaken V1 public safety gates. V2 should build behind explicit routes, flags, auth, or consent boundaries and keep V1 smoke coverage passing.
