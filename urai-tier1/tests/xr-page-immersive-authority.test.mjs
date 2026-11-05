import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const root = process.env.URAI_XR_SOURCE_ROOT || fileURLToPath(new URL('../..', import.meta.url))
const source = fs.readFileSync(path.join(root, 'urai-tier1/src/app/xr/page.tsx'), 'utf8')
const compiled = ts.transpileModule(source, {
  fileName: 'page.tsx',
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText
const World = (props) => ({ kind: 'world', props })
const node = (type, props) => ({ type, props: props || {} })
const jsxRuntime = { jsx: node, jsxs: node, Fragment: Symbol.for('react.fragment') }
const createPage = (enabled) => {
  const module = { exports: {} }
  let worldImports = 0
  const load = new Function('require', 'module', 'exports', compiled)
  load((name) => {
    if (name === 'react/jsx-runtime') return jsxRuntime
    if (name === '@/app/spatial/ar-vr/UraiQuestEntryWorldV2') {
      worldImports += 1
      return { __esModule: true, default: World }
    }
    if (name === '@/lib/spatial-launch-boundaries') return { spatialLaunchBoundary: { liveArWebXrEnabled: enabled } }
    if (name === 'next/navigation') return { notFound: () => {
      const error = new Error('NOT_FOUND')
      error.digest = 'NEXT_HTTP_ERROR_FALLBACK;404'
      throw error
    } }
    throw new Error(`Unexpected original page import: ${name}`)
  }, module, module.exports)
  assert.equal(worldImports, 1)
  return module.exports
}
const walk = (element, predicate) => {
  if (Array.isArray(element)) return element.flatMap((item) => walk(item, predicate))
  if (!element || typeof element !== 'object') return []
  const hits = predicate(element) ? [element] : []
  return [...hits, ...walk(element.props?.children, predicate)]
}

test('current disabled authority still fails closed as a Next 404', () => {
  const page = createPage(false)
  assert.throws(() => page.default(), (error) => error.digest === 'NEXT_HTTP_ERROR_FALLBACK;404')
})

test('enabled authority includes the original XR world component', () => {
  const page = createPage(true)
  assert.equal(walk(page.default(), (element) => element.type === World).length, 1)
})

test('enabled XR route must forward source authority into immersive world control', () => {
  const page = createPage(true)
  const [world] = walk(page.default(), (element) => element.type === World)
  assert.ok(world)
  assert.equal(world.props.immersiveSessionEnabled, true,
    'Missing prop defaults to false in actual UraiQuestEntryWorldV2; the canonical /xr route would keep immersive entry disabled')
})

test('original XR title and route identity remain intact', () => {
  const page = createPage(true)
  assert.equal(page.metadata.title, 'URAI XR World')
  assert.equal(walk(page.default(), (element) => element.type === 'h1').length, 1)
})
