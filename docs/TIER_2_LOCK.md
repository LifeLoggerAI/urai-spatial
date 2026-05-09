# URAI Spatial Tier-2 Lock

Tier-2 is the governed system layer that operationalizes Tier-1 without redefining it.

## Completed Tier-2 surfaces

- `storytime`: focus, replay, mirror, and unwind flows with explicit user action before replay.
- `spatial`: home, spatial shell, Life Map, ascent, and public demo handle surfaces.
- `privacy`: privacy, terms, entitlement guardrails, provider-status clarity, and consent boundaries.
- `admin`: invite, internal lock, billing, and webhook guardrails behind protected routes.
- `companion`: orb companion fallback, narrator seams, and provider-gated voice expansion.
- `memory`: Life Map nodes, body snapshot fallback, memory artifacts, and provider-gated live memory.

## Runtime registry

The public-safe Tier-2 registry is exposed at:

```txt
/api/system/tier2
```

The endpoint returns Tier-2 system domains, owners, statuses, routes, API surfaces, data collections, guarantees, deferred providers, and the Tier-1 lock boundary.

## Tier-1 dependency rule

Tier-2 may extend Tier-1 but may not:

- redefine Tier-1 vocabulary,
- weaken Tier-1 privacy posture,
- introduce text/buttons/navigation/onboarding/narration/upgrade prompts on the Tier-1 home scene,
- expose private memory, passive signal, relationship, biometric, entitlement, waitlist, or account data through public routes,
- claim live providers are active before auth, consent, and provider validation exist.

## Required checks

These checks may be run from the monorepo root or from `urai-tier1`. The app workspace forwards the root-only lock aliases back to `..` so the command set is consistent from either location.

```bash
pnpm tier2:check
pnpm test:canon
pnpm lock:static
pnpm lock:build
HOST=http://127.0.0.1:3000 pnpm smoke
```

For full release validation, also run:

```bash
pnpm lock:all
```

`pnpm lock:all` requires Playwright Chromium system libraries in the host environment.

## V2 handoff

V2 may now build on Tier-2 by completing authenticated, consent-gated versions of memory, companion, Storytime, privacy, admin, and spatial provider systems. All V2 work must preserve V1 public demo safety and keep Tier-1 canon immutable.
