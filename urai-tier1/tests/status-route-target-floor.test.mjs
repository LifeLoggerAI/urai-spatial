import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'

// Render the actual Status component's initial (unverified) state and inspect
// its emitted link props. This checks source layout ownership, not browser pixels.
function renderStatus() {
  const jsx = (type, props) => ({ type, props })
  const modules = new Map([
    ['react', { useState: value => [value, () => {}], useEffect() {} }],
    ['react/jsx-runtime', { jsx, jsxs: jsx, Fragment: 'fragment' }],
    ['next/link', { __esModule: true, default: 'a' }],
  ])
  function load(path) {
    const source = readFileSync(path, 'utf8')
    const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
    const module = { exports: {} }
    const factory = vm.runInNewContext(`(function(require,module,exports){${output}\n})`)
    factory(name => {
      if (!modules.has(name)) throw new Error(`Unexpected actual Status dependency: ${name}`)
      return modules.get(name)
    }, module, module.exports)
    return module.exports
  }
  modules.set('@/data/launchTruth', load(new URL('../src/data/launchTruth.ts', import.meta.url)))
  return load(new URL('../src/app/status/StatusReleaseAuthority.tsx', import.meta.url)).default()
}

function flatten(value, output = []) {
  if (!value || typeof value !== 'object') return output
  output.push(value)
  for (const child of [value.props?.children].flat(Infinity)) flatten(child, output)
  return output
}

const rendered = renderStatus()
const nav = flatten(rendered).find(element => element.type === 'nav' && element.props?.['aria-label'] === 'Status route navigation')
const links = flatten(nav).filter(element => element.type === 'a')
const intended = ['/home', '/ground', '/life-map', '/privacy-controls', '/spatial/ar-vr']

test('actual Status renders the intended five route actions while certification is unverified', () => {
  assert.equal(rendered.props['data-authority-state'], 'loading')
  assert.ok(nav)
  assert.deepEqual(links.map(link => link.props.href), intended)
})

for (const href of intended) {
  test(`actual Status ${href} action owns a fixed CSS-pixel target floor`, () => {
    const link = links.find(item => item.props.href === href)
    assert.ok(link)
    assert.equal(link.props.style?.minHeight, 48)
    assert.equal(link.props.style?.minWidth, 48)
    assert.equal(link.props.style?.display, 'inline-flex')
    assert.equal(link.props.style?.alignItems, 'center')
    assert.equal(link.props.style?.justifyContent, 'center')
    assert.ok(link.props.children)
  })
}
