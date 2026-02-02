
import * as THREE from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// A placeholder material for assets that fail to load.
const placeholderMaterial = new THREE.MeshBasicMaterial({ color: 0xff00ff, wireframe: true });

export class AssetManager {
  private gltfLoader = new GLTFLoader();
  private cache = new Map<string, Promise<GLTF>>();

  constructor(private baseUrl: string) {}

  /**
   * Get the full URL for a given asset path.
   * @param assetPath The relative path to the asset.
   * @returns The full URL to the asset.
   */
  getAssetUrl(assetPath: string): string {
    return `${this.baseUrl}${assetPath}`;
  }

  /**
   * Asynchronously load a GLTF model.
   * This function caches the promise for each asset path to avoid redundant loads.
   *
   * @param assetPath The path to the GLTF asset.
   * @returns A promise that resolves with the loaded GLTF scene.
   */
  async loadGltf(assetPath: string): Promise<GLTF> {
    const fullUrl = this.getAssetUrl(assetPath);

    // Check if the asset is already in the cache
    const cached = this.cache.get(fullUrl);
    if (cached) {
      return cached;
    }

    // If not, create a new promise and store it in the cache
    const promise = this.gltfLoader.loadAsync(fullUrl).catch((error: unknown) => {
      console.error(`Failed to load asset from ${fullUrl}:`, error);
      // If loading fails, return a placeholder scene
      return this.createPlaceholderScene(new Error(error instanceof Error ? error.message : String(error)));
    });

    this.cache.set(fullUrl, promise);
    return promise;
  }

  /**
   * Create a placeholder GLTF scene to use when an asset fails to load.
   * This is useful for preventing the application from crashing and providing a visual indicator of a missing asset.
   *
   * @param error The error that occurred during loading.
   * @returns A GLTF-like object with a placeholder scene.
   */
  private createPlaceholderScene(error: Error): GLTF {
    console.warn('Creating placeholder scene due to loading error:', error.message);

    // Create a simple box geometry to represent the missing asset
    const placeholderGeometry = new THREE.BoxGeometry(1, 1, 1);
    const placeholderMesh = new THREE.Mesh(placeholderGeometry, placeholderMaterial);
    placeholderMesh.name = 'Placeholder';

    // Add text to the placeholder to indicate that the asset is missing
    // Note: This requires a font to be loaded, which is not included in this example.
    // You would typically use a TextGeometry or a sprite-based text solution here.

    // Create a new scene and add the placeholder mesh to it
    const scene = new THREE.Scene();
    scene.add(placeholderMesh);

    // Return a GLTF-like object
    return {
      scene,
      scenes: [scene],
      cameras: [],
      animations: [],
      asset: { version: '2.0' },
      parser: {} as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      userData: { error, isPlaceholder: true },
    };
  }
}
