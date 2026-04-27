export const uraiTier11XRFirestoreSchema = {
  users: {
    "{userId}": {
      uraiXRManifests: {
        "{manifestId}": {
          version: "1",
          mode: "flat | ar_preview | vr_preview | xr_ready",
          phase: "HOME | ASCENT | LIFEMAP | FOCUS | REPLAY",
          selectedMemoryId: "string | null",
          selectedMemoryTitle: "string | null",
          anchors: "UraiXRAnchor[]",
          companionAnchorId: "string",
          interactionModel: {
            gazeSelect: "boolean",
            handSelect: "boolean",
            voiceSelect: "boolean",
            controllerSelect: "boolean",
          },
          safety: {
            canonicalFlowLocked: "true",
            replayOnlyFromFocus: "true",
            escapeReverseChainRequired: "true",
          },
          generatedAt: "number",
        },
      },
    },
  },
} as const;
