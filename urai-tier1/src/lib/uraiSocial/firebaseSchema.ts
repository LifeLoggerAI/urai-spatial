export const uraiTier9SocialFirestoreSchema = {
  users: {
    "{userId}": {
      uraiSocialNodes: {
        "{nodeId}": {
          label: "string",
          role: "self | anchor | mirror | challenger | ghost | ally | unknown",
          tone: "neutral | warm | charged | distant | supportive | tension | repair",
          weight: "number",
          trustSignal: "number",
          recurrence: "number",
          lastInteractionAt: "number",
          position: "[number, number, number]",
          updatedAt: "number",
        },
      },
      uraiSocialEdges: {
        "{edgeId}": {
          fromId: "string",
          toId: "string",
          strength: "number",
          tone: "string",
          pattern: "stable | repairing | strained | fading | emerging",
          updatedAt: "number",
        },
      },
      uraiSocialConstellation: {
        latest: {
          dominantSocialPattern: "string",
          systemInsight: "string",
          suggestedSocialFocusId: "string | null",
          updatedAt: "number",
        },
      },
    },
  },
} as const;
