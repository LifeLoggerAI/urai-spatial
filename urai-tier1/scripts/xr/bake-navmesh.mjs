import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

const outPath = join(process.cwd(), 'public', 'xr', 'navmeshes', 'home-platform-v1.json')

const navmesh = {
  id: 'home-platform-v1',
  version: 1,
  coordinateSystem: 'webxr-local-floor',
  vertices: [
    [-3.4, 0.02, -3.4],
    [3.4, 0.02, -3.4],
    [3.4, 0.02, 1.2],
    [-3.4, 0.02, 1.2],
    [-1.1, 0.02, -4.6],
    [1.1, 0.02, -4.6],
  ],
  triangles: [
    [0, 1, 2],
    [0, 2, 3],
    [0, 4, 5],
    [0, 5, 1],
  ],
  anchors: {
    spawn: [0, 0.04, 0],
    orbFocus: [0, 0.04, -2.4],
    safeReturn: [0, 0.04, 0.6],
  },
  constraints: {
    maxTeleportDistanceMeters: 4.8,
    minComfortRadiusMeters: 0.55,
    noClipBelowY: -0.05,
  },
}

await mkdir(dirname(outPath), { recursive: true })
await writeFile(outPath, `${JSON.stringify(navmesh, null, 2)}\n`)
console.log(`[xr:navmesh] baked ${outPath}`)
