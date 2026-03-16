
# URAI Firestore Schema Definitions

This document outlines the data structure for all Firestore collections.

---

### `users/{userId}`
- **Description:** Root document for a single user.
- **Fields:** None. Data is held in subcollections.

### `users/{userId}/memories/{memoryId}`
- **Description:** A single memory event.
- **Fields:**
    - `text` (string): The core text of the memory.
    - `timestamp` (timestamp): When the memory occurred.
    - `audioUrl` (string, optional): Link to a stored audio recording.
    - `emotion` (string): AI-tagged emotion (e.g., "joy", "sadness").
    - `emotionalWeight` (number): AI-tagged intensity (0.0 to 1.0).
    - `transcription` (string, optional): Transcription of the audio.

### `users/{userId}/stars/{starId}`
- **Description:** The visual representation of a memory in the galaxy.
- **Fields:**
    - `memoryId` (string): Foreign key to the `memories` collection.
    - `position` (array): `[x, y, z]` coordinates.
    - `color` (string): Hex color code based on emotion.
    - `size` (number): Size based on emotional weight.
    - `timestamp` (timestamp): Copied from the memory for temporal queries.

### `users/{userId}/relationships/{relationshipId}`
- **Description:** (Future) Represents a connection to another person.
- **Fields:**
    - `name` (string): Name of the person.
    - `signalScore` (number): AI-calculated strength of the relationship.

### `users/{userId}/insights/{insightId}`
- **Description:** (Future) An AI-generated insight about the user's data.
- **Fields:**
    - `text` (string): The content of the insight.
    - `relatedMemories` (array): List of `memoryId`s that contributed to this insight.
    - `type` (string): The category of insight (e.g., "mood_pattern", "behavior_correlation").
