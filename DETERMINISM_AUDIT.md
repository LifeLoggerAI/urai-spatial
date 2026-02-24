# URAI-SPATIAL V1 — DETERMINISM LOCK AUDIT PLAN

## PHASE A: DETERMINISM LOCK

**Objective:** Prove or falsify the claim that for a given, stable dataset, URAI-Spatial produces a mathematically identical visual output across all sessions, browsers, and machines.

**Failure Condition:** Any variance in the final rendered positions of scene objects for a given input constitutes a P0 (highest priority) bug and a V1 release blocker.

---

## EXECUTION CHECKLIST

This is a sequential, non-negotiable execution order.

### 1. CODEBASE AUDIT: HUNT AND DESTROY NON-DETERMINISM

**Objective:** Purge all sources of randomness and time-variance from the scene generation logic.

**Execute:**

1.  **Grep the entire codebase** for any and all instances of:
    *   `Math.random()`
    *   `Date.now()`
    *   `performance.now()`
    *   Any other timestamp-based or non-seeded random number generators.
2.  **Analyze each finding:**
    *   If it influences star position, color, size, or any other visual attribute, it **must be removed** and replaced with a value derived from a seeded pseudo-random number generator (PRNG).
    *   If it is used for animation timing (e.g., in a `useFrame` loop), ensure it only affects animation state (`delta`) and does **not** influence initial layout or properties.

### 2. DATA FLOW AUDIT: ENSURE CANONICAL INPUT

**Objective:** Guarantee the data feeding the rendering pipeline is stable, sorted, and canonical.

**Execute:**

1.  **Trace data from Firestore:** Identify the exact query or queries that fetch the user's memory data.
2.  **Enforce Canonical Sort:** The Firestore query **must** have an explicit `orderBy` clause (e.g., `orderBy('createdAt', 'asc')`). If multiple ordering criteria are needed, they must be explicit. Relying on default Firestore ordering is a fatal flaw.
3.  **Verify Data Immutability:** The data payload, once fetched, **must not be mutated** by the rendering pipeline. Any filtering, mapping, or processing must output new arrays/objects. Use `Object.freeze()` in development builds to enforce this.

### 3. SEED GENERATION AUDIT: LOCK THE ROOT OF TRUST

**Objective:** Ensure the seed for the PRNG is itself deterministic.

**Execute:**

1.  **Isolate the seed generation logic.**
2.  **Confirm the input:** The seed must be generated from a canonical representation of the *entire sorted dataset*.
3.  **Implement Canonical Serialization:** Before creating the seed, the sorted data array must be serialized to a string using a canonical JSON library. This prevents object key order from causing hash changes.
    *   `npm install canonical-json`
    *   `const canonicalString = require('canonical-json')(sortedDataObject);`
4.  **Use a high-quality seeded PRNG** (e.g., `seedrandom`) to generate all "random" values from this canonical string.

### 4. IMPLEMENT THE DETERMINISTIC HASH TOOL

**Objective:** Create a tool to generate a single, verifiable hash of the final scene state.

**Execute:**

1.  **Create a new utility function `generateSceneHash(scene)`**.
2.  This function will:
    *   Iterate through all significant objects in the rendered scene (e.g., every memory star).
    *   For each object, create a simple object containing only its critical deterministic properties (e.g., `{ id: star.id, position: [x, y, z] }`).
    *   **Normalize floats:** Crucially, round all floating-point numbers to a fixed precision (e.g., 4 decimal places) to mitigate cross-GPU precision variance.
    *   Collect these simple objects into an array.
    *   Sort this array by object `id`.
    *   Generate a canonical JSON string of the sorted array.
    *   Return a SHA256 hash of this final string.
3.  **Expose this tool** in a debug panel or via a global function for validation.

---

## VALIDATION PROTOCOL

**Objective:** Prove the Determinism Lock is successful.

**Execute:**

1.  **Create a golden dataset:** A static JSON file representing a sample user's data.
2.  **Create an automated test:**
    *   This test loads the golden dataset.
    *   Renders the scene.
    *   Calls `generateSceneHash()`.
    *   Compares the resulting hash against a pre-computed, committed "golden hash".
3.  **Manual Cross-Platform Verification:**
    *   Run the application on at least three distinct hardware/browser combinations (e.g., M1 Mac/Chrome, Windows/Nvidia/Firefox, Intel Mac/Safari).
    *   Load the same user account (with stable data).
    *   Generate the scene hash on all three.
    *   **The hashes must be identical.**

---

## LOCK CRITERIA

The Determinism Lock is considered complete **only when**:

*   The automated test passes.
*   The manual cross-platform verification yields identical hashes.
*   The `DETERMINISM_AUDIT.md` is updated with the final golden hash and signed off by the engineering lead.

This phase is not complete until we have mathematical proof of reproducibility. No exceptions.
