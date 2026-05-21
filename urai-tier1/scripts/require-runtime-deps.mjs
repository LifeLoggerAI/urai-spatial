import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

const requiredDependencies = [
  ['next', 'Next.js runtime'],
  ['react', 'React runtime'],
  ['react-dom', 'React DOM runtime'],
  ['typescript', 'TypeScript compiler'],
  ['tsx', 'test loader']
]

function fail(missing) {
  console.error('\n[URAI Spatial runtime deps] Workspace dependencies are missing or incomplete.\n')
  console.error(`Missing: ${missing.map(([, label]) => label).join(', ')}`)
  console.error('\nRun from the repo root:')
  console.error('  corepack enable')
  console.error('  corepack prepare pnpm@10.0.0 --activate')
  console.error('  corepack pnpm install')
  console.error('')
  console.error('Then rerun:')
  console.error('  corepack pnpm check:types')
  console.error('  corepack pnpm build')
  console.error('')
  process.exit(1)
}

const missing = []

for (const dependency of requiredDependencies) {
  try {
    require.resolve(dependency[0])
  } catch {
    missing.push(dependency)
  }
}

if (missing.length > 0) fail(missing)

console.log('[URAI Spatial runtime deps] Required workspace dependencies resolved')
