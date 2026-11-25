import assert from 'node:assert/strict'
import test from 'node:test'
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
