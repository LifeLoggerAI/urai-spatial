import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

const fixture = fs.readFileSync(new URL('../../tests/replay-tier5-lock.mjs', import.meta.url), 'utf8')
const clientSource = fs.readFileSync(new URL('../src/app/replay/CinematicReplayClient.tsx', import.meta.url), 'utf8')

async function exercisePlaybackProof(source, { ready = true, continueChangesPlayback = true } = {}) {
  const tree = ts.createSourceFile('replay-proof.mjs', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS)
  const validators = tree.statements.filter(node => ts.isFunctionDeclaration(node) && node.name?.text === 'validateReplay')
  assert.equal(validators.length, 1, 'one actual browser Replay validator')
  const manifest = tree.statements.flatMap(node => ts.isVariableStatement(node) ? [...node.declarationList.declarations] : [])
    .find(node => node.name.getText(tree) === 'MANIFEST_ID')?.initializer?.text
  assert.ok(manifest, 'actual browser fixture retains selected manifest')
  let playing = false
  const events = []
  const locator = kind => ({
    kind,
    first() { return this },
    async waitFor() {},
    async click() {
      events.push(`click:${kind}`)
      if (kind === 'continue') {
        assert.ok(ready, 'Continue cannot activate before actual interaction readiness')
        if (continueChangesPlayback) playing = true
      }
      if (kind === 'pause') playing = false
    },
  })
  const page = {
    getByTestId: id => locator(id === 'urai-replay-surface' ? 'proof' : 'client'),
    locator: selector => locator(selector),
    getByRole: (_role, { name }) => locator(name === 'Continue memory' ? 'continue' : name === 'Pause memory' ? 'pause' : 'companion'),
    async screenshot() { events.push('screenshot') },
  }
  const validate = runInNewContext(`(${validators[0].getText(tree)})`, {
    MANIFEST_ID: manifest,
    ARTIFACT_DIR: '/controlled-proof',
    // This unit boundary isolates playback observations; the unchanged browser
    // validator remains responsible for real visibility and layout measurements.
    expectVisible: async () => {},
    expectNoOverlap: async () => {},
    expect: target => ({ async toBeEnabled() { assert.equal(target.kind, 'continue'); assert.ok(ready, 'Continue must be enabled'); events.push('enabled:continue') } }),
    expectAttribute: async (target, name, expected) => {
      let actual
      if (name === 'data-playing') actual = playing ? 'true' : 'false'
      else if (name === 'data-replay-phase') actual = playing ? 'replay_playing' : 'replay_paused'
      else if (name === 'data-replay-interaction-ready') actual = ready ? 'true' : 'false'
      else if (name === 'data-memory-status') actual = 'demo'
      else if (name === 'data-manifest-id') actual = manifest
      else assert.fail(`Unexpected actual browser playback attribute: ${name}`)
      events.push(`${target.kind}:${name}=${expected}`)
      assert.equal(actual, expected, `actual ${target.kind} ${name} must match playback state`)
    },
  })
  await validate(page, { audits: [], screenshots: [] }, 'playback.png')
  const continued = events.indexOf('click:continue')
  const paused = events.indexOf('click:pause')
  assert.ok(continued >= 0 && paused > continued, 'real Continue and Pause actions must separate observations')
  const initial = events.slice(0, continued)
  const active = events.slice(continued + 1, paused)
  const final = events.slice(paused + 1)
  assert.ok(initial.includes('client:data-playing=false') && initial.includes('proof:data-playing=false') && initial.includes('proof:data-replay-phase=replay_paused'), 'both surfaces must observe initial pause')
  assert.ok(initial.includes('client:data-replay-interaction-ready=true') && initial.includes('enabled:continue'), 'actual readiness and enabled control precede Continue')
  assert.ok(active.includes('client:data-playing=true') && active.includes('proof:data-playing=true') && active.includes('proof:data-replay-phase=replay_playing'), 'both surfaces must observe the real Continue transition')
  assert.ok(final.includes('client:data-playing=false') && final.includes('proof:data-playing=false') && final.includes('proof:data-replay-phase=replay_paused'), 'both surfaces must observe the real Pause transition')
  return events
}

test('Actual Replay browser validator observes paused, ready Continue, and Pause in action order', async () => {
  await exercisePlaybackProof(fixture)
})

test('Replay browser validator rejects the contradictory former pre-play proof assertion', async () => {
  const mutant = fixture.replace("await expectAttribute(proof, 'data-replay-phase', 'replay_paused');", "await expectAttribute(proof, 'data-replay-phase', 'replay_playing');")
  assert.notEqual(mutant, fixture)
  await assert.rejects(exercisePlaybackProof(mutant), /actual proof data-replay-phase/)
})

test('Replay browser proof requires real Continue activation and actual playback state change', async () => {
  const mutant = fixture.replace('await play.click();', '// Continue action removed')
  assert.notEqual(mutant, fixture)
  await assert.rejects(exercisePlaybackProof(mutant), /actual client data-playing/)
  await assert.rejects(exercisePlaybackProof(fixture, { continueChangesPlayback: false }), /actual client data-playing/)
})

test('Replay browser proof rejects a missing proof-surface transition after Continue', async () => {
  const mutant = fixture.replace("  await expectAttribute(proof, 'data-replay-phase', 'replay_playing');\n", '')
  assert.notEqual(mutant, fixture)
  await assert.rejects(exercisePlaybackProof(mutant), /both surfaces must observe the real Continue transition/)
})

test('Replay browser proof refuses activation while interaction readiness is false', async () => {
  await assert.rejects(exercisePlaybackProof(fixture, { ready: false }), /data-replay-interaction-ready/)
})

test('Production proof and client attributes derive from the same real playing state', () => {
  const tree = ts.createSourceFile('client.tsx', clientSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const experiences = tree.statements.filter(node => ts.isFunctionDeclaration(node) && node.name?.text === 'ReplayMemoryExperience')
  assert.equal(experiences.length, 1, 'one admitted Replay memory experience')
  const surfaces = new Map()
  const visit = node => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const attrs = new Map(node.attributes.properties.filter(ts.isJsxAttribute).map(attr => [attr.name.getText(tree), attr.initializer]))
      const id = attrs.get('data-testid')?.text
      if (id === 'urai-replay-surface' || id === 'cinematic-replay-client') {
        assert.ok(!surfaces.has(id), 'one owner per actual Replay surface')
        surfaces.set(id, attrs)
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(experiences[0])
  assert.equal(surfaces.size, 2)
  for (const [id, attrs] of surfaces) {
    const expression = attrs.get('data-playing')?.expression
    assert.ok(expression, `${id} playing attribute observes live state`)
    const observe = runInNewContext(`playing => (${expression.getText(tree)})`)
    assert.equal(observe(false), 'false')
    assert.equal(observe(true), 'true')
  }
  const phase = surfaces.get('urai-replay-surface').get('data-replay-phase')?.expression
  assert.ok(phase)
  const observePhase = runInNewContext(`playing => (${phase.getText(tree)})`)
  assert.equal(observePhase(false), 'replay_paused')
  assert.equal(observePhase(true), 'replay_playing')
})
