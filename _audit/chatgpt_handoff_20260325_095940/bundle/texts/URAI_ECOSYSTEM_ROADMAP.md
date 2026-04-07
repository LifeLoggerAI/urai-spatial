
# URAI Ecosystem Roadmap

This document reconstructs the intended product and technical roadmap for the URAI ecosystem, mapping projects to major development phases.

## URAI V1 — Core Platform Launch

**Focus:** Establish the foundational "digital life-map" experience.

- **`spatial-web`**: The primary user-facing web application for memory creation and spatial visualization. (PARTIAL)
- **`firebase` (Core Infrastructure)**: Authentication, Firestore for core data (users, memories, stars), Hosting, and Storage. (COMPLETE)
- **`apps/functions/processNewMemory`**: The initial backend function for processing and visualizing new memories. (COMPLETE)
- **End-to-End Flow**: Implement the core user journey from sign-up to creating a memory and seeing it in the spatial galaxy. (PARTIAL)

## URAI V2 — AI Analytics and Ecosystem Expansion

**Focus:** Enrich the user experience with AI-driven insights and expand data collection.

- **`apps/functions` (AI & Analytics)**: Implement the stubbed-out analytics functions:
    - `generateInsights`: To provide users with patterns and insights about their lives. (STUBBED)
    - `aggregateTimeline`: To create a chronological view of memories. (STUBBED)
    - `scoreRelationshipSignals`: To analyze and quantify the strength of relationships. (STUBBED)
- **Firestore Schema Expansion**: Fully implement and utilize the stubbed collections:
    - `emotionLogs`, `voiceEvents`, `behaviorSignals`, `locations`, `relationships`, `rituals`, `dreamLogs`. (STUBBED)
- **`insights` Collection**: Fully implement the data model and the AI logic to populate it. (PARTIAL)

## URAI V3 — Marketplace Systems and Intelligence Layers

**Focus:** Introduce systems for users to exchange value and services based on their data (with consent).

- **New Projects (Planned)**:
    - `urai-marketplace-api`: A new backend service for managing transactions and listings.
    - `urai-marketplace-web`: A new front-end application for the marketplace.
- **Privacy and Consent Layer**: A robust system for managing data permissions and sharing. (NOT STARTED)

## URAI V4 — Immersive Spatial Systems

**Focus:** Move beyond the 2D screen into fully immersive VR and AR experiences.

- **`spatial-xr`**: A new user-facing application for VR/AR devices. (PLANNED)
- **`engine` Enhancements**: Upgrade the rendering engine to support VR/XR interactions and navigation. (PLANNED)
- **Advanced Scenes**: Develop more complex and interactive memory scenes like the planned `scene_memoryroom_v1`. (PLANNED)

## URAI V5 — Advanced AI Narrative and Platform Intelligence

**Focus:** Evolve from simple insights to generating complex narratives and providing a deeply personalized AI companion.

- **Advanced AI Models**: Implement more sophisticated AI for:
    - **Constellation Storytelling**: Weaving memories together into narrative arcs. (PLANNED)
    - **Temporal Galaxy Evolution**: Simulating how a user's "galaxy" changes over time. (PLANNED)
- **`companionState`**: Fully implement the AI companion, making it a central part of the user experience. (STUBBED)
