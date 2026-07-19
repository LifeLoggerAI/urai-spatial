import fs from 'node:fs'

const read = (path) => fs.readFileSync(path, 'utf8')
const write = (path, value) => fs.writeFileSync(path, value)

function replaceOnce(path, before, after) {
  const source = read(path)
  const first = source.indexOf(before)
  if (first < 0) throw new Error(`Expected source not found in ${path}: ${before.slice(0, 120)}`)
  if (source.indexOf(before, first + before.length) >= 0) throw new Error(`Expected unique source duplicated in ${path}: ${before.slice(0, 120)}`)
  write(path, source.slice(0, first) + after + source.slice(first + before.length))
}

function replaceRegexOnce(path, pattern, after) {
  const source = read(path)
  const matches = [...source.matchAll(new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`))]
  if (matches.length !== 1) throw new Error(`Expected one regex match in ${path}; found ${matches.length}: ${pattern}`)
  write(path, source.replace(pattern, after))
}

const scene = 'urai-tier1/src/components/lifemap/AdaptiveLifeMapScene.tsx'

replaceOnce(scene,
`type MemoryPortalHandlers = {
  onEnterFocus: (node: LifeMapNode) => void;
  onEnterReplay: (node: LifeMapNode) => void;
  onOverview: () => void;
};`,
`type MemoryPortalHandlers = {
  onEnterFocus: (node: LifeMapNode) => void;
  onEnterReplay: (node: LifeMapNode) => void;
  onOverview: () => void;
};

type TextureReadinessHandlers = {
  onTextureCommitted: (nodeId: string) => void;
  onTextureInvalidated: (nodeId: string) => void;
};`)

replaceOnce(scene,
`const LIFE_MAP_STATE_KEY = "urai:spatial:lifeMapState";
const DEFAULT_MANIFEST_ID = "replay-recovery-thread";`,
`const LIFE_MAP_STATE_KEY = "urai:spatial:lifeMapState";
const DEFAULT_MANIFEST_ID = "replay-recovery-thread";
const LIFE_MAP_VISUAL_READY_MARK = "urai:life-map-visual-ready";
const LIFE_MAP_VISUAL_READY_EVENT = "urai:life-map-visual-ready";`)

replaceOnce(scene,
`function FirstFrame({ profile }: { profile: SpatialQualityProfile }) {
  const marked = useRef(false);
  useFrame(() => {
    if (marked.current || !profile.documentVisible) return;
    marked.current = true;
    markFirstSpatialFrame("/life-map", profile.tier);
  });
  return null;
}`,
`function FirstFrame({ profile }: { profile: SpatialQualityProfile }) {
  const marked = useRef(false);
  useFrame(() => {
    if (marked.current || !profile.documentVisible) return;
    marked.current = true;
    markFirstSpatialFrame("/life-map", profile.tier);
  });
  return null;
}

function VisualReadyMarker({ ready, generationKey }: { ready: boolean; generationKey: string }) {
  const committedFrames = useRef(0);
  const marked = useRef(false);

  useEffect(() => {
    committedFrames.current = 0;
    marked.current = false;
    if (typeof performance !== "undefined") performance.clearMarks(LIFE_MAP_VISUAL_READY_MARK);
  }, [generationKey]);

  useFrame(() => {
    if (!ready || marked.current || document.visibilityState === "hidden") return;
    committedFrames.current += 1;
    if (committedFrames.current < 2) return;
    performance.clearMarks(LIFE_MAP_VISUAL_READY_MARK);
    performance.mark(LIFE_MAP_VISUAL_READY_MARK);
    window.dispatchEvent(new CustomEvent(LIFE_MAP_VISUAL_READY_EVENT, { detail: { generationKey } }));
    marked.current = true;
  });

  return null;
}`)

replaceRegexOnce(scene,
/function ContinuityNexus\(\{ profile \}: \{ profile: SpatialQualityProfile \}\) \{[\s\S]*?\n\}\n\nfunction ChapterRegions/,
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
}

function ChapterRegions`)

replaceOnce(scene,
`function MemoryArtifact({ node, selected, related, overview, profile, onSelect, onEnterFocus, onEnterReplay, onOverview }: {
  node: LifeMapNode;
  selected: boolean;
  related: boolean;
  overview: boolean;
  profile: SpatialQualityProfile;
  onSelect: (node: LifeMapNode) => void;
} & MemoryPortalHandlers) {`,
`function MemoryArtifact({ node, selected, related, overview, profile, onSelect, onEnterFocus, onEnterReplay, onOverview, onTextureCommitted, onTextureInvalidated }: {
  node: LifeMapNode;
  selected: boolean;
  related: boolean;
  overview: boolean;
  profile: SpatialQualityProfile;
  onSelect: (node: LifeMapNode) => void;
} & MemoryPortalHandlers & TextureReadinessHandlers) {`)

replaceOnce(scene,
`  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);
  const scale = 0.72 + node.intensity * 0.24;

  useEffect(() => {
    const nextTexture = createMemorySurface(node, textureResolution);
    setTexture(nextTexture);
    return () => {
      if (typeof window === "undefined") {
        nextTexture?.dispose();
        return;
      }
      window.requestAnimationFrame(() => nextTexture?.dispose());
    };
  }, [node, textureResolution]);`,
`  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);
  const textureKey = texture?.uuid ?? "pending";
  const scale = 0.72 + node.intensity * 0.24;

  useEffect(() => {
    onTextureInvalidated(node.id);
    const nextTexture = createMemorySurface(node, textureResolution);
    setTexture(nextTexture);
    return () => {
      onTextureInvalidated(node.id);
      if (typeof window === "undefined") {
        nextTexture?.dispose();
        return;
      }
      window.requestAnimationFrame(() => nextTexture?.dispose());
    };
  }, [node, onTextureInvalidated, textureResolution]);

  useEffect(() => {
    if (texture) onTextureCommitted(node.id);
  }, [node.id, onTextureCommitted, texture]);`)

replaceOnce(scene,
`        <meshBasicMaterial map={texture ?? undefined} color={texture ? "#ffffff" : "#06101f"} transparent opacity={texture ? (selected ? 1 : related ? 0.88 : 0.42) : (selected ? 0.68 : related ? 0.3 : 0.12)} toneMapped={false} />`,
`        <meshBasicMaterial key={\`memory-main-\${textureKey}\`} map={texture ?? undefined} color={texture ? "#ffffff" : "#06101f"} transparent opacity={texture ? (selected ? 1 : related ? 0.88 : 0.42) : 0} toneMapped={false} />`)
replaceOnce(scene,
`        <meshBasicMaterial map={texture ?? undefined} color={texture ? "#ffffff" : "#06101f"} transparent opacity={texture ? (selected ? 0.52 : related ? 0.2 : 0.04) : 0} depthWrite={false} />`,
`        <meshBasicMaterial key={\`memory-left-\${textureKey}\`} map={texture ?? undefined} color={texture ? "#ffffff" : "#06101f"} transparent opacity={texture ? (selected ? 0.52 : related ? 0.2 : 0.04) : 0} depthWrite={false} />`)
replaceOnce(scene,
`        <meshBasicMaterial map={texture ?? undefined} color={texture ? "#ffffff" : "#06101f"} transparent opacity={texture ? (selected ? 0.42 : related ? 0.16 : 0.03) : 0} depthWrite={false} />`,
`        <meshBasicMaterial key={\`memory-right-\${textureKey}\`} map={texture ?? undefined} color={texture ? "#ffffff" : "#06101f"} transparent opacity={texture ? (selected ? 0.42 : related ? 0.16 : 0.03) : 0} depthWrite={false} />`)

replaceOnce(scene,
`function LifeMapWorld({ nodes, selectedNode, profile, cameraIntent, onSelect, onEnterFocus, onEnterReplay, onOverview }: {
  nodes: LifeMapNode[];
  selectedNode: LifeMapNode | null;
  profile: SpatialQualityProfile;
  cameraIntent: CameraIntent;
  onSelect: (node: LifeMapNode) => void;
} & MemoryPortalHandlers) {`,
`function LifeMapWorld({ nodes, selectedNode, profile, cameraIntent, visualGenerationKey, visualReadyEligible, onSelect, onEnterFocus, onEnterReplay, onOverview }: {
  nodes: LifeMapNode[];
  selectedNode: LifeMapNode | null;
  profile: SpatialQualityProfile;
  cameraIntent: CameraIntent;
  visualGenerationKey: string;
  visualReadyEligible: boolean;
  onSelect: (node: LifeMapNode) => void;
} & MemoryPortalHandlers) {`)

replaceOnce(scene,
`  const nodeById = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);`,
`  const nodeById = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const [readyTextureIds, setReadyTextureIds] = useState<Set<string>>(() => new Set());
  const onTextureCommitted = useCallback((nodeId: string) => {
    setReadyTextureIds((current) => current.has(nodeId) ? current : new Set(current).add(nodeId));
  }, []);
  const onTextureInvalidated = useCallback((nodeId: string) => {
    setReadyTextureIds((current) => {
      if (!current.has(nodeId)) return current;
      const next = new Set(current);
      next.delete(nodeId);
      return next;
    });
  }, []);
  const requiredTexturesReady = nodes.length > 0
    && readyTextureIds.size === nodes.length
    && (!selectedNode || readyTextureIds.has(selectedNode.id));`)

replaceOnce(scene,
`      <FirstFrame profile={profile} />`,
`      <FirstFrame profile={profile} />
      <VisualReadyMarker
        ready={visualReadyEligible && profile.documentVisible && requiredTexturesReady}
        generationKey={visualGenerationKey}
      />`)

replaceOnce(scene,
`            onSelect={onSelect}
            onEnterFocus={onEnterFocus}`, 
`            onSelect={onSelect}
            onTextureCommitted={onTextureCommitted}
            onTextureInvalidated={onTextureInvalidated}
            onEnterFocus={onEnterFocus}`)

replaceOnce(scene,
`  const stableCanvas = useRef({ antialias: profile.antialias, pixelRatioMax: profile.pixelRatioMax });`,
`  const stableCanvas = useRef({ antialias: profile.antialias, pixelRatioMax: profile.pixelRatioMax });
  const visualGenerationKey = \`${webglState}:\${profile.tier}:\${selectedNode?.id ?? "overview"}:\${nodes.length}\`;

  useEffect(() => {
    if (typeof performance !== "undefined") performance.clearMarks(LIFE_MAP_VISUAL_READY_MARK);
  }, [visualGenerationKey]);`)

replaceOnce(scene,
`        <LifeMapWorld
          nodes={nodes}`, 
`        <LifeMapWorld
          key={visualGenerationKey}
          nodes={nodes}`)
replaceOnce(scene,
`          cameraIntent={cameraIntent}
          onSelect={selectNode}`, 
`          cameraIntent={cameraIntent}
          visualGenerationKey={visualGenerationKey}
          visualReadyEligible={webglState === "ready"}
          onSelect={selectNode}`)

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
  await page.waitForFunction(
    () => performance.getEntriesByName('urai:life-map-visual-ready').length > 0,
    null,
    { timeout: 45_000 },
  )
}`)
replaceOnce(proof, `    waitForScene: waitForFirstSpatialFrame,`, `    waitForScene: waitForLifeMapVisualReady,`)
replaceOnce(proof,
`    waitForScene: async (page) => {
      await waitForFirstSpatialFrame(page)
      await waitForStableAnimationFrames(page)
      await chooseVisibleLifeMapStar(page)
    },`,
`    waitForScene: async (page) => {
      await waitForLifeMapVisualReady(page)
      const selectedControl = page.getByRole('button', { name: 'Enter Focus' }).first()
      if (!await selectedControl.isVisible().catch(() => false)) {
        await chooseVisibleLifeMapStar(page)
        await waitForLifeMapVisualReady(page)
      }
    },`)
replaceOnce(proof,
`      const firstSpatialFrameMarked = await page.evaluate(() => performance.getEntriesByName('urai:first-spatial-frame').length > 0)`,
`      const firstSpatialFrameMarked = await page.evaluate(() => performance.getEntriesByName('urai:first-spatial-frame').length > 0)
      const visualReadyMarked = await page.evaluate(() => performance.getEntriesByName('urai:life-map-visual-ready').length > 0)`)
replaceOnce(proof,
`        firstSpatialFrameMarked,
        spatialDocumentVisible: spatialVisible === 'true',`,
`        firstSpatialFrameMarked,
        visualReadyMarked,
        spatialDocumentVisible: spatialVisible === 'true',`)
replaceOnce(proof,
`      const firstSpatialFrameMarked = await page.evaluate(() => performance.getEntriesByName('urai:first-spatial-frame').length > 0)
      const selectedControls`,
`      const firstSpatialFrameMarked = await page.evaluate(() => performance.getEntriesByName('urai:first-spatial-frame').length > 0)
      const visualReadyMarked = await page.evaluate(() => performance.getEntriesByName('urai:life-map-visual-ready').length > 0)
      const selectedControls`)
replaceOnce(proof,
`        firstSpatialFrameMarked,
        selectedMemoryControlsVisible,`,
`        firstSpatialFrameMarked,
        visualReadyMarked,
        selectedMemoryControlsVisible,`)

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

const accessibility = 'urai-tier1/tests/accessibility-performance-source-contract.test.mjs'
replaceOnce(accessibility,
`  requireNormalizedPattern(ground, /inline:\\s*'center'/, 'Ground focus reveal must center the destination inline')`,
`  requireNormalizedPattern(ground, /inline:\\s*'nearest'/, 'Ground focus reveal must keep the destination inside the nearest mobile-safe inline boundary')`)

const fallbackContract = 'urai-tier1/tests/lifemap-material-fallback-contract.test.mjs'
write(fallbackContract, `import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(
  path.join(here, "../src/components/lifemap/AdaptiveLifeMapScene.tsx"),
  "utf8",
);

test("Life Map texture-backed materials never expose default-white loading planes", () => {
  assert.equal(source.includes('map={texture ?? undefined} transparent'), false);
  assert.equal((source.match(/color={texture ? "#ffffff" : "#06101f"}/g) || []).length, 3);
  assert.match(source, /key={\\`memory-main-\\${textureKey}\\`}/);
  assert.match(source, /key={\\`memory-left-\\${textureKey}\\`}/);
  assert.match(source, /key={\\`memory-right-\\${textureKey}\\`}/);
  assert.match(source, /opacity={texture ? \\(selected ? 1 : related ? 0\\.88 : 0\\.42\\) : 0}/);
  assert.equal((source.match(/opacity={texture ? \\(selected ? 0\\.(?:52|42).*?\\) : 0}/g) || []).length, 2);
});
`)

const readinessContract = 'urai-tier1/tests/lifemap-visual-readiness-contract.test.mjs'
if (fs.existsSync(readinessContract)) throw new Error(`${readinessContract} already exists`)
write(readinessContract, `import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const scene = fs.readFileSync(path.join(here, '../src/components/lifemap/AdaptiveLifeMapScene.tsx'), 'utf8')
const proof = fs.readFileSync(path.join(here, '../../scripts/capture-continuous-spatial-proof.mjs'), 'utf8')
const canonical = fs.readFileSync(path.join(here, '../src/spatial/lifemap/SpatialLifeMapCanonical.tsx'), 'utf8')

test('Life Map visual readiness is deterministic and resets with visual ownership', () => {
  assert.match(scene, /LIFE_MAP_VISUAL_READY_MARK = "urai:life-map-visual-ready"/)
  assert.match(scene, /committedFrames\\.current < 2/)
  assert.match(scene, /performance\\.clearMarks\\(LIFE_MAP_VISUAL_READY_MARK\\)/)
  assert.match(scene, /performance\\.mark\\(LIFE_MAP_VISUAL_READY_MARK\\)/)
  assert.match(scene, /onTextureInvalidated\\(node\\.id\\)/)
  assert.match(scene, /onTextureCommitted\\(node\\.id\\)/)
  assert.match(scene, /readyTextureIds\\.size === nodes\\.length/)
  assert.match(scene, /visualReadyEligible={webglState === "ready"}/)
  assert.match(scene, /key={visualGenerationKey}/)
  assert.match(proof, /async function waitForLifeMapVisualReady/)
  assert.match(proof, /getEntriesByName\\('urai:life-map-visual-ready'\\)/)
  assert.doesNotMatch(proof, /waitForTimeout\\(/)
})

test('Life Map composition cannot regress to white planes, a cyan slab, or an authored seam', () => {
  const continuity = scene.match(/function ContinuityNexus[\\s\\S]*?\\n}\\n\\nfunction ChapterRegions/)?.[0] ?? ''
  assert.match(continuity, /const compact = size\\.width <= 700/)
  assert.match(continuity, /<octahedronGeometry args={\\[1, 0\\]} \\/>/)
  assert.doesNotMatch(continuity, /<boxGeometry/)
  assert.match(continuity, /position={compact ? \\[0\\.45, -0\\.08, -18\\.8\\] : \\[0\\.45, 0\\.15, -15\\.6\\]}/)
  assert.match(canonical, /data-life-map-seam-blended="true"/)
  assert.match(canonical, /WebkitMaskImage: "linear-gradient\\(to bottom/)
  assert.match(canonical, /maskImage: "linear-gradient\\(to bottom/)
})
`)

console.log('Applied deterministic Life Map visual readiness, composition, and accessibility repair.')
