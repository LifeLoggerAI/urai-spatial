# Ground first-person / XR canon

This lock records the product rule for the Home -> Ground transition.

## Canon

- `/home` is the threshold world.
- The visible user body/avatar and the orb companion are anchored at `/home`.
- Clicking Ground does not move the body/orb into Ground.
- Clicking Ground starts a camera descent into the lower layer.
- `/ground` is entered as the user camera: first-person on desktop/mobile, and first-person/teleport-ready in XR.
- `/ground` may show helpers, agents, inspectable objects, stations, rooms, and world zones.
- `/ground` must not render the Home avatar as a standing character in front of the user.
- `/ground` must not render the Home orb as a physical companion unless an explicit future summon mode is added.

## Route intent

`/ground` should feel like a walkable private operations floor, not a poster and not a dashboard.

Primary zones:

- Reception
- Privacy sanctuary
- Work console
- Logistics table
- Schedule table
- Wellness corner
- Memory archive
- Garden/reset passage

## XR proof rule

Quest/WebXR proof is manual until tested on physical hardware. It is acceptable for the route to expose an XR entry button and fallback instructions, but docs and UI must not claim Quest verified until the headset test is recorded.
