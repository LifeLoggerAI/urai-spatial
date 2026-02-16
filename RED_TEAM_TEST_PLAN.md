# Red Team Test Plan: Archetype Evolution Engine

**Objective:** To stress-test the URAI Archetype Evolution Engine against the risks identified in the `PSYCHOLOGICAL_RISK_AUDIT.md`. This plan simulates user behavior and system responses to ensure the implemented mitigations are effective.

## Test Case 1: The "Relapse" Scenario (Risk: Determinism & Psychological Fatalism)

*   **Scenario:** A user has a history of a "Contraction-Expansion" cycle. They experience a significant "Reinvention" event, breaking the pattern. After a period of stability, they experience a setback that mirrors their old pattern.
*   **Test Steps:**
    1.  Simulate user data that establishes a clear, repeating cycle of "Expansion" and "Contraction" archetypes.
    2.  Trigger a "Reinvention" event in the data.
    3.  After a period of a new, stable archetype (e.g., "Architect"), inject data that causes a shift back to a "Contraction" archetype.
*   **Success Criteria:**
    *   **Language:** The Companion's narrative must strictly adhere to reflective, past-tense language. It must not use predictive or fatalistic phrasing (e.g., "It seems you are in a familiar pattern.").
    *   **Agency:** The narrative should frame the shift as a "current" or "pull," not a destiny. It should empower the user to navigate the feeling, not succumb to it.
    *   **Visuals:** The "Lifetime Tendency" halo should remain subtle and not intensify or become more prominent.

## Test Case 2: The "Grief" Scenario (Risk: Narrative Misinterpretation & Algorithmic Cruelty)

*   **Scenario:** A user is experiencing a period of intense grief or trauma, which is reflected in the data as a prolonged "Dormant" or "Contraction" state.
*   **Test Steps:**
    1.  Simulate user data that represents a sudden and sustained drop in activity, engagement, and other metrics, consistent with a major life disruption.
*   **Success Criteria:**
    *   **Narrative Humility:** The Companion's language must be gentle and uncertain (e.g., "Perhaps this was a time of turning inward.").
    *   **Interpretive Choice:** The system should, if possible, offer multiple interpretations of the period, or the option to apply no narrative at all.
    *   **"Sanctuary of Silence":** The test will confirm that the user can easily and completely disable all narrative overlays, reverting the experience to a silent, visual one.

## Test Case 3: The "Optimization" Scenario (Risk: The Gamification of Growth)

*   **Scenario:** A user attempts to "game" the system to achieve what they perceive as a "better" archetype.
*   **Test Steps:**
    1.  Simulate user data that is intentionally manipulated to trigger a specific archetype (e.g., a sudden burst of activity designed to achieve the "Explorer" archetype).
*   **Success Criteria:**
    *   **Opaque Calculation:** The system should not immediately shift to the desired archetype. The archetype calculation should be slow and holistic, resisting short-term manipulation.
    *   **Neutral Framing:** Even if the archetype shifts, the narrative, colors, and visuals must remain neutral and not imply that the new archetype is "better" than the previous one.

## Test Case 4: The "Social Comparison" Scenario (Risk: The Anxiety of New Social Taxonomies)

*   **Scenario:** A user wants to share their archetype with others.
*   **Test Steps:**
    1.  Review the application's UI and functionality.
*   **Success Criteria:**
    *   **No Sharing:** There must be no UI elements or functionality that allow the user to share their archetype, patterns, or any data from the Archetype Evolution Engine.
    *   **Internal Names:** The user-facing experience must not use any of the internal, evocative archetype names (e.g., "Resilient Architect"). The language should focus on verbs and processes ("a season of building"), not nouns ("you are an Architect").
