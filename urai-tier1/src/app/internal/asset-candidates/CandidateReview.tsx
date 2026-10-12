'use client'

import { Component, Suspense, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, useGLTF } from '@react-three/drei'
import * as THREE from 'three'

export type ReviewAsset = {
  id: string; url: string; label: string; bytes: number; sha256: string;
  recordedTriangles: number; source: string; license: string;
  releaseState: 'pending-final-review'
}
type ModelReport = {
  meshCount: number; triangleCount: number; nodeCount: number;
  materialCount: number; textureCount: number;
  originalMaterialTypes: string[]; animationClips: string[];
  boundsMeters: [number, number, number]; inspectionScale: number
}
class ModelBoundary extends Component<{ children: ReactNode; fail: (error: string) => void }, { error: string | null }> {
  state = { error: null as string | null }
  static getDerivedStateFromError(error: Error) { return { error: error.message } }
  componentDidCatch(error: Error) { this.props.fail(error.message) }
  render() { return this.state.error ? null : this.props.children }
}
function OriginalModel({ asset, measured }: { asset: ReviewAsset; measured: (id: string, data: ModelReport) => void }) {
  const gltf = useGLTF(asset.url)
  const model = useMemo(() => {
    const clone = gltf.scene.clone(true)
    clone.updateMatrixWorld(true)
    const bounds = new THREE.Box3().setFromObject(clone)
    if (bounds.isEmpty()) throw new Error('Candidate GLB has no renderable bounds')
    const center = bounds.getCenter(new THREE.Vector3())
    const extent = bounds.getSize(new THREE.Vector3())
    const span = Math.max(extent.x, extent.y, extent.z)
    if (!Number.isFinite(span) || span <= 0) throw new Error('Invalid candidate dimensions')
    const materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>(), types = new Set<string>()
    let nodes = 0, meshes = 0, triangles = 0
    clone.traverse((node) => {
      nodes += 1
      if (!(node instanceof THREE.Mesh)) return
      meshes += 1
      node.castShadow = true
      node.receiveShadow = true
      const geometry = node.geometry
      const indices = geometry?.getIndex(), positions = geometry?.getAttribute('position')
      triangles += indices ? Math.floor(indices.count / 3) : positions ? Math.floor(positions.count / 3) : 0
      for (const mat of Array.isArray(node.material) ? node.material : [node.material]) {
        if (!mat) continue
        materials.add(mat); types.add(mat.type)
        const surface = mat as THREE.MeshStandardMaterial
        for (const key of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap', 'alphaMap'] as const) {
          const texture = surface[key]
          if (texture instanceof THREE.Texture) textures.add(texture)
        }
      }
    })
    if (!meshes) throw new Error('GLB decoded but contains no mesh geometry')
    const report: ModelReport = {
      meshCount: meshes, triangleCount: triangles, nodeCount: nodes,
      materialCount: materials.size, textureCount: textures.size,
      originalMaterialTypes: [...types].sort(), animationClips: gltf.animations.map(clip => clip.name),
      boundsMeters: [extent.x, extent.y, extent.z].map(x => Number(x.toFixed(4))) as [number,number,number],
      inspectionScale: Number((5.4 / span).toFixed(5)),
    }
    return { clone, center, scale: 5.4 / span, report }
  }, [gltf.scene, gltf.animations])
  useEffect(() => measured(asset.id, model.report), [asset.id, model, measured])
  return <group scale={model.scale} name={'exact-candidate-' + asset.id}>
    <primitive object={model.clone} position={[-model.center.x, -model.center.y, -model.center.z]} />
  </group>
}

export default function CandidateReview({ assets }: { assets: ReviewAsset[] }) {
  const [selected, select] = useState(assets[0]?.id || '')
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => { setHydrated(true) }, [])
  const [report, setReport] = useState<ModelReport | null>(null)
  const [failure, setFailure] = useState<string | null>(null)
  const asset = assets.find(x => x.id === selected) || assets[0]
  const measured = useCallback((id: string, value: ModelReport) => { if (id === selected) setReport(value) }, [selected])
  const fail = useCallback((reason: string) => setFailure(reason), [])
  if (!asset) return <main>No inspectable candidates</main>
  const status = failure ? 'failed' : report ? 'loaded' : 'loading'
  return <main data-testid="urai-internal-candidate-review" data-asset-review-id={asset.id} data-asset-review-interactive={hydrated ? 'true' : 'false'}
    data-asset-review-state={status} style={{ background: '#0d1219', color: '#f5f7fa', minHeight: '100vh', padding: '56px 16px 24px', fontFamily: 'system-ui,sans-serif' }}>
    <style jsx global>{'body:has(main[data-testid="urai-internal-candidate-review"]) [data-urai-adam-launcher="true"] { display: none !important; }'}</style>
    <h1>URAI · Source-controlled GLB candidate review</h1>
    <p style={{ color: '#ffde9a' }}>DEVELOPMENT ONLY · UNADMITTED ART · NO PERSONAL MEMORY · NO RELEASE AUTHORITY</p>
    <nav aria-label="Exact model selection" style={{ display: 'flex', gap: 8, flexWrap: 'nowrap', maxWidth: '100%', overflowX: 'auto', paddingBottom: 8, marginBottom: 12 }}>
      {assets.map(item => <button type="button" key={item.id} aria-pressed={item.id === asset.id}
        onClick={() => { select(item.id); setReport(null); setFailure(null) }}
        style={{ padding: 12, minHeight: 48, whiteSpace: 'nowrap', flexShrink: 0, border: item.id === asset.id ? '2px solid #95e3d6' : '1px solid #637587', color: '#fff', background: '#253344', borderRadius: 8 }}>
        {item.label}
      </button>)}
    </nav>
    <div style={{ height: 'min(62vh,650px)', minHeight: 300, borderRadius: 12, overflow: 'hidden', border: '1px solid #5c727a' }}>
      <Canvas key={asset.id} shadows dpr={[1,1.5]} camera={{ position: [5.5,3.8,7.5], fov: 43, near: 0.01, far: 150 }}>
        <color attach="background" args={['#161d24']} />
        <ambientLight intensity={0.72} />
        <hemisphereLight args={['#eaf5f7', '#393b34', 1.1]} />
        <directionalLight position={[8,12,7]} intensity={2.3} castShadow shadow-mapSize={[2048,2048]} />
        <directionalLight position={[-7,5,-8]} intensity={0.55} color="#b4d2df" />
        <gridHelper args={[20,20,'#60747b','#27343d']} position={[0,-3.48,0]} />
        <mesh rotation={[-Math.PI/2,0,0]} position={[0,-3.5,0]} receiveShadow>
          <planeGeometry args={[20,20]} />
          <meshStandardMaterial color="#293039" roughness={0.9} />
        </mesh>
        <ModelBoundary key={asset.id} fail={fail}>
          <Suspense fallback={null}>
            <OriginalModel asset={asset} measured={measured} />
          </Suspense>
        </ModelBoundary>
        <OrbitControls target={[0,0,0]} enableDamping minDistance={3} maxDistance={35} />
      </Canvas>
    </div>
    <section style={{ marginTop: 18, maxWidth: 1100 }}>
      <div role="status" data-asset-review-status={status}><strong>{status === 'loaded' ? 'REAL SOURCE GEOMETRY LOADED' : status === 'failed' ? 'MODEL LOAD FAILED' : 'Waiting for original GLB'}</strong></div>
      {failure ? <p style={{ color: '#ffaaaa' }}>{failure}</p> : null}
      <p><b>Asset:</b> {asset.id} · <b>Release:</b> {asset.releaseState}</p>
      <p><b>Bytes:</b> {asset.bytes.toLocaleString()} · <b>SHA-256:</b> <code style={{ wordBreak: 'break-all' }}>{asset.sha256}</code></p>
      <p><b>Source:</b> {asset.source} · <b>License:</b> {asset.license}</p>
      <pre data-asset-geometry-report="true" style={{ padding: 16, background: '#1b2630', fontSize: 12, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
        {report ? JSON.stringify({ assetId: asset.id, receiptTriangles: asset.recordedTriangles, ...report, exactSource: true, finalArtAdmitted: false }, null, 2) : 'Waiting for source geometry'}
      </pre>
    </section>
  </main>
}
