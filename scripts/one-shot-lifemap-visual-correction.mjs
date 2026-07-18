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
replaceOnce(
  scene,
  `  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);\n  const scale = 0.72 + node.intensity * 0.24;`,
  `  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);\n  const scale = 0.72 + node.intensity * 0.24;\n  const textureKey = texture?.uuid ?? \`pending-\${node.id}-\${textureResolution}\`;`,
)
replaceOnce(
  scene,
  `        <meshBasicMaterial map={texture ?? undefined} transparent opacity={selected ? 1 : related ? 0.88 : 0.42} toneMapped={false} />`,
  `        <meshBasicMaterial\n          key={\`\${textureKey}-main\`}\n          map={texture ?? undefined}\n          color={texture ? "#ffffff" : "#071425"}\n          transparent\n          opacity={texture ? selected ? 1 : related ? 0.88 : 0.42 : 0.12}\n          toneMapped={false}\n          depthWrite={false}\n        />`,
)
replaceOnce(
  scene,
  `        <meshBasicMaterial map={texture ?? undefined} transparent opacity={selected ? 0.52 : related ? 0.2 : 0.04} depthWrite={false} />`,
  `        <meshBasicMaterial\n          key={\`\${textureKey}-left\`}\n          map={texture ?? undefined}\n          color={texture ? "#ffffff" : "#071425"}\n          transparent\n          opacity={texture ? selected ? 0.52 : related ? 0.2 : 0.04 : 0}\n          toneMapped={false}\n          depthWrite={false}\n        />`,
)
replaceOnce(
  scene,
  `        <meshBasicMaterial map={texture ?? undefined} transparent opacity={selected ? 0.42 : related ? 0.16 : 0.03} depthWrite={false} />`,
  `        <meshBasicMaterial\n          key={\`\${textureKey}-right\`}\n          map={texture ?? undefined}\n          color={texture ? "#ffffff" : "#071425"}\n          transparent\n          opacity={texture ? selected ? 0.42 : related ? 0.16 : 0.03 : 0}\n          toneMapped={false}\n          depthWrite={false}\n        />`,
)
replaceOnce(
  scene,
  `  const selectNode = useCallback((node: LifeMapNode) => {\n    setSelectedId(node.id);`,
  `  const selectNode = useCallback((node: LifeMapNode) => {\n    document.querySelectorAll<HTMLDetailsElement>(".life-map-accessibility-menu").forEach((controls) => {\n      controls.open = false;\n      controls.removeAttribute("open");\n    });\n    setSelectedId(node.id);`,
)

const controls = 'urai-tier1/src/spatial/lifemap/LifeMapDeepLinkControls.tsx'
write(controls, [
  "'use client'",
  "",
  "import { useEffect } from 'react'",
  "import { useRouter, useSearchParams } from 'next/navigation'",
  "",
  "function safeToken(value: string | null, fallback = '') {",
  "  if (!value) return fallback",
  "  const normalized = value.trim().slice(0, 120)",
  "  return /^[A-Za-z0-9._:-]+$/.test(normalized) ? normalized : fallback",
  "}",
  "",
  "function memoryTitle(memoryId: string) {",
  "  if (memoryId === 'quiet-reset') return 'The Quiet Reset'",
  "  return memoryId",
  "    .split(/[-_]+/)",
  "    .filter(Boolean)",
  "    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)",
  "    .join(' ')",
  "}",
  "",
  "export default function LifeMapDeepLinkControls() {",
  "  const router = useRouter()",
  "  const searchParams = useSearchParams()",
  "  const memoryId = safeToken(searchParams.get('memoryId') ?? searchParams.get('node'))",
  "",
  "  useEffect(() => {",
  "    if (!memoryId) return",
  "    const closeSemanticDrawers = () => {",
  "      document.querySelectorAll<HTMLDetailsElement>('.life-map-accessibility-menu').forEach((controls) => {",
  "        controls.open = false",
  "        controls.removeAttribute('open')",
  "      })",
  "    }",
  "    closeSemanticDrawers()",
  "    const frame = window.requestAnimationFrame(closeSemanticDrawers)",
  "    const observer = new MutationObserver(closeSemanticDrawers)",
  "    observer.observe(document.body, { childList: true, subtree: true })",
  "    return () => {",
  "      window.cancelAnimationFrame(frame)",
  "      observer.disconnect()",
  "    }",
  "  }, [memoryId])",
  "",
  "  if (!memoryId) return null",
  "",
  "  const manifestId = safeToken(searchParams.get('manifestId'), 'replay-recovery-thread')",
  "  const title = memoryTitle(memoryId)",
  "  const destination = (route: 'focus' | 'replay') => {",
  "    const query = new URLSearchParams()",
  "    query.set('memoryId', memoryId)",
  "    query.set('manifestId', manifestId)",
  "    query.set('node', memoryId)",
  "    query.set('from', 'life-map-selected-memory')",
  "    return `/${route}?${query.toString()}`",
  "  }",
  "",
  "  return (",
  "    <>",
  "      <div",
  "        className=\"urai-lifemap-selected-visual\"",
  "        data-life-map-selected-visual=\"authored-memory-surface\"",
  "        data-memory-id={memoryId}",
  "        aria-hidden=\"true\"",
  "      >",
  "        <div className=\"urai-lifemap-selected-visual__halo\" />",
  "        <div className=\"urai-lifemap-selected-visual__frame\">",
  "          <div className=\"urai-lifemap-selected-visual__constellation\"><i /><i /><i /><i /><i /></div>",
  "          <div className=\"urai-lifemap-selected-visual__copy\">",
  "            <span>Memory in focus</span>",
  "            <strong>{title}</strong>",
  "            <i>Private cinematic surface · identity preserved</i>",
  "          </div>",
  "        </div>",
  "      </div>",
  "      <aside",
  "        className=\"urai-lifemap-deep-link-controls\"",
  "        data-testid=\"urai-lifemap-selected-memory-controls\"",
  "        data-selected-memory-panel=\"diegetic\"",
  "        data-memory-id={memoryId}",
  "        data-manifest-id={manifestId}",
  "        aria-label={`Selected memory: ${title}`}",
  "        aria-live=\"polite\"",
  "      >",
  "        <p className=\"urai-lifemap-deep-link-controls__eyebrow\">Selected memory</p>",
  "        <strong className=\"urai-lifemap-deep-link-controls__title\">{title}</strong>",
  "        <span className=\"urai-lifemap-deep-link-controls__detail\">Continue directly into this memory or replay its cinematic thread.</span>",
  "        <div className=\"urai-lifemap-deep-link-controls__actions\">",
  "          <button type=\"button\" onClick={() => router.push(destination('focus'))}>",
  "            Enter Focus",
  "          </button>",
  "          <button type=\"button\" onClick={() => router.push(destination('replay'))}>",
  "            Replay",
  "          </button>",
  "        </div>",
  "      </aside>",
  "    </>",
  "  )",
  "}",
  "",
].join('\n'))

const interactionCss = 'urai-tier1/src/spatial/world/lifeMapIndependentInteraction.css'
write(interactionCss, `${read(interactionCss).trimEnd()}\n\n/* Native details ownership must remain correct before world-state hydration. */\n.life-map-accessibility-menu:not([open]) > div {\n  display: none !important;\n}\n\n.life-map-accessibility-menu[open] > div {\n  display: grid !important;\n}\n`)

const proofCss = 'urai-tier1/src/app/continuous-spatial-proof-defects.css'
write(proofCss, `${read(proofCss).trimEnd()}\n\n/* Selected Life Map memory is a cinematic spatial surface, not an open menu over a blank plane. */\n.urai-lifemap-selected-visual {\n  position: fixed;\n  z-index: 72;\n  left: clamp(32px, 7vw, 112px);\n  top: clamp(150px, 22svh, 220px);\n  width: min(640px, 58vw);\n  height: min(520px, 58svh);\n  pointer-events: none;\n  perspective: 1200px;\n}\n\n.urai-lifemap-selected-visual__halo {\n  position: absolute;\n  inset: -18%;\n  border-radius: 50%;\n  background: radial-gradient(circle, rgba(126, 231, 255, .18), rgba(148, 94, 255, .08) 34%, transparent 68%);\n  filter: blur(34px);\n}\n\n.urai-lifemap-selected-visual__frame {\n  position: absolute;\n  inset: 0;\n  overflow: hidden;\n  transform: rotateY(7deg) rotateX(-2deg);\n  border: 1px solid rgba(205, 247, 255, .34);\n  border-radius: 36px;\n  background:\n    radial-gradient(circle at 34% 28%, rgba(255,255,255,.92) 0 1px, transparent 2px),\n    radial-gradient(circle at 68% 36%, rgba(143,237,255,.74) 0 2px, transparent 3px),\n    radial-gradient(circle at 53% 56%, rgba(203,166,255,.7) 0 2px, transparent 3px),\n    linear-gradient(145deg, rgba(12, 37, 70, .92), rgba(6, 8, 25, .96) 48%, rgba(35, 12, 59, .92));\n  background-size: 72px 72px, 116px 116px, 164px 164px, auto;\n  box-shadow: 0 50px 140px rgba(0,0,0,.66), 0 0 90px rgba(90,224,255,.18), inset 0 1px 0 rgba(255,255,255,.18);\n}\n\n.urai-lifemap-selected-visual__frame::before {\n  content: \"\";\n  position: absolute;\n  inset: 8% 8% 30%;\n  clip-path: polygon(0 78%, 20% 42%, 38% 62%, 58% 18%, 76% 50%, 100% 25%, 100% 100%, 0 100%);\n  background: linear-gradient(135deg, rgba(118,232,255,.25), rgba(176,116,255,.14));\n  border-bottom: 1px solid rgba(204,247,255,.22);\n}\n\n.urai-lifemap-selected-visual__constellation i {\n  position: absolute;\n  width: 8px;\n  height: 8px;\n  border-radius: 50%;\n  background: #effeff;\n  box-shadow: 0 0 22px rgba(157,243,255,.9);\n}\n\n.urai-lifemap-selected-visual__constellation i:nth-child(1) { left: 18%; top: 24%; }\n.urai-lifemap-selected-visual__constellation i:nth-child(2) { left: 42%; top: 17%; width: 5px; height: 5px; }\n.urai-lifemap-selected-visual__constellation i:nth-child(3) { left: 65%; top: 32%; width: 11px; height: 11px; }\n.urai-lifemap-selected-visual__constellation i:nth-child(4) { left: 78%; top: 19%; width: 4px; height: 4px; }\n.urai-lifemap-selected-visual__constellation i:nth-child(5) { left: 53%; top: 47%; width: 6px; height: 6px; }\n\n.urai-lifemap-selected-visual__copy {\n  position: absolute;\n  left: clamp(22px, 4vw, 52px);\n  right: clamp(22px, 4vw, 52px);\n  bottom: clamp(22px, 4vw, 48px);\n  display: grid;\n  gap: 8px;\n  color: #f6fdff;\n  text-shadow: 0 2px 20px rgba(0,0,0,.7);\n}\n\n.urai-lifemap-selected-visual__copy span,\n.urai-lifemap-selected-visual__copy i {\n  font-size: 10px;\n  font-weight: 850;\n  font-style: normal;\n  letter-spacing: .18em;\n  text-transform: uppercase;\n  color: rgba(206,244,255,.72);\n}\n\n.urai-lifemap-selected-visual__copy strong {\n  font-size: clamp(34px, 5vw, 72px);\n  line-height: .9;\n  letter-spacing: -.055em;\n}\n\n@media (max-width: 760px) {\n  .urai-lifemap-selected-visual {\n    left: 14px;\n    right: 14px;\n    top: max(92px, calc(env(safe-area-inset-top) + 72px));\n    width: auto;\n    height: 34svh;\n  }\n\n  .urai-lifemap-selected-visual__frame {\n    transform: none;\n    border-radius: 24px;\n  }\n\n  .urai-lifemap-selected-visual__copy strong {\n    font-size: clamp(28px, 10vw, 46px);\n  }\n\n  .urai-lifemap-deep-link-controls {\n    top: auto;\n    bottom: max(18px, env(safe-area-inset-bottom));\n  }\n}\n\n@media (prefers-reduced-motion: reduce) {\n  .urai-lifemap-selected-visual__frame {\n    transform: none;\n  }\n}\n`)

const visualContract = 'urai-tier1/tests/lifemap-visual-material-contract.test.mjs'
write(visualContract, `import assert from 'node:assert/strict'\nimport fs from 'node:fs'\nimport test from 'node:test'\n\nconst scene = fs.readFileSync('src/components/lifemap/AdaptiveLifeMapScene.tsx', 'utf8')\nconst controls = fs.readFileSync('src/spatial/lifemap/LifeMapDeepLinkControls.tsx', 'utf8')\nconst interactionCss = fs.readFileSync('src/spatial/world/lifeMapIndependentInteraction.css', 'utf8')\nconst proofCss = fs.readFileSync('src/app/continuous-spatial-proof-defects.css', 'utf8')\n\ntest('pending memory textures cannot render default white planes', () => {\n  assert.match(scene, /const textureKey = texture\\?\\.uuid/)\n  assert.match(scene, /key=\\{\\\`\\$\\{textureKey\\}-main\\\`\\}/)\n  assert.match(scene, /color=\\{texture \\? \\"#ffffff\\" : \\"#071425\\"\\}/)\n  assert.match(scene, /opacity=\\{texture \\? selected \\? 1/)\n  assert.match(scene, /key=\\{\\\`\\$\\{textureKey\\}-left\\\`\\}/)\n  assert.match(scene, /key=\\{\\\`\\$\\{textureKey\\}-right\\\`\\}/)\n  assert.doesNotMatch(scene, /<meshBasicMaterial map=\\{texture \\?\\? undefined\\} transparent opacity=/)\n})\n\ntest('selected memory closes semantic drawers and owns a cinematic surface', () => {\n  assert.match(scene, /querySelectorAll<HTMLDetailsElement>\\(\\"\\.life-map-accessibility-menu\\"\\)/)\n  assert.match(controls, /new MutationObserver\\(closeSemanticDrawers\\)/)\n  assert.match(controls, /data-life-map-selected-visual=\\"authored-memory-surface\\"/)\n  assert.match(controls, /data-selected-memory-panel=\\"diegetic\\"/)\n  assert.match(interactionCss, /\\.life-map-accessibility-menu:not\\(\\[open\\]\\) > div/)\n  assert.match(proofCss, /\\.urai-lifemap-selected-visual__frame/)\n  assert.match(proofCss, /@media \\(max-width: 760px\\)/)\n})\n`)
