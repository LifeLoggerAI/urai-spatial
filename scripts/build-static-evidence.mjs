import { access, rename, rm } from 'node:fs/promises'
import { constants } from 'node:fs'
import { spawn } from 'node:child_process'

const runtimeOnlyRoutes = [
  'urai-tier1/src/app/api/entitlement/route.ts',
  'urai-tier1/src/app/api/stripe/create-checkout-session/route.ts',
  'urai-tier1/src/app/api/stripe/create-portal-session/route.ts',
  'urai-tier1/src/app/api/stripe/webhook/route.ts',
  'urai-tier1/src/app/api/stripe/webhook-v2/route.ts',
]

const staged = []
const basisPath = 'urai-tier1/public/basis'
let basisExistedBefore = false

async function exists(path) {
  try {
    await access(path, constants.F_OK)
    return true
  } catch {
    return false
  }
}

async function run(command, args, env = process.env) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', env })
    child.once('error', reject)
    child.once('exit', (code, signal) => {
      if (code === 0) resolve()
      else reject(new Error(`${command} ${args.join(' ')} failed with ${signal ? `signal ${signal}` : `exit code ${code}`}`))
    })
  })
}

async function stageRuntimeOnlyRoutes() {
  for (const source of runtimeOnlyRoutes) {
    const stagedPath = `${source}.static-evidence-runtime-only`
    const sourceExists = await exists(source)
    const stagedExists = await exists(stagedPath)

    if (!sourceExists && stagedExists) {
      // An outer evidence wrapper already staged this route.
      continue
    }
    if (!sourceExists) continue
    if (stagedExists) throw new Error(`Refusing static evidence build: staged route already exists: ${stagedPath}`)

    await rename(source, stagedPath)
    staged.push({ source, stagedPath })
  }
}

async function restoreRuntimeOnlyRoutes() {
  for (const { source, stagedPath } of [...staged].reverse()) {
    if (!(await exists(stagedPath))) throw new Error(`Static evidence route disappeared before restore: ${stagedPath}`)
    if (await exists(source)) throw new Error(`Refusing to overwrite restored runtime route: ${source}`)
    await rename(stagedPath, source)
  }
}

async function restoreBasisAssets() {
  if (!basisExistedBefore) {
    await rm(basisPath, { recursive: true, force: true })
    return
  }

  // --prepare-runtime-assets intentionally replaces public/basis from the installed
  // Three.js package. Static evidence must leave the exact checked-out candidate
  // untouched, so restore tracked decoder assets and remove any generated extras.
  await run('git', ['restore', '--source=HEAD', '--worktree', '--', basisPath])
  await run('git', ['clean', '-fd', '--', basisPath])
}

let buildError
try {
  basisExistedBefore = await exists(basisPath)
  await run('node', ['scripts/run-pnpm.mjs', 'bootstrap:check'])
  await run('node', ['scripts/prepare-low-disk-build.mjs'])
  await stageRuntimeOnlyRoutes()
  await run('node', ['urai-tier1/scripts/require-runtime-deps.mjs', '--prepare-runtime-assets'])
  await run(
    'node',
    ['scripts/run-pnpm.mjs', '--dir', 'urai-tier1', 'exec', 'next', 'build'],
    { ...process.env, URAI_FIREBASE_STATIC_EXPORT: 'true' },
  )
} catch (error) {
  buildError = error
} finally {
  try {
    await restoreBasisAssets()
    await restoreRuntimeOnlyRoutes()
    await run('git', ['diff', '--exit-code', '--', basisPath, ...staged.map(({ source }) => source)])
    await run('git', ['status', '--porcelain', '--untracked-files=all'])
  } catch (restoreError) {
    if (buildError) {
      console.error(buildError)
      throw restoreError
    }
    throw restoreError
  }
}

if (buildError) throw buildError
