/**
 * Stage checked-in ESM runtime helpers that TypeScript's CJS emit does not
 * copy. This is a build-only file operation, not a voice/consent issuer.
 */
import { createHash } from 'node:crypto'
import { copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

function filesUnder(root, extension) {
  const found = []
  function visit(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const full = join(directory, entry.name)
      if (entry.isSymbolicLink() || lstatSync(full).isSymbolicLink()) {
        throw new Error('runtime_stage_symlink_refused')
      }
      if (entry.isDirectory()) visit(full)
      else if (entry.isFile() && entry.name.endsWith(extension)) found.push(full)
    }
  }
  visit(root)
  return found.sort()
}

export function stageRuntimeMjs(sourceRoot, outputRoot) {
  const source = resolve(sourceRoot)
  const output = resolve(outputRoot)
  const inputFiles = filesUnder(source, '.mjs')
  if (!inputFiles.length) throw new Error('runtime_mjs_source_missing')
  const receipts = []
  for (const input of inputFiles) {
    const suffix = relative(source, input)
    if (isAbsolute(suffix) || suffix.startsWith('..')) throw new Error('runtime_stage_path_escape')
    const target = join(output, suffix)
    mkdirSync(dirname(target), { recursive: true })
    copyFileSync(input, target)
    const before = readFileSync(input)
    const after = readFileSync(target)
    if (!before.equals(after)) throw new Error('runtime_mjs_stage_integrity_failure:' + suffix)
    receipts.push({
      path: suffix.replaceAll('\\', '/'),
      sha256: createHash('sha256').update(after).digest('hex'),
    })
  }
  // Compiled TS can require checked-in ESM helpers by their literal .mjs names.
  // Refuse green builds where the runtime module is still absent.
  for (const emitted of filesUnder(output, '.js')) {
    const code = readFileSync(emitted, 'utf8')
    for (const match of code.matchAll(/require\(["'](\.[^"']+\.mjs)["']\)/g)) {
      const target = resolve(dirname(emitted), match[1])
      if (!target.startsWith(output + '/') || !existsSync(target)) {
        throw new Error('compiled_runtime_mjs_import_missing:' + match[1])
      }
    }
  }
  return receipts
}

const scriptPath = fileURLToPath(import.meta.url)
if (process.argv[1] && resolve(process.argv[1]) === scriptPath) {
  const functionsDir = resolve(dirname(scriptPath), '..')
  const receipts = stageRuntimeMjs(
    join(functionsDir, 'src'),
    join(functionsDir, 'lib', 'apps', 'functions', 'src'),
  )
  console.log('R551_FUNCTIONS_RUNTIME_MJS_STAGED', JSON.stringify(receipts))
}
