export interface PatternInsight {
  id: string;
  userId?: string;
  category:
    | "emotion"
    | "behavior"
    | "relationship"
    | "shadow"
    | "recovery"
    | "productivity"
    | "life_phase";
  label: string;
  description: string;
  confidence: number;
  severity: number;
  momentum: number;
  memoryIds: string[];
  firstSeenAt: number;
  lastSeenAt: number;
  recurrenceCount: number;
  signals: string[];
}
