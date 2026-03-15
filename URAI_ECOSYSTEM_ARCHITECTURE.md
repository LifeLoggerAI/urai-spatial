
# URAI Ecosystem Architecture

This document outlines the architecture of the URAI platform, detailing its various layers and their responsibilities.

## 1. User-Facing Applications

These are the primary interfaces through which users interact with the URAI ecosystem.

- **`spatial-web`**: The core web application providing the "digital life-map." It allows users to create, view, and interact with their memories in a spatial environment.
- **`urai-tier1`**: A planned future application, likely offering a more advanced or specialized set of features.
- **`spatial-xr`**: A planned application for immersive virtual and augmented reality experiences.

## 2. Spatial Life-Map Engine

This layer is responsible for rendering the spatial environment and its contents.

- **`engine`**: A dedicated rendering engine that visualizes memories as stars in a galaxy, handles user navigation, and manages the overall spatial experience.

## 3. Analytics and Intelligence Layer

This layer provides AI-powered insights and data processing.

- **`apps/functions`**: A collection of serverless functions responsible for:
    - **`processNewMemory`**: Enriching new memories with AI-generated data (emotions, transcriptions) and creating corresponding stars.
    - **`generateInsights`**: (Stubbed) Analyzing user data to generate insights and patterns.
    - **`aggregateTimeline`**: (Stubbed) Aggregating memories into a timeline view.
    - **`scoreRelationshipSignals`**: (Stubbed) Analyzing user interactions to score relationship strengths.

## 4. Shared Infrastructure Services

This layer provides the foundational backend services for the entire URAI ecosystem.

- **Firebase**:
    - **Authentication**: Manages user identity and access control.
    - **Firestore**: The primary NoSQL database for storing all user data, including memories, stars, and application state.
    - **Cloud Functions**: Hosts the serverless backend logic.
    - **Hosting**: Serves the `spatial-web` application.
    - **Storage**: Stores user-uploaded media files (images, audio).
