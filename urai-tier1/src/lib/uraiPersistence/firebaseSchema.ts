export const uraiTier7FirestoreSchema = {
  users: {
    "{userId}": {
      uraiSessions: {
        "{sessionId}": {
          phase: "HOME | ASCENT | LIFEMAP | FOCUS | REPLAY",
          selectedStarId: "string | null",
          lastPhase: "HOME | ASCENT | LIFEMAP | FOCUS | REPLAY",
          replayEnteredAt: "number",
          updatedAt: "number",
        },
      },
      uraiMemories: {
        "{memoryId}": {
          title: "string",
          memoryType: "threshold | relationship | clarity | shadow | recovery",
          emotionalTone: "calm | charged | shadow | bright | threshold",
          memoryWeight: "number",
          auraIntensity: "number",
          position: "[number, number, number]",
          updatedAt: "number",
        },
      },
      uraiPatterns: {
        latest: {
          dominantArc: "string",
          relatedMemoryIds: "string[]",
          relatedTitles: "string[]",
          nextSuggestedFocusId: "string | null",
          chainLine: "string",
          systemInsight: "string",
          updatedAt: "number",
        },
      },
      uraiCompanion: {
        latest: {
          mode: "idle | witness | guide | guardian | reflector",
          presence: "number",
          suggestedAction: "none | observe | slow_down | enter_focus | hold_replay",
          confidence: "number",
          whisper: "string",
          updatedAt: "number",
        },
      },
    },
  },
} as const;
