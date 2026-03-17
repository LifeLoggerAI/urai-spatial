# Phase 28: Batch Diff Audit and Merge Preflight

Goal:
Audit incoming canonical rows against the current dataset before persistence.

Targets:
- compute insert/update/skip actions
- surface changed rows as merge conflicts
- expose merge readiness and preflight action summary
- preserve build/export/deploy green path
