"use client";

import HomeEnvironment from "../components/HomeEnvironment";
import { useSceneStore } from "../state/sceneStore";

export default function HomeWorld() {
  const mode = useSceneStore((s) => s.mode);
  const enterLifeMap = useSceneStore((s) => s.enterLifeMap);

  return (
    <HomeEnvironment
      mode={mode}
      transitionProgress={0}
      reducedMotion={false}
      camera={{
        position: [-5.2, 1.25, 6.6],
        lookAt: [-0.6, 1.05, 0],
        fov: 33,
      }}
      onEnterLifeMap={enterLifeMap}
    />
  );
}
