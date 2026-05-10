"use client";

import React, { useMemo } from "react";
import type { HomeMoodState, HomeRecoveryState, HomeWorldState, HomeWorldTier } from "../homeWorldTypes";

export type HomeSceneMode = "loading" | "home" | "exitingHome" | "enteringLifeMap" | "lifemap" | "focus" | "replay" | "unwind";

type HomeSceneProps = {
  homeWorldState?: Partial<HomeWorldState>;
  state?: HomeSceneMode;
  opening?: boolean;
  enterLifeMap?: () => void;
  onReplay?: () => void;
  onUnwind?: () => void;
  onFocus?: () => void;
  narratorText?: string;
  className?: string;
};

const fallbackState: HomeWorldState = {
  userId: "demo-user",
  groundTier: 3,
  orbTier: 3,
  skyTier: 3,
  moodState: "recovery",
  recoveryState: "growing",
  energyScore: 64,
  narratorSpeaking: false,
  skyWeatherIntensity: 0.55,
  groundGrowthIntensity: 0.62,
  orbPulseIntensity: 0.66,
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
};

const moodRgb: Record<HomeMoodState, string> = {
  calm: "114 211 255",
  low: "88 127 172",
  recovery: "134 239 172",
  dream: "174 143 255",
  shadow: "190 92 148",
  focused: "210 244 255",
  joy: "255 199 112",
};

const skyRgb: Record<HomeMoodState, string> = {
  calm: "15 42 68",
  low: "11 20 34",
  recovery: "10 62 58",
  dream: "35 28 82",
  shadow: "39 18 48",
  focused: "18 40 64",
  joy: "62 45 98",
};

function safeTier(value: unknown, fallback: HomeWorldTier): HomeWorldTier {
  return value === 1 || value === 2 || value === 3 || value === 4 || value === 5 ? value : fallback;
}

function safeMood(value: unknown, fallback: HomeMoodState): HomeMoodState {
  const allowed: HomeMoodState[] = ["calm", "low", "recovery", "dream", "shadow", "focused", "joy"];
  return allowed.includes(value as HomeMoodState) ? (value as HomeMoodState) : fallback;
}

function safeRecovery(value: unknown, fallback: HomeRecoveryState): HomeRecoveryState {
  const allowed: HomeRecoveryState[] = ["dormant", "recovering", "stable", "growing", "awakened"];
  return allowed.includes(value as HomeRecoveryState) ? (value as HomeRecoveryState) : fallback;
}

function clamp(value: number | undefined, fallback: number, min = 0, max = 1) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, value));
}

function starStyle(index: number) {
  return {
    "--i": index,
    "--x": `${(index * 37 + 11) % 100}%`,
    "--y": `${(index * 53 + 17) % 62}%`,
    "--s": `${1 + ((index * 3) % 3)}px`,
  } as React.CSSProperties;
}

function mergeState(partial?: Partial<HomeWorldState>): HomeWorldState {
  return {
    ...fallbackState,
    ...partial,
    groundTier: safeTier(partial?.groundTier, fallbackState.groundTier),
    orbTier: safeTier(partial?.orbTier, fallbackState.orbTier),
    skyTier: safeTier(partial?.skyTier, fallbackState.skyTier),
    moodState: safeMood(partial?.moodState, fallbackState.moodState),
    recoveryState: safeRecovery(partial?.recoveryState, fallbackState.recoveryState),
    energyScore: typeof partial?.energyScore === "number" ? Math.max(0, Math.min(100, partial.energyScore)) : fallbackState.energyScore,
    skyWeatherIntensity: clamp(partial?.skyWeatherIntensity, fallbackState.skyWeatherIntensity),
    groundGrowthIntensity: clamp(partial?.groundGrowthIntensity, fallbackState.groundGrowthIntensity),
    orbPulseIntensity: clamp(partial?.orbPulseIntensity, fallbackState.orbPulseIntensity),
  };
}

function defaultNarrator(state: HomeWorldState) {
  if (state.narratorSpeaking) return "The orb is speaking softly. Your world is listening.";
  if (state.moodState === "shadow") return "The world is dimmer to make room for heavier weather without judgment.";
  if (state.moodState === "recovery") return "The ground is brighter because growth signals are active.";
  if (state.moodState === "dream") return "The sky is violet because rest and memory signals are stronger.";
  return "The home world reflects recent energy, mood, recovery, ritual, memory, and rhythm signals.";
}

export default function HomeScene({ homeWorldState, state = "home", opening, enterLifeMap, onReplay, onUnwind, onFocus, narratorText, className }: HomeSceneProps) {
  const world = useMemo(() => mergeState(homeWorldState), [homeWorldState]);
  const mode = opening || state === "enteringLifeMap" || state === "exitingHome" ? "enteringLifeMap" : state;
  const orbColor = moodRgb[world.moodState] ?? moodRgb.calm;
  const ambientColor = skyRgb[world.moodState] ?? skyRgb.calm;
  const horizonColor = world.moodState === "joy" ? "255 202 143" : world.moodState === "shadow" ? "202 91 142" : world.moodState === "recovery" ? "177 235 168" : orbColor;
  const skyDisabled = mode === "enteringLifeMap";

  return (
    <main
      className={["urai-home-scene", className].filter(Boolean).join(" ")}
      data-testid="urai-home-scene"
      data-scene-state={mode}
      data-ground-tier={world.groundTier}
      data-orb-tier={world.orbTier}
      data-sky-tier={world.skyTier}
      data-mood={world.moodState}
      data-recovery={world.recoveryState}
      data-energy={Math.round(world.energyScore)}
      data-narrator-speaking={world.narratorSpeaking}
      style={{
        "--urai-orb-rgb": orbColor,
        "--urai-sky-rgb": ambientColor,
        "--urai-horizon-rgb": horizonColor,
        "--urai-energy": `${world.energyScore / 100}`,
        "--urai-sky-intensity": `${world.skyWeatherIntensity}`,
        "--urai-ground-intensity": `${world.groundGrowthIntensity}`,
        "--urai-orb-intensity": `${world.orbPulseIntensity}`,
        "--urai-ground-tier": `${world.groundTier}`,
        "--urai-orb-tier": `${world.orbTier}`,
        "--urai-sky-tier": `${world.skyTier}`,
      } as React.CSSProperties}
      aria-label="URAI Home World"
    >
      <div className="urai-sky-deep" data-testid="home-layer-deep-sky" />
      <div className="urai-sky-vault" data-testid="home-layer-sky-vault" />
      <div className="urai-moon-system" data-testid="home-layer-moon" aria-hidden="true"><div className="urai-moon-halo" /><div className="urai-moon-disc" /><div className="urai-moon-cut" /></div>
      <div className="urai-aurora aurora-a" data-testid="home-layer-aurora" />
      <div className="urai-aurora aurora-b" aria-hidden="true" />
      <div className="urai-cloud cloud-a" aria-hidden="true" />
      <div className="urai-cloud cloud-b" aria-hidden="true" />
      <div className="urai-cloud cloud-c" aria-hidden="true" />
      <div className="urai-stars" data-testid="home-layer-stars" aria-hidden="true">{Array.from({ length: 72 }, (_, index) => <i key={index} style={starStyle(index)} />)}</div>
      <div className="urai-constellation" data-testid="home-layer-constellations" aria-hidden="true" />
      <button type="button" className="urai-sky-enter" onClick={enterLifeMap} disabled={skyDisabled} aria-disabled={skyDisabled} data-testid="enter-sky-button" aria-label="Enter Life Map through the sky">
        <span className="sr-only">{skyDisabled ? "Opening the sky" : "Enter Life Map"}</span>
      </button>
      <section className="urai-horizon-system" data-testid="urai-home-horizon" aria-hidden="true"><div className="horizon-glow" /><div className="horizon-threshold" /><div className="terrain terrain-far" /><div className="mist mist-high" /><div className="terrain terrain-mid" /><div className="mist mist-mid" /><div className="terrain terrain-near" /><div className="mist mist-low" /></section>
      <section className="urai-ground" data-testid="urai-home-ground" aria-hidden="true"><div className="ground-plane ground-back" /><div className="ground-plane ground-mid" /><div className="root-network" data-testid="home-layer-root-network" /><div className="bloom-field" data-testid="home-layer-bloom-field" /><div className="ground-plane ground-front" /><div className="light-flecks" /></section>
      <section className="urai-hero" aria-label="Your symbolic avatar and orb companion"><div className="avatar-shadow" aria-hidden="true" /><div className="avatar-aura" aria-hidden="true" /><div className="avatar" data-testid="urai-home-avatar" role="img" aria-label="A calm symbolic avatar standing beneath the living orb"><div className="avatar-head" /><div className="avatar-neck" /><div className="avatar-shoulders" /><div className="avatar-body" /><div className="avatar-chest-glow" /><div className="avatar-leg leg-left" /><div className="avatar-leg leg-right" /></div><div className="orb-reflection" aria-hidden="true" /><button type="button" className="orb-companion" onClick={onFocus} disabled={mode === "enteringLifeMap" || !onFocus} aria-disabled={mode === "enteringLifeMap" || !onFocus} aria-label="Focus companion" data-testid="urai-orb-button"><span className="orb-halo" aria-hidden="true" /><span className="orb-core" aria-hidden="true" /><span className="orb-shine" aria-hidden="true" /><span className="orb-ring ring-a" aria-hidden="true" /><span className="orb-ring ring-b" aria-hidden="true" /><span className="orb-particles" aria-hidden="true">{Array.from({ length: 12 }, (_, index) => <i key={index} style={{ "--i": index } as React.CSSProperties} />)}</span></button></section>
      <aside className="narrator-whisper" data-testid="home-layer-narrator-shimmer" aria-live="polite"><span className="narrator-dot" aria-hidden="true" /><span>{narratorText ?? defaultNarrator(world)}</span></aside>
      <nav className="command-ribbon" data-testid="urai-command-ribbon" aria-label="Home World controls"><button type="button" onClick={enterLifeMap} disabled={mode === "enteringLifeMap"} aria-disabled={mode === "enteringLifeMap"} data-testid="home-control-lifemap">LifeMap</button><button type="button" onClick={onReplay} disabled={mode === "enteringLifeMap"} aria-disabled={mode === "enteringLifeMap"} data-testid="home-control-replay">Replay</button><button type="button" onClick={onUnwind} disabled={mode === "enteringLifeMap"} aria-disabled={mode === "enteringLifeMap"} data-testid="home-control-unwind">Mirror</button>{onFocus ? <button type="button" onClick={onFocus} disabled={mode === "enteringLifeMap"} aria-disabled={mode === "enteringLifeMap"} data-testid="home-control-focus">Focus</button> : null}</nav>
      <div className="foreground-vignette" data-testid="home-layer-foreground-vignette" aria-hidden="true" />
    </main>
  );
}
