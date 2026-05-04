# URAI Spatial Life Map schema

This document describes the Firestore shape and integration contract for the symbolic Life Map inside `urai-tier1/src/spatial/scene`.

## Collections

All collections are scoped under a user document:

- `users/{userId}/lifeMapNodes`
- `users/{userId}/lifeMapEdges`
- `users/{userId}/lifeChapters`
- `users/{userId}/memoryBlooms`
- `users/{userId}/rituals`
- `users/{userId}/relationshipNodes`
- `users/{userId}/dreamNodes`
- `users/{userId}/recoveryEvents`
- `users/{userId}/shadowEvents`
- `users/{userId}/narratorInsights`
- `users/{userId}/lifeMapSettings`

## `lifeMapNodes/{nodeId}`

```ts
{
  id: string;
  userId: string;
  title: string;
  subtitle: string;
  description: string;
  timestamp: string;
  nodeType:
    | "memory"
    | "insight"
    | "ritual"
    | "dream"
    | "relationship"
    | "recovery"
    | "shadow"
    | "milestone"
    | "chapter"
    | "voiceMoment"
    | "locationMoment"
    | "emotionalShift"
    | "habitPattern"
    | "socialPattern"
    | "threshold"
    | "rebirth"
    | "legacy"
    | "mirrorMoment";
  emotionalTone:
    | "calm"
    | "clarity"
    | "memory"
    | "milestone"
    | "purpose"
    | "dream"
    | "mystery"
    | "pain"
    | "conflict"
    | "recovery"
    | "growth"
    | "rebirth"
    | "shadow";
  emotionalIntensity: number;
  auraColor: string;
  glyphType: string;
  chapterId: string;
  season: string;
  importanceScore: number;
  privacyLevel: "private" | "circle" | "shareable";
  x: number;
  y: number;
  z: number;
  clusterId: string;
  relatedPeople: string[];
  relatedLocations: string[];
  relatedTags: string[];
  sourceSignals: string[];
  replayScript: string[];
  narratorLine: string;
  visualState: "quiet" | "glowing" | "blooming" | "fogged" | "orbiting" | "resolved";
  isMilestone: boolean;
  isShadow: boolean;
  isRecovery: boolean;
  isDream: boolean;
  isRelationship: boolean;
  isRitual: boolean;
  createdAt: string;
  updatedAt: string;
}