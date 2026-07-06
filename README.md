# URAI Spatial

URAI Spatial is the canonical public URAI application repository.

- Public product: `https://urai.app`
- Canonical repository: `LifeLoggerAI/urai-spatial`
- Runtime root: `urai-tier1`
- Canonical branch: `main`
- Current release mode: `fallback-demo`
- Production certification: incomplete

The public product path is Home → Ground → Life Map → Focus → Replay → Mirror → Passport → Status.

## Current status

The repository contains a substantial spatial web experience, runtime architecture, provider seams, asset handoffs, WebXR and Quest preparation, privacy gates, and release automation. Source presence alone does not certify provider activity, physical-device support, persistence, or a production deployment.

Current allowed framing:

> URAI Spatial is reachable as a privacy-safe fallback/demo spatial shell with a substantial V1 web experience and future provider seams.

## Evidence authority

Read these files before making release or marketing claims:

- [`STATUS.md`](./STATUS.md) — canonical status, route drift, version posture, and blockers
- [`EVIDENCE.md`](./EVIDENCE.md) — command, workflow, deployment, browser, provider, and device evidence
- [`release/tier-xr-release-matrix.json`](./release/tier-xr-release-matrix.json) — tier and XR release requirements
- [`docs/decisions/`](./docs/decisions/) — runtime and release authority decisions

When README language conflicts with `STATUS.md` or `EVIDENCE.md`, use the stricter evidence-backed statement.

## Runtime system

The repository includes the canonical routed application under `urai-tier1` and a runtime layer built around:

```text
EventBus → SimulationEngine → Memory → Replay → Prediction → XR
```

Runtime components include:

- SystemLoop orchestration
- MemoryGraph and ReplayEngine
- PredictionEngine
- XRRuntime and gated WebXR/Quest paths
- CommunicationsBridge
- AnalyticsBridge
- advisory FeedbackBridge

Run the runtime smoke test with:

```bash
node scripts/smoke-system-loop-runtime.mjs
```

## Version posture

- **V1 — Spatial Foundation:** core route chain and source owners exist; current deployment, rollback, route parity, and browser proof remain required.
- **V2 — Living World:** fallback wiring and verification exist; provider-backed asset receipt and promotion remain required.
- **V3 — Relationships and Patterns:** consent-safe source and fallback concepts exist; canonical manifest, privacy review, activation, and live proof remain required.
- **V4 — Spatial Computing:** WebXR and Quest source hardening exists; browser and physical-device certification remain required.
- **V5 — Mirror of Becoming:** identity, legacy, provenance, and protected-presence concepts remain implementation- and privacy-gated.

## Repository authority

Older URAI repositories may support migration, reference, or rollback. The canonical public runtime remains `urai-spatial/urai-tier1` unless a reviewed decision record changes that authority.
