import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

function fail(message) {
  console.error(`\n[URAI Spatial bootstrap] ${message}\n`)
  console.error('Run from the repo root:')
  console.error('  corepack enable')
  console.error('  corepack pnpm install')
  console.error('  corepack pnpm --dir urai-tier1 test')
  console.error('')
  process.exit(1)
}

try {
  require.resolve('tsx')
} catch {
  fail('Missing test loader dependency: tsx. node_modules is not installed or the workspace install is incomplete.')
}

try {
  require.resolve('typescript')
} catch {
  fail('Missing TypeScript dependency. node_modules is not installed or the workspace install is incomplete.')
}
