#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, statSync, cpSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const argv = new Set(process.argv.slice(2))
const getArg = (name, fallback) => {
  const prefix = `${name}=`
  const hit = process.argv.slice(2).find((arg) => arg.startsWith(prefix))
  return hit ? hit.slice(prefix.length) : fallback
}

const base = getArg('--base', process.env.URAI_BASE_URL || 'https://urai.app')
const label = getArg('--label', 'v1-proof-loop')
const receiptsRoot = process.env.URAI_RECEIPT_ROOT || join(homedir(), 'urai-final-receipts')
const runDeploy = argv.has('--deploy')
const archiveToRepo = argv.has('--archive-to-repo')
const skipBrowserInstall = argv.has('--skip-browser-install')
const skipTypecheck = argv.has('--skip-typecheck')
const skipBuild = argv.has('--skip-build')

function sh(command, options = {}) {
  console.log(`\n=== ${command} ===`)
  const result = spawnSync(command, {
    shell: true,
    stdio: 'inherit',
    env: { ...process.env, FORCE_COLOR: '0', CI: process.env.CI || '1' },
    ...options,
  })
  return typeof result.status === 'number' ? result.status : 1
}

function fail(message) {
  console.error(`\n${message}`)
  process.exit(1)
}

function latestReceiptDir() {
  if (!existsSync(receiptsRoot)) return ''
  const dirs = readdirSync(receiptsRoot)
    .filter((name) => name.startsWith('aaa-launch-proof-'))
    .map((name) => join(receiptsRoot, name))
    .filter((path) => statSync(path).isDirectory())
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)
  return dirs[0] || ''
}

if (runDeploy) {
  fail('The --deploy option is disabled. Deploy only through the protected URAI Canonical Production Release workflow.')
}

const startedAt = new Date().toISOString().replace(/[:.]/g, '-')
const loopDir = join(receiptsRoot, `proof-loop-${label}-${startedAt}`)
mkdirSync(loopDir, { recursive: true })
const summaryPath = join(loopDir, 'summary.txt')
const summary = []
function mark(line) {
  summary.push(line)
  writeFileSync(summaryPath, `${summary.join('\n')}\n`)
  console.log(line)
}

mark(`LOOP_DIR=${loopDir}`)
mark(`BASE=${base}`)
mark(`LABEL=${label}`)
mark('DEPLOY=no-protected-workflow-only')

if (!skipBrowserInstall) {
  const code = sh('pnpm exec playwright install chromium')
  mark(`PW_INSTALL_EXIT=${code}`)
  if (code !== 0) fail('Browser install failed before screenshots.')
}

if (!skipTypecheck) {
  const code = sh('pnpm typecheck')
  mark(`TYPECHECK_EXIT=${code}`)
  if (code !== 0) fail('Typecheck failed before proof.')
}

if (!skipBuild) {
  const code = sh('rm -rf urai-tier1/.next urai-tier1/out .next out && pnpm build:static')
  mark(`BUILD_EXIT=${code}`)
  if (code !== 0) fail('Static build failed before proof.')
}

const proofExit = sh(`node scripts/aaa-launch-proof.mjs --skip-install --skip-typecheck --skip-test --skip-build --screenshots --base=${base}`)
mark(`PROOF_EXIT=${proofExit}`)
if (proofExit !== 0) fail('AAA launch proof failed.')

const receipt = latestReceiptDir()
mark(`LATEST_PROOF=${receipt}`)
if (!receipt) fail('Could not find aaa-launch-proof receipt directory.')

const screenshotDir = join(receipt, 'screenshots')
const pngCount = existsSync(screenshotDir) ? readdirSync(screenshotDir).filter((name) => name.endsWith('.png')).length : 0
mark(`PNG_COUNT=${pngCount}`)
if (pngCount !== 24) fail('Expected 24 screenshot PNG files.')

const zipName = `${label}-${receipt.split('/').pop()}.zip`.replace(/[^a-z0-9._-]+/gi, '-')
const zipPath = join(loopDir, zipName)
const zipExit = sh(`cd ${JSON.stringify(receipt)} && zip -r ${JSON.stringify(zipPath)} screenshots screenshots.json final-report.md route-matrix.md route-matrix.json summary.json`)
mark(`ZIP_EXIT=${zipExit}`)
mark(`ZIP=${zipPath}`)
if (zipExit !== 0) fail('Could not package proof zip.')

if (archiveToRepo) {
  const dstDir = resolve('docs/receipts/screenshots')
  mkdirSync(dstDir, { recursive: true })
  const dst = join(dstDir, zipName)
  cpSync(zipPath, dst)
  mark(`REPO_ZIP=${dst}`)
  mark('Archive copied into docs/receipts/screenshots. Commit through a reviewed branch; do not push directly to main.')
}

mark('STATUS=GREEN')
mark('Next: review screenshots, patch the named visual defect, and rerun proof. Production deployment remains protected-workflow only.')
