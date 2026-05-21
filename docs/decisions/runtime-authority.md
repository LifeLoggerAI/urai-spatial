# Decision: Spatial Runtime Authority

Date: 2026-05-21

## Decision

`urai-tier1` is the only production runtime root for `urai-spatial`.

Root-level source, archived code, audit bundles, and historical surfaces are non-runtime unless a future decision record explicitly wires them into the root release gates.

## Reason

This prevents duplicate runtime behavior, stale SaaS surfaces, and release confusion. The repository already documents `urai-tier1` as the active app package and all production-facing runtime changes should stay there.

## Required checks

Before release, maintainers must verify:

- root scripts delegate runtime work to `urai-tier1`;
- release gates target `urai-tier1`;
- any root-level duplicate app code is deleted, archived, or clearly marked non-runtime;
- public docs do not imply that root-level historical code is the live app.

## Status

Accepted for release hardening.
