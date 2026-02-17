# URAI-SPATIAL

**The 3D / XR rendering engine for the Life Operating System.**

URAI-Spatial is not just a starfield demo. It is a real-time, data-driven, cinematic spatial engine designed to visualize and interact with the memories and experiences of a life, represented as a galaxy of `lifeNodes`.

## 🔥 Core Features

*   **Data-Driven Galaxy:** The starfield is not random. Each star is a `lifeNode` pulled from Firestore, with its position, color, and mass determined by the memory's data (timestamp, emotion, importance).
*   **Cinematic Home Scene:** A beautiful, immersive home environment with a glowing orb, avatar, and atmospheric lighting, serving as the entry point to the LifeMap.
*   **Scene Switching Architecture:** A robust engine with clean separation between scenes (Home, LifeMap, Chat, Ground), managed by a state machine for deterministic transitions.
*   **WebGPU Compute-Powered N-Body Simulation:** A high-performance physics engine running on the GPU simulates the gravitational interactions of thousands of stars, creating a dynamic and living galaxy.
*   **Production-Grade Rendering Pipeline:** A tiered rendering architecture with a WebGL fallback for broad accessibility and a high-fidelity WebGPU mode for next-generation visuals.
*   **Cinematic Post-Processing:** A full stack of post-processing effects including bloom, depth of field, vignette, and chromatic aberration for a film-quality look.
*   **XR Ready:** The architecture is designed to be extended to a full WebXR experience with hand tracking and immersive interaction.

## 🚀 Roadmap

The development of URAI-Spatial is planned in several phases:

1.  **Phase 1: Production Browser Cinematic Pipeline (COMPLETE)**
    *   Stable, 60fps WebGL-based engine.
    *   Cinematic Home Scene and LifeMap.
    *   Data-driven N-body simulation powered by WebGPU with WebGL fallback.
2.  **Phase 2: High-Tier WebGPU Features**
    *   Hybrid raster + ray-traced rendering.
    *   True volumetric clouds and plasma orb.
    *   Progressive GI.
3.  **Phase 3: Unreal XR Flagship**
    *   Porting the engine to Unreal Engine for a high-fidelity VR experience.
    *   Full implementation of Lumen for global illumination and Nanite for geometry.
    *   Advanced XR interaction with hand tracking and physics.

## 🛠️ Technical Stack

*   **Frontend:** Next.js, React
*   **3D/Graphics:** WebGPU, with WebGL fallback
*   **Backend:** Node.js, Firebase (Firestore)
*   **Core Engine:** Custom-built data-oriented ECS (Entity Component System)

## Project Structure

The project is structured as a professional game engine, with a clear separation of concerns:

```
/engine
  /core         # Core engine classes (EngineRoot, World, Systems)
  /renderer     # WebGPU and WebGL rendering pipelines
  /ecs          # Entity Component System core
  /components   # ECS component definitions
  /systems      # ECS systems (Physics, Rendering, etc.)
  /scenes       # Scene composition files
/app            # Next.js app router and pages
/server         # Backend services (Gateway, Shard Manager)
```

## Getting Started

1.  **Install dependencies:**
    ```bash
    pnpm install
    ```
2.  **Set up your environment variables:**
    Create a `.env.local` file and populate it with your Firebase project configuration.
3.  **Run the development server:**
    ```bash
    pnpm dev
    ```
