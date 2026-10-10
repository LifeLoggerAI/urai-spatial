import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import test from 'node:test'
import ts from 'typescript'

const compiled = ts.transpileModule(fs.readFileSync(new URL('../src/app/passport/VaultAmbientFrames.tsx', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
function fixture() {
  let now = 0, next = 0, draws = 0, effect, cleanup
  const timers = new Map(), module = { exports: {} }
  vm.runInNewContext(compiled, { module, exports: module.exports,
    require(name) {
      if (name === 'react') return { useEffect: fn => { effect = fn } }
      if (name === '@react-three/fiber') return { useThree: select => select({ invalidate: () => draws++ }) }
      throw new Error(`Unexpected import ${name}`)
    },
    setTimeout(fn, delay) { const id = ++next; timers.set(id, { fn, at: now + delay }); return id },
    clearTimeout(id) { timers.delete(id) },
  })
  return {
    timers, get draws() { return draws },
    render(props) { cleanup?.(); assert.equal(module.exports.VaultAmbientFrames(props), null); cleanup = effect() },
    advance(duration) { const end = now + duration; for (;;) { const first = [...timers].sort((a, b) => a[1].at - b[1].at)[0]; if (!first || first[1].at > end) break; now = first[1].at; timers.delete(first[0]); first[1].fn() } now = end },
    unmount() { cleanup?.() },
  }
}
test('actual vault cadence bounds desktop ambient invalidations to 30 per second', () => {
  const f = fixture(); f.render({ enabled: true, framesPerSecond: 120 }); f.advance(1000)
  assert.ok(f.draws >= 29 && f.draws <= 30); assert.equal(f.timers.size, 1)
})
test('actual vault cadence stops for reduced motion, hidden documents and route unmount', () => {
  const f = fixture(); f.render({ enabled: true, framesPerSecond: 20 }); f.advance(1000); assert.equal(f.draws, 20)
  const pending = [...f.timers.values()][0].fn
  f.render({ enabled: false, framesPerSecond: 20 }); pending(); f.advance(1000)
  assert.equal(f.draws, 20); assert.equal(f.timers.size, 0)
  f.render({ enabled: true, framesPerSecond: 20 }); f.advance(1000); assert.equal(f.draws, 40)
  f.unmount(); f.advance(1000); assert.equal(f.draws, 40); assert.equal(f.timers.size, 0)
})
test('changing device tier replaces the cadence rather than accumulating loops', () => {
  const f = fixture(); f.render({ enabled: true, framesPerSecond: 30 }); f.advance(100)
  const before = f.draws; f.render({ enabled: true, framesPerSecond: 20 }); f.advance(1000)
  assert.equal(f.draws - before, 20); assert.equal(f.timers.size, 1)
})
