import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

const source = () => readFileSync(new URL('../cloudbuild.urai-verify.yaml', import.meta.url), 'utf8')
const expectedTests = [
  'tests/lifemap-semantic-owner-contract.test.mjs',
  'tests/lifemap-signed-out-navigation-behavior.test.mjs',
]

function verify(input) {
  const lines = input.split(/\r?\n/)
  const gate = lines.filter(line => /^\s*run_gate lifemap-semantic-privacy\s/.test(line))
  assert.equal(gate.length, 1, 'exactly one Life Map semantic privacy execution gate required')
  const command = gate[0].trim()
  assert.match(command, /^run_gate lifemap-semantic-privacy pnpm --dir urai-tier1 exec node --import tsx --test\s/,
    'workspace TypeScript loader must execute the maintained tests')
  for (const name of expectedTests) {
    assert.equal(command.split(name).length - 1, 1, 'real Life Map test must execute once: ' + name)
  }
  assert.ok(input.indexOf('pnpm install --frozen-lockfile') < input.indexOf(command),
    'frozen install must precede TypeScript-dependent tests')
  assert.match(input, /corepack prepare pnpm@10\.0\.0 --activate/)
  assert.match(input, /run_gate lifemap-data-boundary node --test urai-tier1\/tests\/lifemap-data-boundary\.test\.mjs/)
  assert.match(input, /run_gate lifemap-hidden-event-privacy node --test urai-tier1\/tests\/lifemap-physical-star-action\.test\.mjs/)
  assert.match(input, /run_gate cloudbuild-shell-contract node --test [^\n]*tests\/cloudbuild-lifemap-loader-contract\.test\.mjs/,
    'main source-pinned verifier must exercise the loader regression')
  assert.match(input, /run_gate lifemap-hidden-event-privacy node --test [^\n]*urai-tier1\/tests\/lifemap-hidden-canonical-fallback\.test\.mjs/)
  assert.match(input, /run_gate lifemap-hidden-event-privacy node --test [^\n]*urai-tier1\/tests\/lifemap-event-coverage\.test\.mjs/)
  assert.match(input, /run_gate lifemap-hidden-event-privacy node --test [^\n]*urai-tier1\/tests\/lifemap-event-privacy\.test\.mjs/)
  assert.match(input, /run_gate lifemap-software-route node --test tests\/life-map-software-route-intent\.test\.mjs/)
  assert.match(input, /run_gate lifemap-software-handoff pnpm --dir urai-tier1 exec node --import tsx --test tests\/lifemap-software-threshold-handoff\.test\.mjs/)
  assert.doesNotMatch(input, /\bfirebase deploy\b/)
}

test('real Cloud Build Life Map runtime tests use the pinned workspace TypeScript loader', () => verify(source()))
test('plain node or omission of an owner/privacy test fails admission', () => {
  const correct = source()
  const line = correct.split(/\r?\n/).find(x => x.includes('run_gate lifemap-semantic-privacy'))
  assert.ok(line)
  assert.throws(() => verify(correct.replace('pnpm --dir urai-tier1 exec node --import tsx --test', 'node --test')))
  assert.throws(() => verify(correct.replace(' ' + expectedTests[0], '')))
  assert.throws(() => verify(correct.replace(' ' + expectedTests[1], '')))
  assert.throws(() => verify(correct.replace(line, '')))
})
test('removing the loader contract from the actual Cloud Build gate fails admission', () => {
  const correct = source()
  assert.throws(() => verify(correct.replace(' tests/cloudbuild-lifemap-loader-contract.test.mjs', '')))
})
