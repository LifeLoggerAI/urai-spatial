# Reference image inventory repair — 2026-09-27

PR1362 exact c58df391cf97fa3f1bd0005b112f6611967e59c7 Reference Estate run36302153148 failed before setup/build/browser capture. Job108571675119 log reports: `Active image candidate count drifted: expected 789, found 790`. All four shards fail the same packaging step; no rendered artifact exists for this run.

The added image is the retained public Firebase outage screenshot under docs/evidence. It is evidence of the deployed state, not candidate art. The packager now excludes docs/evidence/** alongside its existing _audit/** and _quarantine/** boundaries and records that exclusion in its manifest. Authored docs/references images remain eligible. The expected789 gate is unchanged; no artwork was deleted, relabeled, promoted or omitted to disguise a quality failure.

Validation: two boundary tests pass. Actual packaging on this checkout succeeds with789 candidates and119,605,367 bytes. This fixes the observed packaging failure; a new completed browser capture is still required. Product source is unchanged from PR1362, whose runtime TypeScript, production build and14 focused tests already passed. Their visual/performance acceptance remains pending.

This candidate consolidates the known PR1359/1360/1362 ancestry against the existing UI integration base. Active branches and their running captures remain untouched. No provider/release-security/Gaussian changes, new charges, merge, deployment, live pass or independent acceptance.
