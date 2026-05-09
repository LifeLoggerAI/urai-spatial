export type SpatialCompatibilityType = 'image_overlay' | 'video_panel' | 'skybox' | 'model3d' | 'audio_narration' | 'unsupported';

export type LifeMapMemoryKind =
  | 'voice'
  | 'ritual'
  | 'person'
  | 'place'
  | 'dream'
  | 'milestone'
  | 'recovery'
  | 'mirror'
  | 'shadow'
  | 'memory';

export type LifeMapSourceType = 'seed' | 'firestore' | 'fallback' | 'private' | 'demo';
export type LifeMapPrivacyState = 'private' | 'demo' | 'redacted' | 'shared-safe';
export type LifeMapEmotionalWeather = 'calm' | 'grief' | 'recovery' | 'threshold' | 'dream' | 'overstimulated';

export interface SpatialManifestArtifact {
  artifactId: string;
  type: string;
  url: string;
  storageUri: string;
  mimeType: string;
  width?: number;
  height?: number;
  durationMs?: number;
}

export interface LifeMapReflectionSummary {
  changed: string;
  repeated: string;
  healed: string;
  needsAttention: string;
}

export interface SpatialAssetManifest {
  manifestId: string;
  manifestVersion: '1.0';
  jobId: string;
  ownerId: string;
  projectId: string;
  assetType: string;
  artifacts: SpatialManifestArtifact[];
  provider: string;
  model: string;
  promptPreview: string;
  spatialCompatibility: {
    supported: boolean;
    type: SpatialCompatibilityType;
    reason?: string;
  };
  title?: string;
  systemLabel?: string;
  emotionalTone?: string;
  emotionalWeather?: LifeMapEmotionalWeather;
  season?: string;
  importanceScore?: number;
  sourceType?: LifeMapSourceType;
  privacyState?: LifeMapPrivacyState;
  narratorLine?: string;
  replayReady?: boolean;
  memoryKind?: LifeMapMemoryKind;
  whyThisAppeared?: string;
  relationshipArcStrength?: number;
  reflectionSummary?: LifeMapReflectionSummary;
}

export function isSpatialAssetManifest(value: unknown): value is SpatialAssetManifest {
  const candidate = value as Partial<SpatialAssetManifest> | null;
  return Boolean(
    candidate &&
      typeof candidate.manifestId === 'string' &&
      candidate.manifestVersion === '1.0' &&
      Array.isArray(candidate.artifacts) &&
      candidate.spatialCompatibility &&
      typeof candidate.spatialCompatibility.supported === 'boolean' &&
      typeof candidate.spatialCompatibility.type === 'string' &&
      (candidate.importanceScore === undefined || typeof candidate.importanceScore === 'number') &&
      (candidate.replayReady === undefined || typeof candidate.replayReady === 'boolean'),
  );
}

export function memoryTitle(manifest: SpatialAssetManifest | null | undefined) {
  return manifest?.title || manifest?.promptPreview || 'Memory star';
}

export function memorySystemLabel(manifest: SpatialAssetManifest | null | undefined) {
  return manifest?.systemLabel || manifest?.assetType || 'Spatial memory';
}

export function memorySourceType(manifest: SpatialAssetManifest | null | undefined): LifeMapSourceType {
  return manifest?.sourceType || (manifest?.provider === 'seed' ? 'seed' : 'firestore');
}

export function memoryPrivacyState(manifest: SpatialAssetManifest | null | undefined): LifeMapPrivacyState {
  return manifest?.privacyState || (manifest?.ownerId === 'launch-demo' ? 'demo' : 'private');
}

export function memoryReplayReady(manifest: SpatialAssetManifest | null | undefined) {
  return manifest?.replayReady !== false;
}
