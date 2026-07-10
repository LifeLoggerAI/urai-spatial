#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const file = join(process.cwd(), 'urai-tier1/src/spatial/components/world/SpatialWorldCanvas.tsx')
let source = readFileSync(file, 'utf8')

function replaceOnce(label, before, after) {
  const first = source.indexOf(before)
  if (first < 0) throw new Error(`${label}: expected source was not found`)
  if (source.indexOf(before, first + before.length) >= 0) throw new Error(`${label}: expected source is ambiguous`)
  source = source.slice(0, first) + after + source.slice(first + before.length)
}

replaceOnce(
  'adaptive quality import',
  "import { URAI_SPATIAL_DEMO_DATA, type SpatialMemory } from './spatialDemoData'",
  "import { URAI_SPATIAL_DEMO_DATA, type SpatialMemory } from './spatialDemoData'\nimport { useAdaptiveSpatialQuality } from '../../performance/useAdaptiveSpatialQuality'",
)

replaceOnce(
  'remove duplicate reduced-motion hook',
  `function useReducedMotionPreference() {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  return reduced
}

`,
  '',
)

replaceOnce(
  'adaptive particle signature',
  'function AuraParticles({ reducedMotion }: { reducedMotion: boolean }) {',
  'function AuraParticles({ reducedMotion, particleCount }: { reducedMotion: boolean; particleCount: number }) {',
)
replaceOnce('adaptive particle buffer', 'new Float32Array(360 * 3)', 'new Float32Array(particleCount * 3)')
replaceOnce('adaptive particle loop', 'for (let i = 0; i < 360; i += 1)', 'for (let i = 0; i < particleCount; i += 1)')
replaceOnce(
  'particle geometry dependency',
  `    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return g
  }, [])`,
  `    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return g
  }, [particleCount])`,
)

replaceOnce(
  'adaptive scene signature',
  "function SpatialScene({ mode, selectedMemory, onHover, onSelect, onGuide, reducedMotion }: { mode: SpatialWorldMode; selectedMemory: SpatialMemory | null; onHover: (memory: SpatialMemory | null) => void; onSelect: (memory: SpatialMemory) => void; onGuide: () => void; reducedMotion: boolean }) {",
  "function SpatialScene({ mode, selectedMemory, onHover, onSelect, onGuide, reducedMotion, particleCount, shadows, postprocessing }: { mode: SpatialWorldMode; selectedMemory: SpatialMemory | null; onHover: (memory: SpatialMemory | null) => void; onSelect: (memory: SpatialMemory) => void; onGuide: () => void; reducedMotion: boolean; particleCount: number; shadows: boolean; postprocessing: boolean }) {",
)
replaceOnce(
  'adaptive directional shadow',
  '<directionalLight position={[-4, 7, 4]} intensity={1.8} color="#dbeafe" castShadow />',
  '<directionalLight position={[-4, 7, 4]} intensity={1.8} color="#dbeafe" castShadow={shadows} />',
)
replaceOnce(
  'adaptive particle use',
  '<AuraParticles reducedMotion={reducedMotion} />',
  '<AuraParticles reducedMotion={reducedMotion} particleCount={particleCount} />',
)
replaceOnce(
  'adaptive postprocessing',
  `      <EffectComposer enabled={!reducedMotion}>
        <Bloom intensity={0.82} luminanceThreshold={0.12} luminanceSmoothing={0.28} />
        <Vignette eskil={false} offset={0.18} darkness={0.62} />
      </EffectComposer>`,
  `      {postprocessing && !reducedMotion ? (
        <EffectComposer enabled>
          <Bloom intensity={0.82} luminanceThreshold={0.12} luminanceSmoothing={0.28} />
          <Vignette eskil={false} offset={0.18} darkness={0.62} />
        </EffectComposer>
      ) : null}`,
)

replaceOnce(
  'adaptive profile hook',
  '  const reducedMotion = useReducedMotionPreference()\n  const webglAvailable = useWebGLAvailable()',
  '  const quality = useAdaptiveSpatialQuality()\n  const reducedMotion = quality.reducedMotion\n  const webglAvailable = useWebGLAvailable()',
)
replaceOnce(
  'quality data attributes',
  '<main className="spatial-world-root" data-mode={worldMode} data-embed={embedded ? \'true\' : \'false\'}>',
  '<main className="spatial-world-root" data-mode={worldMode} data-embed={embedded ? \'true\' : \'false\'} data-quality-tier={quality.tier} data-document-visible={quality.documentVisible ? \'true\' : \'false\'}>',
)
replaceOnce(
  'adaptive Canvas settings',
  `<Canvas data-testid="spatial-world-canvas" shadows dpr={[1, 1.7]} gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }} onCreated={({ gl }) => { gl.setPixelRatio(Math.min(window.devicePixelRatio, 1.7)) }}>
            <SpatialScene mode={worldMode} selectedMemory={selectedMemory} onHover={setHoveredMemory} onSelect={setSelectedMemory} onGuide={guide} reducedMotion={reducedMotion} />`,
  `<Canvas
            data-testid="spatial-world-canvas"
            shadows={quality.shadows}
            dpr={[1, quality.pixelRatioMax]}
            frameloop={quality.documentVisible ? 'always' : 'never'}
            gl={{ antialias: quality.antialias, alpha: false, powerPreference: quality.tier === 'high' ? 'high-performance' : 'default' }}
            onCreated={({ gl }) => { gl.setPixelRatio(Math.min(window.devicePixelRatio, quality.pixelRatioMax)) }}
          >
            <SpatialScene
              mode={worldMode}
              selectedMemory={selectedMemory}
              onHover={setHoveredMemory}
              onSelect={setSelectedMemory}
              onGuide={guide}
              reducedMotion={reducedMotion}
              particleCount={quality.particleCount}
              shadows={quality.shadows}
              postprocessing={quality.postprocessing}
            />`,
)

writeFileSync(file, source)
console.log(JSON.stringify({
  ok: true,
  file,
  applied: ['pixelRatioMax', 'particleCount', 'shadows', 'postprocessing', 'antialias', 'documentVisible'],
  trigger: '2026-07-10T13:30:00Z',
}, null, 2))
