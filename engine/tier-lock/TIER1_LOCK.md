URAI Spatial Tier-1 Lock

Interaction loop guaranteed:

Sky → Starfield → Star Selection → Camera Glide → Memory Sphere → ESC Return

Locked behaviors:

1. Deterministic star generation
2. InstancedMesh star rendering
3. Star click selection
4. Camera glide to selected star
5. Memory sphere spawn
6. Memory image rendering
7. ESC reset to map
8. No runtime render loops
9. No duplicate scene components

Restrictions after lock:

• No camera architecture changes
• No scene graph changes
• No star generation changes
• No state store structure changes

Any new work must be implemented outside these components.
