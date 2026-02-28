import * as THREE from "three";

export function createOrbMaterial() {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color("#5b6ea6"),
    roughness: 0.4,
    metalness: 0.2,
    emissive: new THREE.Color("#2f3d66"),
    emissiveIntensity: 0.6,
  });
}
