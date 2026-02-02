
export interface Scene {
  id: string;
  currentReleaseId: string;
  title: string;
  description: string;
  updatedAt: any; // Firestore timestamp
}

export interface SceneRelease {
  id: string;
  sceneId: string;
  version: number;
  status: 'draft' | 'published' | 'rolledBack';
  manifestRef: string; // Path to scene manifest in Firestore
  createdBy: string; // User ID
  createdAt: any; // Firestore timestamp
  notes: string;
}

export interface SceneManifest {
  id: string;
  sceneId: string;
  releaseId: string;
  sceneJson: string; // The actual scene JSON
  assetRefs: string[]; // Array of asset build paths
  checksum: string; // SHA256 of the manifest content
}
