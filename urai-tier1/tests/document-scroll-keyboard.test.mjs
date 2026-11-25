import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'

const source = fs.readFileSync(new URL('../src/components/public/DocumentScrollArea.tsx', import.meta.url), 'utf8')
const javascript = ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
const module = { exports: {} }
vm.runInNewContext(javascript, {
  module,
  exports: module.exports,
  require(name) {
    if (name === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }) }
    if (name === './DocumentScrollArea.module.css') return { default: { scrollArea: 'scroll-area' } }
    throw new Error(`Unexpected dependency ${name}`)
  },
})
const DocumentScrollArea = module.exports.default

function keyEvent(key, changes = {}) {
  const commands = []
  const owner = { scrollHeight: 2060, scrollTo: command => commands.push({ ...command }) }
  const event = { key, target: owner, currentTarget: owner, defaultPrevented: false, preventDefault() { this.defaultPrevented = true }, ...changes }
  return { event, commands }
}

test('focused document End reaches its end and Home returns to its start', () => {
  const component = DocumentScrollArea({})
  for (const [key, top] of [['End', 2060], ['Home', 0]]) {
    const { event, commands } = keyEvent(key)
    component.props.onKeyDown(event)
    assert.equal(event.defaultPrevented, true)
    assert.deepEqual(commands, [{ top, behavior: 'instant' }])
  }
})

test('child inputs, modified keys and other keys keep their native behavior', () => {
  const component = DocumentScrollArea({})
  for (const changes of [{ target: { tagName: 'INPUT' } }, { altKey: true }, { ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { key: 'PageDown' }]) {
    const { event, commands } = keyEvent('End', changes)
    component.props.onKeyDown(event)
    assert.equal(event.defaultPrevented, false)
    assert.deepEqual(commands, [])
  }
})

test('caller keyboard handling can cancel scrolling and is called once', () => {
  let calls = 0
  const component = DocumentScrollArea({ onKeyDown(event) { calls += 1; event.preventDefault() } })
  const { event, commands } = keyEvent('End')
  component.props.onKeyDown(event)
  assert.equal(calls, 1)
  assert.deepEqual(commands, [])
})
