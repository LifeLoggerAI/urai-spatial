export type LifeMapNodeType =
  | 'memory' | 'insight' | 'ritual' | 'dream' | 'relationship' | 'recovery' | 'shadow' | 'milestone' | 'chapter'
  | 'voiceMoment' | 'locationMoment' | 'emotionalShift' | 'habitPattern' | 'socialPattern' | 'threshold' | 'rebirth' | 'legacy' | 'mirrorMoment'

export type EmotionalTone = 'calm' | 'clarity' | 'purpose' | 'dreamy' | 'pain' | 'healing' | 'rebirth' | 'shadow'
export type LifeMapMode = 'timeline' | 'constellation' | 'weather' | 'recovery' | 'shadow' | 'dream' | 'relationship' | 'chapter' | 'mirror'

export interface LifeMapNode {
  id: string; userId: string; title: string; subtitle?: string; description: string; timestamp: string;
  nodeType: LifeMapNodeType; emotionalTone: EmotionalTone; emotionalIntensity: number; auraColor: string; glyphType: string;
  chapterId?: string; season?: 'spring' | 'summer' | 'autumn' | 'winter'; importanceScore: number; privacyLevel: 'private'|'trusted'|'public';
  x: number; y: number; z: number; clusterId?: string; relatedPeople: string[]; relatedLocations: string[]; relatedTags: string[];
  sourceSignals: string[]; replayScript?: string[]; narratorLine?: string; visualState?: 'dim'|'active'|'highlighted';
  isMilestone: boolean; isShadow: boolean; isRecovery: boolean; isDream: boolean; isRelationship: boolean; isRitual: boolean;
  createdAt: string; updatedAt: string;
}

export interface LifeMapEdge { id: string; sourceId: string; targetId: string; strength: number; type: 'constellation'|'recovery'|'dream'|'relationship'|'shadow'; }
export interface LifeChapter { id: string; title: string; summary: string; dominantEmotions: EmotionalTone[]; keyNodeIds: string[]; coverAura: string; eraStart: string; eraEnd: string; narratorVoiceover: string; }

export interface LifeMapSettings {
  layers: Record<string, boolean>; mode: LifeMapMode; reducedMotion: boolean; lowPowerMode: boolean; showCompanion: boolean;
  filters: { emotion?: EmotionalTone[]; nodeType?: LifeMapNodeType[]; chapterId?: string; person?: string; location?: string; importanceMin?: number; privacy?: LifeMapNode['privacyLevel'][]; dateStart?: string; dateEnd?: string; };
}

export interface ReplayFrame { nodeId: string; holdMs: number; zoom: number; weather?: 'fog'|'rain'|'lightning'|'aurora'|'wind'|'sunrise'|'eclipse'; narratorText?: string; }
