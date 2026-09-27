# Ground responsiveness repair — 2026-09-27

Parent: PR1359 head `111e62035de735698ccc009887a3a7d536a5bf7e` (including its software-renderer shadow-map repair). Parent branch and active captures are untouched.

## Primary diagnostic evidence

PR1356 `d243fd91cc9429c940c16e0b264dd5902df0f121`, accessibility run 36297393723, artifact 10924618527 (91,229,383 bytes), SHA-256 `e769f8a5599246ecdb91044e211d65c674c12168cb1ed05d1a836ad1f0742424`: 47 passes, three failures. Retained Ground mobile trace shows focus about 14.2s, count 5.7s, focus assertion 5.75s and scroll/evaluate about 20s before the original 90s case expires. This establishes delayed browser actions, not clipping or a proven root cause. The Orb Escape and mobile canonical journey failures remain separate unfinished diagnoses.

PR1357 `cd54055fc1defd69ddf5dcdfa7e2af66421f4340`, Home run 36297798004, artifact 10925330334, SHA-256 `3e9cbda550cf32de6580765d257010c115daa165035d493372c509b3bb416f5c`: 12 of 13 scenarios pass; normal-motion Orb conversation-open-keyboard fails at its unchanged 10s visibility assertion. Successor acceptance does not transfer.

## Implementation

Ground previously requested continuous draws even on a software renderer or under reduced motion. The constrained scene now rests when idle and resumes for input, target selection, reset and camera settling. Active movement retains the existing kernel, collision, speed and arrival rules. After each expensive completed draw the existing cadence yields a full quiet interval; exit or hidden-document cleanup cancels timers. Software rendering omits shadow maps consistently with Home. Hardware normal-motion rendering remains continuous.

Three behavior tests execute the actual production player callback and shared motion kernel with a simulated renderer: idle/movement/braking/camera settling in both motion modes, and click-to-walk arrival/exit cleanup. Browser timing and visual proof are still required. Existing five-second Passport, 90-second Ground control and other assertions are unchanged.

The Home, accessibility and Passport workflows register the stacked parent so this repair receives exact-head proof. No provider, release, Gaussian, payment, budget or asset acceptance policy changed.

## Validation and acceptance

- Runtime TypeScript: passed.
- Production build: passed using repository-pinned pnpm 10; existing build warnings retained.
- 24 focused cadence, embodied-navigation and mobile-navigation tests: passed.
- Implemented: yes. Visually inspected on repaired revision: pending.
- Independently accepted / merged / deployed / verified live: no.

Current browser captures and traces must establish whether responsiveness improves before review or merge. Production remains separately quarantined pending its provider/security release evidence. This repair is not an AAA+++ acceptance claim.
