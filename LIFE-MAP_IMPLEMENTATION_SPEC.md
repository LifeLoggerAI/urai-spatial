# 🛠️ REACT THREE FIBER IMPLEMENTATION SPEC

**Principle:** Clean separation of concerns. The rendering components should be as stateless as possible, driven by data flowing from a single, optimized source.

---

### 📁 Component Structure

```
/src
|-- /components
|   |-- /lifemap
|   |   |-- LifeMapCanvas.tsx       # Main R3F Canvas wrapper
|   |   |-- Scene.tsx               # Primary scene, contains all elements
|   |   |-- Starfield.tsx           # Renders all star layers
|   |   |-- LifeOrb.tsx             # Renders the central orb
|   |   |-- Constellations.tsx      # Renders lines between related stars
|   |   |-- BloomEffects.tsx        # Manages the post-processing stack
|
|-- /hooks
|   |-- useLifeMapData.ts         # Fetches, enriches, and provides star data
|
|-- /glsl
    |-- starfield.glsl            # Vertex and Fragment shaders for stars
    |-- orb.glsl                  # Vertex and Fragment shaders for the orb
```

### 🧠 Data Flow & State Management

1.  **Data Source:** A `useLifeMapData` hook is the single source of truth for all star data.
2.  **Fetching:** Inside the hook, `react-query` or a similar library fetches the raw memory nodes from Firestore.
3.  **Enrichment:** The hook processes the raw data, calculating positions, colors, sizes, and other visual attributes based on the Star Classification Model.
4.  **Memoization:** The processed arrays (`positions`, `colors`, `sizes`, etc.) are heavily memoized (`useMemo`) to prevent unnecessary recalculations.
5.  **Provision:** The hook provides the data to the `Starfield` component.
6.  **Rendering:** The `Starfield` component is a pure rendering component. It takes the data arrays and passes them into a `bufferGeometry`.
7.  **Animation:** All animations (breathing, twinkling, drifting) are handled in the shaders via `uniforms` updated in a `useFrame` loop. **No component state will trigger re-renders for animation.**

### ⭐ `Starfield.tsx` Implementation Sketch

```tsx
import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useLifeMapData } from '@/hooks/useLifeMapData';
import starfieldShaders from '@/glsl/starfield.glsl';

export function Starfield() {
  const materialRef = useRef<THREE.ShaderMaterial>(null!)
  const { positions, colors, sizes } = useLifeMapData();

  // Pass data to buffer attributes
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    g.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
    return g;
  }, [positions, colors, sizes]);

  useFrame(({ clock }) => {
    materialRef.current.uniforms.time.value = clock.elapsedTime;
  });

  return (
    <points geometry={geometry}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={starfieldShaders.vertex}
        fragmentShader={starfieldShaders.fragment}
        uniforms={{ time: { value: 0 } }}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
```

### 🚀 Performance Strategy

*   **Instancing:** For star counts > 10,000, we will switch from `THREE.Points` to `<instancedMesh>` to render stars as tiny meshes. This is more performant at very high counts.
*   **LOD (Level of Detail):** The `useLifeMapData` hook will contain logic to reduce the number of stars returned based on camera zoom level, preventing the GPU from being overloaded when zoomed out.
*   **Shader Simplicity:** Shaders will be kept as simple as possible, offloading complex calculations to the data enrichment step where possible.
