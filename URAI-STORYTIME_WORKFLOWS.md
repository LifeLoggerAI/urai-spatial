1.  **Selection (Private):** Inside their *private* URAI-Spatial interface, User A identifies a memory they wish to share. They select an option: "Share as a Story Archetype."
2.  **The Abstraction Chamber (System & Private):** The user is transported to a minimalist, private, silent space—the Abstraction Chamber. Here, the system generates a `SharedMemoryArchetype` from the memory, abstracting its core properties into `magnitude`, `valence`, and a set of neutral `keywords`.
3.  **Review & Consent (Ceremonial):** The abstracted `SharedMemoryArchetype` is presented to the user as a polished, smooth stone in their hand. The prompt is explicit and solemn: "You are about to place this stone in the story '[Story Title]'. Its shape, weight, and texture will be known, but its origin will remain yours alone. Do you consent?"
4.  **Token Generation:** Upon consent, the system generates a `ConsentToken` linking the `sourceMemoryHash` to the `storyId`.
5.  **Addition to Story:** The `SharedMemoryArchetype` appears in the shared story space for all collaborators to see. It has no direct link to the `ConsentToken` or the source hash.

---

## Workflow 3: Revoking Consent

**Goal:** To ensure user control is continuous, absolute, and private.

1.  **Initiation (Private):** From their private URAI interface, User A can view all the 'stones' they have placed in shared stories.
2.  **Revocation:** User A selects "Reclaim Stone" for a specific shared memory.
3.  **Token Update:** The corresponding `ConsentToken`'s status is changed to `REVOKED`.
4.  **Immediate & Silent Removal (System):** A system process, listening for `REVOKED` status changes, immediately and permanently deletes the corresponding `SharedMemoryArchetype` from any and all `Story` objects where it appears. The `sourceMemoryHash` in the token is then purged.
5.  **No Trace:** Collaborators are not notified of the removal. The archetype simply vanishes from the narrative, as if it was never there. This protects the revoking user's privacy and prevents social friction.

---

## Workflow 4: Saving a Story

**Goal:** To make story permanence a deliberate, unanimous decision.

1.  **Initiation:** At the end of a session, any collaborator can propose to save the story.
2.  **Unanimous Consent:** All other active collaborators receive a prompt: "User A wishes to make this story permanent. This requires the consent of all. Do you agree?"
3.  **State Change:** If, and only if, all participants agree, the `Story` object's `ephemeralState` is changed from `TRANSIENT` to `SAVED`.
4.  **Failure & Dissolution:** If any user declines or does not respond, the story remains `TRANSIENT` and dissolves at the end of the session. There is no record of who declined, and no penalty for doing so.