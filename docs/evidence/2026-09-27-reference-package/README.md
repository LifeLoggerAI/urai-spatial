# Reference image inventory repair — 2026-09-27

PR1362 exact c58df391cf97fa3f1bd0005b112f6611967e59c7 Reference Estate run36302153148 failed before setup/build/browser capture. Job108571675119 log reports: `Active image candidate count drifted: expected 789, found 790`. All four shards fail the same packaging step; no rendered artifact exists for this run.

The added image is the retained public Firebase outage screenshot under docs/evidence. It is evidence of the deployed state, not candidate art. The packager now excludes docs/evidence/** alongside its existing _audit/** and _quarantine/** boundaries and records that exclusion in its manifest. Authored docs/references images remain eligible. The expected789 gate is unchanged; no artwork was deleted, relabeled, promoted or omitted to disguise a quality failure.

Validation: two boundary tests pass. Actual packaging on this checkout succeeds with789 candidates and119,605,367 bytes. This fixes the observed packaging failure; a new completed browser capture is still required. Product source is unchanged from PR1362, whose runtime TypeScript, production build and14 focused tests already passed. Their visual/performance acceptance remains pending.

This candidate consolidates the known PR1359/1360/1362 ancestry against the existing UI integration base. Active branches and their running captures remain untouched. No provider/release-security/Gaussian changes, new charges, merge, deployment, live pass or independent acceptance.

Integration refresh: incorporated base a0823d800913063178642103997a03f0c7cd91b9, which independently applies the same software-renderer shadow policy already present here. Retained the software pixel budget; no runtime changes relative to c58df391. The Home quality test now evaluates the actual Canvas shadow and DPR expressions for software/hardware and both governed shadow settings instead of requiring obsolete full-resolution software rendering. Camera, antialias and demand-render assertions remain. All 118 focused unit contract suites pass locally; browser timing and visual assertions are unchanged.

Fresh predecessor status: c58df391 Home, strict Passport, canonical journey and Production Verify workflows report success. Artifacts still need examination before claiming their rendered outcomes. These do not establish exact-head independent acceptance or deployment.
