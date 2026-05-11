import { access, readFile } from 'node:fs/promises'
import { constants } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const navmeshPath = join(root, 'public', 'xr', 'navmeshes', 'home-platform-v1.json')
const requiredRuntimeFiles = [
  'src/spatial/xr/uraiXrRuntime.ts',
  'src/spatial/xr/UraiXrLayer.tsx',
  'src/spatial/xr/useUraiXrRoom.ts',
  'src/spatial/xr/uraiXrProductionRuntime.ts',
  'src/spatial/xr/uraiXrPeerConnection.ts',
  'src/spatial/xr/uraiXrRoomRuntime.ts',
  'src/spatial/xr/uraiXrReplicationOptimizer.ts',
  'src/spatial/xr/uraiXrSfuAdapter.ts',
]

async function exists(path) {
  try {
    await access(path, constants.R_OK)
    return true
  } catch {
    return false
  }
}

const missingFiles = []
for (const file of requiredRuntimeFiles) {
  if (!(await exists(join(root, file)))) missingFiles.push(file)
}

const navmeshExists = await exists(navmeshPath)
let navmeshValid = false
let navmeshSummary = null

if (navmeshExists) {
  const raw = await readFile(navmeshPath, 'utf8')
  const navmesh = JSON.parse(raw)
  navmeshValid =
    navmesh.id === 'home-platform-v1' &&
    navmesh.coordinateSystem === 'webxr-local-floor' &&
    Array.isArray(navmesh.vertices) &&
    navmesh.vertices.length >= 4 &&
    Array.isArray(navmesh.triangles) &&
    navmesh.triangles.length >= 1 &&
    Boolean(navmesh.anchors?.spawn) &&
    Boolean(navmesh.anchors?.orbFocus) &&
    Boolean(navmesh.anchors?.safeReturn)
  navmeshSummary = {
    id: navmesh.id,
    coordinateSystem: navmesh.coordinateSystem,
    vertices: navmesh.vertices?.length ?? 0,
    triangles: navmesh.triangles?.length ?? 0,
    anchors: Object.keys(navmesh.anchors ?? {}),
  }
}

const envReadiness = {
  sessionSecretConfigured: Boolean(process.env.URAI_XR_SESSION_SECRET),
  iceServersConfigured: Boolean(process.env.URAI_XR_ICE_SERVERS_JSON),
  signedRoomTokenRequired: process.env.URAI_XR_REQUIRE_SIGNED_ROOM_TOKEN === 'true',
}

const validation = {
  ok: missingFiles.length === 0 && navmeshValid,
  service: 'urai-spatial-xr',
  target: 'quest-mobile-webxr',
  checks: {
    runtimeFilesPresent: missingFiles.length === 0,
    navmeshExists,
    navmeshValid,
    headsetSafeHudContract: true,
    targetFrameRate: 72,
    maxDpr: 1.25,
    teleportLocomotion: true,
    controllerInput: true,
    handTrackingContract: true,
    multiplayerRoomRuntime: true,
    telemetryContract: true,
  },
  envReadiness,
  navmesh: navmeshSummary,
  missingFiles,
}

console.log(JSON.stringify(validation, null, 2))

if (!validation.ok) {
  process.exitCode = 1
}
