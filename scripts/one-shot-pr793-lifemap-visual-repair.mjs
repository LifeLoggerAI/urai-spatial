import fs from 'node:fs'

const scenePath = 'urai-tier1/src/components/lifemap/AdaptiveLifeMapScene.tsx'
const testPath = 'urai-tier1/tests/lifemap-scene-behavior.test.mjs'

const read = (path) => fs.readFileSync(path, 'utf8')
const write = (path, value) => fs.writeFileSync(path, value)

function replaceOnce(path, before, after) {
  const source = read(path)
  const first = source.indexOf(before)
  if (first < 0) throw new Error(`Expected source not found in ${path}`)
  if (source.indexOf(before, first + before.length) >= 0) throw new Error(`Expected source duplicated in ${path}`)
  write(path, source.slice(0, first) + after + source.slice(first + before.length))
}

function replaceBetween(path, startMarker, endMarker, replacement) {
  const source = read(path)
  const start = source.indexOf(startMarker)
  if (start < 0) throw new Error(`Start marker not found in ${path}`)
  const end = source.indexOf(endMarker, start)
  if (end < 0) throw new Error(`End marker not found in ${path}`)
  if (source.indexOf(startMarker, start + startMarker.length) >= 0) throw new Error(`Start marker duplicated in ${path}`)
  write(path, source.slice(0, start) + replacement + source.slice(end))
}

const continuityNexus = `function ContinuityNexus({ profile }: { profile: SpatialQualityProfile }) {
  const group = useRef<THREE.Group>(null);
  const threads = useMemo(() => [
    {
      color: "#8befff",
      curve: new THREE.CatmullRomCurve3([
        new THREE.Vector3(-1.9, -0.72, 0.34),
        new THREE.Vector3(-1.18, 0.22, 0.08),
        new THREE.Vector3(-0.34, -0.2, -0.22),
        new THREE.Vector3(0.58, 0.52, -0.52),
        new THREE.Vector3(1.74, 0.08, -0.86),
      ]),
    },
    {
      color: "#b896ff",
      curve: new THREE.CatmullRomCurve3([
        new THREE.Vector3(-1.46, 0.92, -0.48),
        new THREE.Vector3(-0.72, 0.28, -0.1),
        new THREE.Vector3(0.12, 0.36, -0.42),
        new THREE.Vector3(0.94, -0.48, -0.68),
        new THREE.Vector3(1.46, -0.92, -1.06),
      ]),
    },
    {
      color: "#ffe6a8",
      curve: new THREE.CatmullRomCurve3([
        new THREE.Vector3(-1.12, -1.02, -0.72),
        new THREE.Vector3(-0.54, -0.38, -0.22),
        new THREE.Vector3(0.18, -0.04, -0.54),
        new THREE.Vector3(0.74, 0.72, -0.88),
        new THREE.Vector3(1.22, 1.06, -1.22),
      ]),
    },
  ], []);
  const anchors = useMemo(() => [
    { position: [-1.9, -0.72, 0.34] as [number, number, number], radius: 0.055, color: "#dffcff" },
    { position: [-1.18, 0.22, 0.08] as [number, number, number], radius: 0.04, color: "#8befff" },
    { position: [-0.34, -0.2, -0.22] as [number, number, number], radius: 0.047, color: "#efffff" },
    { position: [0.18, -0.04, -0.54] as [number, number, number], radius: 0.038, color: "#ffe6a8" },
    { position: [0.58, 0.52, -0.52] as [number, number, number], radius: 0.052, color: "#b896ff" },
    { position: [0.94, -0.48, -0.68] as [number, number, number], radius: 0.042, color: "#dffcff" },
    { position: [1.74, 0.08, -0.86] as [number, number, number], radius: 0.058, color: "#8befff" },
    { position: [1.22, 1.06, -1.22] as [number, number, number], radius: 0.036, color: "#ffe6a8" },
  ], []);

  useFrame(({ clock }) => {
    if (!group.current || profile.reducedMotion || !profile.documentVisible) return;
    group.current.rotation.y = -0.12 + Math.sin(clock.elapsedTime * 0.038) * 0.026;
    group.current.rotation.z = Math.cos(clock.elapsedTime * 0.031) * 0.012;
    group.current.position.y = 0.12 + Math.sin(clock.elapsedTime * 0.09) * 0.045;
  });

  return (
    <group ref={group} position={[0.45, 0.12, -10.4]} rotation={[0.03, -0.12, -0.02]} name="life-map-continuity-nexus">
      {threads.map((thread, index) => (
        <mesh key={thread.color} name="life-map-continuity-thread">
          <tubeGeometry args={[thread.curve, 72, index === 0 ? 0.018 : 0.012, 8, false]} />
          <meshBasicMaterial
            color={thread.color}
            transparent
            opacity={index === 0 ? 0.32 : 0.2}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
      {anchors.map((anchor, index) => (
        <group key={index} position={anchor.position} name="life-map-continuity-anchor">
          <mesh>
            <sphereGeometry args={[anchor.radius, 18, 18]} />
            <meshBasicMaterial color={anchor.color} transparent opacity={0.86} depthWrite={false} blending={THREE.AdditiveBlending} />
          </mesh>
          {index === 2 || index === 4 || index === 6 ? (
            <pointLight color={anchor.color} intensity={0.34} distance={2.8} />
          ) : null}
        </group>
      ))}
    </group>
  );
}`

replaceBetween(
  scenePath,
  'function ContinuityNexus({ profile }: { profile: SpatialQualityProfile }) {',
  '\n\nfunction ChapterRegions',
  continuityNexus,
)

replaceOnce(
  scenePath,
  '  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);\n  const scale = 0.72 + node.intensity * 0.24;\n',
  '  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);\n  const scale = 0.72 + node.intensity * 0.24;\n  const textureKey = texture?.uuid ?? `pending-${node.id}-${textureResolution}`;\n',
)

replaceOnce(
  scenePath,
  '        <meshBasicMaterial map={texture ?? undefined} transparent opacity={selected ? 1 : related ? 0.88 : 0.42} toneMapped={false} />',
  `        <meshBasicMaterial
          key={\`\${textureKey}-main\`}
          map={texture ?? undefined}
          color={texture ? "#ffffff" : "#071425"}
          transparent
          opacity={texture ? selected ? 1 : related ? 0.88 : 0.42 : 0.1}
          toneMapped={false}
          depthWrite={false}
        />`,
)

replaceOnce(
  scenePath,
  '        <meshBasicMaterial map={texture ?? undefined} transparent opacity={selected ? 0.52 : related ? 0.2 : 0.04} depthWrite={false} />',
  `        <meshBasicMaterial
          key={\`\${textureKey}-left\`}
          map={texture ?? undefined}
          color={texture ? "#ffffff" : "#071425"}
          transparent
          opacity={texture ? selected ? 0.52 : related ? 0.2 : 0.04 : 0}
          toneMapped={false}
          depthWrite={false}
        />`,
)

replaceOnce(
  scenePath,
  '        <meshBasicMaterial map={texture ?? undefined} transparent opacity={selected ? 0.42 : related ? 0.16 : 0.03} depthWrite={false} />',
  `        <meshBasicMaterial
          key={\`\${textureKey}-right\`}
          map={texture ?? undefined}
          color={texture ? "#ffffff" : "#071425"}
          transparent
          opacity={texture ? selected ? 0.42 : related ? 0.16 : 0.03 : 0}
          toneMapped={false}
          depthWrite={false}
        />`,
)

const testMarker = "test('LifeMap visual correction removes debug slabs and remounts authored textures'"
const testSource = read(testPath)
if (testSource.includes(testMarker)) throw new Error('Visual repair contract already exists')
const contract = [
  "test('LifeMap visual correction removes debug slabs and remounts authored textures', () => {",
  "  const nexusStart = source.indexOf('function ContinuityNexus')",
  "  const nexusEnd = source.indexOf('function ChapterRegions', nexusStart)",
  '  const nexus = source.slice(nexusStart, nexusEnd)',
  '  assert.match(nexus, /life-map-continuity-thread/)',
  '  assert.match(nexus, /life-map-continuity-anchor/)',
  '  assert.match(nexus, /CatmullRomCurve3/)',
  '  assert.doesNotMatch(nexus, /boxGeometry|planeGeometry/)',
  '  assert.doesNotMatch(nexus, /#5ce8ff|#90f5ff/)',
  '  assert.match(source, /const textureKey = texture\\?\\.uuid/)',
  "  assert.match(source, /key=\\{`\\$\\{textureKey\\}-main`\\}/)",
  '  assert.match(source, /color=\\{texture \\? "#ffffff" : "#071425"\\}/)',
  '  assert.match(source, /opacity=\\{texture \\? selected \\? 1/)',
  '  assert.doesNotMatch(source, /<meshBasicMaterial map=\\{texture \\?\\? undefined\\} transparent opacity=/)',
  '})',
]
write(testPath, `${testSource.trimEnd()}\n\n${contract.join('\n')}\n`)
