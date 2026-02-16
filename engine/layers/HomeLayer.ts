
import * as THREE from 'three';
import { Layer } from './LifeMapLayer'; // Reuse the interface

export class HomeLayer implements Layer {
  private group = new THREE.Group();
  private orb: THREE.Mesh;
  private morphProgress = 0;

  constructor(scene: THREE.Scene) {
    scene.add(this.group);

    const geometry = new THREE.SphereGeometry(1, 64, 64);
    // A simple material for the central orb
    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xaaaaaa,
      emissiveIntensity: 0.5,
      metalness: 0.1,
      roughness: 0.8,
    });

    this.orb = new THREE.Mesh(geometry, material);
    this.group.add(this.orb);
  }

  update(delta: number): void {
    // Simple pulsing animation in the HOME state
    const scale = 1 + Math.sin(Date.now() * 0.002) * 0.03;
    this.orb.scale.setScalar(scale);
    this.orb.rotation.y += delta * 0.1;
  }

  // This function drives the transition from HOME to LIFEMAP
  updateMorph(delta: number): boolean {
    this.morphProgress += delta * 1.5; // Speed up the morph
    const p = Math.min(this.morphProgress, 1.0);

    // Use an easing function for a smoother feel
    const easeOutQuint = (x: number): number => 1 - Math.pow(1 - x, 5);
    const easedProgress = easeOutQuint(p);

    // The orb shrinks and fades out
    const scale = THREE.MathUtils.lerp(1, 0.01, easedProgress);
    this.orb.scale.setScalar(scale);
    
    const material = this.orb.material as THREE.MeshStandardMaterial;
    material.emissiveIntensity = THREE.MathUtils.lerp(0.5, 0.0, easedProgress);
    material.opacity = THREE.MathUtils.lerp(1.0, 0.0, easedProgress);
    material.transparent = true;

    // Return true when the animation is complete
    return p >= 1.0;
  }

  setVisible(visible: boolean): void {
    this.group.visible = visible;
  }
}
