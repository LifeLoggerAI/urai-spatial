
# URAI-SPATIAL — COMPLETION & FORENSIC PATCH REPORT

**REPORT DATE:** 2024-10-27
**STATUS:** **CRITICAL** — Project requires immediate corrective action to meet `v1.0.0-spatial` lock requirements.

---

## SECTION 1 — Verified Functional Systems

*   **`SceneEngine.ts`**: A functional state machine that manages scene transitions and the main render loop.
*   **`LifeMapLayer.ts`**: Uses instanced rendering with custom shaders for the starfield, including a depth-based reveal animation.
*   **`useLifeMapData.ts`**: Successfully fetches data from Firestore and maps user archetypes to star types.
*   **Firestore Rules**: Basic security rules are in place, providing a foundation for data protection.

## SECTION 2 — Incomplete Systems

*   **Star Selection/Interaction**: The `handleClick` function in `Starfield.tsx` and the `handleInteractions` in `LifeMapLayer.ts` are placeholders. Raycasting is not fully implemented to select individual stars.
*   **`ReplayLayer.ts`**: This is a placeholder with a simple rotating cube. It lacks any real "replay" functionality.
*   **Camera Controls**: The `useCameraController` hook is not implemented, leaving `zoomTo` and `resetCamera` as non-functional placeholders.
*   **`LifeMapScene` Components**: The components `Orb`, `CosmicFog`, `Constellations`, `TraumaCloud`, and `RecoveryBloom` are all unimplemented placeholders.
*   **XR Toggle**: There is no evidence of an XR toggle or any WebXR integration.

## SECTION 3 — Phantom / Roadmapped Systems Not Started

*   **Phase 2 — AR Anchors**: No implementation of AR anchors, session gating, or platform adapters.
*   **Phase 4 — VR Systems**: No implementation of hand tracking, locomotion, or VR performance budgets.
*   **Phase 6 — Native stacks**: No work on native clients for Unity, visionOS, ARKit, or ARCore.

## SECTION 4 — Dead Code / Orphan Assets

*   **Placeholder Components**: `Orb`, `CosmicFog`, `Constellations`, `TraumaCloud`, `RecoveryBloom` are all dead code until implemented.
*   **Unused Scene Files**: `public/scenes/scene_memoryroom_v1.json` and `public/scenes/scene_starworld_v1.json` are likely unused.
*   **Mock Data**: The mock data generation in `LifeMapLayer.ts` is dead code once real data is used.

## SECTION 5 — Security Audit

*   **`ignoreBuildErrors: true`**: This is a major security risk, as it allows potentially unsafe code to be deployed.
*   **Firestore Rules**: The rules are too permissive for a production environment. For example, `allow read: if resource.data.status == 'published' || isAdmin();` could expose sensitive data if the `status` field is not properly managed.
*   **Admin Boundaries**: The `isAdmin` function is not fully implemented, creating a potential for unauthorized access.

## SECTION 6 — Performance Audit

*   **Starfield Scaling Risk**: Rendering all stars at once will cause major performance issues as the number of memory nodes grows.
*   **Unbounded Firestore Queries**: The `useLifeMapData.ts` hook uses unbounded queries, which will become slow and expensive.
*   **Shader Inefficiencies**: The custom shaders have not been optimized for performance.

## SECTION 7 — Version Integrity Check

*   **`LOCK.md` vs. Reality**: The `LOCK.md` file claims the project is locked, but the codebase is far from complete. This is a major misrepresentation.
*   **Version Drift**: The lack of a clear versioning strategy for components and assets makes it difficult to track changes and ensure consistency.

## SECTION 8 — Required Corrections

### 1. Fix `ignoreBuildErrors`

**Action:** Remove the `ignoreBuildErrors` flag from `next.config.js` and fix all resulting TypeScript errors.

**File:** `next.config.js`

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    appDir: true,
  },
};

module.exports = nextConfig;
```

### 2. Implement Star Selection

**Action:** Implement a proper raycasting solution to select individual stars.

**File:** `engine/layers/LifeMapLayer.ts`

```typescript
// ... existing code ...
  handleInteractions(raycaster: THREE.Raycaster) {
      const intersects = raycaster.intersectObject(this.stars);

      if (intersects.length > 0) {
          const instanceId = intersects[0].instanceId;
          if (instanceId !== undefined) {
            this.shaderMaterial.uniforms.u_hovered_instance_id.value = instanceId;
            // TODO: Trigger a "star selected" event
          }
      } else {
          this.shaderMaterial.uniforms.u_hovered_instance_id.value = -1;
      }
  }
// ... existing code ...
```

### 3. Implement Camera Controls

**Action:** Create a `useCameraController.ts` file with functional `zoomTo` and `resetCamera` methods.

**File:** `lib/lifemap/useCameraController.ts` (New File)

```typescript
import { useThree } from '@react-three/fiber';
import { useCallback } from 'react';
import * as THREE from 'three';

export function useCameraController() {
  const { camera, controls } = useThree();

  const zoomTo = useCallback((position: [number, number, number]) => {
    if (controls) {
      const target = new THREE.Vector3(...position);
      controls.setLookAt(...target, ...camera.position, true);
    }
  }, [camera, controls]);

  const resetCamera = useCallback(() => {
    if (controls) {
      controls.setLookAt(0, 0, 15, 0, 0, 0, true);
    }
  }, [camera, controls]);

  return { zoomTo, resetCamera };
}
```

### 4. Implement Bounded Firestore Queries

**Action:** Add a `limit` to the Firestore query in `useLifeMapData.ts`.

**File:** `lib/lifemap/useLifeMapData.ts`

```typescript
// ... existing code ...
import { collection, doc, query, orderBy, limit } from "firebase/firestore";
// ... existing code ...
  const { data: memoryNodesData } = useFirestoreCollectionData(query(memoryNodesRef, orderBy("timestamp", "desc"), limit(1000)), { idField: 'id' });
// ... existing code ...
```

### 5. Strengthen Firestore Rules

**Action:** Update the Firestore rules to be more restrictive.

**File:** `infra/firestore.rules`

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    function isAdmin() {
      return get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.isAdmin == true;
    }

    function isOwner(userId) {
      return request.auth.uid == userId;
    }

    match /users/{userId}/{document=**} {
      allow read, write: if isOwner(userId) || isAdmin();
    }

    match /scenes/{sceneId} {
      allow read: if resource.data.status == 'published' || isAdmin();
      allow write: if isAdmin();
    }

    // ... other rules ...
  }
}
```

## SECTION 9 — Production Lock Checklist

- [ ] Remove `ignoreBuildErrors` from `next.config.js`.
- [ ] Fix all TypeScript errors.
- [ ] Implement raycasting for star selection.
- [ ] Implement camera controls (`zoomTo`, `resetCamera`).
- [ ] Implement bounded Firestore queries.
- [ ] Strengthen Firestore rules.
- [ ] Implement the `ReplayLayer`.
- [ ] Implement the `Orb`, `CosmicFog`, `Constellations`, `TraumaCloud`, and `RecoveryBloom` components.
- [ ] Implement the XR toggle.
- [ ] Perform a full asset audit and remove unused assets.
- [ ] Update `LOCK.md` to reflect the true state of the project.

## SECTION 10 — Final Production Readiness Score

*   **Stability**: 20/100
*   **XR Completeness**: 10/100
*   **Demo Readiness**: 30/100
*   **Enterprise Credibility**: 10/100

**Overall Score**: 17.5/100
