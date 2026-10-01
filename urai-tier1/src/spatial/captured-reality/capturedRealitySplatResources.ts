import * as THREE from 'three'
import { splatVertexShader, splatFragmentShader } from './capturedRealitySplatShaders'

/** Sorting adapted from Drei10.7.7 (MIT; see DREI_SPLAT_LICENSE.txt).
 * Only loaded centers/radii are retained, not full per-point matrices.
 * This function is serialized into an isolated worker and has no closures.
 */
export function capturedSplatSortWorker(self: any) {
  let points: Float32Array | null = null
  let count = 0
  self.onmessage = (event: any) => {
    const data = event.data
    if (data.method === 'push') {
      if (!points) points = new Float32Array(data.capacity * 4)
      const chunk = new Float32Array(data.points)
      points.set(chunk, count * 4)
      count += chunk.length / 4
      return
    }
    if (data.method !== 'sort' || !points) return
    const depth = new Float32Array(count)
    const index = new Uint32Array(count)
    let visible = 0
    let minimum = Infinity
    let maximum = -Infinity
    for (let i = 0; i < count; i++) {
      const z = data.view[0] * points[i * 4] + data.view[1] * points[i * 4 + 1] + data.view[2] * points[i * 4 + 2] + data.view[3]
      if (z < 0 && points[i * 4 + 3] > -.0001 * z) {
        depth[visible] = z
        index[visible++] = i
        minimum = Math.min(minimum, z)
        maximum = Math.max(maximum, z)
      }
    }
    const result = new Uint32Array(visible)
    if (maximum === minimum) result.set(index.subarray(0, visible))
    else {
      const counts = new Uint32Array(65536)
      const buckets = new Uint16Array(visible)
      const inverse = 65535 / (maximum - minimum)
      for (let i = 0; i < visible; i++) counts[buckets[i] = Math.max(0, Math.min(65535, (depth[i] - minimum) * inverse | 0))]++
      const starts = new Uint32Array(65536)
      for (let i = 1; i < 65536; i++) starts[i] = starts[i - 1] + counts[i - 1]
      for (let i = 0; i < visible; i++) result[starts[buckets[i]]++] = index[i]
    }
    self.postMessage({ indices: result.buffer }, [result.buffer])
  }
}

export type SplatWorker = Pick<Worker, 'postMessage' | 'terminate' | 'onmessage' | 'onerror'>
export function createCapturedSplatWorker(): SplatWorker {
  const url = URL.createObjectURL(new Blob([`(${capturedSplatSortWorker.toString()})(self)`], { type: 'application/javascript' }))
  try { return new Worker(url) } finally { URL.revokeObjectURL(url) }
}

export function createCapturedSplatResources(byteSize: number, {
  maxTextureSize, alphaHash, onFailure, workerFactory = createCapturedSplatWorker,
}: {
  maxTextureSize: number
  alphaHash: boolean
  onFailure: () => void
  workerFactory?: () => SplatWorker
}) {
  const pointCount = byteSize / 32
  if (!Number.isSafeInteger(pointCount) || pointCount < 1 || !Number.isSafeInteger(maxTextureSize) || maxTextureSize < 1 || pointCount > maxTextureSize * maxTextureSize) throw new Error('SPLAT_EXCEEDS_GPU_TEXTURE_CAPACITY')
  const width = Math.min(maxTextureSize, pointCount)
  const height = Math.ceil(pointCount / width)
  const centerData = new Float32Array(width * height * 4)
  const covarianceData = new Uint32Array(width * height * 4)
  const indices = new Uint32Array(pointCount)
  const centers = new THREE.DataTexture(centerData, width, height, THREE.RGBAFormat, THREE.FloatType)
  const covariances = new THREE.DataTexture(covarianceData, width, height, THREE.RGBAIntegerFormat, THREE.UnsignedIntType)
  covariances.internalFormat = 'RGBA32UI'
  centers.needsUpdate = covariances.needsUpdate = true
  const geometry = new THREE.InstancedBufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([-2, -2, 0, 2, 2, 0, -2, 2, 0, 2, -2, 0, 2, 2, 0, -2, -2, 0], 3))
  const indexAttribute = new THREE.InstancedBufferAttribute(indices, 1)
  indexAttribute.setUsage(THREE.DynamicDrawUsage)
  geometry.setAttribute('splatIndex', indexAttribute)
  geometry.instanceCount = 0
  const material = new THREE.ShaderMaterial({
    uniforms: {
      viewport: { value: new THREE.Vector2(1, 1) }, focal: { value: 1 },
      centerAndScaleTexture: { value: centers }, covAndColorTexture: { value: covariances },
    },
    vertexShader: splatVertexShader, fragmentShader: splatFragmentShader,
    transparent: !alphaHash, alphaHash, depthTest: true, depthWrite: alphaHash,
    blending: alphaHash ? THREE.NormalBlending : THREE.CustomBlending,
    blendSrcAlpha: THREE.OneFactor, toneMapped: false,
  })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.frustumCulled = false
  let disposed = false
  let loaded = 0
  let revision = 0
  let lastRevision = -1
  let pendingSort = false
  let worker: SplatWorker | undefined
  const lastView = [NaN, NaN, NaN, NaN]
  const matrix = new THREE.Matrix4()
  const transpose = new THREE.Matrix4()
  const rotation = new THREE.Quaternion()
  const scale = new THREE.Vector3()
  const color = new THREE.Color()
  const bytes = new Uint8Array(covarianceData.buffer)
  const shorts = new Int16Array(covarianceData.buffer)
  const dispose = () => {
    if (disposed) return
    disposed = true
    if (worker) {
      worker.onmessage = null
      worker.onerror = null
      worker.terminate()
      worker = undefined
    }
    mesh.visible = false
    geometry.instanceCount = 0
    centers.dispose()
    covariances.dispose()
    geometry.dispose()
    material.dispose()
    centerData.fill(0)
    covarianceData.fill(0)
    indices.fill(0)
    material.uniforms.centerAndScaleTexture.value = null
    material.uniforms.covAndColorTexture.value = null
    centers.clearUpdateRanges()
    covariances.clearUpdateRanges()
  }
  try {
    // Alpha-hashed transparency is order independent, so it needs no worker.
    if (!alphaHash) {
      worker = workerFactory()
      worker.onmessage = (event) => {
        if (disposed) return
        const sorted = new Uint32Array(event.data.indices)
        if (sorted.length > loaded || sorted.some((index) => index >= loaded)) { onFailure(); return }
        indices.set(sorted)
        indexAttribute.clearUpdateRanges()
        indexAttribute.addUpdateRange(0, sorted.length)
        indexAttribute.needsUpdate = true
        geometry.instanceCount = sorted.length
        pendingSort = false
      }
      worker.onerror = () => { if (!disposed) onFailure() }
    }
  } catch (error) { dispose(); throw error }
  return {
    mesh, centers, covariances,
    get disposed() { return disposed },
    get loadedPoints() { return loaded },
    dispose,
    append(chunk: Uint8Array) {
      if (disposed) throw new Error('SPLAT_SESSION_DISPOSED')
      const count = chunk.byteLength / 32
      if (!Number.isInteger(count) || loaded + count > pointCount) throw new Error('SPLAT_POINT_BUDGET_EXCEEDED')
      const view = new DataView(chunk.buffer, chunk.byteOffset, chunk.byteLength)
      const workerPoints = worker ? new Float32Array(count * 4) : null
      for (let i = 0; i < count; i++) {
        const offset = i * 32
        rotation.set(-(view.getUint8(offset + 29) - 128) / 128, (view.getUint8(offset + 30) - 128) / 128, (view.getUint8(offset + 31) - 128) / 128, -(view.getUint8(offset + 28) - 128) / 128).invert()
        scale.set(view.getFloat32(offset + 12, true), view.getFloat32(offset + 16, true), view.getFloat32(offset + 20, true))
        matrix.makeRotationFromQuaternion(rotation).transpose().scale(scale)
        transpose.copy(matrix)
        matrix.transpose().premultiply(transpose)
        const covariance = [0, 1, 2, 5, 6, 10].map((index) => matrix.elements[index])
        const maximum = Math.max(...covariance.map(Math.abs))
        const quantizationScale = Math.fround(maximum / 32767)
        if (!Number.isFinite(quantizationScale) || quantizationScale <= 0 || covariance.some((value) => !Number.isFinite(Math.fround(value)))) throw new Error('SPLAT_COVARIANCE_NOT_RENDERABLE')
        const target = (loaded + i) * 4
        centerData[target] = view.getFloat32(offset, true)
        centerData[target + 1] = -view.getFloat32(offset + 4, true)
        centerData[target + 2] = -view.getFloat32(offset + 8, true)
        centerData[target + 3] = quantizationScale
        for (let j = 0; j < 6; j++) shorts[(loaded + i) * 8 + j] = covariance[j] * 32767 / maximum
        color.setRGB(view.getUint8(offset + 24) / 255, view.getUint8(offset + 25) / 255, view.getUint8(offset + 26) / 255).convertSRGBToLinear()
        bytes[(loaded + i) * 16 + 12] = color.r * 255
        bytes[(loaded + i) * 16 + 13] = color.g * 255
        bytes[(loaded + i) * 16 + 14] = color.b * 255
        bytes[(loaded + i) * 16 + 15] = view.getUint8(offset + 27)
        indices[loaded + i] = loaded + i
        if (workerPoints) {
          workerPoints.set(centerData.subarray(target, target + 3), i * 4)
          workerPoints[i * 4 + 3] = Math.max(scale.x, scale.y, scale.z) * view.getUint8(offset + 27) / 255
        }
      }
      centers.addUpdateRange(loaded * 4, count * 4)
      covariances.addUpdateRange(loaded * 4, count * 4)
      centers.needsUpdate = covariances.needsUpdate = true
      indexAttribute.addUpdateRange(loaded, count)
      indexAttribute.needsUpdate = true
      loaded += count
      revision++
      if (worker && workerPoints) worker.postMessage({ method: 'push', capacity: pointCount, points: workerPoints.buffer }, [workerPoints.buffer])
      else geometry.instanceCount = loaded
    },
    update(camera: THREE.Camera, viewport: THREE.Vector4) {
      if (disposed) return
      material.uniforms.viewport.value.set(viewport.z, viewport.w)
      material.uniforms.focal.value = viewport.w / 2 * Math.abs(camera.projectionMatrix.elements[5])
      if (!worker || pendingSort || !loaded) return
      camera.updateMatrixWorld()
      mesh.updateWorldMatrix(true, false)
      matrix.multiplyMatrices(camera.matrixWorldInverse, mesh.matrixWorld)
      const elements = matrix.elements
      const view = [elements[2], elements[6], elements[10], elements[14]]
      if (lastRevision === revision && view.every((value, index) => Math.abs(value - lastView[index]) < 1e-6)) return
      pendingSort = true
      lastRevision = revision
      lastView.splice(0, 4, ...view)
      worker.postMessage({ method: 'sort', view })
    },
  }
}
export type CapturedSplatResources = ReturnType<typeof createCapturedSplatResources>
