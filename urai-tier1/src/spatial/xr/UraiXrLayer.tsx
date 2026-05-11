'use client'

import { useMemo } from 'react'
import { buildUraiXrRuntimeState, type UraiXrRuntimeState } from './uraiXrRuntime'

type UraiXrLayerProps = {
  enabled?: boolean
  sessionMode?: 'vr' | 'ar' | 'none'
  onTeleport?: (position: [number, number, number]) => void
}

function XrProviderShim({ children }: { children: React.ReactNode }) {
  return <group name="urai-xr-provider" userData={{ provider: '<XR>', runtime: 'webxr' }}>{children}</group>
}

function XrHeadsetCameraTakeover({ active }: { active: boolean }) {
  return (
    <group
      name="urai-xr-headset-camera-takeover"
      visible={active}
      userData={{ cameraSource: 'headset', takesOverPerspectiveCamera: active }}
    />
  )
}

function XrControllers({ runtime }: { runtime: UraiXrRuntimeState }) {
  return (
    <group name="urai-xr-live-controllers" visible={runtime.controllerEnabled} userData={{ input: 'controller', teleport: runtime.teleportEnabled }}>
      <mesh position={[-0.32, 1.18, -0.8]} userData={{ hand: 'left-controller' }}>
        <boxGeometry args={[0.08, 0.08, 0.22]} />
        <meshStandardMaterial color="#9fdcff" emissive="#1f6d88" emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[0.32, 1.18, -0.8]} userData={{ hand: 'right-controller' }}>
        <boxGeometry args={[0.08, 0.08, 0.22]} />
        <meshStandardMaterial color="#ffe4a8" emissive="#7b5b18" emissiveIntensity={0.28} />
      </mesh>
    </group>
  )
}

function XrHands({ runtime }: { runtime: UraiXrRuntimeState }) {
  return (
    <group name="urai-xr-live-hands" visible={runtime.handTrackingEnabled} userData={{ input: 'hand', handTracking: runtime.handTrackingEnabled }}>
      <mesh position={[-0.24, 1.1, -0.72]} userData={{ hand: 'left' }}>
        <sphereGeometry args={[0.055, 16, 16]} />
        <meshStandardMaterial color="#c6f6ff" transparent opacity={0.72} />
      </mesh>
      <mesh position={[0.24, 1.1, -0.72]} userData={{ hand: 'right' }}>
        <sphereGeometry args={[0.055, 16, 16]} />
        <meshStandardMaterial color="#fff1c2" transparent opacity={0.72} />
      </mesh>
    </group>
  )
}

function XrTeleportRay({ runtime, onTeleport }: { runtime: UraiXrRuntimeState; onTeleport?: (position: [number, number, number]) => void }) {
  const target: [number, number, number] = [0, 0.04, -2.4]

  return (
    <group
      name="urai-xr-teleport-raycaster"
      visible={runtime.teleportEnabled}
      userData={{ locomotion: 'teleport', raycasting: true, target }}
      onClick={() => onTeleport?.(target)}
    >
      <mesh position={[0, 0.045, -1.4]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.01, 0.01, 2.2, 10]} />
        <meshBasicMaterial color="#8feaff" transparent opacity={0.35} />
      </mesh>
      <mesh position={target} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.24, 0.34, 40]} />
        <meshBasicMaterial color="#dff9ff" transparent opacity={0.62} />
      </mesh>
    </group>
  )
}

function XrSafeHud({ runtime }: { runtime: UraiXrRuntimeState }) {
  return (
    <group name="urai-xr-safe-hud" position={[0, 1.55, -1.35]} visible={runtime.headsetSafeHud} userData={{ hud: 'headset-safe', domOverlay: false }}>
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
    <group name="urai-xr-spatial-audio-emitters" userData={{ zones: runtime.spatialAudioZones }}>
      {runtime.spatialAudioZones.map((zone, index) => (
        <mesh key={zone} position={[(index - 1.5) * 0.8, 1 + index * 0.08, -2.2 - index * 0.35]} visible={false} userData={{ audioZone: zone, spatialAudio: true }}>
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
      userData={{ networking: 'presence', sync: runtime.multiplayerSync, privacy: 'presence-only-by-default' }}
    />
  )
}

export default function UraiXrLayer({ enabled = false, sessionMode = 'none', onTeleport }: UraiXrLayerProps) {
  const runtime = useMemo(
    () =>
      buildUraiXrRuntimeState({
        active: enabled,
        supported: true,
        sessionMode,
        inputSources: ['gaze', 'controller', 'hand'],
        locomotionMode: enabled ? 'teleport' : 'stationary',
        controllerEnabled: enabled,
        teleportEnabled: enabled,
        handTrackingEnabled: enabled,
        performanceTier: 'quest-mobile',
        multiplayerSync: 'presence-only',
      }),
    [enabled, sessionMode],
  )

  if (!enabled) return null

  return (
    <XrProviderShim>
      <XrHeadsetCameraTakeover active={runtime.active} />
      <XrControllers runtime={runtime} />
      <XrHands runtime={runtime} />
      <XrTeleportRay runtime={runtime} onTeleport={onTeleport} />
      <XrSafeHud runtime={runtime} />
      <XrSpatialAudioEmitters runtime={runtime} />
      <XrRealtimePresence runtime={runtime} />
    </XrProviderShim>
  )
}
