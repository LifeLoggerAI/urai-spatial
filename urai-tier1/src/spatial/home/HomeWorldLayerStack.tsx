"use client";

import type { CSSProperties } from "react";
import { homeWorldTierLabels } from "./homeWorldDefaults";
import type { HomeWorldState } from "./homeWorldTypes";
import { AvatarLayer } from "./layers/AvatarLayer";
import { AuroraWeatherLayer, CloudLayer, CelestialPortalLayer, DeepSkyLayer } from "./layers/DeepSkyLayer";
import { GroundTierLayer, RootBloomLayer } from "./layers/GroundTierLayer";
import { HorizonSystem } from "./layers/HorizonSystem";
import { NarratorEffectLayer } from "./layers/NarratorEffectLayer";
import { OrbCompanionLayer } from "./layers/OrbCompanionLayer";
import { StarfieldLayer } from "./layers/StarfieldLayer";

export function HomeWorldLayerStack({ state, opening, onEnter }: { state: HomeWorldState; opening: boolean; onEnter: () => void }) {
  const tierLabel = homeWorldTierLabels[state.groundTier];
  const energyStyle = {
    "--energy": `${state.energyScore / 100}`,
    "--sky-intensity": `${state.skyWeatherIntensity}`,
    "--ground-intensity": `${state.groundGrowthIntensity}`,
    "--orb-intensity": `${state.orbPulseIntensity}`,
  } as CSSProperties;

  return (
    <section className={`home-world ${opening ? "opening" : ""}`} data-testid="urai-home-scene" style={energyStyle}>
      <div className="camera-rig">
        <DeepSkyLayer />
        <CelestialPortalLayer />
        <AuroraWeatherLayer />
        <CloudLayer />
        <StarfieldLayer />
        <HorizonSystem />
        <GroundTierLayer />
        <RootBloomLayer />
        <AvatarLayer />
        <OrbCompanionLayer opening={opening} onEnter={onEnter} />
        <NarratorEffectLayer state={state} />
        <div className="foreground-vignette" data-testid="home-layer-foreground-vignette" />

        <button type="button" className="enter-label" onClick={onEnter} disabled={opening} aria-disabled={opening}>
          {opening ? "CAMERA LIFTING THROUGH THE SKY" : "ENTER THE SKY"}
        </button>

        <p className="caption">
          {tierLabel} / {state.moodState} / energy {Math.round(state.energyScore)}
        </p>
      </div>
    </section>
  );
}
