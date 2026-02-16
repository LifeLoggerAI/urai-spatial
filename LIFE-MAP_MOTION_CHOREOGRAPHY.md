# 🎥 LIFE-MAP MOTION CHOREOGRAPHY (Frame-by-Frame)

**Target:** 60fps
**Opening Sequence Duration:** ~6.5 seconds
**Emotion:** Calm → Awe → Ownership

---

### 🎬 Scene 0 — Black Void (0ms–300ms)

*   **Screen:** Pure black (#000000).
*   **UI:** None.
*   **Stars:** Invisible.
*   **Orb:** Invisible.
*   **Audio (Optional):** A subtle, low-frequency ambient tone begins a slow fade-in (e.g., a 20Hz sine wave).

### 🎬 Scene 1 — Star Emergence (300ms–1200ms)

*   **Frame 300–600ms:**
    *   The "Far" star layer fades in (opacity 0 → 0.4).
    *   A subtle, randomized twinkle animation begins on this layer.
*   **Frame 600–900ms:**
    *   The "Mid" star layer fades in (opacity 0 -> 0.6).
    *   A slight parallax effect becomes visible as the camera drifts.
*   **Frame 900–1200ms:**
    *   The "Near" star layer appears, brighter and slightly larger (opacity 0 -> 1.0).
    *   Depth is now clearly perceptible.
*   **Camera:** An extremely subtle, slow forward drift begins (a positional Z-axis change of ~0.2% over the duration).
*   **Intended Emotion:** "Something vast exists."

### 🎬 Scene 2 — Orb Manifestation (1200ms–2500ms)

*   **1200–1500ms:**
    *   A small, dim sphere materializes at the center of the screen.
    *   Animation: `scale` from 0.6 to 1.0 with an `easeOutExpo` curve.
*   **1500–2000ms:**
    *   The orb's inner gradient brightens.
    *   The soft outer aura bloom activates and begins its gentle pulse.
    *   The core 8-second breathing animation cycle starts.
*   **2000–2500ms:**
    *   The micro-particle orbit system spawns and begins its rotation.
    *   The camera's forward drift micro-stabilizes to a near-halt.
*   **Companion Whisper:** At 2500ms, the audio whisper "This is your Life-Map" is triggered.

### 🎬 Scene 3 — Living Field (2500ms–6000ms)

*   The full idle animation loop is now active:
    *   **Orb Breathing:** A 6-8 second sinusoidal loop on the orb's scale (`1.0` to `1.03`).
    *   **Aura Pulse:** The aura's opacity oscillates gently (`0.25` to `0.35`).
    *   **Star Drift:** A near-imperceptible positional drift on the star layers (`~0.0005` position offset per frame) to avoid a static feeling.
    *   **Star Flicker:** Occasional, randomized star twinkles at 1.5–3 second intervals.
*   **UI:** No overlays. The experience is purely about presence.
