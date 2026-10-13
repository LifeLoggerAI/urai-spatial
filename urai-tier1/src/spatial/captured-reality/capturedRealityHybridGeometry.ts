/** Verified in-world splat/GLB registration; no storage access is granted here.
 * Private bytes must first pass authenticated owner, consent and artifact fences.
 * Unknown metric scale never enables collision or first-person translation.
 */
export const HYBRID_REGISTRATION_SCHEMA = 'urai-hybrid-registration-1' as const

export type CapturedRealityHybridRegistration = {
  schemaVersion: typeof HYBRID_REGISTRATION_SCHEMA
  splatSha256: string
  meshSha256: string
  splatToWorld: readonly number[]
  meshToWorld: readonly number[]
  sourceFrame: 'right-handed-y-up'
  admission: 'technical-proof' | 'independently-admitted'
  alignmentReviewed: boolean
  metricScaleReviewed: boolean
}

export type CapturedRealityHybridMeshPayload = {
  bytes: Uint8Array
  sha256: string
  registration: CapturedRealityHybridRegistration
}

const SHA256 = /^[a-f0-9]{64}$/i
const MAX_PRIVATE_GLB_BYTES = 24 * 1024 * 1024

function validRigidMatrix(values: readonly number[]): boolean {
  if (!Array.isArray(values) || values.length !== 16 || !values.every(Number.isFinite)) return false
  if ([3, 7, 11].some(i => Math.abs(values[i]) > 1e-5) || Math.abs(values[15] - 1) > 1e-5) return false
  if ([12, 13, 14].some(i => Math.abs(values[i]) > 100_000)) return false
  const axes = [0, 4, 8].map(i => [values[i], values[i + 1], values[i + 2]])
  const norms = axes.map(axis => Math.hypot(...axis))
  if (norms.some(n => n < 1e-4 || n > 1e4) || Math.max(...norms) / Math.min(...norms) > 1.02) return false
  const dot = (a: number[], b: number[]) => a.reduce((acc, x, i) => acc + x * b[i], 0)
  if (Math.abs(dot(axes[0], axes[1])) > norms[0] * norms[1] * .02
    || Math.abs(dot(axes[0], axes[2])) > norms[0] * norms[2] * .02
    || Math.abs(dot(axes[1], axes[2])) > norms[1] * norms[2] * .02) return false
  const cross = [
    axes[0][1] * axes[1][2] - axes[0][2] * axes[1][1],
    axes[0][2] * axes[1][0] - axes[0][0] * axes[1][2],
    axes[0][0] * axes[1][1] - axes[0][1] * axes[1][0],
  ]
  return dot(cross, axes[2]) > 0
}

export function capturedRealityHybridRegistrationValid(
  binding: CapturedRealityHybridRegistration,
  activeSplatSha256: string,
  mode: 'proof' | 'runtime',
): boolean {
  if (!binding || binding.schemaVersion !== HYBRID_REGISTRATION_SCHEMA
    || !SHA256.test(activeSplatSha256) || !SHA256.test(binding.splatSha256)
    || !SHA256.test(binding.meshSha256) || binding.splatSha256.toLowerCase() !== activeSplatSha256.toLowerCase()
    || binding.sourceFrame !== 'right-handed-y-up'
    || !validRigidMatrix(binding.splatToWorld) || !validRigidMatrix(binding.meshToWorld)
    || binding.alignmentReviewed !== true) return false
  if (mode === 'runtime') return binding.admission === 'independently-admitted'
    && binding.metricScaleReviewed === true
  return binding.admission === 'technical-proof' || binding.admission === 'independently-admitted'
}

/** Reject GLB external dependencies so parsing cannot trigger unrelated fetches. */
export function inspectCapturedRealitySelfContainedGlb(bytes: Uint8Array): {
  meshCount: number
  triangleCount: number
  nodeCount: number
} {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength < 32 || bytes.byteLength > MAX_PRIVATE_GLB_BYTES) {
    throw new Error('PRIVATE_MESH_SIZE_INVALID')
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (view.getUint32(0, true) !== 0x46546c67 || view.getUint32(4, true) !== 2
    || view.getUint32(8, true) !== bytes.byteLength) throw new Error('PRIVATE_GLB_HEADER_INVALID')
  const chunkLength = view.getUint32(12, true)
  if (view.getUint32(16, true) !== 0x4e4f534a || chunkLength === 0
    || chunkLength > bytes.byteLength - 20 || chunkLength % 4 !== 0) {
    throw new Error('PRIVATE_GLB_JSON_INVALID')
  }
  let gltf: Record<string, unknown>
  try {
    const jsonBytes = bytes.subarray(20, 20 + chunkLength)
    gltf = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(jsonBytes))
  } catch { throw new Error('PRIVATE_GLB_JSON_INVALID') }
  if (gltf.asset == null || typeof gltf.asset !== 'object'
    || (gltf.asset as { version?: unknown }).version !== '2.0') throw new Error('PRIVATE_GLB_SCHEMA_INVALID')
  const arr = (key: string): Record<string, unknown>[] => Array.isArray(gltf[key]) ? gltf[key] as Record<string, unknown>[] : []
  const buffers = arr('buffers'), images = arr('images'), meshes = arr('meshes'), nodes = arr('nodes'), accessors = arr('accessors')
  if (buffers.length !== 1 || typeof buffers[0].byteLength !== 'number'
    || buffers[0].uri != null || images.some(img => img.uri != null || typeof img.bufferView !== 'number')
    || (gltf.extensionsRequired != null && (gltf.extensionsRequired as unknown[]).length > 0)) {
    throw new Error('PRIVATE_GLB_EXTERNAL_DEPENDENCY_FORBIDDEN')
  }
  const binOffset = 20 + chunkLength
  if (binOffset + 8 > bytes.byteLength || view.getUint32(binOffset + 4, true) !== 0x004e4942
    || view.getUint32(binOffset, true) + binOffset + 8 !== bytes.byteLength
    || Number(buffers[0].byteLength) > view.getUint32(binOffset, true)) {
    throw new Error('PRIVATE_GLB_BUFFER_INVALID')
  }
  if (!meshes.length || meshes.length > 256 || nodes.length > 1024) throw new Error('PRIVATE_GLB_COMPLEXITY_INVALID')
  let triangles = 0
  for (const mesh of meshes) {
    if (!Array.isArray(mesh.primitives) || !mesh.primitives.length) throw new Error('PRIVATE_GLB_PRIMITIVE_INVALID')
    for (const primitive of mesh.primitives as { mode?: number; indices?: number; attributes?: { POSITION?: number } }[]) {
      if (primitive.mode != null && primitive.mode !== 4) throw new Error('PRIVATE_GLB_PRIMITIVE_INVALID')
      const index = primitive.indices ?? primitive.attributes?.POSITION
      if (!Number.isSafeInteger(index) || index == null || index < 0 || index >= accessors.length) {
        throw new Error('PRIVATE_GLB_ACCESSOR_INVALID')
      }
      const count = Number(accessors[index].count)
      if (!Number.isSafeInteger(count) || count < 3 || count > 1_500_000) throw new Error('PRIVATE_GLB_COMPLEXITY_INVALID')
      if (count % 3 !== 0) throw new Error('PRIVATE_GLB_TRIANGLES_INVALID')
      triangles += count / 3
    }
  }
  if (triangles > 500_000) throw new Error('PRIVATE_GLB_COMPLEXITY_INVALID')
  return { meshCount: meshes.length, triangleCount: triangles, nodeCount: nodes.length }
}

export async function verifyCapturedRealityHybridPayload(
  mesh: CapturedRealityHybridMeshPayload,
  activeSplatSha256: string,
  mode: 'proof' | 'runtime',
): Promise<Uint8Array> {
  if (!capturedRealityHybridRegistrationValid(mesh.registration, activeSplatSha256, mode)
    || !SHA256.test(mesh.sha256) || mesh.sha256.toLowerCase() !== mesh.registration.meshSha256.toLowerCase()) {
    throw new Error('PRIVATE_HYBRID_AUTHORITY_OR_REGISTRATION_INVALID')
  }
  inspectCapturedRealitySelfContainedGlb(mesh.bytes)
  if (typeof crypto === 'undefined' || !crypto.subtle) throw new Error('PRIVATE_HYBRID_CRYPTO_UNAVAILABLE')
  const stableBytes = new Uint8Array(mesh.bytes.byteLength)
  stableBytes.set(mesh.bytes)
  const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', stableBytes)))
    .map(x => x.toString(16).padStart(2, '0')).join('')
  if (digest !== mesh.sha256.toLowerCase()) throw new Error('PRIVATE_HYBRID_BYTES_CHANGED')
  return stableBytes
}
