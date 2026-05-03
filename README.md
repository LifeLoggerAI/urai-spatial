 # URAI-Spatial Engine
zzZz
## 1. System Overview

URAI-Spatial is a real-time 3D engine for visualizing user memories as a navigable galaxy. It's the core of the URAI platform's spatial interface, translating abstract data into an interactive, explorable starfield.

### Core Design Principles

- **Deterministic Rendering:** The galaxy is generated procedurally from user data, ensuring that the same data always produces the same visual output.
- **Memory-as-Stars Model:** Each star in the galaxy represents a single memory, with its properties (color, size, position) determined by the memory's metadata.


- **Cinematic Navigation:** The camera system is designed to be fluid and intuitive, allowing for seamless transitions between different views and levels of detail.
- **Passive Intelligence:** The engine passively analyzes user data to reveal patterns and insights, which are then visualized in the galaxy.

## 2. Tier Architecture

The engine is built in tiers, from the core rendering engine to the high-level narrative and visualization layers.

### Tier 1 – Core Spatial Engine

- **Environment:** React / Next.js / React Three Fiber
- **Scene Bootstrap:** Initializes the 3D scene, camera, and renderer.
- **Rendering Pipeline:** Manages the render loop, post-processing, and frame updates.
- **Deterministic Star Generation:** Creates the starfield from a deterministic seed, ensuring that the galaxy is the same every time.
- **Camera System:** Controls the user's viewpoint and transitions between camera modes.
- **State Management:** Uses Zustand for global state management, including camera mode, selected star, and UI state.
- **Performance Constraints:** The engine is designed to run at 60fps on a wide range of hardware, with performance optimizations in place to ensure a smooth experience.

### Tier 2 – Galaxy Simulation Layer

- **Star Distribution:** Stars are distributed using a combination of spiral and elliptical galaxy models.
- **Spiral Arm Density Fields:** A density field is used to create the spiral arms of the galaxy.
- **Bulge / Disk / Halo Generation:** The galaxy is composed of a central bulge, a disk, and a halo, each with its own star distribution properties.
- **Star Classification:** Stars are classified by their temperature and luminosity, which determines their color and size.
- **Color Temperature Mapping:** A color temperature map is used to convert a star's temperature to its RGB color.
- **Star Sprite and Diffraction Shaders:** Custom shaders are used to render the stars as sprites with diffraction spikes.
- **GPU Instancing:** Stars are rendered using GPU instancing to minimize draw calls and maximize performance.

### Tier 3 – Environmental Layers

- **Nebula Systems:** Volumetric nebulas are used to create a sense of depth and atmosphere.
- **Volumetric Fog:** A volumetric fog shader is used to create a sense of distance and scale.
- **Parallax Star Layers:** Multiple layers of parallax stars are used to create a sense of depth and movement.
- **Deep Background Galaxies:** Distant galaxies are rendered as a backdrop to the main galaxy.
- **Dust Turbulence Fields:** A turbulence field is used to create the appearance of dust lanes and other galactic features.
- **Hyperspace Streaks:** A streak effect is used to simulate faster-than-light travel between stars.
- **Lighting Cones and Corona Effects:** Custom shaders are used to create lighting cones and corona effects around bright stars.

### Tier 4 – Interaction Layer

- **Star Selection System:** Allows the user to select stars by clicking on them.
- **Spatial Picking:** A raycasting system is used to determine which star the user has clicked on.
- **Hover / Highlight Logic:** Stars are highlighted when the user hovers over them.
- **Star Metadata Linking:** Each star is linked to a memory, which is displayed when the star is selected.
- **Memory Sphere Activation:** When a star is selected, a memory sphere is created, which displays the memory's content.

### Tier 5 – Memory Visualization Layer

- **Memory Sphere Rendering:** The memory sphere is a 3D object that displays the memory's content.
- **Bloom and Glow Effects:** Bloom and glow effects are used to give the memory sphere a dreamlike appearance.
- **Event Star Types:** Different types of stars are used to represent different types of memories.
- **Narrative States:** The memory sphere can be in different narrative states, such as a summary state or a detailed state.
- **Temporal Clustering:** Memories are clustered together based on their date, creating a timeline of the user's life.

### Tier 6 – Navigation / Camera Modes

- **Home View:** The default view, showing the entire galaxy.
- **Sky View:** A view of the galaxy from the user's current location.
- **LifeMap View:** A 2D view of the galaxy, showing the user's life as a timeline.
- **Star Zoom:** A close-up view of a single star.
- **Memory Sphere Dive:** A view from inside the memory sphere.
- **Replay Mode:** A mode that allows the user to replay a memory.
- **Deterministic Camera Transitions:** The camera transitions between different modes are deterministic, ensuring that the same transition is always used.

### Tier 7 – Narrative Engine Integration

- **Connection to URAI Narrator:** The engine is connected to the URAI narrator, which provides a voiceover for the user's memories.
- **Memory Tagging:** Memories are tagged with keywords, which are used to generate the narrator's script.
- **Emotional Color Mapping:** The color of each star is determined by the emotional content of the memory it represents.
- **Symbolic Overlays:** Symbolic overlays are used to represent the user's emotional state and other abstract concepts.
- **Life-Timeline Playback:** The engine can play back the user's life as a timeline, with the narrator providing a voiceover.

## 3. Rendering Pipeline

1.  **Scene Initialization:** The scene is created, and the camera is positioned.
2.  **Star Geometry Generation:** The starfield is generated, and the stars are positioned.
3.  **Shader Materials:** Custom shaders are created for the stars, nebulas, and other effects.
4.  **Sprite Textures:** Sprite textures are loaded for the stars and other particles.
5.  **Post-Processing:** Bloom, glow, and other post-processing effects are applied.
6.  **Frame Updates:** The scene is rendered and updated on each frame.

## 4. Performance Architecture

- **GPU Instancing:** Stars are rendered using GPU instancing to minimize draw calls.
- **Buffer Geometry Usage:** Buffer geometry is used to store the star data, which is then sent to the GPU for rendering.
- **Particle Sprite Optimization:** Star sprites are optimized to reduce their size and improve performance.
- **Culling Strategies:** Frustum culling is used to avoid rendering stars that are not visible to the camera.
- **LOD Approaches:** Level of detail (LOD) is used to render stars at different levels of detail depending on their distance from the camera.
- **Memory Constraints:** The engine is designed to run within a 1GB memory budget.

## 5. Data Model

### Memory-as-Stars Model
The "Memory-as-Stars Model" is a core concept in the URAI-Spatial engine. Each star in the galaxy represents a single memory, with its properties determined by the memory's metadata. This creates a personal and visually rich representation of a user's life.

The following properties of a star are derived from the memory it represents:

*   **`id`**: A unique identifier for the star, derived from the memory's own unique ID. This allows for a stable and consistent mapping between memories and stars.
*   **`position`**: The star's position in 3D space is determined by a deterministic algorithm based on the memory's creation date and other metadata. This places the memory within the larger context of the user's life, with related memories appearing closer to each other.
*   **`size`**: The size of the star can represent the significance or richness of the memory. Larger stars may indicate more detailed or important memories.
*   **`color`**: The color of the star is determined by the emotional content of the memory. A color mapping system translates emotions into specific hues, providing a quick visual reference to the feeling of a memory.
*   **`featured`**: A boolean that indicates whether a star is "featured". This can be used to highlight significant memories, such as milestones or important life events.
*   **`selected`**: When a user selects a star, its appearance changes to indicate that it is the current focus. This is a transient state, not an intrinsic property of the star itself.

This model allows for a deeply personal and meaningful representation of a user's memories, turning an abstract collection of data into a beautiful and explorable galaxy.

- **Star Objects:** Each star is represented by a star object, which contains its position, color, size, and other properties.
- **Memory Events:** Each memory is represented by a memory event, which contains its date, title, content, and other metadata.
- **Star Metadata:** Each star is linked to a memory event, which is displayed when the star is selected.
- **Emotional Color Attributes:** The color of each star is determined by the emotional content of the memory it represents.
- **Timeline Indexing:** Memories are indexed by their date, which allows them to be displayed as a timeline.

## 6. Directory / File Architecture

- **`engine/`:** The core of the spatial engine, containing the rendering pipeline, camera system, and other low-level systems.
- **`scene/`:** The 3D scene, including the starfield, nebulas, and other objects.
- **`shaders/`:** Custom shaders for the stars, nebulas, and other effects.
- **`effects/`:** Post-processing effects, such as bloom, glow, and volumetric fog.
- **`background/`:** The background of the scene, including the deep background galaxies and parallax stars.
- **`camera/`:** The camera system, including the camera rig and camera modes.
- **`memory/`:** The memory visualization system, including the memory sphere and memory content.
- **`state/`:** The global state management system.
- **`utils/`:** Utility functions, such as the color temperature map and the star distribution algorithms.
- **`data/`:** The data model, including the star objects and memory events.

## 7. Future Expansion Tiers

- **VR / XR Navigation:** The engine will be expanded to support VR and XR devices.
- **Planetary Memory Clusters:** Memories will be clustered together into planets, which can be explored.
- **Constellation Storytelling:** Constellations will be used to tell stories about the user's life.
- **AI-Driven Pattern Visualization:** AI will be used to identify patterns in the user's data, which will then be visualized in the galaxy.
- **Temporal Galaxy Evolution:** The galaxy will evolve over time, reflecting the user's personal growth and development.

## 8. End-to-End Flow

1.  **User opens URAI:** The application starts, and the user is presented with the home screen.
2.  **User sees the sky:** The user enters the sky view, and the galaxy is displayed.
3.  **User enters the LifeMap:** The user enters the LifeMap view, and their life is displayed as a timeline.
4.  **User selects a star:** The user clicks on a star, and the camera zooms in on it.
5.  **User enters a memory sphere:** The user enters the memory sphere, and the memory's content is displayed.
6.  **User exits back to the galaxy:** The user exits the memory sphere and returns to the galaxy view.
