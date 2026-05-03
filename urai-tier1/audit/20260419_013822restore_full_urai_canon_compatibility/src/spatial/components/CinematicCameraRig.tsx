"use client";
/* URAI_CANON_CAMERA_V1 */
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { MathUtils, Vector3 } from "three";
import type { CanonPhase } from "@/lib/uraiCanon/types";

type CameraPose = {
position: [number, number, number];
lookAt: [number, number, number];
damping: number;
};

export type CinematicCameraRigProps = {
phase: CanonPhase;
selected?: [number, number, number] | null;
};

const homePosition: [number, number, number] = [0, 1.6, 18];
const homeLookAt: [number, number, number] = [0, 0.9, 0];

function resolvePose(phase: CanonPhase, selected?: [number, number, number] | null): CameraPose {
const star = selected ?? [0, 0, -48];
if (phase === "HOME") {
return { position: homePosition, lookAt: homeLookAt, damping: 3.4 };
}
if (phase === "ASCENT") {
return { position: [0, 7.5, 27.5], lookAt: [0, -2.4, -10], damping: 2.4 };
}
if (phase === "LIFEMAP") {
return { position: [0, 1.8, 16], lookAt: [0, 0.2, -52], damping: 2.8 };
}
if (phase === "FOCUS") {
return {
position: [star[0] * 0.58, star[1] * 0.55 + 1.4, star[2] + 10.5],
lookAt: [star[0], star[1], star[2]],
damping: 5.0,
};
}
return {
position: [star[0] * 0.35, star[1] * 0.35 + 0.8, star[2] + 4.0],
lookAt: [star[0], star[1], star[2] - 4.2],
damping: 3.2,
};
}

export function CinematicCameraRig({ phase, selected = null }: CinematicCameraRigProps) {
const { camera } = useThree();
const positionRef = useRef(new Vector3(...homePosition));
const lookRef = useRef(new Vector3(...homeLookAt));
const targetPosRef = useRef(new Vector3(...homePosition));
const targetLookRef = useRef(new Vector3(...homeLookAt));
const previousPhaseRef = useRef<CanonPhase>(phase);

const pose = useMemo(() => resolvePose(phase, selected), [phase, selected]);

useEffect(() => {
targetPosRef.current.set(...pose.position);
targetLookRef.current.set(...pose.lookAt);
previousPhaseRef.current = phase;
}, [phase, pose]);

useFrame((_, delta) => {
const p = resolvePose(phase, selected);
const replayBreath = phase === "REPLAY" ? Math.sin(performance.now() * 0.0012) * 0.06 : 0;
const factor = 1 - Math.exp(-delta * p.damping);

```
positionRef.current.x = MathUtils.lerp(positionRef.current.x, p.position[0], factor);
positionRef.current.y = MathUtils.lerp(positionRef.current.y, p.position[1] + replayBreath, factor);
positionRef.current.z = MathUtils.lerp(positionRef.current.z, p.position[2], factor);

lookRef.current.x = MathUtils.lerp(lookRef.current.x, p.lookAt[0], factor);
lookRef.current.y = MathUtils.lerp(lookRef.current.y, p.lookAt[1], factor);
lookRef.current.z = MathUtils.lerp(lookRef.current.z, p.lookAt[2], factor);

camera.position.copy(positionRef.current);
camera.lookAt(lookRef.current);
```

});

return null;
}

export default CinematicCameraRig;
