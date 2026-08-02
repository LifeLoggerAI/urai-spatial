import { readFile, unlink, writeFile } from 'node:fs/promises'

const sourceUrl = new URL('./run-continuous-spatial-proof-v18-portal-stable.mjs', import.meta.url)
const generatedUrl = new URL('./.run-continuous-spatial-proof-v19-portal-stable.generated.mjs', import.meta.url)
const original = await readFile(sourceUrl, 'utf8')
const target = String.raw`&& /^\/assets\/urai\/final\/manifests\/v[234]-asset-factory-spatial-handoff\.json$/.test(requestUrl.pathname)`
const replacement = `&& [
            '/assets/urai/final/manifests/v2-asset-factory-spatial-handoff.json',
            '/assets/urai/final/manifests/v3-asset-factory-spatial-handoff.json',
            '/assets/urai/final/manifests/v4-asset-factory-spatial-handoff.json',
          ].includes(requestUrl.pathname)`
const count = original.split(target).length - 1
if (count !== 1) {
  throw new Error(`Portal-stable manifest predicate expected one audited occurrence; found ${count}`)
}
const patched = original.replace(target, replacement)
await writeFile(generatedUrl, patched, 'utf8')
try {
  await import(`${generatedUrl.href}?exact=${Date.now()}`)
} finally {
  await unlink(generatedUrl).catch(() => {})
}
