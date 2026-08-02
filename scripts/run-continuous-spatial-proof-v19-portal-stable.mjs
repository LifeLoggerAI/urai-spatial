import { readFile, unlink, writeFile } from 'node:fs/promises'

const sourceUrl = new URL('./run-continuous-spatial-proof-v18-portal-stable.mjs', import.meta.url)
const generatedUrl = new URL('./.run-continuous-spatial-proof-v19-portal-stable.generated.mjs', import.meta.url)
const original = await readFile(sourceUrl, 'utf8')

const manifestTarget = String.raw`&& /^\/assets\/urai\/final\/manifests\/v[234]-asset-factory-spatial-handoff\.json$/.test(requestUrl.pathname)`
const manifestReplacement = `&& [
            '/assets/urai/final/manifests/v2-asset-factory-spatial-handoff.json',
            '/assets/urai/final/manifests/v3-asset-factory-spatial-handoff.json',
            '/assets/urai/final/manifests/v4-asset-factory-spatial-handoff.json',
          ].includes(requestUrl.pathname)`
const manifestCount = original.split(manifestTarget).length - 1
if (manifestCount !== 1) {
  throw new Error(`Portal-stable manifest predicate expected one audited occurrence; found ${manifestCount}`)
}

const focusTarget = "page.locator('.home-discreet-controls button').first()"
const focusReplacement = "page.locator('.home-discreet-controls button:not(:disabled)').first()"
const focusCount = original.split(focusTarget).length - 1
if (focusCount !== 1) {
  throw new Error(`Home keyboard focus selector expected one audited occurrence; found ${focusCount}`)
}

const patched = original
  .replace(manifestTarget, manifestReplacement)
  .replace(focusTarget, focusReplacement)

if (!patched.includes(focusReplacement)) {
  throw new Error('Home keyboard focus repair was not materialized')
}
if (!patched.includes("if (!editableFocusProven) throw new Error('Home proof could not establish editable-control focus before movement regression')")) {
  throw new Error('Home keyboard focus assertion was weakened or removed')
}
if (!patched.includes("method === 'keyboard' && (!result.editableFocusProven || !result.focusClear?.blurred || result.focusClear.afterEditable)")) {
  throw new Error('Home keyboard focus-clear regression assertion was weakened or removed')
}

await writeFile(generatedUrl, patched, 'utf8')
try {
  await import(`${generatedUrl.href}?exact=${Date.now()}`)
} finally {
  await unlink(generatedUrl).catch(() => {})
}
