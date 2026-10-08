import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import test from 'node:test'

const root = path.resolve(import.meta.dirname, '..')
const workflow = readFileSync(path.join(root, '.github/workflows/spatial-governed-wif-deploy.yml'), 'utf8')
const wrapper = path.join(root, 'scripts/run-frozen-firebase.mjs')

test('all four governed deployment calls use the reviewed local CLI, including rollback', () => {
  assert.doesNotMatch(workflow, /\bnpx\s+[^\n]*firebase-tools|\bnpm\s+exec\b/)
  const calls = workflow.match(/node (?:"\$GITHUB_WORKSPACE\/)?scripts\/run-frozen-firebase\.mjs"? deploy/g) || []
  assert.equal(calls.length, 4)
  assert.match(workflow, /node "\$GITHUB_WORKSPACE\/scripts\/run-frozen-firebase\.mjs" deploy/)
})

function fixture() {
  const directory = mkdtempSync(path.join(tmpdir(), 'urai-frozen-firebase-'))
  const candidate = path.join(directory, 'candidate')
  const rollback = path.join(directory, 'rollback')
  const cli = path.join(candidate, 'node_modules/firebase-tools')
  mkdirSync(path.join(candidate, 'scripts'), { recursive: true })
  mkdirSync(path.join(cli, 'lib/bin'), { recursive: true })
  mkdirSync(rollback)
  writeFileSync(path.join(candidate, 'package.json'), JSON.stringify({ devDependencies: { 'firebase-tools': '15.32.1' } }))
  writeFileSync(path.join(cli, 'package.json'), JSON.stringify({ name: 'firebase-tools', version: '15.32.1', bin: { firebase: './lib/bin/firebase.js' } }))
  writeFileSync(path.join(cli, 'lib/bin/firebase.js'), 'process.stdout.write(JSON.stringify({cwd:process.cwd(),args:process.argv.slice(2)})); process.exitCode=Number(process.env.URAI_TEST_CLI_EXIT || 0)\n')
  writeFileSync(path.join(candidate, 'scripts/run-frozen-firebase.mjs'), readFileSync(wrapper))
  return { directory, candidate, rollback, cli }
}

function run(f, cwd = f.candidate, args = ['deploy', '--only', 'functions', '--project', 'urai-4dc1d', '--config', 'firebase.json', '--non-interactive'], extra = {}) {
  return spawnSync(process.execPath, [path.join(f.candidate, 'scripts/run-frozen-firebase.mjs'), ...args], {
    cwd, encoding: 'utf8', env: { ...process.env, ...extra }, timeout: 10_000,
  })
}

test('candidate deployment preserves arguments and caller working directory', () => {
  const f = fixture()
  try {
    const result = run(f)
    assert.equal(result.status, 0, result.stderr)
    assert.deepEqual(JSON.parse(result.stdout), { cwd: f.candidate, args: ['deploy', '--only', 'functions', '--project', 'urai-4dc1d', '--config', 'firebase.json', '--non-interactive'] })
  } finally { rmSync(f.directory, { recursive: true, force: true }) }
})

test('rollback source uses the candidate reviewed CLI without installing another graph', () => {
  const f = fixture()
  try {
    const result = run(f, f.rollback)
    assert.equal(result.status, 0, result.stderr)
    assert.equal(JSON.parse(result.stdout).cwd, f.rollback)
  } finally { rmSync(f.directory, { recursive: true, force: true }) }
})

for (const [name, modify] of [
  ['missing installed graph', f => rmSync(path.join(f.candidate, 'node_modules'), { recursive: true })],
  ['undeclared CLI', f => writeFileSync(path.join(f.candidate, 'package.json'), '{}')],
  ['floating declaration', f => writeFileSync(path.join(f.candidate, 'package.json'), JSON.stringify({ devDependencies: { 'firebase-tools': '^15.32.1' } }))],
  ['version mismatch', f => writeFileSync(path.join(f.cli, 'package.json'), JSON.stringify({ name: 'firebase-tools', version: '15.22.3', bin: { firebase: './lib/bin/firebase.js' } }))],
  ['foreign package identity', f => writeFileSync(path.join(f.cli, 'package.json'), JSON.stringify({ name: 'different-cli', version: '15.32.1', bin: { firebase: './lib/bin/firebase.js' } }))],
]) {
  test(`refuses ${name} before CLI execution`, () => {
    const f = fixture()
    try { modify(f); const result = run(f); assert.notEqual(result.status, 0); assert.equal(result.stdout, '') }
    finally { rmSync(f.directory, { recursive: true, force: true }) }
  })
}

test('preserves deployment failure exit status for the existing rollback gate', () => {
  const f = fixture()
  try { assert.equal(run(f, f.candidate, undefined, { URAI_TEST_CLI_EXIT: '17' }).status, 17) }
  finally { rmSync(f.directory, { recursive: true, force: true }) }
})

test('cancellation never becomes a successful deployment receipt when CLI exits cleanly', async () => {
  const f = fixture()
  try {
    writeFileSync(path.join(f.cli, 'lib/bin/firebase.js'), 'process.on("SIGTERM",()=>process.exit(0)); process.stdout.write("ready"); setInterval(()=>{},1000)\n')
    const child = spawn(process.execPath, [path.join(f.candidate, 'scripts/run-frozen-firebase.mjs'), 'deploy'], {
      cwd: f.candidate, env: process.env, stdio: ['ignore', 'pipe', 'pipe'],
    })
    const result = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => { child.kill('SIGKILL'); reject(new Error('Cancellation did not terminate the reviewed CLI runner')) }, 5000)
      child.stdout.once('data', () => child.kill('SIGTERM'))
      child.once('error', reject)
      child.once('exit', (code, signal) => { clearTimeout(timer); resolve({ code, signal }) })
    })
    assert.deepEqual(result, { code: 143, signal: null })
  } finally { rmSync(f.directory, { recursive: true, force: true }) }
})
