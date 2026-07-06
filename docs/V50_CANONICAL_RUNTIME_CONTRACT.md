# URAI v50 Canonical Runtime Contract

Status: certification candidate
Date: 2026-07-06

## Authority split

- `urai-tier1` is the canonical public Next.js product and deployment root.
- Root `src` is the deterministic computation kernel and is not the browser entrypoint.
- Integration between them must use a versioned JSON-safe receipt or API contract.

## Product entry

`urai-tier1/src/app/page.tsx` -> `urai-tier1/src/app/FinalHomeThreshold.tsx` -> `urai-tier1/src/app/HomeSpatialWorldFinal.tsx`

## Kernel entry

`src/index.ts` -> `src/kernel/SystemLoop.ts` -> memory -> replay -> prediction -> XR frame -> communications -> analytics.

## Privacy boundary

The integration receipt may contain counts, pass/fail states, timestamps, and the exact commit SHA. It must not contain raw memories, prompts, user text, secrets, personal identifiers, precise locations, health data, or device telemetry.

The runtime default persistence path must be outside the repository. An explicit `URAI_RUNTIME_STATE_PATH` may be used in controlled environments.

## v50 gate

One exact-commit workflow must publish a downloadable artifact containing:

1. canonical-path contract check;
2. root runtime compile log;
3. one-cycle runtime smoke log;
4. `urai-tier1` typecheck log;
5. `urai-tier1` production build log;
6. machine-readable receipt;
7. tested commit SHA.

Passing this gate certifies a fallback-capable canonical runtime candidate. It does not prove deployment, provider activation, multi-user convergence, physical-device support, or production data persistence.

PR #412 is v100 work. It must not merge into v50 until rebased onto the certified v50 commit and proven by convergence CI.
