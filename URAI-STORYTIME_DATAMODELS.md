# URAI-Storytime: Data Models

This document outlines the data structures for URAI-Storytime. These models are designed to enforce the principles of consent, anonymity, and ephemerality defined in `URAI-STORYTIME_PRINCIPLES.md`.

---

## 1. SharedMemoryArchetype

A `SharedMemoryArchetype` is the fundamental unit of a shared story. It is an abstracted, anonymized representation of a user's memory, created only after explicit consent.

-   **`archetypeId`**: A unique identifier for this specific shared instance.
-   **`sourceMemoryHash`**: A one-way hash of the original memory ID from the user's private URAI-Spatial instance. This allows a user to identify their own contributions without revealing the source to others.
-   **`archetype`** (Enum): A high-level, non-identifying category for the memory. Examples:
    -   `MOMENT_OF_DECISION`
    -   `UNEXPECTED_JOY`
    -   `A_QUIET_ENDING`
    -   `A_DIFFICULT_BEGINNING`
    -   `SHARED_LAUGHTER`
-   **`magnitude`** (Float, 0.0-1.0): An abstracted measure of the memory's intensity or significance, derived from properties like `resonance`.
-   **`valence`** (Enum: `POSITIVE` | `NEGATIVE` | `NEUTRAL` | `AMBIGUOUS`): A generalized emotional tone.
-   **`keywords`** (Array of Strings): A list of user-approved, non-identifying keywords (e.g., "journey," "family," "change").

**Crucially, this object contains NO personal data, timestamps, locations, or direct content from the original memory.**

---

## 2. Story

A `Story` is a collaborative narrative composed of `SharedMemoryArchetype` objects from one or more users.

-   **`storyId`**: Unique identifier for the shared story session.
-   **`title`** (String): A user-generated title for the story.
-   **`contributors`**: An array of anonymized user handles.
-   **`archetypes`**: An ordered array of `SharedMemoryArchetype` objects that form the narrative sequence.
-   **`narrative`** (Structured Text): The collaborative text or structure built around the archetypes.
-   **`ephemeralState`** (Enum: `TRANSIENT` | `SAVED`): Default is `TRANSIENT`. The story is deleted at the end of a session unless all participants agree to change the state to `SAVED`.

---

## 3. ConsentToken

A `ConsentToken` is a non-permanent, revocable record of a user's specific consent to share a memory.

-   **`tokenId`**: Unique ID for this consent action.
-   **`userId`**: The anonymized ID of the user granting consent.
-   **`sourceMemoryHash`**: The hash of the memory being shared.
-   **`storyId`**: The specific story for which the memory is being shared.
-   **`grantedAt`**: Timestamp of when consent was given.
-   **`status`** (Enum: `ACTIVE` | `REVOKED`): The current state of the consent. If `REVOKED`, the corresponding `SharedMemoryArchetype` is immediately and permanently removed from the `Story`.

This data model ensures that consent is not a one-time event, but a continuous, revocable state that the user controls completely.