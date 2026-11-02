import { createHash } from 'node:crypto'
import { copyFileSync, existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const packageDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const contracts = Object.freeze(['adamFounderVoiceReceiptContract.mjs'])

/** Preserve original ESM runtime contracts beside CommonJS TypeScript output.
 * tsc does not emit .mjs sources. A missing contract prevents Firebase Functions
 * initialization, even when compilation and the normal unit suite succeed. */
export function copyRuntimeContracts(packageRoot = packageDirectory) {
  const receipts = []
  for (const name of contracts) {
    const source = join(packageRoot, 'src', name)
    const target = join(packageRoot, 'lib', 'apps', 'functions', 'src', name)
    if (!existsSync(source) || !existsSync(dirname(target))) {
      throw new Error("Functions compiled runtime contract missing: " + name)
    }
    const original = readFileSync(source)
    copyFileSync(source, target)
    const copied = readFileSync(target)
    const sha256 = bytes => createHash('sha256').update(bytes).digest('hex')
    if (sha256(original) !== sha256(copied)) {
      throw new Error("Functions compiled runtime contract mismatch: " + name)
    }
    receipts.push(Object.freeze({ name, sha256: sha256(copied) }))
  }
  return receipts
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  copyRuntimeContracts()
}
