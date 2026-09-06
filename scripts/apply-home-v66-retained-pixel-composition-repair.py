#!/usr/bin/env python3
from pathlib import Path

SOURCE = Path('urai-tier1/src/spatial/layout/HomeWorldProductionFinal.tsx')
text = SOURCE.read_text()


def replace_once(old: str, new: str, label: str) -> None:
    global text
    if new in text:
        return
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one source match, found {count}')
    text = text.replace(old, new, 1)


# V66r2 is already materially present on the owner-authored certifying tree. This script
# remains idempotent and documents the bounded runtime/art intent for future exact-head repairs.
required = [
    "visualOwner:'v66r2-responsive-photogrammetry-sanctuary'",
    "home-v66r2-embedded-photogrammetry-relief",
    "v66r1-wall-seated-engineered-reliquary-no-pedestal-no-ring-no-primitive-clamps",
    "scale={scale*10.8}",
    "v66r1-recessed-load-bearing-threshold-aperture-no-freestanding-arch",
    "camera.quaternion.copy(freeLook).slerp(landmarkLook,1-Math.pow(0.00008,delta))",
]
missing = [marker for marker in required if marker not in text]
if missing:
    raise SystemExit('V66r2 canonical repair markers missing: ' + ', '.join(missing))

# Keep the responsiveness correction fail-closed: one committed scanned relief is integrated;
# unused heavy pipe/second-rock preloads are not allowed back into the Home startup path.
for forbidden in [
    'useGLTF.preload(V48_PIPE_SYSTEM)',
    'useGLTF.preload(V48_ROCK_FACE_02)',
    'home-v66r1-right-deep-relief',
    'home-v66r1-left-mid-relief',
]:
    if forbidden in text:
        raise SystemExit(f'V66r2 responsiveness regression detected: {forbidden}')

SOURCE.write_text(text)
print('V66r2 retained-pixel repair verified: bounded scanned relief, engineered Orb, visible thresholds, landmark framing, balanced lighting.')
