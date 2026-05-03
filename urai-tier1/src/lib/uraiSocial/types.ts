export type UraiSocialRole =
  | "self"
  | "anchor"
  | "mirror"
  | "challenger"
  | "ghost"
  | "ally"
  | "unknown";

export type UraiSocialTone =
  | "neutral"
  | "warm"
  | "charged"
  | "distant"
  | "supportive"
  | "tension"
  | "repair";

export type UraiSocialNode = {
  id: string;
  label: string;
  role: UraiSocialRole;
  tone: UraiSocialTone;
  weight: number;
  trustSignal: number;
  recurrence: number;
  lastInteractionAt: number;
  position: [number, number, number];
};

export type UraiSocialEdge = {
  id: string;
  fromId: string;
  toId: string;
  strength: number;
  tone: UraiSocialTone;
  pattern: "stable" | "repairing" | "strained" | "fading" | "emerging";
};

export type UraiSocialConstellation = {
  version: 1;
  nodes: UraiSocialNode[];
  edges: UraiSocialEdge[];
  dominantSocialPattern:
    | "stable_support"
    | "charged_relation"
    | "repair_arc"
    | "absence_pattern"
    | "mixed_social_field";
  systemInsight: string;
  suggestedSocialFocusId: string | null;
  updatedAt: number;
};
