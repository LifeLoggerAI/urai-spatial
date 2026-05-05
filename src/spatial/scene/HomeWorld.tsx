"use client";

import Orb from "../components/Orb";
import { useSceneStore } from "../state/sceneStore";
import GroundWorld from "./GroundWorld";
import HomeSky from "./HomeSky";
import { useHomeWorldState } from "../homeWorld/homeWorldState";

export default function HomeWorld() {
  const enterLifeMap = useSceneStore((s) => s.enterLifeMap);
  const { state } = useHomeWorldState();

  const onActivateOrb = () => {
    if (useSceneStore.getState().isTransitioning) return;
    enterLifeMap();
  };

  return (
    <group
      data-ground-tier={state.groundTier}
      data-orb-tier={state.orbTier}
      data-sky-tier={state.skyTier}
      data-mood={state.moodState}
      data-recovery={state.recoveryState}
    >
      <HomeSky state={state} />
      <GroundWorld state={state} />
      <Orb state={state} onClick={onActivateOrb} />
    </group>
  );
}
