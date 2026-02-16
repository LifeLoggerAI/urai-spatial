# URAI V2 - Full Technical Specification

**Version:** 2.0
**Date:** 2024-10-27

## 1. Overview & Core Principles

URAI has evolved from a local-first mobile app concept (V1) into a web-based, private environment for emotional reflection. The core goal is to provide users with a longitudinal, visual representation of their emotional journey through a novel "Archetype Evolution Engine."

*   **Core Principles (Unchanged):**
    *   **Privacy First:** User data is protected and private. The core experience is a personal, non-social one.
    *   **Ethical Design:** The system avoids manipulative patterns, gamification, and judgmental feedback.
    *   **Safety & Security:** All data is securely stored and managed with modern cloud infrastructure.

## 2. Architecture

The system is a modern web application built on the **PERN stack (PostgreSQL, Express, React, Node.js) with Firebase** for core backend services.

*   **Frontend:**
    *   **Framework:** React with TypeScript.
    *   **3D Visualization:** WebXR, likely using a library such as `react-three-fiber`.
    *   **Data Fetching:** `reactfire` for real-time data binding to Firestore.

*   **Backend (Firebase):**
    *   **Database:** Firestore for storing user data in a NoSQL document structure.
    *   **Serverless Functions:** Cloud Functions for Firebase (written in TypeScript) for all backend processing and scheduled jobs.
    *   **Authentication:** Firebase Authentication for secure user management.

## 3. Data Model (Firestore)

The database is structured per-user, ensuring strong data isolation.

**User Collection:** `/users/{uid}`

*   **Memory Nodes:** `/users/{uid}/memoryNodes/{nodeId}`
    ```json
    {
      "timestamp": "<Firestore.Timestamp>",
      "emotionVector": {"valence": 0.8, "arousal": 0.6, "agency": 0.7},
      "significanceScore": 0.9,
      "spiralPosition": {"x": 10, "y": 25, "z": -15}
    }
    ```

*   **Daily Averages:** `/users/{uid}/dailyAverages/{averageId}`
    ```json
    {
      "timestamp": "<Firestore.Timestamp>",
      "vector": {"valence": 0.7, "arousal": 0.5, "agency": 0.6}
    }
    ```

*   **Narrative Arcs:** `/users/{uid}/narrativeArcs/{arcId}`
    ```json
    {
        "arc": "Awakening -> Explorer",
        "from": "Awakening",
        "to": "Explorer",
        "startDate": "<Firestore.Timestamp>",
        "endDate": "<Firestore.Timestamp>"
    }
    ```

*   **User State:** `/users/{uid}/state/current`
    ```json
    {
        "seasonalArchetype": "Explorer",
        "selfArchetype": "Creator",
        "lastUpdated": "<Firestore.Timestamp>"
    }
    ```

## 4. Backend Logic (Cloud Functions)

All backend logic resides in Cloud Functions, providing a scalable, serverless architecture.

*   `enrichMemoryNode()`: Triggered on the creation of a new `memoryNode`. It calculates the node's position on the user's personal URAI spiral.
*   `dailyArchetypeCalculation()`: A scheduled function (runs every 24 hours). It calculates the user's `dailyAverage` emotion vector, determines their `SeasonalArchetype`, and detects `NarrativeArc` transitions.
*   `monthlySelfArchetypeCalculation()`: A scheduled function (runs monthly). It analyzes the long-term history of a user's archetypes to determine their stable `SelfArchetype`.

## 5. Frontend & Visualization

The frontend is responsible for rendering the user's emotional "lifemap" as an interactive 3D scene.

*   `useLifeMapData()` Hook: This is the central piece of the frontend data layer. It uses `reactfire` to subscribe to the user's `memoryNodes`, `narrativeArcs`, and `state` collections in real-time.
*   **Archetype Mapping:** The hook maps the user's current `seasonalArchetype` to a specific visual representation (`StarType`), which determines the appearance of the `memoryNodes` in the 3D scene.
*   **WebXR:** The application leverages WebXR to create an immersive, navigable 3D space where the user can explore their lifemap.

## 6. Secure Research Enclave

As outlined in the `RESEARCH_ENCLAVE_BRIEF.md`, a separate, secure system is planned for academic research.

*   **Ethical Firewall:** This system is architecturally separate from the core URAI application. It is a one-way data ingestion pipeline.
*   **Consent & Anonymization:** Users must provide explicit, informed consent via the `ConsentScreen.tsx` component. All data is fully anonymized before being sent to the research enclave.
*   **IRB Protocol:** All research will be governed by the principles outlined in the `IRB_PROTOCOL_DRAFT.md`.

This specification provides a complete overview of the URAI V2 system, a significant evolution from the original V1 concept. It is a robust, scalable, and ethically-grounded platform for personal emotional insight.
