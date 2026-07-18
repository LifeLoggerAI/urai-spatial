import fs from 'node:fs'

const read = (path) => fs.readFileSync(path, 'utf8')
const write = (path, value) => fs.writeFileSync(path, value)

function replaceOnce(path, before, after) {
  const source = read(path)
  const first = source.indexOf(before)
  if (first < 0) throw new Error(`Expected source not found in ${path}`)
  if (source.indexOf(before, first + before.length) >= 0) {
    throw new Error(`Expected source duplicated in ${path}`)
  }
  write(path, source.slice(0, first) + after + source.slice(first + before.length))
}

const scene = 'urai-tier1/src/components/lifemap/AdaptiveLifeMapScene.tsx'

replaceOnce(
  scene,
  `      <mesh position={[0.08, 0.08, 0.18]} rotation={[0, 0.12, 0]}>
        <planeGeometry args={[2.6, 4.5]} />
        <meshBasicMaterial color="#90f5ff" transparent opacity={0.055} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
`,
  ``,
)

replaceOnce(
  scene,
  `    <group ref={group} position={[0, 0.3, -8]} name="life-map-emotional-weather">
      <mesh position={[-3.4, 1.1, -0.8]} rotation={[0.18, -0.28, 0.12]}>
        <planeGeometry args={[9.2, 4.8]} />
        <meshBasicMaterial color="#4fdfff" transparent opacity={0.026} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh position={[3.5, -0.4, -1.8]} rotation={[-0.12, 0.32, -0.18]}>
        <planeGeometry args={[10.8, 5.6]} />
        <meshBasicMaterial color="#b177ff" transparent opacity={0.035} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh position={[0.8, 2.4, -4.2]} rotation={[0.14, 0.08, 0.2]}>
        <planeGeometry args={[8.4, 3.2]} />
        <meshBasicMaterial color="#fff1bd" transparent opacity={0.018} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>`,
  `    <group ref={group} position={[0, 0.3, -8]} name="life-map-emotional-weather">
      <pointLight position={[-3.4, 1.1, -0.8]} color="#4fdfff" intensity={0.24} distance={13} decay={2} />
      <pointLight position={[3.5, -0.4, -1.8]} color="#b177ff" intensity={0.2} distance={15} decay={2} />
      <pointLight position={[0.8, 2.4, -4.2]} color="#fff1bd" intensity={0.12} distance={11} decay={2} />
    </group>`,
)

const contract = 'urai-tier1/tests/lifemap-visual-material-contract.test.mjs'
const contractSource = read(contract)
if (contractSource.includes("Life Map atmosphere cannot use viewport-scale translucent planes")) {
  throw new Error('Seam-free atmosphere contract already present')
}
write(contract, `${contractSource.trimEnd()}\n\ntest('Life Map atmosphere cannot use viewport-scale translucent planes', () => {\n  assert.doesNotMatch(scene, /<planeGeometry args=\\{\\[2\\.6, 4\\.5\\]\\}/, 'Continuity Nexus must not mount a rectangular glow sheet')\n  assert.doesNotMatch(scene, /<planeGeometry args=\\{\\[(?:9\\.2, 4\\.8|10\\.8, 5\\.6|8\\.4, 3\\.2)\\]\\}/, 'Emotional weather must not use viewport-scale additive planes')\n  assert.match(scene, /name=\"life-map-emotional-weather\"/)\n  assert.match(scene, /color=\"#4fdfff\" intensity=\\{0\\.24\\} distance=\\{13\\}/)\n  assert.match(scene, /color=\"#b177ff\" intensity=\\{0\\.2\\} distance=\\{15\\}/)\n  assert.match(scene, /color=\"#fff1bd\" intensity=\\{0\\.12\\} distance=\\{11\\}/)\n})\n`)
