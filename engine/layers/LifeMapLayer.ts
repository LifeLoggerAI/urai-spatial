
import * as THREE from 'three';
import { SceneMode } from '../modes';

// Simple Layer interface
export interface Layer {
  update(delta: number): void;
  setVisible(visible: boolean): void;
}

const STAR_COUNT = 10000; // The number of stars (memories) to instance

// --- SHADERS ---
// This is where the GPU magic happens.

const vertexShader = `
  // Uniforms are global variables passed from CPU to GPU
  uniform float u_time;
  uniform float u_reveal_progress; // 0 -> 1 for depth-based reveal
  uniform int u_hovered_instance_id; // The ID of the star currently hovered

  // Varyings pass data from the vertex shader to the fragment shader
  varying float v_alpha;
  varying float v_is_hovered;

  void main() {
    // A unique ID for each instance
    float instanceId = float(gl_InstanceID);

    // Get the position/scale/rotation matrix for this instance
    mat4 instanceMatrix = getInstanceMatrix();
    
    // Calculate the world position of the instance
    vec3 instancePosition = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;

    // --- 1. Depth-Based Reveal ---
    // Reveal stars based on their distance from the origin as animation progresses
    float reveal_cutoff = u_reveal_progress * 200.0; // Max radius of 200
    float dist = length(instancePosition);
    float reveal_alpha = smoothstep(reveal_cutoff - 20.0, reveal_cutoff, dist);

    // --- 2. Per-instance animation (twinkle) ---
    // Use instanceId to give each star a unique, deterministic twinkle
    float twinkle = 0.8 + 0.2 * sin(u_time * 2.0 + instanceId * 0.314);
    
    // --- 3. GPU-level hover detection ---
    // Compare this instance's ID to the hovered ID passed from the CPU
    v_is_hovered = (u_hovered_instance_id == gl_InstanceID) ? 1.0 : 0.0;

    // Final alpha combines reveal and twinkle
    v_alpha = reveal_alpha * twinkle;

    // --- Final Position Calculation ---
    vec4 modelPosition = instanceMatrix * vec4(position, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;

    gl_Position = projectedPosition;
  }
`;

const fragmentShader = `
  uniform vec3 u_color;
  uniform float u_master_opacity;

  varying float v_alpha;
  varying float v_is_hovered;

  void main() {
    // --- 4. Shader-based Halo ---
    // Create a soft, circular shape for the star instead of a hard square
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord);
    float halo = smoothstep(0.5, 0.0, dist);

    if (halo < 0.01) discard; // Discard pixels outside the circle

    // --- 5. GPU-level Hover Glow ---
    // If this fragment belongs to the hovered star, make it glow
    vec3 final_color = u_color;
    float final_opacity = halo * v_alpha * u_master_opacity;

    if (v_is_hovered > 0.5) {
      final_color = vec3(1.0, 1.0, 1.0); // Glow white
      final_opacity = halo; // Make it fully visible regardless of reveal
    }

    gl_FragColor = vec4(final_color, final_opacity);
  }
`;

export class LifeMapLayer implements Layer {
  private group = new THREE.Group();
  private stars: THREE.InstancedMesh;
  private shaderMaterial: THREE.ShaderMaterial;
  
  // Mocks for memory data. In a real system, this comes from the backend.
  private memoryData: { position: THREE.Vector3, id: string }[] = [];

  constructor(scene: THREE.Scene, private camera: THREE.Camera, private renderer: THREE.WebGLRenderer) {
    scene.add(this.group);
    
    // --- Data Generation (Mock) ---
    // In a real system, this data would be fetched and processed by the
    // "Deterministic Star Distribution Engine"
    for (let i = 0; i < STAR_COUNT; i++) {
      this.memoryData.push({
        id: `mem_${i}`,
        position: new THREE.Vector3(
          (Math.random() - 0.5) * 200,
          (Math.random() - 0.5) * 100,
          (Math.random() - 0.5) * 200
        )
      });
    }

    // --- Instancing Setup ---
    const geometry = new THREE.PlaneGeometry(0.5, 0.5); // Use a simple plane for each star
    
    this.shaderMaterial = new THREE.ShaderMaterial({
      uniforms: {
        u_time: { value: 0.0 },
        u_reveal_progress: { value: 0.0 },
        u_hovered_instance_id: { value: -1 },
        u_color: { value: new THREE.Color(0x87CEEB) },
        u_master_opacity: { value: 1.0 },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    
    this.stars = new THREE.InstancedMesh(geometry, this.shaderMaterial, STAR_COUNT);
    
    // --- Set Instance Positions ---
    // This is the core of instancing. We set the position for each instance once.
    const dummy = new THREE.Object3D();
    for (let i = 0; i < STAR_COUNT; i++) {
      dummy.position.copy(this.memoryData[i].position);
      dummy.updateMatrix();
      this.stars.setMatrixAt(i, dummy.matrix);
    }
    this.stars.instanceMatrix.needsUpdate = true;
    
    // The InstancedMesh is added to the group for visibility control
    this.group.add(this.stars);
  }

  update(delta: number): void {
    // Update shader uniforms for animations
    this.shaderMaterial.uniforms.u_time.value += delta;
  }
  
  // This would be called from the main SceneEngine update loop in LIFEMAP_IDLE
  handleInteractions(raycaster: THREE.Raycaster) {
      const intersects = raycaster.intersectObject(this.stars);

      if (intersects.length > 0) {
          const instanceId = intersects[0].instanceId;
          // We found a hovered star!
          // Pass its ID to the GPU so the shader can make it glow.
          this.shaderMaterial.uniforms.u_hovered_instance_id.value = instanceId;
      } else {
          // No intersection, reset the hover state.
          this.shaderMaterial.uniforms.u_hovered_instance_id.value = -1;
      }
  }

  // Animates the starfield reveal
  updateReveal(delta: number): boolean {
    const progress = this.shaderMaterial.uniforms.u_reveal_progress.value + delta * 0.5;
    this.shaderMaterial.uniforms.u_reveal_progress.value = Math.min(progress, 1.0);
    return progress >= 1.0;
  }

  setVisible(visible: boolean): void {
    this.group.visible = visible;
  }
  
  // Placeholder for when we enter a replay
  freezeBackground(frozen: boolean): void {
    this.shaderMaterial.uniforms.u_master_opacity.value = frozen ? 0.1 : 1.0;
  }

  prepareReplay(memoryId: string) {
    // Placeholder to find the star and prepare it for transition
    console.log("Preparing to enter replay for memory:", memoryId);
  }
  
  updateEnterReplay(delta: number): boolean {
    // Placeholder for transition animation
    return true; 
  }
}
