import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const requireFromRoot = createRequire(path.join(root, 'package.json'))
const requireFromTier1 = createRequire(path.join(root, 'urai-tier1', 'package.json'))

const requiredRootFiles = ['package.json', 'pnpm-workspace.yaml', 'urai-tier1/package.json']
const requiredTier1Packages = ['next', 'react', 'react-dom', 'typescript', 'tsx']
const requiredNodeMajor = 22
const nodeVersionPinFiles = ['.nvmrc', '.node-version']

function fail(message) {
  console.error('\n[URAI Spatial workspace] ' + message + '\n')
  console.error('Run from the monorepo root:')
  console.error('  nvm use')
  console.error('  corepack enable')
  console.error('  corepack prepare pnpm@10.0.0 --activate')
  console.error('  corepack pnpm install')
  console.error('')
  console.error('Then run:')
  console.error('  corepack pnpm check:types')
  console.error('  corepack pnpm build')
  console.error('  corepack pnpm release:p1')
  console.error('')
  process.exit(1)
}

function readRequiredTextFile(file) {
  const fullPath = path.join(root, file)
  if (!fs.existsSync(fullPath)) {
    fail('Missing expected monorepo file: ' + file)
  }
  return fs.readFileSync(fullPath, 'utf8').trim()
}

const nodeMajor = Number.parseInt(process.versions.node.split('.')[0] ?? '0', 10)
if (!Number.isFinite(nodeMajor) || nodeMajor < requiredNodeMajor) {
  fail(`Expected Node ${requiredNodeMajor}+ but found ${process.version}. Use .nvmrc, .node-version, or another version manager to select Node ${requiredNodeMajor}.`)
}

for (const file of requiredRootFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    fail('Missing expected monorepo file: ' + file)
  }
}

for (const file of nodeVersionPinFiles) {
  const pinnedVersion = readRequiredTextFile(file)
  if (pinnedVersion !== String(requiredNodeMajor)) {
    fail(`Expected ${file} to pin Node ${requiredNodeMajor}, found: ${pinnedVersion}`)
  }
}

try {
  const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
  if (packageJson.packageManager !== 'pnpm@10.0.0') {
    fail('Expected packageManager pnpm@10.0.0 in root package.json')
  }
} catch (error) {
  fail('Could not read root package.json: ' + error.message)
}

try {
  requireFromRoot.resolve('typescript')
} catch {
  fail('Root workspace dependencies are not installed')
}

const missingTier1 = []
for (const dependency of requiredTier1Packages) {
  try {
    requireFromTier1.resolve(dependency)
  } catch {
    missingTier1.push(dependency)
  }
}

if (missingTier1.length > 0) {
  fail('Tier1 dependencies are not installed: ' + missingTier1.join(', '))
}

console.log('[URAI Spatial workspace] Workspace install looks ready')