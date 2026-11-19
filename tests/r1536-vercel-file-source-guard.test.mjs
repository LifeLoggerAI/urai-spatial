import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import test from 'node:test'

const nextConfig = new URL('../urai-tier1/next.config.mjs', import.meta.url)
function cmd(cwd, args) { return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore','pipe','pipe'] }).trim() }
function check(configFile, env) {
  return spawnSync(process.execPath, ['--input-type=module', '-e', 'await import(process.argv[1])', configFile], {
    cwd: resolve(configFile, '../..'), encoding: 'utf8', timeout: 8000,
    env: { PATH: process.env.PATH || '/usr/bin:/bin', HOME: process.env.HOME || '/tmp', ...env },
  })
}
test('source-file preview requires exact checked Git HEAD and tree; Git source guard stays separate', () => {
  const root = mkdtempSync(join(tmpdir(), 'urai-verified-file-preview-'))
  try {
    const app = join(root, 'urai-tier1')
    mkdirSync(app)
    mkdirSync(join(root, '.urai-r1536'))
    const file = join(app, 'next.config.mjs')
    writeFileSync(file, readFileSync(nextConfig))
    writeFileSync(join(root, 'README.md'), 'disposable provenance test\n')
    cmd(root, ['init', '-q'])
    cmd(root, ['add', 'README.md', 'urai-tier1/next.config.mjs'])
    execFileSync('git', ['-c','user.name=UrAi Fixture','-c','user.email=fixture@example.invalid','commit','-qm','fixture'], { cwd: root })
    const sha = cmd(root, ['rev-parse', 'HEAD'])
    const tree = cmd(root, ['rev-parse', 'HEAD^{tree}'])
    const lock = { sourceSha: sha, sourceTreeSha: tree, releaseAuthorized: false, reviewOnly: true, privateMemoryWrites: 'DISABLED' }
    const lockPath = join(root, '.urai-r1536/source-lock.json')
    writeFileSync(lockPath, JSON.stringify(lock))
    const env = { VERCEL: '1', VERCEL_ENV: 'preview', URAI_REVIEW_SOURCE_UPLOAD: 'true', NEXT_PUBLIC_URAI_BUILD_SHA: sha }
    assert.equal(check(file,env).status, 0)
    const denied = [
      { ...env, NEXT_PUBLIC_URAI_BUILD_SHA:'b'.repeat(40) },
      { ...env, VERCEL_ENV:'production' },
      { ...env, VERCEL_GIT_COMMIT_SHA:'c'.repeat(40) },
      { ...env, VERCEL:'0' },
    ]
    for(const bad of denied){
      const r=check(file,bad)
      assert.notEqual(r.status,0)
      assert.match(r.stderr,/URAI_SOURCE_UPLOAD_PROVENANCE_DENIED/)
    }
    writeFileSync(lockPath, JSON.stringify({ ...lock, sourceTreeSha:'a'.repeat(40) }))
    assert.match(check(file,env).stderr,/URAI_SOURCE_UPLOAD_PROVENANCE_DENIED/)
    writeFileSync(lockPath, JSON.stringify({ ...lock, sourceTreeSha:tree, privateMemoryWrites:'ENABLED' }))
    assert.match(check(file,env).stderr,/URAI_SOURCE_UPLOAD_PROVENANCE_DENIED/)
  } finally { rmSync(root,{recursive:true,force:true}) }
})
