export type SpatialCompatibilityType = 'image_overlay' | 'video_panel' | 'skybox' | 'model3d' | 'audio_narration' | 'unsupported';

export interface SpatialManifestArtifact {
  artifactId: string;
  type: string;
  url: string;
  storageUri: string;
  mimeType: string;
  width?: number;
  height?: number;
  durationMs?: number;
  checksum?: string;
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
}

function isArtifact(value: unknown): value is SpatialManifestArtifact {
  const candidate = value as Partial<SpatialManifestArtifact> | null;
  return Boolean(
    candidate &&
      typeof candidate.artifactId === 'string' &&
      typeof candidate.type === 'string' &&
      typeof candidate.url === 'string' &&
      typeof candidate.storageUri === 'string' &&
      typeof candidate.mimeType === 'string',
  );
}

export function isSpatialAssetManifest(value: unknown): value is SpatialAssetManifest {
  const candidate = value as Partial<SpatialAssetManifest> | null;
  return Boolean(
    candidate &&
      typeof candidate.manifestId === 'string' &&
      candidate.manifestVersion === '1.0' &&
      typeof candidate.jobId === 'string' &&
      typeof candidate.ownerId === 'string' &&
      typeof candidate.projectId === 'string' &&
      typeof candidate.assetType === 'string' &&
      Array.isArray(candidate.artifacts) &&
      candidate.artifacts.every(isArtifact) &&
      typeof candidate.provider === 'string' &&
      typeof candidate.model === 'string' &&
      typeof candidate.promptPreview === 'string' &&
      candidate.spatialCompatibility &&
      typeof candidate.spatialCompatibility.supported === 'boolean' &&
      typeof candidate.spatialCompatibility.type === 'string',
  );
}
