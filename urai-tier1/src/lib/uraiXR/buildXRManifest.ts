import type { UraiXRAnchor, UraiXRMode, UraiXRPhase, UraiXRSceneManifest } from "./types";

type BuildXRManifestArgs = {
  mode: UraiXRMode;
  phase: UraiXRPhase;
  selectedMemoryId: string | null;
  selectedMemoryTitle: string | null;
  selectedMemoryPosition: [number, number, number] | null;
};

export function buildUraiXRManifest(args: BuildXRManifestArgs): UraiXRSceneManifest {
  const selected = args.selectedMemoryPosition ?? [0, 0, -5];

  const anchors: UraiXRAnchor[] = [
    {
      id: "xr-origin-home",
      phase: "HOME",
      label: "Origin Home",
      position: [0, 0.8, 0],
      scale: 1,
      intent: "origin",
    },
    {
      id: "xr-ascent-portal",
      phase: "ASCENT",
      label: "Ascent Portal",
      position: [0, 5.2, -4.2],
      scale: 1.4,
      intent: "portal",
    },
    {
      id: "xr-lifemap-field",
      phase: "LIFEMAP",
      label: "LifeMap Field",
      position: [0, 8.2, -9.8],
      scale: 2.2,
      intent: "memory_field",
    },
    {
      id: "xr-focus-memory",
      phase: "FOCUS",
      label: args.selectedMemoryTitle ?? "Focused Memory",
      position: [selected[0], selected[1] + 5.2, selected[2] - 7.8],
      scale: 1,
      intent: "memory_focus",
    },
    {
      id: "xr-replay-room",
      phase: "REPLAY",
      label: "Replay Room",
      position: [selected[0], selected[1] + 4.8, selected[2] - 8.5],
      scale: 1.7,
      intent: "replay_room",
    },
    {
      id: "xr-companion",
      phase: args.phase,
      label: "Companion Presence",
      position: [selected[0] + 1.2, selected[1] + 5.6, selected[2] - 7.2],
      scale: 0.42,
      intent: "companion",
    },
  ];

  return {
    version: 1,
    mode: args.mode,
    phase: args.phase,
    selectedMemoryId: args.selectedMemoryId,
    selectedMemoryTitle: args.selectedMemoryTitle,
    anchors,
    companionAnchorId: "xr-companion",
    interactionModel: {
      gazeSelect: true,
      handSelect: true,
      voiceSelect: true,
      controllerSelect: true,
    },
    safety: {
      canonicalFlowLocked: true,
      replayOnlyFromFocus: true,
      escapeReverseChainRequired: true,
    },
    generatedAt: Date.now(),
  };
}
