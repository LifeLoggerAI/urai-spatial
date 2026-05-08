# URAI Tier-1 Lock Complete

Date: 2026-05-06
Branch: tier-1-5-launch-lock
Package manager: pnpm

Status: LOCKED COMPLETE

## Validation

- pnpm install: PASS
- pnpm run check:types: PASS
- pnpm run build: PASS
- pnpm run check:build: PASS
- pnpm run tier1:verify: PASS
- pnpm run tier1:lock: PASS

## Routes verified by production build

- /
- /admin/invites
- /api/urai/narrator/elevenlabs
- /api/voice/elevenlabs
- /brand-system
- /demo
- /demo/life-map
- /early-access
- /focus
- /home
- /icon.svg
- /internal/locks
- /invite/[code]
- /life-map
- /mirror
- /replay

## Fixes applied

- Tier-1 validation scripts added.
- Next output file tracing root configured.
- HomeScene import/export state inspected.
- CSS module global selector purity fixed.
- Tier-1 lock script now avoids reinstall side effects.
- Machine-readable lock file finalized.

## Final Tier-1 status

LOCKED COMPLETE
