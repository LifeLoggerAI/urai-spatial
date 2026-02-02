
export interface Scene {
  currentReleaseId: string;
  title: string;
  description: string;
  updatedAt: FirebaseFirestore.Timestamp;
}

export interface SceneRelease {
  sceneId: string;
  version: number;
  status: 'draft' | 'published' | 'rolledBack';
  manifestRef: FirebaseFirestore.DocumentReference;
  createdBy: string;
  createdAt: FirebaseFirestore.Timestamp;
  notes: string;
}

export interface SceneManifest {
  sceneId: string;
  releaseId: string;
  sceneJson: string;
  assetRefs: string[];
  checksum: string;
}
