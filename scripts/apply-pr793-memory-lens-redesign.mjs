import fs from 'node:fs'

const read = (path) => fs.readFileSync(path, 'utf8')
const write = (path, value) => fs.writeFileSync(path, value)

function replaceOnce(path, before, after) {
  const source = read(path)
  const first = source.indexOf(before)
  if (first < 0) throw new Error(`Expected source not found in ${path}`)
  if (source.indexOf(before, first + before.length) >= 0) throw new Error(`Expected unique source duplicated in ${path}`)
  write(path, source.slice(0, first) + after + source.slice(first + before.length))
}

function replaceBetween(path, startMarker, endMarker, replacement) {
  const source = read(path)
  const start = source.indexOf(startMarker)
  const end = source.indexOf(endMarker, start + startMarker.length)
  if (start < 0 || end < 0) throw new Error(`Expected bounded source not found in ${path}`)
  write(path, source.slice(0, start) + replacement + source.slice(end))
}

function appendOnce(path, marker, addition) {
  const source = read(path)
  if (source.includes(marker)) throw new Error(`Marker already present in ${path}`)
  write(path, `${source.trimEnd()}\n\n${addition.trim()}\n`)
}

const lifeMap = 'urai-tier1/src/components/lifemap/AdaptiveLifeMapScene.tsx'

replaceBetween(
  lifeMap,
  'function roundedRect',
  'function FirstFrame',
  `function hexToRgba(hex: string, alpha: number) {
  const value = hex.replace("#", "");
  const normalized = value.length === 3 ? value.split("").map((part) => part + part).join("") : value.padEnd(6, "0").slice(0, 6);
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return \`rgba(138, 223, 255, \${alpha})\`;
  const number = Number.parseInt(normalized, 16);
  const red = (number >> 16) & 255;
  const green = (number >> 8) & 255;
  const blue = number & 255;
  return \`rgba(\${red}, \${green}, \${blue}, \${alpha})\`;
}

function memoryLensPath(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  outerRadius: number,
  innerRadius: number,
  points = 12,
  phase = 0,
) {
  ctx.beginPath();
  for (let index = 0; index < points * 2; index += 1) {
    const radius = index % 2 === 0 ? outerRadius : innerRadius;
    const angle = phase - Math.PI / 2 + (index * Math.PI) / points;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function createMemorySurface(node: LifeMapNode, resolution: number) {
  if (typeof document === "undefined") return null;

  const canvas = document.createElement("canvas");
  canvas.width = resolution;
  canvas.height = resolution;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const designScale = resolution / 768;
  ctx.scale(designScale, designScale);

  const centerX = 384;
  const centerY = 352;
  const outerRadius = 306;
  const innerRadius = 270;
  const aura = node.aura || "#8adfff";
  const phase = ((node.id.length + node.title.length) % 12) * 0.025;

  const auraGlow = ctx.createRadialGradient(centerX, centerY, 54, centerX, centerY, 372);
  auraGlow.addColorStop(0, hexToRgba(aura, 0.2));
  auraGlow.addColorStop(0.58, hexToRgba(aura, 0.1));
  auraGlow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = auraGlow;
  ctx.fillRect(0, 0, 768, 768);

  const deep = ctx.createRadialGradient(322, 252, 18, centerX, centerY, 340);
  deep.addColorStop(0, "rgba(218,250,255,.92)");
  deep.addColorStop(0.08, hexToRgba(aura, 0.84));
  deep.addColorStop(0.34, "rgba(12,34,63,.98)");
  deep.addColorStop(0.72, "rgba(4,12,31,.99)");
  deep.addColorStop(1, "rgba(1,3,12,1)");

  memoryLensPath(ctx, centerX, centerY, outerRadius, innerRadius, 12, phase);
  ctx.fillStyle = deep;
  ctx.fill();

  ctx.save();
  memoryLensPath(ctx, centerX, centerY, outerRadius - 14, innerRadius - 16, 12, phase);
  ctx.clip();

  const horizon = ctx.createLinearGradient(0, 118, 0, 670);
  horizon.addColorStop(0, "rgba(255,255,255,.055)");
  horizon.addColorStop(0.46, hexToRgba(aura, 0.08));
  horizon.addColorStop(1, "rgba(0,0,0,.84)");
  ctx.fillStyle = horizon;
  ctx.fillRect(64, 54, 640, 650);

  for (let index = 0; index < 64; index += 1) {
    const angle = index * 2.399963229728653 + node.id.length * 0.17;
    const radial = 44 + ((index * 47) % 245);
    const x = centerX + Math.cos(angle) * radial;
    const y = centerY + Math.sin(angle * 1.13) * radial * 0.78;
    const radius = 1.1 + (index % 5) * 0.62;
    ctx.fillStyle = index % 5 === 0 ? "rgba(255,255,255,.86)" : hexToRgba(aura, 0.38 + (index % 3) * 0.08);
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalCompositeOperation = "screen";
  if (node.type === "relationship") {
    ctx.fillStyle = "rgba(245,252,255,.62)";
    ctx.beginPath();
    ctx.arc(300, 314, 58, 0, Math.PI * 2);
    ctx.arc(474, 292, 66, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = hexToRgba(aura, 0.72);
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(350, 306);
    ctx.bezierCurveTo(382, 258, 430, 360, 446, 310);
    ctx.stroke();
  } else if (node.type === "threshold") {
    ctx.fillStyle = hexToRgba(aura, 0.34);
    ctx.beginPath();
    ctx.moveTo(384, 130);
    ctx.lineTo(554, 468);
    ctx.lineTo(214, 468);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.54)";
    ctx.fillRect(370, 246, 28, 240);
  } else if (node.type === "ritual") {
    ctx.strokeStyle = hexToRgba(aura, 0.64);
    ctx.lineWidth = 8;
    for (let ring = 0; ring < 4; ring += 1) {
      ctx.beginPath();
      ctx.ellipse(centerX, 350, 92 + ring * 46, 26 + ring * 12, -0.08, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (node.type === "recovery") {
    ctx.strokeStyle = hexToRgba(aura, 0.74);
    ctx.lineWidth = 7;
    for (let arc = 0; arc < 5; arc += 1) {
      ctx.beginPath();
      ctx.arc(centerX, 396, 54 + arc * 42, Math.PI * 1.06, Math.PI * 1.94);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(245,255,255,.68)";
    ctx.beginPath();
    ctx.arc(centerX, 334, 54, 0, Math.PI * 2);
    ctx.fill();
  } else if (node.type === "forecast") {
    ctx.strokeStyle = hexToRgba(aura, 0.68);
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(192, 470);
    ctx.bezierCurveTo(270, 408, 336, 450, 402, 342);
    ctx.bezierCurveTo(478, 220, 544, 286, 602, 176);
    ctx.stroke();
  } else if (node.type === "legacy") {
    ctx.fillStyle = "rgba(3,9,24,.66)";
    for (let layer = 0; layer < 5; layer += 1) {
      const inset = layer * 28;
      ctx.fillRect(210 + inset, 190 + inset * 0.52, 348 - inset * 2, 252 - inset);
      ctx.strokeStyle = hexToRgba(aura, 0.3 + layer * 0.06);
      ctx.lineWidth = 4;
      ctx.strokeRect(210 + inset, 190 + inset * 0.52, 348 - inset * 2, 252 - inset);
    }
  } else {
    const glow = ctx.createRadialGradient(334, 278, 16, centerX, 344, 250);
    glow.addColorStop(0, "rgba(255,255,255,.84)");
    glow.addColorStop(0.24, hexToRgba(aura, 0.62));
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(112, 92, 544, 494);

    ctx.strokeStyle = "rgba(235,251,255,.48)";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(184, 456);
    ctx.bezierCurveTo(260, 390, 326, 486, 408, 412);
    ctx.bezierCurveTo(476, 352, 542, 384, 600, 306);
    ctx.stroke();
  }

  ctx.globalCompositeOperation = "source-over";
  const lower = ctx.createLinearGradient(0, 422, 0, 650);
  lower.addColorStop(0, "rgba(1,5,16,0)");
  lower.addColorStop(1, "rgba(1,5,16,.9)");
  ctx.fillStyle = lower;
  ctx.fillRect(94, 402, 580, 260);

  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(216,247,255,.7)";
  ctx.font = "800 19px system-ui, sans-serif";
  ctx.fillText(lifeMapTypeLabels[node.type].toUpperCase(), centerX, 528);

  ctx.fillStyle = "rgba(255,255,255,.98)";
  ctx.font = "800 34px system-ui, sans-serif";
  const title = node.title.length > 26 ? \`\${node.title.slice(0, 24)}…\` : node.title;
  ctx.fillText(title, centerX, 574);

  ctx.fillStyle = "rgba(219,241,255,.7)";
  ctx.font = "650 20px system-ui, sans-serif";
  ctx.fillText(node.dateLabel, centerX, 610);
  ctx.restore();

  memoryLensPath(ctx, centerX, centerY, outerRadius, innerRadius, 12, phase);
  ctx.strokeStyle = "rgba(225,251,255,.5)";
  ctx.lineWidth = 5;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(centerX, centerY, innerRadius - 18, 0, Math.PI * 2);
  ctx.strokeStyle = hexToRgba(aura, 0.24);
  ctx.lineWidth = 3;
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = resolution >= 384 ? 8 : 4;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = resolution >= 128;
  texture.premultiplyAlpha = true;
  texture.needsUpdate = true;
  return texture;
}

`,
)

replaceBetween(
  lifeMap,
  'function MemoryArtifact',
  'function ForegroundDepthCrossings',
  `function MemoryArtifact({ node, selected, related, overview, profile, onSelect, onEnterFocus, onEnterReplay, onOverview }: {
  node: LifeMapNode;
  selected: boolean;
  related: boolean;
  overview: boolean;
  profile: SpatialQualityProfile;
  onSelect: (node: LifeMapNode) => void;
} & MemoryPortalHandlers) {
  const group = useRef<THREE.Group>(null);
  const lens = useRef<THREE.MeshPhysicalMaterial>(null);
  const { camera } = useThree();
  const textureResolution = selected
    ? profile.tier === "high" ? 512 : 384
    : overview
      ? profile.tier === "high" ? 128 : 96
      : related
        ? profile.tier === "high" ? 224 : 160
        : 80;
  const texture = useMemo(() => createMemorySurface(node, textureResolution), [node, textureResolution]);
  const scale = 0.58 + node.intensity * 0.2;
  const visibleOpacity = selected ? 1 : overview ? 0.82 : related ? 0.42 : 0.11;

  useEffect(() => () => {
    const dispose = () => texture?.dispose();
    if (typeof window === "undefined") dispose();
    else window.requestAnimationFrame(dispose);
  }, [texture]);

  useFrame(({ clock }, delta) => {
    if (!group.current) return;
    group.current.quaternion.slerp(camera.quaternion, profile.reducedMotion ? 1 : 0.085);
    const targetScale = selected ? 1.82 : overview ? 0.92 : related ? 0.76 : 0.56;
    const nextScale = profile.reducedMotion
      ? targetScale
      : THREE.MathUtils.damp(group.current.scale.x, targetScale, 4.8, delta);
    group.current.scale.setScalar(nextScale);
    if (!profile.reducedMotion && profile.documentVisible) {
      const breath = Math.sin(clock.elapsedTime * (0.44 + node.intensity) + node.position[0]) * (selected ? 0.032 : 0.018);
      group.current.scale.multiplyScalar(1 + breath);
      group.current.position.y = node.position[1] + Math.sin(clock.elapsedTime * 0.2 + node.position[2]) * 0.045;
      group.current.rotation.z = Math.sin(clock.elapsedTime * 0.08 + node.position[0]) * (selected ? 0.018 : 0.008);
    }
    if (lens.current) lens.current.opacity = selected ? 0.3 : overview ? 0.12 : related ? 0.07 : 0.025;
  });

  const choose = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    onSelect(node);
  };

  return (
    <group ref={group} position={node.position} name={\`life-map-memory-lens-\${node.type}\`}>
      <mesh
        name="life-map-memory-lens-hit-target"
        onClick={choose}
        onPointerOver={() => { document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { document.body.style.cursor = ""; }}
        scale={[scale * 1.62, scale * 1.62, 1]}
      >
        <circleGeometry args={[0.82, 56]} />
        <meshBasicMaterial transparent opacity={0} colorWrite={false} depthWrite={false} />
      </mesh>

      {selected ? Array.from({ length: 6 }, (_, index) => (
        <mesh key={index} position={[0, 0, -0.14]} rotation={[0, 0, (Math.PI / 6) * index]} scale={[scale * 0.035, scale * 2.8, 1]}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial color={node.aura} transparent opacity={0.16} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
      )) : null}

      <mesh position={[0, 0, -0.12]} scale={[scale * 1.66, scale * 1.66, 1]}>
        <circleGeometry args={[0.86, 64]} />
        <meshBasicMaterial color={node.aura} transparent opacity={selected ? 0.2 : overview ? 0.075 : related ? 0.04 : 0.012} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>

      <mesh scale={[scale * 1.5, scale * 1.5, 1]}>
        <planeGeometry args={[1.74, 1.74, 1, 1]} />
        <meshBasicMaterial
          map={texture || undefined}
          color={texture ? "#ffffff" : "#071323"}
          transparent
          opacity={texture ? visibleOpacity : 0}
          toneMapped={false}
          depthWrite={selected}
        />
      </mesh>

      <mesh position={[0, 0, -0.055]} scale={[scale * 1.36, scale * 1.36, 1]}>
        <circleGeometry args={[0.84, 64]} />
        <meshPhysicalMaterial
          ref={lens}
          color={node.aura}
          transparent
          opacity={selected ? 0.3 : 0.08}
          roughness={0.06}
          metalness={0.08}
          transmission={0.48}
          thickness={0.26}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh position={[-scale * 0.78, scale * 0.52, -0.09]} rotation={[0, 0, -0.42]} scale={[scale * 0.26, scale * 0.08, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color={node.aura} transparent opacity={selected ? 0.34 : related ? 0.08 : 0.015} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh position={[scale * 0.76, -scale * 0.48, -0.1]} rotation={[0, 0, 0.36]} scale={[scale * 0.22, scale * 0.065, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color="#dffcff" transparent opacity={selected ? 0.28 : related ? 0.06 : 0.012} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>

      {selected ? <pointLight color={node.aura} intensity={1.35} distance={7} decay={2} position={[0, 0.15, 0.7]} /> : null}

      {node.privacyLevel === "hidden" || node.locked ? (
        <mesh position={[0, 0, 0.08]} scale={[scale * 1.3, scale * 1.3, 1]}>
          <circleGeometry args={[0.84, 64]} />
          <meshBasicMaterial color="#01040a" transparent opacity={0.58} depthWrite={false} />
        </mesh>
      ) : null}

      {selected ? (
        <Html distanceFactor={8.2} position={[0, -scale * 1.48, 0.16]} center zIndexRange={[90, 30]}>
          <div className="life-map-memory-portals" onPointerDown={(event) => event.stopPropagation()}>
            <button type="button" onClick={() => onEnterFocus(node)}>Enter Focus</button>
            <button type="button" onClick={() => onEnterReplay(node)} disabled={!node.replayAvailable || node.locked}>Replay</button>
            <button type="button" onClick={onOverview}>Overview</button>
          </div>
        </Html>
      ) : null}
    </group>
  );
}

`,
)

replaceOnce(
  lifeMap,
  '      data-life-map-source={usingSeedData ? "explicit-sample" : "private"}\n      data-home-companion-owned="false"',
  '      data-life-map-source={usingSeedData ? "explicit-sample" : "private"}\n      data-life-map-mode={selectedNode ? "selected" : "overview"}\n      data-home-companion-owned="false"',
)

replaceOnce(
  lifeMap,
  '        data-life-map-memory-contract="authored-media-surfaces"',
  '        data-life-map-memory-contract="synchronous-luminous-memory-lenses"',
)

replaceOnce(
  lifeMap,
  '      <section className="life-map-whisper" data-life-map-whisper="true" aria-live="polite" aria-atomic="true">',
  '      <section className="life-map-whisper" data-life-map-whisper="true" data-selected={selectedNode ? "true" : "false"} aria-live="polite" aria-atomic="true">',
)

const boundary = 'urai-tier1/src/spatial/world/LifeMapIndependentInputBoundary.tsx'
replaceOnce(
  boundary,
  `function ensureMapControlsOpen() {
  const menu = document.querySelector<HTMLDetailsElement>('.life-map-accessibility-menu')
  if (menu) menu.open = true
  return menu
}

`,
  '',
)
replaceOnce(
  boundary,
  `    const keepSelectedControlsOpen = () => {
      const menu = document.querySelector<HTMLDetailsElement>('.life-map-accessibility-menu')
      if (menu && selectedMemoryIsActive()) menu.open = true
    }

`,
  '',
)
replaceOnce(boundary, '      keepSelectedControlsOpen()\n', '')
replaceOnce(boundary, '      ensureMapControlsOpen()\n', '')
replaceOnce(boundary, '      queueMicrotask(keepSelectedControlsOpen)\n', '')
replaceOnce(
  boundary,
  `        const menu = button.closest<HTMLDetailsElement>('.life-map-accessibility-menu')
        if (menu) menu.open = true
        window.setTimeout(keepSelectedControlsOpen, 0)
`,
  '',
)

const css = 'urai-tier1/src/spatial/world/lifeMapConvergence.css'
appendOnce(
  css,
  'AAA MEMORY LENS SELECTION CONVERGENCE',
  `/* AAA MEMORY LENS SELECTION CONVERGENCE */
.life-map-independent-realm[data-life-map-mode='selected'] .life-map-depth-vignette {
  background:
    linear-gradient(180deg, rgba(0, 0, 0, .48), transparent 20%, transparent 70%, rgba(0, 0, 0, .72)),
    radial-gradient(ellipse at 50% 46%, transparent 0 24%, rgba(0, 0, 0, .2) 48%, rgba(0, 0, 0, .82) 100%);
}

.life-map-whisper {
  transition: left .4s ease, bottom .4s ease, width .4s ease, transform .4s ease, background .4s ease, border-color .4s ease;
}

.life-map-whisper[data-selected='true'] {
  left: 50%;
  bottom: max(96px, calc(env(safe-area-inset-bottom) + 86px));
  width: min(760px, calc(100vw - 160px));
  transform: translateX(-50%);
  padding: 18px 24px 20px;
  border-left: 0;
  text-align: center;
  color: rgba(236, 249, 255, .82);
  background: radial-gradient(ellipse at 50% 100%, rgba(41, 159, 196, .18), rgba(1, 5, 16, .3) 54%, transparent 78%);
  text-shadow: 0 12px 42px rgba(0, 0, 0, .92);
}

.life-map-whisper[data-selected='true'] p {
  color: #f7fdff;
  font-size: clamp(15px, 2.1vw, 24px);
  letter-spacing: .11em;
}

.life-map-whisper[data-selected='true'] span {
  max-width: 620px;
  margin: 8px auto 0;
  color: rgba(219, 242, 255, .74);
  font-size: clamp(11px, 1.2vw, 14px);
  line-height: 1.55;
}

.life-map-memory-portals {
  padding: 7px;
  border-color: rgba(211, 250, 255, .24);
  background: linear-gradient(180deg, rgba(5, 20, 36, .78), rgba(1, 6, 18, .72));
  box-shadow: 0 20px 74px rgba(0, 0, 0, .62), 0 0 62px rgba(93, 225, 255, .18);
}

.life-map-memory-portals button {
  min-height: 44px;
  padding: 0 15px;
}

@media (max-width: 760px) {
  .life-map-whisper[data-selected='true'] {
    bottom: max(78px, calc(env(safe-area-inset-bottom) + 68px));
    width: calc(100vw - 24px);
    padding: 12px 14px 14px;
  }

  .life-map-whisper[data-selected='true'] p {
    font-size: 14px;
  }

  .life-map-whisper[data-selected='true'] span {
    max-width: 100%;
    font-size: 10px;
    -webkit-line-clamp: 2;
  }

  .life-map-memory-portals {
    max-width: calc(100vw - 18px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .life-map-whisper {
    transition: none;
  }
}`,
)

const embodiedBrowser = 'urai-tier1/tests/accessibility-performance-embodied-exploration.spec.ts'
replaceOnce(
  embodiedBrowser,
  `    await page.keyboard.press('d')
    await expect.poll(() => new URL(page.url()).searchParams.get('memoryId')).toBeTruthy()
    await expect(page.locator('.life-map-memory-portals')).toBeVisible()
`,
  `    await page.keyboard.press('d')
    await expect.poll(() => new URL(page.url()).searchParams.get('memoryId')).toBeTruthy()
    await expect(page.locator('.life-map-independent-realm')).toHaveAttribute('data-life-map-mode', 'selected')
    await expect(page.locator('.life-map-whisper')).toHaveAttribute('data-selected', 'true')
    await expect(page.locator('.life-map-accessibility-menu')).not.toHaveAttribute('open', '')
    await expect(page.locator('.life-map-memory-portals')).toBeVisible()
`,
)

const embodiedContract = 'urai-tier1/tests/embodied-exploration-contract.test.mjs'
appendOnce(
  embodiedContract,
  'synchronous luminous memory lenses do not force duplicate selected panels',
  `test('synchronous luminous memory lenses do not force duplicate selected panels', () => {
  assert.match(lifeMapBoundary, /function memoryButtons\\(\\)/)
  assert.doesNotMatch(lifeMapBoundary, /keepSelectedControlsOpen|ensureMapControlsOpen|menu\\.open = true/)
  assert.match(lifeMapBoundary, /selectedMemoryIsActive/)
})`,
)

const finalContract = 'urai-tier1/tests/final-aaa-world-convergence-contract.test.mjs'
appendOnce(
  finalContract,
  'Life Map renders synchronous luminous lenses with dominant selected mode',
  `test('Life Map renders synchronous luminous lenses with dominant selected mode', () => {
  assert.match(adaptiveLifeMap, /memoryLensPath/)
  assert.match(adaptiveLifeMap, /const texture = useMemo\\(\\(\\) => createMemorySurface\\(node, textureResolution\\)/)
  assert.match(adaptiveLifeMap, /data-life-map-memory-contract="synchronous-luminous-memory-lenses"/)
  assert.match(adaptiveLifeMap, /data-life-map-mode=\\{selectedNode \\? "selected" : "overview"\\}/)
  assert.match(adaptiveLifeMap, /data-selected=\\{selectedNode \\? "true" : "false"\\}/)
  assert.match(adaptiveLifeMap, /name="life-map-memory-lens-hit-target"/)
  assert.match(adaptiveLifeMap, /opacity=\\{texture \\? visibleOpacity : 0\\}/)
  assert.doesNotMatch(adaptiveLifeMap, /useState<THREE\\.CanvasTexture \\| null>|setTexture\\(|map=\\{texture \\?\\? undefined\\}/)
  assert.match(lifeMapConvergence, /AAA MEMORY LENS SELECTION CONVERGENCE/)
  assert.match(lifeMapConvergence, /data-life-map-mode='selected'/)
  assert.match(lifeMapConvergence, /life-map-whisper\\[data-selected='true'\\]/)
})`,
)

console.log('Applied PR 793 synchronous memory lens redesign.')
