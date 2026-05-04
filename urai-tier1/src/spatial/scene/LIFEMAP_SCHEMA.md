# URAI Spatial Life Map schema

This document describes the Firestore shape and integration contract for the symbolic Life Map inside `urai-tier1/src/spatial/scene`.

## Collections

All collections are scoped under `users/{userId}`:

- `lifeMapNodes`
- `lifeMapEdges`
- `lifeChapters`
- `memoryBlooms`
- `rituals`
- `relationshipNodes`
- `dreamNodes`
- `recoveryEvents`
- `shadowEvents`
- `narratorInsights`
- `lifeMapSettings`

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
    | "memory" | "insight" | "ritual" | "dream" | "relationship"
    | "recovery" | "shadow" | "milestone" | "chapter"
    | "voiceMoment" | "locationMoment" | "emotionalShift"
    | "habitPattern" | "socialPattern" | "threshold"
    | "rebirth" | "legacy" | "mirrorMoment";
  emotionalTone:
    | "calm" | "clarity" | "memory" | "milestone" | "purpose"
    | "dream" | "mystery" | "pain" | "conflict" | "recovery"
    | "growth" | "rebirth" | "shadow";
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
```

## `lifeMapEdges/{edgeId}`

```ts
{
  id: string;
  from: string;
  to: string;
  strength: number;
  edgeType: "chapter" | "relationship" | "recovery" | "shadow" | "dream" | "ritual" | "mirror";
  label: string;
}
```

## `lifeChapters/{chapterId}`

```ts
{
  id: string;
  title: string;
  summary: string;
  dominantEmotions: EmotionalTone[];
  coverGradient: string;
  keyNodeIds: string[];
  narratorVoiceover: string;
}
```

## Visual meaning contract

- Size = `importanceScore`
- Brightness = `emotionalIntensity`
- Pulse speed = recentness or unresolved charge
- Aura radius = emotional impact
- Line thickness = edge `strength`
- Glow color = `emotionalTone` / `auraColor`
- Orbit behavior = relationship or recurring pattern
- Fog / broken lines = shadow or unresolved state
- Blooming state = recovery arc

## Current implementation

Implemented in this branch:

- Home sky entry to Life Map
- Zoomable starfield with demo data
- Symbolic nodes and constellation edges
- Timeline, constellation, weather, recovery, shadow, dream, relationship, chapter, and Mirror modes
- Memory detail card
- Cinematic replay overlay with TTS hook button
- Companion guide
- Export panel shell for snapshot, memory scroll, and share card
- Empty state / demo mode switch
- Mobile safe layout and reduced-motion fallback
- Typed demo fallback data and helper functions

## Backend connection points

The helper functions in `lifeMapModel.ts` currently return demo fallback data. Replace the function bodies with Firestore reads/writes when production Firebase config is ready:

- `fetchLifeMapNodes(userId)`
- `fetchLifeMapEdges(userId)`
- `fetchLifeChapters(userId)`
- `saveLifeMapSettings(userId, settings)`
- `createLifeMapNode(userId, node)`
- `updateLifeMapNode(userId, nodeId, updates)`
- `generateLifeMapFromSignals(userId)`
- `generateReplayPath(userId, nodeIds)`
- `generateMirrorOfBecoming(userId)`

## Firebase Studio integration prompt

```text
Connect the URAI Spatial Life Map scene to Firestore using the schema in urai-tier1/src/spatial/scene/LIFEMAP_SCHEMA.md. Replace the fallback helper bodies in lifeMapModel.ts with Firebase client reads/writes, preserving the exported types and function names. Keep demo fallback behavior when Firebase is unavailable. Add auth-aware userId resolution and keep all Life Map data private by default unless privacyLevel is set to shareable.
```
