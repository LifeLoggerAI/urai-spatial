export const uraiTier8AdaptiveFirestoreSchema = {
  users: {
    "{userId}": {
      uraiAdaptiveProfile: {
        latest: {
          version: "1",
          totalSignals: "number",
          phaseCounts: "Record<string, number>",
          toneCounts: "Record<string, number>",
          arcCounts: "Record<string, number>",
          memoryTypeCounts: "Record<string, number>",
          companionModeCounts: "Record<string, number>",
          preferredNarratorTempo: "slow | balanced | direct",
          preferredCompanionMode: "idle | witness | guide | guardian | reflector",
          dominantTone: "string",
          dominantArc: "string",
          updatedAt: "number",
        },
      },
      uraiAdaptiveSignals: {
        "{signalId}": {
          phase: "HOME | ASCENT | LIFEMAP | FOCUS | REPLAY",
          selectedMemoryType: "string | null",
          selectedTone: "string | null",
          dominantArc: "string",
          companionMode: "string",
          companionAction: "string",
          memoryWeight: "number",
          auraIntensity: "number",
          timestamp: "number",
        },
      },
    },
  },
} as const;
