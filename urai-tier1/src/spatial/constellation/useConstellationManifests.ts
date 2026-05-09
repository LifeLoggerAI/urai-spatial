'use client'

import { useEffect, useMemo, useState } from 'react'
import { collection, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore'
import { getFirebaseDb } from '../../lib/firebase/client'
import { SpatialAssetManifest, isSpatialAssetManifest } from '../assets/manifestTypes'

export const CONSTELLATION_MANIFEST_LIMIT = 18
export const LAUNCH_DEMO_OWNER_ID = 'launch-demo'

const SEED_MANIFESTS: SpatialAssetManifest[] = [
  {
    manifestId: 'seed-memory-bloom',
    manifestVersion: '1.0',
    jobId: 'seed-memory-bloom',
    ownerId: LAUNCH_DEMO_OWNER_ID,
    projectId: 'urai-spatial',
    assetType: 'memory image',
    artifacts: [],
    provider: 'seed',
    model: 'launch-fallback',
    promptPreview: 'soft memory bloom in the life map',
    spatialCompatibility: { supported: true, type: 'image_overlay' },
    title: 'Soft Memory Bloom',
    systemLabel: 'Voice Memory',
    emotionalTone: 'tender clarity',
    emotionalWeather: 'calm',
    season: 'Spring recovery',
    importanceScore: 0.82,
    sourceType: 'seed',
    privacyState: 'demo',
    narratorLine: 'This star holds a soft moment where your system began to settle.',
    replayReady: true,
    memoryKind: 'voice',
    whyThisAppeared: 'It is part of the launch fallback constellation and demonstrates how a private voice memory becomes a replayable star.',
    relationshipArcStrength: 0.54,
    reflectionSummary: {
      changed: 'Your attention moved from scattered recall into a calmer memory field.',
      repeated: 'Soft signals cluster around reflection and self-trust.',
      healed: 'The moment can be revisited without forcing raw capture data onto the screen.',
      needsAttention: 'Replace this seed star with a private validated manifest when live data is available.',
    },
  },
  {
    manifestId: 'seed-recovery-arc',
    manifestVersion: '1.0',
    jobId: 'seed-recovery-arc',
    ownerId: LAUNCH_DEMO_OWNER_ID,
    projectId: 'urai-spatial',
    assetType: 'recovery motion',
    artifacts: [],
    provider: 'seed',
    model: 'launch-fallback',
    promptPreview: 'recovery arc returning to calm',
    spatialCompatibility: { supported: true, type: 'video_panel' },
    title: 'Recovery Arc',
    systemLabel: 'Recovery Pattern',
    emotionalTone: 'strain to steadiness',
    emotionalWeather: 'recovery',
    season: 'Late winter',
    importanceScore: 0.92,
    sourceType: 'seed',
    privacyState: 'demo',
    narratorLine: 'A recovery arc is visible here: tension rose, then your pattern returned toward steadiness.',
    replayReady: true,
    memoryKind: 'recovery',
    whyThisAppeared: 'It demonstrates rebound detection and the path from Life Map selection into Focus and Replay.',
    relationshipArcStrength: 0.78,
    reflectionSummary: {
      changed: 'The map shifted from pressure into a recovery rhythm.',
      repeated: 'You often stabilize after visible overload rather than all at once.',
      healed: 'The star makes the rebound legible without treating the hard moment as failure.',
      needsAttention: 'Live recovery stars should include source confidence and timing metadata.',
    },
  },
  {
    manifestId: 'seed-threshold-storm',
    manifestVersion: '1.0',
    jobId: 'seed-threshold-storm',
    ownerId: LAUNCH_DEMO_OWNER_ID,
    projectId: 'urai-spatial',
    assetType: 'threshold skybox',
    artifacts: [],
    provider: 'seed',
    model: 'launch-fallback',
    promptPreview: 'storm threshold becoming visible',
    spatialCompatibility: { supported: true, type: 'skybox' },
    title: 'Threshold Storm',
    systemLabel: 'Threshold Pattern',
    emotionalTone: 'overwhelm becoming visible',
    emotionalWeather: 'threshold',
    season: 'Storm season',
    importanceScore: 0.88,
    sourceType: 'seed',
    privacyState: 'demo',
    narratorLine: 'This threshold star marks the point where pressure becomes visible enough to name.',
    replayReady: true,
    memoryKind: 'shadow',
    whyThisAppeared: 'It provides the AAA emotional weather example for threshold mode and shadow-pattern visualization.',
    relationshipArcStrength: 0.67,
    reflectionSummary: {
      changed: 'Hidden tension became a visible storm layer.',
      repeated: 'Stress tends to gather before it can be described.',
      healed: 'The map gives the storm a boundary so it can be exited.',
      needsAttention: 'Future versions can connect this to real crisis-safe escalation settings.',
    },
  },
  {
    manifestId: 'seed-mirror-focus',
    manifestVersion: '1.0',
    jobId: 'seed-mirror-focus',
    ownerId: LAUNCH_DEMO_OWNER_ID,
    projectId: 'urai-spatial',
    assetType: 'mirror model',
    artifacts: [],
    provider: 'seed',
    model: 'launch-fallback',
    promptPreview: 'spatial mirror for focused attention',
    spatialCompatibility: { supported: true, type: 'model3d' },
    title: 'Mirror Focus',
    systemLabel: 'Mirror of Becoming',
    emotionalTone: 'reflection and integration',
    emotionalWeather: 'dream',
    season: 'Night review',
    importanceScore: 0.74,
    sourceType: 'seed',
    privacyState: 'demo',
    narratorLine: 'This mirror star turns the memory into a reflection summary instead of another task.',
    replayReady: true,
    memoryKind: 'mirror',
    whyThisAppeared: 'It demonstrates the safe Mirror fallback for selected memories.',
    relationshipArcStrength: 0.44,
    reflectionSummary: {
      changed: 'The selected memory becomes a summary of change rather than a static point.',
      repeated: 'Reflection appears after focus, not before it.',
      healed: 'The user can review without autoplay or microphone capture.',
      needsAttention: 'Mirror depth can expand once private memory synthesis is connected.',
    },
  },
]

function liveManifestFirestoreEnabled() {
  return process.env.NEXT_PUBLIC_URAI_MANIFEST_FIRESTORE === 'true'
}

function scopedManifestOwnerId() {
  return process.env.NEXT_PUBLIC_URAI_MANIFEST_OWNER_ID || LAUNCH_DEMO_OWNER_ID
}

function uniqueByManifestId(manifests: SpatialAssetManifest[]) {
  const seen = new Set<string>()
  return manifests.filter((manifest) => {
    if (seen.has(manifest.manifestId)) return false
    seen.add(manifest.manifestId)
    return true
  })
}

function normalizeManifest(manifest: SpatialAssetManifest): SpatialAssetManifest {
  const sourceType = manifest.sourceType || (manifest.provider === 'seed' ? 'seed' : 'firestore')
  const privacyState = manifest.privacyState || (manifest.ownerId === LAUNCH_DEMO_OWNER_ID ? 'demo' : 'private')

  return {
    ...manifest,
    title: manifest.title || manifest.promptPreview || 'Memory star',
    systemLabel: manifest.systemLabel || manifest.assetType || 'Spatial memory',
    emotionalTone: manifest.emotionalTone || 'unlabeled signal',
    emotionalWeather: manifest.emotionalWeather || 'calm',
    season: manifest.season || 'Unsorted season',
    importanceScore: typeof manifest.importanceScore === 'number' ? manifest.importanceScore : 0.5,
    sourceType,
    privacyState,
    narratorLine: manifest.narratorLine || `This ${manifest.assetType || 'memory'} is ready for focus review.`,
    replayReady: manifest.replayReady !== false,
    memoryKind: manifest.memoryKind || 'memory',
    whyThisAppeared: manifest.whyThisAppeared || 'This manifest passed validation and is part of the current Life Map constellation.',
    relationshipArcStrength: typeof manifest.relationshipArcStrength === 'number' ? manifest.relationshipArcStrength : 0.5,
    reflectionSummary: manifest.reflectionSummary || {
      changed: 'This memory became visible in the constellation.',
      repeated: 'Related emotional signals cluster around this point.',
      healed: 'The system can review it without exposing raw capture data.',
      needsAttention: 'Add richer synthesis once private context is available.',
    },
  }
}

export function useConstellationManifests(enabled: boolean) {
  const [manifests, setManifests] = useState<SpatialAssetManifest[]>([])
  const ownerId = useMemo(scopedManifestOwnerId, [])

  useEffect(() => {
    if (!enabled) {
      setManifests([])
      return
    }

    if (!liveManifestFirestoreEnabled()) {
      setManifests(SEED_MANIFESTS.map(normalizeManifest))
      return
    }

    try {
      const q = query(
        collection(getFirebaseDb(), 'assetManifests'),
        where('ownerId', '==', ownerId),
        orderBy('createdAt', 'desc'),
        limit(CONSTELLATION_MANIFEST_LIMIT),
      )

      return onSnapshot(
        q,
        (snapshot) => {
          const remoteManifests = snapshot.docs
            .map((doc) => ({ ...doc.data(), manifestId: doc.id }))
            .filter(isSpatialAssetManifest)
            .map(normalizeManifest)
            .slice(0, CONSTELLATION_MANIFEST_LIMIT)

          setManifests(uniqueByManifestId(remoteManifests.length ? remoteManifests : SEED_MANIFESTS.map(normalizeManifest)))
        },
        (error) => {
          console.warn('[URAI] Scoped asset manifest listener unavailable; using launch fallback.', error)
          setManifests(SEED_MANIFESTS.map(normalizeManifest))
        },
      )
    } catch (error) {
      console.warn('[URAI] Scoped asset manifest listener failed to start; using launch fallback.', error)
      setManifests(SEED_MANIFESTS.map(normalizeManifest))
    }
  }, [enabled, ownerId])

  return manifests
}
