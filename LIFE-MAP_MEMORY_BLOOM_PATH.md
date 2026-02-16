# 🚀 "ZOOM INTO MEMORY BLOOM" CINEMATIC PATH

**Principle:** This is the most important interactive sequence. It must feel seamless, emotional, and reverent. It is a transition from the cosmic to the personal.

---

### Step 1: Star Hover (The Invitation)

*   **Trigger:** `onPointerOver` event on a star in the "Near" layer.
*   **Visuals:**
    *   The hovered star subtly enlarges (`scale: 1.2`).
    *   Its glow intensifies, and the color becomes more saturated.
    *   All other stars in the scene dim by `~10%`.
*   **Animation:** A very short `ease-in-out` transition (`~200ms`).
*   **Goal:** To signal interactivity and draw focus without being jarring.

### Step 2: Click Trigger (The Commitment)

*   **Trigger:** `onClick` event on the hovered star.
*   **Camera Animation:**
    *   The camera smoothly animates from its current orbital position to the star's 3D position.
    *   **Easing:** `easeInOutCubic` for a gentle acceleration and deceleration.
    *   **Duration:** `1200ms`.
*   **Visuals:**
    *   As the camera moves, the clicked star begins to expand.
    *   Nearby stars fade out completely.
*   **Goal:** A feeling of being drawn into a specific memory.

### Step 3: Bloom Expansion (The Transition)

*   **Trigger:** As the camera approaches the star's position.
*   **Visuals:**
    *   The star sprite transitions into a large, glowing, semi-transparent sphere (the "Bloom").
    *   A soft halo expands outwards from the Bloom's center.
    *   The entire starfield blurs using a depth-of-field effect, focusing attention solely on the Bloom.
*   **Audio:** The ambient sound bed intensifies slightly, perhaps with a gentle, resonant tone.
*   **Goal:** To create a sacred, isolated space for the memory.

### Step 4: Memory Scene Load (The Reveal)

*   **Trigger:** Once the Bloom expansion animation is complete.
*   **Visuals:**
    *   A UI overlay fades in gracefully over the Bloom.
    *   **Content:**
        *   Timestamp (`Date, Year`).
        *   A short, poetic summary of the emotion (`"A moment of quiet joy."`).
        *   Companion narration is triggered.
    *   The background Bloom pulses softly.
*   **Optional Effects:**
    *   A subtle particle rain effect within the Bloom.
    *   A slight, slow color shift in the Bloom's aura.
*   **Goal:** The emotional payoff. A moment of pure reflection.

### Step 5: Exit (The Return)

*   **Trigger:** A click on a "Return" button or a click outside the main content area.
*   **Animation:** The entire sequence plays in reverse.
    *   The overlay fades out.
    *   The camera pulls back along the same cubic bezier path.
    *   The Bloom shrinks back into its star form.
    *   The starfield comes back into focus, and other stars fade back in.
*   **Goal:** A seamless, gentle return to the full Life-Map, integrating the memory back into the whole.
