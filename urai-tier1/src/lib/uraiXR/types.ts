export type UraiXRMode = "flat" | "ar_preview" | "vr_preview" | "xr_ready";

export type UraiXRPhase = "HOME" | "ASCENT" | "LIFEMAP" | "FOCUS" | "REPLAY";

export type UraiXRAnchor = {
  id: string;
  phase: UraiXRPhase;
  label: string;
  position: [number, number, number];
  scale: number;
  intent: "origin" | "portal" | "memory_field" | "memory_focus" | "replay_room" | "companion";
};

export type UraiXRSceneManifest = {
  version: 1;
  mode: UraiXRMode;
  phase: UraiXRPhase;
  selectedMemoryId: string | null;
  selectedMemoryTitle: string | null;
  anchors: UraiXRAnchor[];
  companionAnchorId: string;
  interactionModel: {
    gazeSelect: boolean;
    handSelect: boolean;
    voiceSelect: boolean;
    controllerSelect: boolean;
  };
  safety: {
    canonicalFlowLocked: true;
    replayOnlyFromFocus: true;
    escapeReverseChainRequired: true;
  };
  generatedAt: number;
};
