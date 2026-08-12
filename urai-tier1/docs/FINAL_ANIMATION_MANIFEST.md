# URAI Final Animation Manifest

Status: **implementation-sealed / release-QA pending**

This document closes the historical "remaining 13 Rive/Lottie" list as a governed runtime contract. It does **not** claim that thirteen new `.riv` or Lottie JSON binaries are production authority. The current Asset Lock explicitly prefers existing promoted GLB animation, physical camera travel, and runtime composition where duplicate media would create a second source of truth.

The canonical machine-readable authority is `src/spatial/motion/motionManifest.ts`; `MotionOrchestrator.tsx` mounts once at the persistent-world shell.

## Sealed cue inventory

| Cue | Historical authoring intent | Canonical runtime authority | Audio | Narration | Reduced motion |
|---|---|---|---|---|---|
| `sky_pressure_roll` | Rive stateful | runtime CSS weather field | none | none | short static pressure pass |
| `timeline_warp` | Rive stateful | persistent-world camera/travel | inherit transition | motion leads | 260 ms |
| `orb_refusal_dim` | Rive stateful | promoted Orb GLB + governed dim | silence | suppressed | 120 ms |
| `orb_threshold_fracture` | Rive stateful | restrained runtime fracture field | silence | motion leads | 160 ms |
| `body_thin_fade` | Rive stateful | runtime embodied handoff | none | none | 120 ms |
| `withdrawal_thin_pass` | Rive stateful | runtime field compression | silence | suppressed | 140 ms |
| `silence_hold_frame` | Rive stateful | runtime visual hold | silence | suppressed | 160 ms |
| `app_boot_intro` | Lottie one-shot | non-blocking Genesis arrival | none | motion leads | 120 ms |
| `map_enter_zoom` | Lottie one-shot | physical Home → Life Map camera ascent | inherit transition | motion leads | 420 ms |
| `replay_enter_curtain` | Lottie one-shot | persistent-world Replay depth curtain | inherit transition | motion leads | 260 ms |
| `ritual_seal_mark` | Lottie one-shot | runtime seal mark | none | motion leads | 120 ms |
| `bloom_archive_fold` | Lottie one-shot | runtime archive fold | none | motion leads | 140 ms |
| `trust_reveal_still` | Lottie one-shot | restrained trust hold | silence | motion leads | 120 ms |

## World-transition coverage

Every destination in `destinationRegistry.ts` is covered by one of four transition paths:

- Home → Life Map: `map_enter_zoom` over the canonical physical sky ascent.
- Any destination → Replay: `replay_enter_curtain` over the canonical 1900 ms persistent-world transition.
- Home → hidden infrastructure: `body_thin_fade` over the descending transition.
- All other ascending/travelling transitions, including Mirror, Shadow, Council, Passport, Privacy Controls, Location Map, Focus, Legacy continuity routes represented by the registry, and returns: `timeline_warp` over the shared persistent-world transition.

No required interaction is blocked on completion of the overlay. The underlying world transition remains authoritative.

## Sound and narration lock

- `urai:narrator-silence` is intentionally silent. `SpatialAudioNarratorBridge` no longer synthesizes a breath on that event.
- Refusal, withdrawal, silence hold, and trust reveal do not invent audio cues.
- Production transition audio remains owned by `SpatialAmbientRuntime`; the motion layer marks those cues `inherit-transition` so it does not double-play sound.
- Focus and Replay speech enforce a minimum visual lead from this manifest; authored narrator timing may add more delay but cannot make speech outrun the visual beat.

## Placeholder rule

No placeholder `.riv`, fake Lottie path, temporary animation label, or duplicate Orb binary is introduced by this closeout. Existing promoted Orb GLB clips and canonical world transitions stay authoritative. If Studio later exports a final `.riv` or Lottie binary for one of these cue IDs, it must replace only the rendering adapter for that ID and preserve the timing, silence, accessibility, and event contract here.

## QA gates

Automated contract coverage lives in `tests/final-motion-orchestration-contract.test.mjs` and verifies:

- exactly 13 cue IDs;
- reduced-motion timing for every cue;
- silence/refusal/withdrawal cannot manufacture audio;
- the orchestrator mounts once at the persistent-world boundary;
- every registered world travel phase has a governed cue;
- Focus and Replay narration obey the visual lead;
- the overlay cannot intercept input and has no infinite/flashing motion.

**Release lock remains separate from implementation seal.** Desktop, mobile, forced reduced-motion, low-power, visual-quality, and device frame-pacing evidence must still pass before the Asset Lock can truthfully move these rows to final `LOCKED`.
