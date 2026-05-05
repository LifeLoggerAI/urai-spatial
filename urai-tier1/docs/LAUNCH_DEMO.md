# URAI Launch Demo Plan

## Goal

Show URAI as a quiet emotional life map, not a dashboard. The demo should make viewers feel restraint, memory, and presence.

## Demo length

Target: 75-90 seconds.

## Setup

1. Run `pnpm dev` from `urai-tier1`.
2. Open `/life-map` in a clean browser profile or clear `localStorage.removeItem("urai:first-light-complete")`.
3. Import `src/spatial/companion/companionPolish.css` globally if not already imported.
4. In `SpatialScene.tsx`, pass `emotionalSync={expression}` into `CinematicCameraRig`.
5. Use a 16:9 browser window. Hide bookmarks and browser chrome if possible.
6. Record at 1080p or higher.

## Shot list

### Shot 1: First Light arrival, 0-15s

Visual: dark softened scene, quiet text.

On-screen lines:
- URAI listens for patterns.
- It does not rush you.

Voiceover optional:
> URAI begins quietly. No dashboard. No pressure. Just space.

### Shot 2: Companion presence, 15-30s

On-screen line:
- I’m here. We can move slowly.

Direction: let silence sit. Do not click early.

Voiceover optional:
> The companion does not interrupt. It waits for meaning.

### Shot 3: First emotional hook, 30-45s

On-screen lines:
- Your sky is quiet, but not empty.
- This was not just an event. It became a pattern.

Direction: allow each line to land. Avoid rapid mouse movement.

### Shot 4: Impact line, 45-60s

On-screen line:
- The recovery was quieter than the wound, but it lasted longer.

Direction: pause after this line. This is the demo's emotional anchor.

### Shot 5: Enter Life Map, 60-75s

Action: click `Enter the Life Map`.

Visual: starfield opens, companion orb appears.

Voiceover optional:
> The map opens only after trust is established.

### Shot 6: Star interaction, 75-90s

Action: tap one star.

Expected: camera moves smoothly, companion line appears once, no spam.

Voiceover optional:
> URAI turns life signals into patterns you can revisit gently.

## What not to show

- Settings screens
- raw Firebase data
- trauma/shadow/deception modes in the first demo
- voice autoplay
- long explanations
- feature menus

## Demo caption

URAI is a passive emotional life map. It notices patterns over time and presents them gently as stars, rituals, memories, and recovery arcs.

## Short pitch

URAI is not another productivity dashboard. It is a quiet AI companion that helps people see the patterns of their life with timing, restraint, and emotional continuity.

## Launch acceptance criteria

- First session shows no more than six lines.
- Companion orb is hidden during First Light.
- Voice is silent by default.
- Life Map opens only after First Light completes.
- Camera motion is smooth and forward-facing.
- Companion speaks once after entry, not repeatedly.
- No React maximum update depth errors.
- No obvious camera jitter or motion sickness.

## Reset command for recording

In browser console:

```js
localStorage.removeItem("urai:first-light-complete")
location.reload()
```

## Final demo principle

The demo should not prove how much URAI can do. It should prove how differently URAI behaves: quiet first, meaningful second.
