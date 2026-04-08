# URAI Spatial Tier-2 Canon

## Canonical flow
Home -> Ascent -> LifeMap -> Focus -> Replay
ESC unwind: Replay -> Focus -> LifeMap -> Home

## Immutable laws
1. Focus is arrival, not magnification.
2. Replay is immersion, not viewing.
3. Camera is committed, physical, cinematic.
4. No mode bleed.
5. No alternate authority paths.
6. No ambiguous transitions.
7. Reducer authority is single source of truth.

## Transition table
- home_to_ascent: duration=1200 damping=0.072
- ascent_to_lifemap: duration=1050 damping=0.064
- lifemap_to_focus: duration=850 damping=0.078
- focus_to_replay: duration=1250 damping=0.060
- replay_to_focus: duration=900 damping=0.070
- focus_to_lifemap: duration=800 damping=0.082
- lifemap_to_home: duration=1300 damping=0.068

## Settle thresholds
positionError <= 0.035
lookError <= 0.030
velocityMagnitude <= 0.012
framesRequired = 6
interactionReleaseDelayMs = 80

## Backgrounds
home    bg=#02060b fog=#061425
lifemap bg=#01030a fog=#020612
focus   bg=#050814 fog=#0b1224
replay  bg=#0b040d fog=#140611
