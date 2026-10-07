import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const script = fileURLToPath(new URL('../../scripts/prepare-ios-source-archive.py', import.meta.url))
const source = 'a'.repeat(40)
const hash = bytes => createHash('sha256').update(bytes).digest('hex')
function run(args) { return spawnSync('python3', [script, ...args], { encoding: 'utf8' }) }
function fixture() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'urai-ios-source-archive-'))
  const project = path.join(directory, 'ios')
  const entries = ['App/App.xcodeproj/project.pbxproj', 'App/CapApp-SPM/Package.swift', 'App/App/AppDelegate.swift', 'App/App/SceneDelegate.swift', 'App/App/Info.plist', 'App/App/App.entitlements', 'App/App/Assets.xcassets/AppIcon.appiconset/Contents.json']
  for (const entry of entries) { const file = path.join(project, entry); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, 'source fixture\n') }
  const plugin = path.join(project, 'App/CapApp-SPM/Dependencies/CapacitorApp')
  fs.mkdirSync(path.join(plugin, 'ios/Sources/AppPlugin'), { recursive: true })
  fs.writeFileSync(path.join(plugin, 'package.json'), JSON.stringify({ name: '@capacitor/app', version: '8.1.2' }))
  fs.writeFileSync(path.join(plugin, 'Package.swift'), 'plugin source')
  fs.writeFileSync(path.join(plugin, 'LICENSE'), 'plugin license')
  fs.writeFileSync(path.join(plugin, 'ios/Sources/AppPlugin/AppPlugin.swift'), 'plugin source')
  fs.writeFileSync(path.join(project, 'App/CapApp-SPM/Package.swift'), '.package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", exact: "8.5.2"), .package(name: "CapacitorApp", path: "Dependencies/CapacitorApp")')
  const web = path.join(project, 'App/App/public')
  fs.mkdirSync(path.join(web, 'api/system'), { recursive: true })
  fs.mkdirSync(path.join(web, 'assets'), { recursive: true })
  fs.writeFileSync(path.join(web, 'assets/memory.bin'), Buffer.from([0, 4, 8, 16, 32, 64, 128]))
  const html = '<html data-deployed-sha="' + source + '"><body>UrAi</body></html>'
  const proof = JSON.stringify({ repository: 'LifeLoggerAI/urai-spatial', environment: { commitSha: source, firebaseProject: 'urai-4dc1d' }, deploymentFreshness: { commitSha: source, commitShaKnown: true } })
  fs.writeFileSync(path.join(web, 'index.html'), html)
  fs.writeFileSync(path.join(web, 'api/system/deploy-proof'), proof)
  fs.writeFileSync(path.join(web, 'native-build-fingerprint.json'), JSON.stringify({ sourceSha: source, platform: 'ios', workflowRunId: '123', firebaseProject: 'urai-4dc1d', htmlSha256: hash(html), deployProofSha256: hash(proof), nativeAcceptance: false, physicalDeviceAcceptance: false, productionAcceptance: false }))
  const receipt = path.join(directory, 'ios-source-receipt.json')
  fs.writeFileSync(receipt, JSON.stringify({ sourceSha: source, compiled: false, signingPerformed: false, appleAuthoritySupplied: false, nativeAppleAuthConfigured: false, nativeGoogleAuthConfigured: false }))
  const output = path.join(directory, 'archive')
  return { directory, project, web, receipt, output, args: ['package', '--project', project, '--receipt', receipt, '--output-directory', output, '--source-sha', source, '--workflow-run-id', '123'] }
}
function cleanup(f) { fs.rmSync(f.directory, { recursive: true, force: true }) }
test('full iOS archive retains Xcode resources, every static asset and exact hashes, then reconstructs losslessly', () => {
  const f = fixture()
  try {
    const packaged = run(f.args)
    assert.equal(packaged.status, 0, packaged.stderr)
    const manifest = path.join(f.output, 'ios-source-archive-transport.json')
    const data = JSON.parse(fs.readFileSync(manifest))
    assert.equal(data.compiled, false)
    assert.equal(data.signed, false)
    const output = path.join(f.directory, 'reconstructed.zip')
    const result = run(['reconstruct', '--manifest', manifest, '--parts-directory', f.output, '--output', output, '--source-sha', source])
    assert.equal(result.status, 0, result.stderr)
    assert.equal(hash(fs.readFileSync(output)), data.archiveSha256)
    const verify = run(['verify', '--archive', output, '--source-sha', source])
    assert.equal(verify.status, 0, verify.stderr)
    const inspect = spawnSync('python3', ['-c', 'import zipfile,json,sys; z=zipfile.ZipFile(sys.argv[1]); index=json.loads(z.read("ios-source-project-index.json")); print(json.dumps([f["path"] for f in index["files"]]))', output], { encoding: 'utf8' })
    assert.equal(inspect.status, 0, inspect.stderr)
    const files = JSON.parse(inspect.stdout)
    assert.ok(files.includes('distribution/ios-shell/ios/App/App/Assets.xcassets/AppIcon.appiconset/Contents.json'))
    assert.ok(files.includes('distribution/ios-shell/ios/App/App/public/assets/memory.bin'))
  } finally { cleanup(f) }
})
test('iOS archive rejects stale receipt, altered packaged web bytes, missing resources and source aliases', () => {
  for (const kind of ['receipt', 'web', 'missing', 'source']) {
    const f = fixture()
    try {
      let args = f.args
      if (kind === 'receipt') fs.writeFileSync(f.receipt, JSON.stringify({ sourceSha: 'b'.repeat(40), compiled: true }))
      if (kind === 'web') fs.appendFileSync(path.join(f.web, 'index.html'), 'altered')
      if (kind === 'missing') fs.rmSync(path.join(f.project, 'App/App/Info.plist'))
      if (kind === 'source') args = args.map(value => value === source ? 'main' : value)
      const result = run(args)
      assert.notEqual(result.status, 0, kind)
      assert.match(result.stderr, /IOS_SOURCE_ARCHIVE_(SOURCE_ONLY_RECEIPT_REQUIRED|STATIC_BYTES_MISMATCH|INCOMPLETE_PROJECT|EXACT_SOURCE_REQUIRED)/)
    } finally { cleanup(f) }
  }
})
test('iOS transport rejects wrong SHA, path traversal, corrupt parts and leaves no output on failure', () => {
  const f = fixture()
  try {
    assert.equal(run(f.args).status, 0)
    const manifest = path.join(f.output, 'ios-source-archive-transport.json')
    const original = JSON.parse(fs.readFileSync(manifest))
    const output = path.join(f.directory, 'must-not-exist.zip')
    const args = ['reconstruct', '--manifest', manifest, '--parts-directory', f.output, '--output', output, '--source-sha', source]
    for (const altered of [{ ...original, sourceSha: 'b'.repeat(40) }, { ...original, parts: [{ ...original.parts[0], name: '../outside' }] }]) {
      fs.writeFileSync(manifest, JSON.stringify(altered))
      assert.notEqual(run(args).status, 0)
      assert.equal(fs.existsSync(output), false)
      assert.equal(fs.existsSync(output + '.partial'), false)
    }
    fs.writeFileSync(manifest, JSON.stringify(original))
    fs.appendFileSync(path.join(f.output, original.parts[0].name), 'corrupt')
    assert.match(run(args).stderr, /PART_HASH_MISMATCH/)
    assert.equal(fs.existsSync(output), false)
  } finally { cleanup(f) }
})
test('iOS source archive rejects linked source files and unsafe ZIP entries', () => {
  const f = fixture()
  try {
    const extra = path.join(f.project, 'App/private-link')
    fs.symlinkSync(f.receipt, extra)
    assert.match(run(f.args).stderr, /SYMLINK_REJECTED/)
    fs.rmSync(extra)
    assert.equal(run(f.args).status, 0)
    const archive = path.join(f.output, 'urai-ios-project-source.zip')
    const inject = spawnSync('python3', ['-c', 'import zipfile,sys; z=zipfile.ZipFile(sys.argv[1],"a"); z.writestr("../escape","private"); z.close()', archive], { encoding: 'utf8' })
    assert.equal(inject.status, 0)
    assert.match(run(['verify', '--archive', archive, '--source-sha', source]).stderr, /ENTRY_UNSAFE/)
  } finally { cleanup(f) }
})


test('iOS archive vendors the exact local SPM plugin with native sources and license', () => {
  const f = fixture()
  try {
    const plugin = path.join(f.project, 'App/CapApp-SPM/Dependencies/CapacitorApp')
    const external = path.join(f.directory, 'locked-plugin')
    fs.renameSync(plugin, external)
    const manifest = path.join(f.project, 'App/CapApp-SPM/Package.swift')
    fs.writeFileSync(manifest, '.package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", exact: "8.5.2"), .package(name: "CapacitorApp", path: "../../../../../node_modules/@capacitor/app")')
    const result = run(['vendor', '--project', f.project, '--capacitor-app-package', external])
    assert.equal(result.status, 0, result.stderr)
    assert.ok(fs.existsSync(path.join(plugin, 'LICENSE')))
    assert.ok(fs.existsSync(path.join(plugin, 'ios/Sources/AppPlugin/AppPlugin.swift')))
    assert.match(fs.readFileSync(manifest, 'utf8'), /path: "Dependencies\/CapacitorApp"/)
    assert.equal(run(f.args).status, 0)
  } finally { cleanup(f) }
})
test('iOS plugin vendoring rejects an unpinned version before changing generated source', () => {
  const f = fixture()
  try {
    const plugin = path.join(f.project, 'App/CapApp-SPM/Dependencies/CapacitorApp')
    fs.writeFileSync(path.join(plugin, 'package.json'), JSON.stringify({ name: '@capacitor/app', version: '0.0.0' }))
    const manifest = path.join(f.project, 'App/CapApp-SPM/Package.swift')
    const original = fs.readFileSync(manifest, 'utf8')
    assert.match(run(['vendor', '--project', f.project, '--capacitor-app-package', plugin]).stderr, /LOCKED_PLUGIN_REQUIRED/)
    assert.equal(fs.readFileSync(manifest, 'utf8'), original)
  } finally { cleanup(f) }
})
