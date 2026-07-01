# URAI AAA Final Visual Proof Matrix

This document is the final launch wall for the public spatial app. It separates what the repo can prove automatically from what still requires human/device proof.

## Repo-side proof now covered

- Home is owned by `HomeSpatialWorldFinal` and keeps one sky/ground/orb/body threshold.
- Ground is an embodied private operating world with reception, privacy, work, memory, wellness, helpers, objects, and a mobile proof tray.
- Life Map uses the canonical R3F route with 3D camera motion, image-textured memory stars, Focus entry, and Replay entry.
- Focus is the selected-memory camera chamber with one dominant memory and one Replay doorway.
- Replay is the cinematic memory film surface with beat progression.
- Mirror, Passport, Status, Privacy Controls, Location Map, demo, and XR routes expose launch-surface markers.
- The Quest chamber now has a repo-side contract for the visible `QUEST CHAMBER LIVE` badge, huge-orb chamber copy, Life Map door, Ground door, visible Enter VR path, and the honest manual proof checklist.
- Quest proof language is bounded: the route can say the XR path exists and the button is present, but physical Quest proof remains manual until a headset recording exists.

## Required route screenshot set

| Route | Human visual question | Expected AAA signal |
| --- | --- | --- |
| `/home` | Does it feel like a real threshold world, not a landing hero? | Sky above, ground below, orb alive, body/avatar presence, clear ground/sky portals. |
| `/ground` | Does it feel like a place? | Reception, privacy sanctuary, work/logistics/wellness/archive zones, helpers, objects, inspector, no memory-galaxy confusion. |
| `/life-map` | Does it feel like a spatial private galaxy? | 3D camera, parallax, image stars, selectable memory star, Focus/Replay route movement. |
| `/focus` | Does it feel like selected-memory chamber? | One dominant memory, image readout, clear Replay doorway, no extra avatar/orb. |
| `/replay` | Does it feel like a memory film? | Cinematic frame, film beats, deeper camera language, unwind path. |
| `/mirror` | Does it feel like reflection realm? | Pattern intelligence, orb reflection language, consent layer, return paths. |
| `/passport` | Does it feel like ownership vault? | Identity, consent, provenance, portability, private-by-default language. |
| `/status` | Does it feel like launch control room? | Route matrix, launch spine, trust/place, XR preview state. |
| `/privacy-controls` | Does it feel like consent console? | Permission states, model access, location precision, user control. |
| `/location-map` | Does it feel like emotional weather atlas? | Place memory, symbolic weather, route to real-world context. |
| `/spatial/ar-vr` | Does it honestly frame XR? | Enter VR button visible, `QUEST CHAMBER LIVE` badge, huge orb, Life Map door, Ground door, WebXR fallback, Quest manual proof steps, no fake hardware claim. |
| `/demo` | Does it feel like public preview walkthrough? | Clear product arc and public demo framing. |
| `/demo/replay-film` | Does it feel like film proof? | Replay/story arc that can be recorded for launch. |

## Local proof commands

```bash
node scripts/aaa-final-visual-contract.mjs
bash scripts/aaa-launch-proof.sh
```

The visual-contract script is static. The launch-proof script adds install, typecheck, static build, Firebase deploy, live route matrix, asset checks, and optional Playwright screenshots where browser tooling is available.

## Truth boundary

Quest 2 physical proof is not complete until someone opens `https://urai.app/spatial/ar-vr` in Quest Browser, presses the Enter VR path where available, opens the Spatial Life Map, interacts with the scene, and records the result.
