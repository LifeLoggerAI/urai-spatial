# Phase 47 — Release Channels / Rollback Discipline

Goal:
- add browser-local release channel discipline
- maintain rollback points using persisted spatial snapshots
- avoid direct mutation of live XR state

Targets:
- canonical release manifest types
- local manifest storage + Zustand store
- release bootstrap
- release panel for channel promotion / rollback point creation / restore
- build green
