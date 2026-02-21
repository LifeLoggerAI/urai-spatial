# URAI Storytime: Consent-Driven Sharing Workflow

This document defines the strict, user-centric workflow for sharing an abstracted memory as part of a "Storytime" experience in URAI-Spatial. This workflow is designed to maximize user agency, privacy, and informed consent.

## Core Components

*   **`PrivateMemory`**: The original, raw user memory. This object is NEVER shared and remains exclusively in the user's private spatial environment.
*   **`SharedMemoryArchetype`**: A data object representing an abstracted memory. It contains only non-identifiable, thematic properties (`magnitude`, `valence`, `keywords`).
*   **`ConsentToken`**: A digital token representing a user's explicit, revocable consent to share a `SharedMemoryArchetype` in a specific story.

## The Workflow

### 1.0 Private Selection

1.  **Context:** The user is in their private, secure spatial environment.
2.  **Action:** The user gazes at and selects a `PrivateMemory` they wish to share.
3.  **System Response:** The system initiates the sharing workflow. The user is prompted: *"You have selected a memory to share. You will now enter the Abstraction Chamber to prepare it."*

### 2.0 The Abstraction Chamber

1.  **Environment:** The user is transitioned to a private, minimalist, and temporary environment. This space is designed to be free of distractions and focused solely on the act of abstraction and consent.
2.  **Abstraction:** The system processes the selected `PrivateMemory` and generates a `SharedMemoryArchetype`. This involves:
    *   Calculating its `magnitude` (e.g., duration, frequency).
    *   Determining its `valence` (e.g., positive, negative, neutral sentiment).
    *   Extracting a small set of anonymous `keywords`.
3.  **Presentation:** The `SharedMemoryArchetype` is presented to the user as a polished, data-formed stone. Its shape, color, and texture are derived from the archetype's properties.

### 3.0 Ceremonial Consent

1.  **Prompt:** The user is presented with a clear, solemn, and explicit consent prompt:

    > *"You are about to place this stone in the story '[Story Title]'. Its shape, weight, and texture will be known, but its origin will remain yours alone. Do you consent?"*

2.  **Action:** The user must perform an explicit, physical action to consent (e.g., placing the stone on a designated pedestal).

3.  **System Response:** Upon consent, the system generates a `ConsentToken` with the following properties:
    *   `status`: `ACTIVE`
    *   `archetypeID`: The ID of the `SharedMemoryArchetype`.
    *   `storyID`: The ID of the story it was shared in.
    *   `timestamp`: The time of consent.

### 4.0 Revocation

1.  **User Action:** At any time, the user can access a list of their `ConsentToken`s.
2.  **Action:** The user can select a token and choose to revoke it.
3.  **System Response:** The system immediately and irrevocably:
    *   Sets the `ConsentToken.status` to `REVOKED`.
    *   Permanently deletes the corresponding `SharedMemoryArchetype` from the shared story database.
    *   The action is final. The data cannot be recovered.
