URAI single-pass runtime lock
Pass intent:
- kill duplicate dev locks
- hard-lock page -> SpatialScene entrypoint
- replace SpatialScene with a single-authority baseline
- restore visible Home and LifeMap states
- remove hidden dependency on unknown camera/transition writers

What this pass guarantees:
- full-viewport Canvas
- deterministic HOME camera
- deterministic LIFEMAP camera
- visible orb / ground / sky baseline
- visible stars in LIFEMAP
- Escape from LIFEMAP back to HOME

What this pass does NOT claim:
- Focus mode complete
- Replay mode complete
- canon-complete transition graph
- repo-wide duplicate authority fully removed outside this file
