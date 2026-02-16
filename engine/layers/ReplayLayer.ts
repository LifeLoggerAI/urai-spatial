
import * as THREE from 'three';
import { Layer } from './LifeMapLayer';

export class ReplayLayer implements Layer {
  private group = new THREE.Group();
  private exitProgress = 0;

  constructor(scene: THREE.Scene) {
    // A simple placeholder for the replay environment
    const geometry = new THREE.BoxGeometry(2, 2, 2);
    const material = new THREE.MeshNormalMaterial();
    const mesh = new THREE.Mesh(geometry, material);
    this.group.add(mesh);

    scene.add(this.group);
  }

  update(delta: number): void {
    // Logic for the active replay would go here
    this.group.rotation.x += delta * 0.2;
    this.group.rotation.y += delta * 0.2;
  }

  updateExit(delta: number): boolean {
    this.exitProgress += delta * 2.0;
    const p = Math.min(this.exitProgress, 1.0);
    
    // Fade out effect
    // In a real system, this would be a more complex shader-based transition.
    const scale = THREE.MathUtils.lerp(1, 0.1, p);
    this.group.scale.setScalar(scale);

    if (p >= 1.0) {
        this.exitProgress = 0; // Reset for next time
        return true;
    }
    return false;
  }

  setVisible(visible: boolean): void {
    this.group.visible = visible;
    if (visible) {
        // Reset state when becoming visible
        this.group.scale.setScalar(1);
        this.exitProgress = 0;
    }
  }
}
