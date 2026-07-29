import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const scriptsDir = path.dirname(fileURLToPath(import.meta.url))
const sourcePath = path.join(scriptsDir, 'capture-continuous-spatial-proof-v18.mjs')
const materializedPath = path.join(scriptsDir, '.capture-continuous-spatial-proof-v19.mjs')

const staleEditableControl = "page.locator('.home-discreet-controls button').first()"
const currentEditableControl = "page.locator('[data-urai-audit-action=\"orb-controls\"]').first()"

let source = await readFile(sourcePath, 'utf8')
const count = source.split(staleEditableControl).length - 1
if (count !== 1) {
  throw new Error(`continuous proof editable-control selector expected exactly one audited occurrence; found ${count}`)
}
source = source.replace(staleEditableControl, currentEditableControl)
await writeFile(materializedPath, source)

await import(`${pathToFileURL(materializedPath).href}?exactHead=${encodeURIComponent(process.env.URAI_EXACT_HEAD || 'local')}`)
