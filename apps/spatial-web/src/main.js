
import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Manages loading and caching of 3D model assets.
class AssetManager {
  constructor() {
    this.loader = new GLTFLoader();
    // Keep a cache of loaded models to avoid re-fetching
    this.cache = new Map();
    // Material for fallback placeholders
    this.placeholderMaterial = new THREE.MeshStandardMaterial({
      color: 0xff00ff, // Magenta
      wireframe: true,
    });
  }

  // Asynchronously loads a GLB model from a given asset ID.
  async loadModel(assetId) {
    // Return the cached model if available
    if (this.cache.has(assetId)) {
      const cachedObject = this.cache.get(assetId);
      // If it's a model, clone it. If it's a promise, await it.
      if (cachedObject.isObject3D) {
          return cachedObject.clone();
      }
      return await cachedObject;
    }

    // The URL where the dev server will find the assets.
    // This maps asset IDs to a path in the public folder.
    const modelUrl = `/assets/builds/${assetId}/scene.glb`;
    console.log(`Attempting to load model from: ${modelUrl}`);

    // Create a promise to handle the asynchronous loading
    const loadPromise = new Promise((resolve, reject) => {
      this.loader.load(
        modelUrl,
        (gltf) => {
          // --- On Success ---
          const model = gltf.scene;
          model.name = assetId;

          console.log(`Successfully loaded model for asset: ${assetId}`);

          // Store the loaded model in the cache
          this.cache.set(assetId, model);
          resolve(model.clone());
        },
        undefined, // onProgress callback (unused)
        (error) => {
          // --- On Error ---
          console.warn(`Failed to load model for ${assetId}. Creating placeholder.`, error);

          // Create a placeholder cube to represent the missing asset
          const placeholder = this.createPlaceholder(assetId);

          // Store the placeholder in the cache so we don't try to load it again
          this.cache.set(assetId, placeholder);
          resolve(placeholder.clone());
        }
      );
    });

    // Store the promise in the cache to handle concurrent requests for the same asset
    this.cache.set(assetId, loadPromise);
    return await loadPromise;
  }

  // Creates a standard placeholder mesh.
  createPlaceholder(assetId) {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const placeholder = new THREE.Mesh(geometry, this.placeholderMaterial);
    placeholder.name = `placeholder-${assetId}`;
    return placeholder;
  }
}


// Manages scene loading, setup, and entity instantiation.
class SceneManager {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.assetManager = new AssetManager();
    this.currentSceneSpec = null;
  }

  async loadScene(sceneId) {
    try {
      const response = await fetch(`/scenes/${sceneId}.json`);
      if (!response.ok) {
        throw new Error(`Failed to load scene: ${response.statusText}`);
      }
      const sceneSpec = await response.json();
      this.currentSceneSpec = sceneSpec;
      console.log('Successfully loaded scene:', sceneSpec.name);
      await this.setupScene();
    } catch (error) {
      console.error('Error loading scene:', error);
    }
  }

  async setupScene() {
    if (!this.currentSceneSpec) return;

    this.setupEnvironment();
    this.setupCamera();

    // Instantiate all entities defined in the scene
    // Using Promise.all to load entities concurrently
    const entityPromises = this.currentSceneSpec.entities.map(entitySpec =>
      this.instantiateEntity(entitySpec)
    );
    await Promise.all(entityPromises);


    console.log('Scene setup complete.');
  }

  setupEnvironment() {
    const env = this.currentSceneSpec.environment;
    if (env && env.fog) {
      if (env.fog.type === 'exp2') {
        this.scene.fog = new THREE.FogExp2(0x000000, env.fog.density);
      }
    }
  }

  setupCamera() {
    const entrypoint = this.currentSceneSpec.entrypoint;
    const cameraRigEntity = this.currentSceneSpec.entities.find(e => e.id === entrypoint.entityId);

    if (cameraRigEntity && cameraRigEntity.transform) {
      const { position, rotation } = cameraRigEntity.transform;
      if (position) {
        this.camera.position.set(position.x, position.y, position.z);
      }
      if (rotation) {
        this.camera.rotation.set(rotation.x, rotation.y, rotation.z, 'YXZ');
      }
    }
  }

  async instantiateEntity(entitySpec) {
    const entityGroup = new THREE.Group();
    entityGroup.name = entitySpec.id;

    // Apply transform
    const { position, rotation, scale } = entitySpec.transform;
    if (position) entityGroup.position.set(position.x, position.y, position.z);
    if (rotation) entityGroup.rotation.set(rotation.x, rotation.y, rotation.z, 'YXZ');
    if (scale) entityGroup.scale.set(scale.x, scale.y, scale.z);

    // Process components
    if (entitySpec.components) {
        for (const component of entitySpec.components) {
            if (component.kind === 'ModelRenderer') {
                const model = await this.assetManager.loadModel(component.data.assetId);
                entityGroup.add(model);
            }
            // Other component kinds (Light, Portal, etc.) can be handled here
        }
    }


    this.scene.add(entityGroup);
  }
}

// --- Basic Three.js Setup ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
const renderer = new THREE.WebGLRenderer({ antialias: true });

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.xr.enabled = true;
// Use a more neutral background color
renderer.setClearColor(0x101010);

document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

const sceneManager = new SceneManager(scene, camera);

// --- Lighting ---
// More sophisticated lighting setup for better PBR material appearance
const ambientLight = new THREE.AmbientLight(0x606060, 1.5);
scene.add(ambientLight);

const hemisphereLight = new THREE.HemisphereLight(0x808080, 0x202020, 1.5);
scene.add(hemisphereLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 2.0);
directionalLight.position.set(2, 8, 5);
scene.add(directionalLight);


// --- Animation Loop ---
function animate() {
  renderer.setAnimationLoop(() => {
    renderer.render(scene, camera);
  });
}

// --- Event Listeners ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Main Execution ---
async function main() {
  await sceneManager.loadScene('scene_starworld_v1');
  animate();
}

main();
