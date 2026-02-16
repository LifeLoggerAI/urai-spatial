# URAI-SPATIAL

**URAI's Spatial Engine — the AR / VR / XR runtime, world model, and asset pipeline that turns memories, timelines, and insights into places you can step into.**

If URAI becomes a world, this is the world layer.

## Mission

To render human life as navigable space — rooms, portals, stars, and environments — across AR, VR, XR, and WebXR, with cinematic quality, privacy-first design, and deterministic asset pipelines.

## Core Features

*   **Spatial Runtime:** Manages the scene graph, world state, and interactions within the spatial environment.
*   **AR/VR/XR Systems:** Provides abstractions for AR (anchors, environment understanding), VR/XR (session lifecycle, input), and various device types.
*   **Asset & World Build Pipeline:** A deterministic pipeline for importing, optimizing, and publishing 3D assets (GLB, USDZ).
*   **Spatial Data Layer (Firebase):** Manages worlds, scenes, entities, and other spatial data in Firestore.
*   **Spatial Safety & Consent:** Prioritizes user privacy with features like redaction, private-space modes, and local-first data whenever possible.

## Project Structure

The project is organized into the following main directories:

*   `apps/`: Contains the main applications, including `spatial-web` (the WebXR client) and `spatial-admin` (an internal tool for managing scenes and assets).
*   `packages/`: Houses shared libraries for core functionality, XR abstractions, data formats, and visual effects.
*   `functions/`: Includes serverless functions for tasks like asset builds and scene publishing.
*   `infra/`: Defines the backend infrastructure, including Firestore rules and indexes.

## Getting Started

To get started with the project, please review the following:

1.  `URAI-SPATIAL-PROJECT-CHARTER.md`: The high-level vision, mission, and boundaries of the project.
2.  `V1_TECHNICAL_SPECIFICATION.md`: The detailed technical blueprint for the V1 build.
