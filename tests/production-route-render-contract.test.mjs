import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'
import { rendersCanonicalDemoOwner } from '../scripts/production-route-render-contract.mjs'

const page = expression => `import Film from './replay-film/page'; export default function DemoPage() { return ${expression} }`

test('the canonical Demo owner renders directly or inside its route layout', () => {
  assert.equal(rendersCanonicalDemoOwner(page('<Film />')), true)
  assert.equal(rendersCanonicalDemoOwner(page('(<div className="urai-replay-film-route">\n<Film />\n</div>)')), true)
})

for (const [name, expression] of [
  ['replaced owner', '<div className="urai-replay-film-route"><Other /></div>'],
  ['removed owner', '<div className="urai-replay-film-route" />'],
  ['hidden owner', '<div className="urai-replay-film-route" hidden><Film /></div>'],
  ['changed route layout', '<div className="different-route"><Film /></div>'],
  ['owner only in a dead expression', 'false && <Film />'],
  ['owner with substituted props', '<Film privateData={true} />'],
  ['additional content', '<div className="urai-replay-film-route"><Film /><Other /></div>'],
]) test(`rejects ${name}`, () => assert.equal(rendersCanonicalDemoOwner(page(expression)), false))

test('comments, unrelated imports and non-returned JSX cannot satisfy the owner contract', () => {
  assert.equal(rendersCanonicalDemoOwner(page('null /* return <Film /> */')), false)
  assert.equal(rendersCanonicalDemoOwner(page('<Film />').replace('./replay-film/page', './private-page')), false)
  assert.equal(rendersCanonicalDemoOwner("import Film from './replay-film/page'; export default function DemoPage() { const unused = <Film />; return null }"), false)
})

// Execute each real source auditor with only the Focus file read substituted.
// Other route, privacy, world-travel and neutral-state checks remain active.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const focusPath = path.join(root, 'urai-tier1/src/app/focus/FocusChamberClient.tsx')
const focus = fs.readFileSync(focusPath, 'utf8')
function auditFocus(script, source) {
  const code = fs.readFileSync(path.join(root, script), 'utf8').replace(/^#!.*\n/, '').replace(/^import .*\n/gm, '')
  const output = []
  const auditProcess = { cwd: () => root, exitCode: 0, exit(code) { this.exitCode = code; throw new Error('audit-exit') } }
  const auditFs = { ...fs, readFileSync(file, ...args) { return path.resolve(String(file)) === focusPath ? source : fs.readFileSync(file, ...args) } }
  try {
    vm.runInNewContext(code, { fs: auditFs, path, readFileSync: auditFs.readFileSync, join: path.join, rendersCanonicalDemoOwner, process: auditProcess, console: { log: value => output.push(value), error: value => output.push(value) } })
  } catch (error) {
    if (error.message !== 'audit-exit') throw error
  }
  return { code: auditProcess.exitCode, output: output.join('\n') }
}
for (const script of ['scripts/check-production-route-exposure-v2.mjs', 'scripts/audit-main-journey-state.mjs']) {
  test(`${script} accepts the actual locale-owned selected-memory Replay control`, () => {
    assert.equal(auditFocus(script, focus).code, 0)
  })
  for (const [name, before, after] of [
    ['retired locale ternary', "aria-label={memory ? locale.text('focus.openReplayFor', {title:memory.title}) : locale.text('focus.chooseReplay')}", "aria-label={locale.locale === 'en' ? `Open Replay for ${memory.title}` : locale.text('focus.enterReplay')}"],
    ['lost captured title', "{title:memory.title}", "{title:'Synthetic memory'}"],
    ['lost locale metadata', "locale.props(memory ? 'focus.openReplayFor' : 'focus.chooseReplay')", "locale.props('focus.enterReplay')"],
    ['ungated Replay control', '{memory ? <button type="button" className="primary"', '{true ? <button type="button" className="primary"'],
    ['duplicate primary control', 'className="primary"', `className="primary" data-duplicate='className="primary"'`],
    ['removed neutral disclosure', 'No personal memory is displayed in this neutral stellar field.', 'A personal memory is always displayed.'],
    ['removed authorization guard', 'if (!memory || !replayHref || committed) return', 'if (committed) return'],
  ]) test(`${script} rejects ${name}`, () => {
    assert.ok(focus.includes(before), `mutation must alter actual source: ${name}`)
    const result = auditFocus(script, focus.replace(before, after))
    assert.equal(result.code, 1, result.output)
  })
}
