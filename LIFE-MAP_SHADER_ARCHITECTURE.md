# 🎨 SHADER ARCHITECTURE

**Principle:** Performance and subtlety are paramount. We will use custom `ShaderMaterial` in THREE.js to achieve the desired effects efficiently. No heavy, generic materials.

---

### 🌌 Starfield Shader Layers

We will use three distinct `THREE.Points` objects, each with its own `BufferGeometry` and custom shader, to create a multi-layered parallax effect.

*   **Blending:** All star layers will use `THREE.AdditiveBlending`.
*   **Depth:** Depth write will be disabled (`depthWrite: false`) to prevent sorting issues.

#### Layer 1: Far Stars (GPU Points)

*   **Purpose:** Background atmosphere.
*   **Size:** Smallest point size.
*   **Brightness:** Low, uniform brightness.
*   **Color:** Slight, uniform color temperature variance (e.g., from `0.9, 0.9, 1.0` to `1.0, 1.0, 0.9`).
*   **Effects:** No bloom pass.

#### Layer 2: Mid Stars (Emotion-Sensitive)

*   **Purpose:** The bulk of the memories, showing emotional temperature.
*   **Effects:** A controlled glow via shader logic.
*   **Uniforms:** Takes an `emotionalScore` attribute to influence its color (warm/cool).

#### Layer 3: Near Stars (Interactive)

*   **Purpose:** Key memories, interactive elements.
*   **Visuals:** Larger point sprites.
*   **Effects:** Enabled for the main `UnrealBloomPass` in the post-processing stack.
*   **Interaction:** A raycaster will target this layer for hover detection.

### 🌑 Orb Shader (Custom Fragment + Vertex)

The central orb will be a `SphereGeometry` with a custom `ShaderMaterial`.

#### Vertex Shader

*   **Functionality:** Handles the subtle breathing pulse and noise displacement.
*   **Offsets:** Applies a sinusoidal offset to vertices based on a `time` uniform to create the breathing effect.
*   **Noise:** Uses a noise function (`classic perlin`, `simplex`, etc.) to apply a very slight, organic displacement to the sphere's surface.

#### Fragment Shader

*   **Functionality:** Creates the orb's visual appearance.
*   **Gradient:** A soft radial gradient for the inner glow (e.g., from a deep blue to black).
*   **Fresnel:** A fresnel effect to create a subtle edge glow, giving it a sense of volume.
*   **Aura:** A soft outer ring for the aura, with opacity controlled by a `pulseStrength` uniform.

#### Key Uniforms

*   `uniform float time;`: For all time-based animations (breathing, pulsing).
*   `uniform vec3 baseColor;`: The core color of the orb.
*   `uniform float emotionalIntensity;`: Influences the aura color and pulse behavior.
*   `uniform float pulseStrength;`: Controls the visibility and intensity of the breathing/pulsing aura.

### ✨ Post-Processing Stack

A minimal, controlled post-processing stack is essential for the cinematic feel.

1.  **`UnrealBloomPass`:** Applied selectively. Only the near stars and the orb's core will have a bloom effect. Thresholds will be high to keep it subtle.
2.  **`Vignette`:** A very subtle, dark vignette to draw focus to the center.
3.  **`FilmPass` or Noise:** A very low-intensity, grayscale noise/grain pass to add texture and an organic, cinematic feel.
4.  **Gamma Correction:** Ensure `GammaCorrectionShader` is the final pass for correct color output.
