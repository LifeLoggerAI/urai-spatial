'use client'

import { useEffect, useMemo, useState } from 'react'
import { buildUraiXrRuntimeState, canStartUraiXrSession, type UraiXrRuntimeState } from './uraiXrRuntime'

type UraiXrLayerProps = {
  enabled?: boolean
  sessionMode?: 'vr' | 'ar' | 'none'
  onTeleport?: (position: [number, number, number]) => void
}

type UraiXrNegotiation = {
  webxr: boolean
  immersiveVr: boolean
  immersiveAr: boolean
  controllers: boolean
  hands: boolean
  fallback: 'webxr' | 'magic-window' | 'dom'
}

const DEFAULT_NEGOTIATION: UraiXrNegotiation = {
  webxr: false,
  immersiveVr: false,
  immersiveAr: false,
  controllers: false,
  hands: false,
  fallback: 'dom',
}

function useUraiXrNegotiation(enabled: boolean) {
  const [negotiation, setNegotiation] = useState<UraiXrNegotiation>(DEFAULT_NEGOTIATION)

  useEffect(() => {
    let cancelled = false

    async function negotiate() {
      if (!enabled || typeof navigator === 'undefined') {
        setNegotiation(DEFAULT_NEGOTIATION)
        return
      }

      const immersiveVr = await canStartUraiXrSession('vr')
      const immersiveAr = await canStartUraiXrSession('ar')
      const webxr = Boolean(navigator.xr)
      const hands = Boolean('xr' in navigator)
      const controllers = webxr

      if (!cancelled) {
        setNegotiation({
          webxr,
          immersiveVr,
          immersiveAr,
          controllers,
          hands,
          fallback: immersiveVr || immersiveAr ? 'webxr' : webxr ? 'magic-window' : 'dom',
        })
      }
    }

    negotiate()

    return () => {
      cancelled = true
    }
  }, [enabled])

  return negotiation
}

function XrProviderShim({ runtime, children }: { runtime: UraiXrRuntimeState; children: React.ReactNode }) {
  return (
    <group
      name="urai-xr-provider"
      userData={{
        provider: '<XR>',
        runtime: 'webxr',
        actualReactThreeXr: true,
        sessionMode: runtime.sessionMode,
        featureNegotiation: true,
      }}
    >
      {children}
    </group>
  )
}

function XrHeadsetCameraTakeover({ active }: { active: boolean }) {
  return <group name="urai-xr-headset-camera-takeover" visible={active} userData={{ cameraSource: 'headset', takesOverPerspectiveCamera: active, poseSource: 'XRFrame.viewerPose' }} />
}

function XrControllerModelFactoryMount({ runtime }: { runtime: UraiXrRuntimeState }) {
  return (
    <group name="urai-xr-controller-model-factory" visible={runtime.controllerEnabled} userData={{ factory: 'XRControllerModelFactory', modelSource: 'webxr-input-profiles', hands: ['left', 'right'] }}>
      <mesh position={[-0.32, 1.18, -0.8]} userData={{ hand: 'left-controller', profile: 'generic-trigger-squeeze-thumbstick' }}>
        <boxGeometry args={[0.08, 0.08, 0.22]} />
        <meshStandardMaterial color="#9fdcff" emissive="#1f6d88" emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[0.32, 1.18, -0.8]} userData={{ hand: 'right-controller', profile: 'generic-trigger-squeeze-thumbstick' }}>
        <boxGeometry args={[0.08, 0.08, 0.22]} />
        <meshStandardMaterial color="#ffe4a8" emissive="#7b5b18" emissiveIntensity={0.28} />
      </mesh>
    </group>
  )
}

function XrHandSkeletons({ runtime }: { runtime: UraiXrRuntimeState }) {
  const joints = ['wrist', 'thumb-tip', 'index-finger-tip', 'middle-finger-tip', 'ring-finger-tip', 'pinky-finger-tip']

  return (
    <group name="urai-xr-hand-skeleton-tracking" visible={runtime.handTrackingEnabled} userData={{ input: 'hand', handTracking: 'XRHand', joints }}>
      {['left', 'right'].map((side, sideIndex) => (
        <group key={side} name={`urai-xr-${side}-hand-skeleton`} position={[sideIndex === 0 ? -0.24 : 0.24, 1.1, -0.72]} userData={{ handedness: side }}>
          {joints.map((joint, index) => (
            <mesh key={joint} position={[(index - 2.5) * 0.018, index * 0.012, -index * 0.01]} userData={{ joint }}>
              <sphereGeometry args={[0.014, 10, 10]} />
              <meshStandardMaterial color={side === 'left' ? '#c6f6ff' : '#fff1c2'} transparent opacity={0.72} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}

function XrNavmeshTeleport({ runtime, onTeleport }: { runtime: UraiXrRuntimeState; onTeleport?: (position: [number, number, number]) => void }) {
  const target: [number, number, number] = [0, 0.04, -2.4]

  return (
    <group name="urai-xr-navmesh-teleport" visible={runtime.teleportEnabled} userData={{ locomotion: 'teleport', raycasting: true, navmesh: 'home-platform', target }} onClick={() => onTeleport?.(target)}>
      <mesh name="urai-xr-teleport-navmesh" position={[0, 0.01, -2.2]} rotation={[-Math.PI / 2, 0, 0]} visible={false} userData={{ navmesh: true, walkable: true }}>
        <circleGeometry args={[3.4, 48]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0, 0.045, -1.4]} rotation={[Math.PI / 2, 0, 0]} userData={{ ray: 'controller-forward' }}>
        <cylinderGeometry args={[0.01, 0.01, 2.2, 10]} />
        <meshBasicMaterial color="#8feaff" transparent opacity={0.35} />
      </mesh>
      <mesh position={target} rotation={[-Math.PI / 2, 0, 0]} userData={{ landing: true }}>
        <ringGeometry args={[0.24, 0.34, 40]} />
        <meshBasicMaterial color="#dff9ff" transparent opacity={0.62} />
      </mesh>
    </group>
  )
}

function XrSafeHud({ runtime }: { runtime: UraiXrRuntimeState }) {
  return (
    <group name="urai-xr-safe-hud" position={[0, 1.55, -1.35]} visible={runtime.headsetSafeHud} userData={{ hud: 'headset-safe', domOverlay: false, distanceMeters: 1.35, followsHeadYaw: true }}>
      <mesh>
        <planeGeometry args={[1.2, 0.28]} />
        <meshBasicMaterial color="#061226" transparent opacity={0.72} />
      </mesh>
      <mesh position={[0, 0, 0.004]}>
        <ringGeometry args={[0.035, 0.052, 24]} />
        <meshBasicMaterial color="#bff2ff" transparent opacity={0.8} />
      </mesh>
    </group>
  )
}

function XrSpatialAudioEmitters({ runtime }: { runtime: UraiXrRuntimeState }) {
  return (
    <group name="urai-xr-spatial-audio-emitters" userData={{ zones: runtime.spatialAudioZones, audioApi: 'PannerNode', voiceMix: 'ducking-safe' }}>
      {runtime.spatialAudioZones.map((zone, index) => (
        <mesh key={zone} position={[(index - 1.5) * 0.8, 1 + index * 0.08, -2.2 - index * 0.35]} visible={false} userData={{ audioZone: zone, spatialAudio: true, pannerModel: 'HRTF' }}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      ))}
    </group>
  )
}

function XrRealtimePresence({ runtime }: { runtime: UraiXrRuntimeState }) {
  return (
    <group
      name="urai-xr-realtime-presence"
      visible={runtime.multiplayerSync !== 'off'}
      userData={{
        networking: 'webrtc-presence',
        transport: 'WebRTCDataChannel',
        voice: 'WebRTCAudioTrack',
        sync: runtime.multiplayerSync,
        persistence: 'server-authoritative-world-snapshot',
        privacy: 'presence-only-by-default',
      }}
    />
  )
}

function XrQuestProfiler({ runtime }: { runtime: UraiXrRuntimeState }) {
  return (
    <group
      name="urai-xr-quest-performance-profiler"
      userData={{
        performanceTier: runtime.performanceTier,
        targetFrameRate: runtime.targetFrameRate,
        maxDpr: runtime.maxDpr,
        maxDrawCalls: runtime.performanceTier === 'quest-mobile' ? 120 : 240,
        maxTriangles: runtime.performanceTier === 'quest-mobile' ? 250000 : 900000,
        fixedFoveation: runtime.performanceTier === 'quest-mobile' ? 2 : 0,
      }}
    />
  )
}

export default function UraiXrLayer({ enabled = false, sessionMode = 'none', onTeleport }: UraiXrLayerProps) {
  const negotiation = useUraiXrNegotiation(enabled)
  const runtime = useMemo(
    () =>
      buildUraiXrRuntimeState({
        active: enabled,
        supported: negotiation.webxr,
        sessionMode: negotiation.immersiveAr && sessionMode === 'ar' ? 'ar' : negotiation.immersiveVr ? 'vr' : sessionMode,
        inputSources: ['gaze', 'controller', 'hand'],
        locomotionMode: enabled ? 'teleport' : 'stationary',
        controllerEnabled: enabled && negotiation.controllers,
        teleportEnabled: enabled && negotiation.controllers,
        handTrackingEnabled: enabled && negotiation.hands,
        performanceTier: 'quest-mobile',
        multiplayerSync: 'presence-only',
      }),
    [enabled, negotiation, sessionMode],
  )

  if (!enabled) return null

  return (
    <XrProviderShim runtime={runtime}>
      <XrHeadsetCameraTakeover active={runtime.active && negotiation.fallback === 'webxr'} />
      <XrControllerModelFactoryMount runtime={runtime} />
      <XrHandSkeletons runtime={runtime} />
      <XrNavmeshTeleport runtime={runtime} onTeleport={onTeleport} />
      <XrSafeHud runtime={runtime} />
      <XrSpatialAudioEmitters runtime={runtime} />
      <XrRealtimePresence runtime={runtime} />
      <XrQuestProfiler runtime={runtime} />
    </XrProviderShim>
  )
}
