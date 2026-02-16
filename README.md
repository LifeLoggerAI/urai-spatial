# URAI-SPATIAL

This repository contains the source code for URAI-SPATIAL, a WebXR-based spatial computing platform built on a deep commitment to user privacy, safety, and a unique narrative philosophy.

## Core Principles & Safety

The URAI Spatial Engine is designed as a space for personal reflection, not a social platform. Our design philosophy is guided by a strict set of safety principles:

*   **Explicit, User-Initiated Actions:** Entry into any experience, especially a memory replay, is always an explicit choice.
*   **Sacred Pacing:** The tempo of core experiences, like memory replays, is system-controlled to ensure a deliberate and contemplative pace. User controls for fast-forward or rewind are intentionally omitted.
*   **Locked Interaction Vocabulary:** User interactions are limited to a minimal, focused set of actions: "gaze," "select," and "exit."
*   **No Social or Gamification Mechanics:** The platform is free from social features (chat, avatars, presence indicators) and gamification (scores, achievements).

## Our Commitment to Your Privacy

Your privacy is the foundation of this project. Our unwavering promise to you is as follows:

*   **You Are Anonymous:** We generate a random ID for you. We can never trace data back to your real-world identity or account.
*   **Only Vectors, Not Words:** We only collect the mathematical `EmotionVector` data (e.g., `{valence: 0.8, arousal: 0.6, agency: 0.7}`).
*   **Your Memories are Yours:** We NEVER collect your text, tags, audio, or any other personal content. That stays private to you, always.
*   **You Are In Control:** You can join or leave the data program at any time, for any reason, without affecting your URAI experience.

## The Storytime Workflow

A core concept in URAI is the ability to share the *essence* of a memory without revealing its content. This is achieved through the "Storytime" workflow:

1.  **Selection:** A user selects a personal memory to share within their private interface.
2.  **Abstraction:** The system transports the user to a private "Abstraction Chamber" where the memory is transformed into a `SharedMemoryArchetype`, capturing its core properties (magnitude, valence) without personal details.
3.  **Consent:** The abstracted memory is presented to the user as a "stone." They are given a solemn and explicit choice to place this stone into a shared story, understanding that only its shape and texture will be known, while its origin remains theirs alone.

## Spatial Engine v0.3

The `spatial-xr` package contains the foundational implementation of the URAI Spatial Engine v0.3. This version includes:

*   **Firestore-driven spatial memory nodes:** The starfield is populated with data from a Firestore collection.
*   **Constellation trails:** Subtle lines connect memory nodes.
*   **Warp tunnel:** A fog and wireframe tunnel effect for transitions.
*   **Breathing orb:** A central orb with a subtle "breathing" animation.
*   **WebXR toggle:** A button to enter WebXR mode.
*   **Avatar embodiment:** A simple placeholder avatar for presence in XR.
*   **Click-to-Replay routing:** Clicking a memory node transitions to a replay scene.
*   **Emotional color shader:** Memory nodes are colored based on their `auraColor` property.
*   **Particle bloom on selection:** A particle bloom effect is triggered when a user selects a memory node.
*   **Deterministic camera spline path:** The camera follows a smooth, predefined spline path for cinematic movement.
*   **Replay Cinematic Camera:** The replay scene features its own choreographed camera movement.

## Getting Started

To get started with the project, please review the following:

1.  `URAI-SPATIAL-PROJECT-CHARTER.md`: The high-level vision, mission, and boundaries of the project.
2.  `V2_TECHNICAL_SPECIFICATION.md`: The detailed technical blueprint for the V2 build.
