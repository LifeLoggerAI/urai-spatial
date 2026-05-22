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

export function isSpatialAssetManifest(value: unknown): value is SpatialAssetManifest {
  const candidate = value as Partial<SpatialAssetManifest> | null;
  return Boolean(
    candidate &&
      typeof candidate.manifestId === 'string' &&
      candidate.manifestVersion === '1.0' &&
      Array.isArray(candidate.artifacts) &&
      candidate.spatialCompatibility &&
      typeof candidate.spatialCompatibility.supported === 'boolean' &&
      typeof candidate.spatialCompatibility.type === 'string',
  );
}
