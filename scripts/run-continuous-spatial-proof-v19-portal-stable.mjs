import { readFile, unlink, writeFile } from 'node:fs/promises'

const sourceUrl = new URL('./run-continuous-spatial-proof-v18-portal-stable.mjs', import.meta.url)
const generatedUrl = new URL('./.run-continuous-spatial-proof-v19-portal-stable.generated.mjs', import.meta.url)
const original = await readFile(sourceUrl, 'utf8')

const lifecycleGuardTarget = "if (!routeEvidence?.routeSettled || !String(request.failure || '').includes('ERR_ABORTED')) return false"
const lifecycleGuardReplacement = "if (!routeEvidence?.routeSettled || !routeEvidence?.lifecycleObserved || !String(request.failure || '').includes('ERR_ABORTED')) return false"
const lifecycleGuardCount = original.split(lifecycleGuardTarget).length - 1
if (lifecycleGuardCount !== 1) {
  throw new Error(`Portal-stable lifecycle abort guard expected one audited occurrence; found ${lifecycleGuardCount}`)
}

const manifestTarget = String.raw`&& /^\/assets\/urai\/final\/manifests\/v[234]-asset-factory-spatial-handoff\.json$/.test(requestUrl.pathname)`
const manifestReplacement = `&& (
          [
            '/assets/urai/final/manifests/v2-asset-factory-spatial-handoff.json',
            '/assets/urai/final/manifests/v3-asset-factory-spatial-handoff.json',
            '/assets/urai/final/manifests/v4-asset-factory-spatial-handoff.json',
          ].includes(requestUrl.pathname)
          || (requestUrl.pathname.startsWith('/_next/static/chunks/') && requestUrl.pathname.endsWith('.js'))
          || (requestUrl.pathname.startsWith('/_next/static/css/') && requestUrl.pathname.endsWith('.css'))
          || (requestUrl.pathname === expectedRoute.pathname + 'index.txt' && requestUrl.searchParams.has('_rsc'))
          || (requestUrl.href === routeEvidence.href
            && requestUrl.pathname === expectedRoute.pathname
            && requestUrl.searchParams.get('entryPortal') === expectedRoute.entryPortal
            && requestUrl.searchParams.get('cameraCheckpoint') === expectedRoute.cameraCheckpoint)
        )`
const manifestCount = original.split(manifestTarget).length - 1
if (manifestCount !== 1) {
  throw new Error(`Portal-stable navigation-abort predicate expected one audited occurrence; found ${manifestCount}`)
}

const constructionTarget = 'const patched = original.slice(0, portalStart) + repairedPortal + original.slice(portalEnd)'
const constructionReplacement = [
  'const portalPatched = original.slice(0, portalStart) + repairedPortal + original.slice(portalEnd)',
  'const focusTarget = "page.locator(\'.home-discreet-controls button\').first()"',
  'const focusReplacement = "page.locator(\'.home-discreet-controls button:not(:disabled)\').first()"',
  'const focusCount = portalPatched.split(focusTarget).length - 1',
  'if (focusCount !== 1) {',
  '  throw new Error(`Home keyboard focus selector expected one audited occurrence; found ${focusCount}`)',
  '}',
  'const focusBlockTarget = "const editableControl = page.locator(\'.home-discreet-controls button:not(:disabled)\').first()\\n      await editableControl.focus()"',
  'const focusBlockReplacement = "let editableControl = page.locator(\'.home-discreet-controls button:not(:disabled)\').first()\\n      if (!(await editableControl.isVisible().catch(() => false))) {\\n        await page.evaluate(() => {\\n          document.querySelector(\'[data-urai-proof-editable-focus]\')?.remove()\\n          const probe = document.createElement(\'input\')\\n          probe.type = \'text\'\\n          probe.setAttribute(\'data-urai-proof-editable-focus\', \'true\')\\n          probe.setAttribute(\'aria-label\', \'Keyboard movement focus-isolation proof\')\\n          probe.style.position = \'fixed\'\\n          probe.style.left = \'-10000px\'\\n          probe.style.top = \'0\'\\n          probe.style.width = \'1px\'\\n          probe.style.height = \'1px\'\\n          document.body.appendChild(probe)\\n        })\\n        editableControl = page.locator(\'[data-urai-proof-editable-focus]\').first()\\n      }\\n      await editableControl.focus()"',
  'const focusBlockCount = portalPatched.replace(focusTarget, focusReplacement).split(focusBlockTarget).length - 1',
  'if (focusBlockCount !== 1) {',
  '  throw new Error(`Home keyboard focus block expected one audited occurrence; found ${focusBlockCount}`)',
  '}',
  'const visibilityTarget = "const style = getComputedStyle(node)\\n    const rect = node.getBoundingClientRect()\\n    return style.display !== \'none\' && style.visibility !== \'hidden\' && Number.parseFloat(style.opacity || \'1\') > 0.02"',
  'const visibilityReplacement = "const style = getComputedStyle(node)\\n    const rect = node.getBoundingClientRect()\\n    let effectiveOpacity = 1\\n    for (let current = node; current instanceof Element; current = current.parentElement) {\\n      const currentStyle = getComputedStyle(current)\\n      if (currentStyle.display === \'none\' || currentStyle.visibility === \'hidden\') return false\\n      effectiveOpacity *= Number.parseFloat(currentStyle.opacity || \'1\')\\n    }\\n    return effectiveOpacity > 0.02"',
  'const visibilityCount = portalPatched.split(visibilityTarget).length - 1',
  'if (visibilityCount !== 1) {',
  '  throw new Error(`Home effective visibility predicate expected one audited occurrence; found ${visibilityCount}`)',
  '}',
  'const controlSetupTarget = "  const semanticButtons = semantic.getByRole(\'button\')\\n  const canvas = owner.locator(\'canvas\').first()"',
  'const controlSetupReplacement = "  const semanticButtons = semantic.getByRole(\'button\')\\n  const discreetButtons = page.locator(\'.home-discreet-controls button\')\\n  const provenanceControl = page.locator(\'.home-discreet-controls .home-why\')\\n  const ambienceControl = page.locator(\'.home-discreet-controls .home-audio\')\\n  const canvas = owner.locator(\'canvas\').first()"',
  'const controlSetupCount = portalPatched.split(controlSetupTarget).length - 1',
  'if (controlSetupCount !== 1) {',
  '  throw new Error(`Home semantic control setup expected one audited occurrence; found ${controlSetupCount}`)',
  '}',
  'const controlResultTarget = "    semanticVisible: await visibleCount(semanticButtons),\\n    discreetControls: await visibleCount(page.locator(\'.home-discreet-controls button\')),"',
  'const controlResultReplacement = "    semanticVisible: await visibleCount(semanticButtons),\\n    discreetButtons: await discreetButtons.count(),\\n    discreetVisible: await visibleCount(discreetButtons),\\n    provenanceVisible: await visibleCount(provenanceControl),\\n    provenanceDisabled: await provenanceControl.isDisabled().catch(() => true),\\n    provenanceLabel: (await provenanceControl.textContent())?.trim() || null,\\n    provenanceExpanded: await provenanceControl.getAttribute(\'aria-expanded\'),\\n    ambienceVisible: await visibleCount(ambienceControl),\\n    ambienceDisabled: await ambienceControl.isDisabled().catch(() => true),"',
  'const controlResultCount = portalPatched.split(controlResultTarget).length - 1',
  'if (controlResultCount !== 1) {',
  '  throw new Error(`Home semantic control result expected one audited occurrence; found ${controlResultCount}`)',
  '}',
  'const controlPassTarget = "&& result.semanticButtons === 3 && result.semanticVisible === 0 && result.discreetControls === 2"',
  'const controlPassReplacement = "&& result.semanticButtons === 3 && result.semanticVisible === 0\\n    && result.discreetButtons === 2 && result.provenanceVisible === 1 && !result.provenanceDisabled\\n    && result.provenanceLabel === \'Why am I seeing this?\' && result.provenanceExpanded === \'false\'\\n    && result.ambienceVisible === 1\\n    && ((result.ambienceDisabled && result.discreetVisible === 2)\\n      || (!result.ambienceDisabled && result.discreetVisible === 2))"',
  'const controlPassCount = portalPatched.split(controlPassTarget).length - 1',
  'if (controlPassCount !== 1) {',
  '  throw new Error(`Home semantic control acceptance expected one audited occurrence; found ${controlPassCount}`)',
  '}',
  'const patched = portalPatched',
  '  .replace(focusTarget, focusReplacement)',
  '  .replace(focusBlockTarget, focusBlockReplacement)',
  '  .replace(visibilityTarget, visibilityReplacement)',
  '  .replace(controlSetupTarget, controlSetupReplacement)',
  '  .replace(controlResultTarget, controlResultReplacement)',
  '  .replace(controlPassTarget, controlPassReplacement)',
  'if (!patched.includes(focusReplacement)) {',
  "  throw new Error('Home keyboard focus repair was not materialized')",
  '}',
  'if (!patched.includes("data-urai-proof-editable-focus")) {',
  "  throw new Error('Home keyboard focus-isolation probe was not materialized')",
  '}',
  'if (!patched.includes("effectiveOpacity *= Number.parseFloat(currentStyle.opacity || \'1\')")) {',
  "  throw new Error('Home ancestor-opacity visibility repair was not materialized')",
  '}',
  'if (!patched.includes("result.ambienceVisible === 1")) {',
  "  throw new Error('Home unavailable ambience visibility assertion was not materialized')",
  '}',
  'if (!patched.includes("result.provenanceLabel === \'Why am I seeing this?\'")) {',
  "  throw new Error('Home provenance accessible-name assertion was not materialized')",
  '}',
  'if (!patched.includes("if (!editableFocusProven) throw new Error(\'Home proof could not establish editable-control focus before movement regression\')")) {',
  "  throw new Error('Home keyboard focus assertion was weakened or removed')",
  '}',
  'if (!patched.includes("method === \'keyboard\' && (!result.editableFocusProven || !result.focusClear?.blurred || result.focusClear.afterEditable)")) {',
  "  throw new Error('Home keyboard focus-clear regression assertion was weakened or removed')",
  '}',
].join('\n')
const constructionCount = original.split(constructionTarget).length - 1
if (constructionCount !== 1) {
  throw new Error(`Portal-stable capture construction expected one audited occurrence; found ${constructionCount}`)
}

const patched = original
  .replace(lifecycleGuardTarget, lifecycleGuardReplacement)
  .replace(manifestTarget, manifestReplacement)
  .replace(constructionTarget, constructionReplacement)

if (!patched.includes("routeEvidence?.lifecycleObserved")) {
  throw new Error('Generated portal wrapper does not require a completed portal lifecycle before ignoring aborts')
}
if (!patched.includes("requestUrl.href === routeEvidence.href")) {
  throw new Error('Generated portal wrapper does not bind an ignored document abort to the exact settled route URL')
}
if (!patched.includes("requestUrl.searchParams.get('entryPortal') === expectedRoute.entryPortal")) {
  throw new Error('Generated portal wrapper does not bind an ignored document abort to the expected entry portal')
}
if (!patched.includes("requestUrl.searchParams.get('cameraCheckpoint') === expectedRoute.cameraCheckpoint")) {
  throw new Error('Generated portal wrapper does not bind an ignored document abort to the expected camera checkpoint')
}
if (!patched.includes("requestUrl.pathname === expectedRoute.pathname + 'index.txt'")) {
  throw new Error('Generated portal wrapper does not retain the exact destination RSC abort boundary')
}
if (!patched.includes("requestUrl.pathname.startsWith('/_next/static/chunks/')")) {
  throw new Error('Generated portal wrapper does not retain the bounded route chunk abort predicate')
}
if (!patched.includes("requestUrl.pathname.startsWith('/_next/static/css/')")) {
  throw new Error('Generated portal wrapper does not retain the bounded route stylesheet abort predicate')
}
if (!patched.includes("button:not(:disabled)")) {
  throw new Error('Generated portal wrapper does not contain the enabled-control repair')
}
if (!patched.includes('data-urai-proof-editable-focus')) {
  throw new Error('Generated portal wrapper does not contain the focus-isolation probe')
}
if (!patched.includes('Home unavailable ambience visibility assertion was not materialized')) {
  throw new Error('Generated portal wrapper does not retain unavailable ambience visibility enforcement')
}
if (!patched.includes('Home provenance accessible-name assertion was not materialized')) {
  throw new Error('Generated portal wrapper does not retain provenance accessible-name acceptance')
}
if (!patched.includes('Home ancestor-opacity visibility repair was not materialized')) {
  throw new Error('Generated portal wrapper does not retain the effective visibility guard')
}
if (!patched.includes('Home keyboard focus assertion was weakened or removed')) {
  throw new Error('Generated portal wrapper does not retain the focus assertion guard')
}
if (!patched.includes('Home keyboard focus-clear regression assertion was weakened or removed')) {
  throw new Error('Generated portal wrapper does not retain the focus-clear assertion guard')
}

await writeFile(generatedUrl, patched, 'utf8')
try {
  await import(`${generatedUrl.href}?exact=${Date.now()}`)
} finally {
  await unlink(generatedUrl).catch(() => {})
}
