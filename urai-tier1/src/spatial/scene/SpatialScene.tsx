"use client";

import { useEffect, useState } from "react";
import HomeWorld from "./HomeWorld";
import { useSceneStore } from "../store/useSceneStore";
import LifeMapStarfield from "../components/LifeMapStarfield";
import { CinematicCameraRig } from "../components/CinematicCameraRig";
import NarratorVoiceBridge from "../narrator/NarratorVoiceBridge";
import NarratorCaptionBridge from "../narrator/NarratorCaptionBridge";
import SpatialAudioNarratorBridge from "../narrator/SpatialAudioNarratorBridge";
import DualLayerNarratorBridge from "../narrator/DualLayerNarratorBridge";

import CompanionOrb from "../companion/CompanionOrb";
import CompanionCard from "../companion/CompanionCard";
import { runCompanionPipeline } from "../companion/CompanionPipeline";
import { trimForLaunch } from "../companion/CompanionLaunchPolish";
import { speakCompanionPayload } from "../companion/CompanionVoiceEngine";
import FirstLightExperience from "../onboarding/FirstLightExperience";
import { trackLaunchEvent } from "../analytics/track";

const FIRST_LIGHT_KEY = "urai:first-light-complete";

export default function SpatialScene() {
  const phase = useSceneStore((s) => s.phase);
  const selectedStarId = useSceneStore((s) => s.selectedStarId);
  const selectedStarPosition = useSceneStore((s) => s.selectedStarPosition);
  const focusStar = useSceneStore((s) => s.focusStar);

  const [firstLightComplete, setFirstLightComplete] = useState(false);
  const [companionState, setCompanionState] = useState<any>(null);
  const [companionLine, setCompanionLine] = useState<string | null>(null);
  const [expression, setExpression] = useState<any>(null);
  const [speechPayload, setSpeechPayload] = useState<any>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setFirstLightComplete(window.localStorage.getItem(FIRST_LIGHT_KEY) === "true");
    trackLaunchEvent("life_map_entered");
  }, []);

  useEffect(() => {
    if (!phase || !firstLightComplete) return;

    const result = runCompanionPipeline({
      phase,
      mode: "timeline",
      selectedNode: null,
      visibleNodes: [],
      showReplay: false,
      state: companionState ?? undefined,
      memorySignals: selectedStarId ? [{ id: selectedStarId, timestamp: new Date().toISOString(), intensity: 0.55, summary: "selected-star" }] : [],
      voiceMode: "tapToSpeak",
      userGesture: false,
    });

    const line = trimForLaunch(result.line, result.decision.context);

    setCompanionLine(line);
    setCompanionState(result.state);
    setExpression(result.expression);
    setSpeechPayload(result.speechPayload);
  }, [phase, selectedStarId, firstLightComplete]);

  const completeFirstLight = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(FIRST_LIGHT_KEY, "true");
    }
    trackLaunchEvent("first_light_completed");
    setFirstLightComplete(true);
  };

  const speakOnTap = () => {
    if (!speechPayload) return;
    speakCompanionPayload({ ...speechPayload, canAutoPlay: true });
  };

  return (
    <>
      <NarratorVoiceBridge />
      <NarratorCaptionBridge />
      <SpatialAudioNarratorBridge />
      <DualLayerNarratorBridge />

      <CinematicCameraRig phase={phase} selectedStarPosition={selectedStarPosition} emotionalSync={expression} />
      <HomeWorld />

      <LifeMapStarfield
        phase={phase}
        selectedStarId={selectedStarId}
        onSelectStar={(star) => {
          trackLaunchEvent("star_clicked", { starId: star.id });
          focusStar(star.id, star.position ?? [0, 18, -220]);
        }}
      />

      {!firstLightComplete && <FirstLightExperience onComplete={completeFirstLight} />}

      {firstLightComplete && expression && (
        <div className="fixed bottom-6 right-6 z-50">
          <CompanionOrb expression={expression} muted={false} onClick={speakOnTap} />
        </div>
      )}

      {firstLightComplete && companionLine && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50">
          <CompanionCard text={companionLine} />
        </div>
      )}
    </>
  );
}
