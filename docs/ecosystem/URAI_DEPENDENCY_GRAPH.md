# URAI Ecosystem Dependency Graph

## Core graph

- asset-factory produces files for urai-spatial public assets.
- urai-studio coordinates studio handoff into urai-spatial.
- firebase-hosting provides deploy and live runtime surface.
- GitHub Actions produces release gates and evidence artifacts.
- urai-spatial owns the V1-V10 roadmap and product evolution evidence.

## Risk classes

- blocker: prevents safe core release.
- degraded: evidence lane or E2E lane is unhealthy but core may remain safe.
- asset-pending: final visual assets are not active yet.
- evidence-missing: proof artifact is absent.
- external-dependency: owned by adjacent system.
- safe-to-ship: release gate is green.

## Rule

V9 must report ecosystem state without pretending external systems are local code.
