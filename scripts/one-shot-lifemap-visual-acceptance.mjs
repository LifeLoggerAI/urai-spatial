import fs from 'node:fs'

const read = (path) => fs.readFileSync(path, 'utf8')
const write = (path, value) => fs.writeFileSync(path, value)
const replaceOnce = (path, before, after) => {
  const source = read(path)
  const first = source.indexOf(before)
  if (first < 0) throw new Error(`Expected source not found in ${path}`)
  if (source.indexOf(before, first + before.length) >= 0) throw new Error(`Expected unique source duplicated in ${path}`)
  write(path, source.slice(0, first) + after + source.slice(first + before.length))
}

const scene = 'urai-tier1/src/components/lifemap/AdaptiveLifeMapScene.tsx'
replaceOnce(scene,
`function ContinuityNexus({ profile }: { profile: SpatialQualityProfile }) {
  const group = useRef<THREE.Group>(null);
  const shards = useMemo(() => [
    { position: [-0.82, 0.4, 0.2] as [number, number, number], scale: [0.18, 1.8, 0.42] as [number, number, number], rotation: [0.22, -0.18, -0.14] as [number, number, number] },
    { position: [-0.28, -0.2, -0.15] as [number, number, number], scale: [0.28, 2.5, 0.58] as [number, number, number], rotation: [-0.12, 0.2, 0.1] as [number, number, number] },
    { position: [0.42, 0.48, 0.08] as [number, number, number], scale: [0.22, 2.05, 0.5] as [number, number, number], rotation: [0.18, -0.1, 0.2] as [number, number, number] },
    { position: [0.92, -0.18, -0.32] as [number, number, number], scale: [0.15, 1.45, 0.36] as [number, number, number], rotation: [-0.24, 0.26, -0.18] as [number, number, number] },
    { position: [0.08, 1.2, -0.45] as [number, number, number], scale: [1.8, 0.12, 0.34] as [number, number, number], rotation: [0.04, -0.2, -0.08] as [number, number, number] },
  ], []);

  useFrame(({ clock }) => {
    if (!group.current || profile.reducedMotion || !profile.documentVisible) return;
    group.current.rotation.y = -0.18 + Math.sin(clock.elapsedTime * 0.05) * 0.035;
    group.current.position.y = 0.2 + Math.sin(clock.elapsedTime * 0.11) * 0.08;
  });

  return (
    <group ref={group} position={[0.45, 0.2, -10.4]} rotation={[0.06, -0.18, -0.04]} name="life-map-continuity-nexus">
      {shards.map((shard, index) => (
        <mesh key={index} position={shard.position} rotation={shard.rotation} scale={shard.scale}>
          <boxGeometry args={[1, 1, 1]} />
          <meshPhysicalMaterial
            color={index % 2 === 0 ? "#071425" : "#0b0c1f"}
            emissive={index === 2 ? "#5ce8ff" : "#342450"}
            emissiveIntensity={index === 2 ? 0.42 : 0.11}
            roughness={0.16}
            metalness={0.72}
            transmission={0.08}
            transparent
            opacity={0.94}
          />
        </mesh>
      ))}
      <mesh position={[0.08, 0.08, 0.18]} rotation={[0, 0.12, 0]}>
        <planeGeometry args={[2.6, 4.5]} />
        <meshBasicMaterial color="#90f5ff" transparent opacity={0.055} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <pointLight position={[0.08, 0.4, 1.2]} color="#9ff7ff" intensity={1.1} distance={8} />
    </group>
  );
}`,
`function ContinuityNexus({ profile }: { profile: SpatialQualityProfile }) {
  const group = useRef<THREE.Group>(null);
  const { size } = useThree();
  const compact = size.width <= 700;
  const shards = useMemo(() => [
    { position: [-0.82, 0.4, 0.2] as [number, number, number], scale: [0.14, 1.35, 0.28] as [number, number, number], rotation: [0.22, -0.18, -0.14] as [number, number, number] },
    { position: [-0.28, -0.2, -0.15] as [number, number, number], scale: [0.2, 1.72, 0.36] as [number, number, number], rotation: [-0.12, 0.2, 0.1] as [number, number, number] },
    { position: [0.42, 0.48, 0.08] as [number, number, number], scale: [0.16, 1.42, 0.32] as [number, number, number], rotation: [0.18, -0.1, 0.2] as [number, number, number] },
    { position: [0.92, -0.18, -0.32] as [number, number, number], scale: [0.12, 1.05, 0.24] as [number, number, number], rotation: [-0.24, 0.26, -0.18] as [number, number, number] },
    { position: [0.08, 1.2, -0.45] as [number, number, number], scale: [1.24, 0.09, 0.22] as [number, number, number], rotation: [0.04, -0.2, -0.08] as [number, number, number] },
  ], []);

  useFrame(({ clock }) => {
    if (!group.current || profile.reducedMotion || !profile.documentVisible) return;
    group.current.rotation.y = -0.18 + Math.sin(clock.elapsedTime * 0.05) * 0.025;
    group.current.position.y = (compact ? -0.08 : 0.15) + Math.sin(clock.elapsedTime * 0.11) * 0.045;
  });

  return (
    <group
      ref={group}
      position={compact ? [0.45, -0.08, -18.8] : [0.45, 0.15, -15.6]}
      scale={compact ? 0.28 : 0.52}
      rotation={[0.06, -0.18, -0.04]}
      name="life-map-continuity-nexus"
    >
      {shards.map((shard, index) => (
        <mesh key={index} position={shard.position} rotation={shard.rotation} scale={shard.scale}>
          <octahedronGeometry args={[1, 0]} />
          <meshPhysicalMaterial
            color={index % 2 === 0 ? "#071425" : "#0b0c1f"}
            emissive={index === 2 ? "#173c4a" : "#221b32"}
            emissiveIntensity={index === 2 ? 0.08 : 0.035}
            roughness={0.32}
            metalness={0.48}
            transmission={0.18}
            transparent
            opacity={0.62}
            depthWrite={false}
          />
        </mesh>
      ))}
      <mesh position={[0.08, 0.08, 0.18]} rotation={[0, 0.12, 0]}>
        <planeGeometry args={[2.2, 3.6]} />
        <meshBasicMaterial color="#90f5ff" transparent opacity={0.018} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <pointLight position={[0.08, 0.4, 1.2]} color="#9ff7ff" intensity={0.26} distance={5} />
    </group>
  );
}`)

replaceOnce(scene,
`  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);
  const scale = 0.72 + node.intensity * 0.24;`,
`  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);
  const textureKey = texture?.uuid ?? "pending";
  const scale = 0.72 + node.intensity * 0.24;`)
replaceOnce(scene,
`        <meshBasicMaterial map={texture ?? undefined} transparent opacity={selected ? 1 : related ? 0.88 : 0.42} toneMapped={false} />`,
`        <meshBasicMaterial key={\`memory-main-\${textureKey}\`} map={texture ?? undefined} transparent opacity={texture ? selected ? 1 : related ? 0.88 : 0.42 : 0} toneMapped={false} />`)
replaceOnce(scene,
`        <meshBasicMaterial map={texture ?? undefined} transparent opacity={selected ? 0.52 : related ? 0.2 : 0.04} depthWrite={false} />`,
`        <meshBasicMaterial key={\`memory-left-\${textureKey}\`} map={texture ?? undefined} transparent opacity={texture ? selected ? 0.52 : related ? 0.2 : 0.04 : 0} depthWrite={false} />`)
replaceOnce(scene,
`        <meshBasicMaterial map={texture ?? undefined} transparent opacity={selected ? 0.42 : related ? 0.16 : 0.03} depthWrite={false} />`,
`        <meshBasicMaterial key={\`memory-right-\${textureKey}\`} map={texture ?? undefined} transparent opacity={texture ? selected ? 0.42 : related ? 0.16 : 0.03 : 0} depthWrite={false} />`)

const canonical = 'urai-tier1/src/spatial/lifemap/SpatialLifeMapCanonical.tsx'
replaceOnce(canonical,
`    <picture aria-hidden="true" data-life-map-authored-universe="primary" style={{ position: "absolute", inset: 0, zIndex: 60, pointerEvents: "none", mixBlendMode: "screen", opacity: .78 }}>
      <source media="(max-width: 700px)" srcSet={lifeMapAssets.mobile.src} />
      <img src={lifeMapAssets.primary.src} alt="" draggable={false} style={{ display: "block", width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", filter: "saturate(1.12) contrast(1.06) brightness(.9)" }} />
    </picture>`,
`    <picture
      aria-hidden="true"
      data-life-map-authored-universe="primary"
      data-life-map-seam-blended="true"
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 60,
        pointerEvents: "none",
        mixBlendMode: "screen",
        opacity: .56,
        WebkitMaskImage: "linear-gradient(to bottom,#000 0%,#000 34%,rgba(0,0,0,.08) 49%,rgba(0,0,0,.08) 51%,#000 66%,#000 100%)",
        maskImage: "linear-gradient(to bottom,#000 0%,#000 34%,rgba(0,0,0,.08) 49%,rgba(0,0,0,.08) 51%,#000 66%,#000 100%)",
      }}
    >
      <source media="(max-width: 700px)" srcSet={lifeMapAssets.mobile.src} />
      <img src={lifeMapAssets.primary.src} alt="" draggable={false} style={{ display: "block", width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", filter: "saturate(1.08) contrast(1.03) brightness(.72)" }} />
    </picture>`)

const proof = 'scripts/capture-continuous-spatial-proof.mjs'
replaceOnce(proof,
`async function waitForStableAnimationFrames(page) {
  await page.evaluate(() => new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve))
  }))
}`,
`async function waitForStableAnimationFrames(page) {
  await page.evaluate(() => new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve))
  }))
}

async function waitForLifeMapVisualReady(page) {
  await waitForFirstSpatialFrame(page)
  await page.waitForTimeout(900)
  await waitForStableAnimationFrames(page)
}`)
replaceOnce(proof,
`    waitForScene: waitForFirstSpatialFrame,`,
`    waitForScene: waitForLifeMapVisualReady,`)
replaceOnce(proof,
`      await waitForFirstSpatialFrame(page)
      await waitForStableAnimationFrames(page)
      await chooseVisibleLifeMapStar(page)`,
`      await waitForLifeMapVisualReady(page)
      await chooseVisibleLifeMapStar(page)`)

const contract = 'urai-tier1/tests/lifemap-scene-behavior.test.mjs'
replaceOnce(contract,
`const eventSource = fs.readFileSync(new URL('../src/components/lifemap/useLifeMapEvents.ts', import.meta.url), 'utf8')`,
`const eventSource = fs.readFileSync(new URL('../src/components/lifemap/useLifeMapEvents.ts', import.meta.url), 'utf8')
const visualProof = fs.readFileSync(new URL('../../scripts/capture-continuous-spatial-proof.mjs', import.meta.url), 'utf8')`)
replaceOnce(contract,
`  assert.ok(source.includes('setTexture(nextTexture)'), 'Committed textures must enter React state only after creation.')`,
`  assert.ok(source.includes('setTexture(nextTexture)'), 'Committed textures must enter React state only after creation.')
  assert.ok(source.includes('const textureKey = texture?.uuid ?? "pending"'), 'Memory materials must remount when their committed texture becomes available.')
  assert.ok(source.includes('key={\`memory-main-\${textureKey}\`}'), 'The dominant memory material must compile with the committed map instead of remaining a white plane.')
  assert.match(source, /opacity=\{texture \? selected \? 1 : related \? 0\.88 : 0\.42 : 0\}/, 'Textureless memory planes must remain invisible until their authored surface is ready.')`)
replaceOnce(contract,
`  assert.ok(canonical.includes('opacity: .78'), 'The authored universe must not regress to a nearly invisible decorative tint.')`,
`  assert.ok(canonical.includes('data-life-map-seam-blended="true"'), 'The authored universe must explicitly blend the baked source seam.')
  assert.ok(canonical.includes('opacity: .56'), 'The authored universe must remain visible without overpowering spatial artifacts.')
  assert.ok(canonical.includes('WebkitMaskImage: "linear-gradient(to bottom'), 'The authored universe must use a center crossfade on WebKit browsers.')
  assert.ok(canonical.includes('maskImage: "linear-gradient(to bottom'), 'The authored universe must use a center crossfade on standards-compliant browsers.')`)
replaceOnce(contract,
`  assert.ok(source.includes('<ContinuityNexus'), 'Life Map must use an asymmetric continuity structure rather than the Home Orb.')`,
`  assert.ok(source.includes('<ContinuityNexus'), 'Life Map must use an asymmetric continuity structure rather than the Home Orb.')
  const continuityBlock = source.match(/function ContinuityNexus[\s\S]*?\n}\n\nfunction ChapterRegions/)?.[0] ?? ''
  assert.ok(continuityBlock.includes('const compact = size.width <= 700'), 'The continuity nexus must move deeper and shrink on phones.')
  assert.ok(continuityBlock.includes('<octahedronGeometry args={[1, 0]} />'), 'The continuity nexus must use restrained shard geometry.')
  assert.doesNotMatch(continuityBlock, /<boxGeometry/, 'The continuity nexus must not render dominant rectangular debug slabs.')
  assert.ok(continuityBlock.includes('position={compact ? [0.45, -0.08, -18.8] : [0.45, 0.15, -15.6]}'), 'The continuity nexus must remain in the far field.')`)
replaceOnce(contract,
`  assert.match(convergenceCss, /prefers-reduced-motion: reduce/, 'Life Map must preserve a reduced-motion equivalent.')`,
`  assert.match(convergenceCss, /prefers-reduced-motion: reduce/, 'Life Map must preserve a reduced-motion equivalent.')
  assert.ok(visualProof.includes('async function waitForLifeMapVisualReady'), 'Visual proof must wait for committed memory surfaces, not only the first WebGL frame.')
  assert.ok(visualProof.includes('await page.waitForTimeout(900)'), 'Visual proof must allow the texture effect and material recompile to paint before capture.')`)
