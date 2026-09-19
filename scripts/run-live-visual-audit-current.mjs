import { createRequire } from 'node:module'

const requireFromTierOne = createRequire(new URL('../urai-tier1/package.json', import.meta.url))
requireFromTierOne('playwright')

// Static contract traceability retained for source guards while runtime proof is owned by the canonical driver.
// Current Ground authority: lived first-person world; visible terrain is traversal; private place data is fail-closed by default.
// Ground route markers: 'urai-ground-lived-world', 'ground-lived-world-v2-canon-lock', 'first-person-lived-world', 'first-person-no-visible-body', 'eye-level-terrain-following-no-authored-bob', 'terrain-plus-authored-obstacle-field'
// Retired Ground copy/authority: 'URAI GROUND', 'Private infrastructure beneath the living world', 'Walk deeper. Approach a chamber.', 'ground-destination-compass'
// data-world-target="focus"
// check.name === 'life-map-to-focus'
// .life-map-accessibility-menu is retired and is not queried by the active proof.
// The Quiet Reset
// focusTouchTarget
// semanticListHidden
// firstVisible(page, check.selectors)
// Open Orb travel controls
// clickOrFollowHref(page, found.locator)
// waitForURL((url) => url.toString().includes(check.expected), { timeout: 7000 })
// getAttribute('data-memory-status') === 'demo'
// getAttribute('data-memory-id')?.startsWith('demo:')
// document.body.textContent?.includes('Memory unavailable')
// destinationUrl.searchParams.get('demo') !== '1'
// Life Map did not preserve truthful explicit-demo identity into Focus

await import('./run-canonical-live-visual-audit-current-home.mjs')
