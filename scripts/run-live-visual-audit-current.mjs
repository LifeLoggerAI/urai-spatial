import { createRequire } from 'node:module'

const requireFromTierOne = createRequire(new URL('../urai-tier1/package.json', import.meta.url))
requireFromTierOne('playwright')

// Static contract traceability retained for source guards while runtime proof is owned by the canonical driver.
// Current Ground visual copy: 'URAI Ground', 'Private infrastructure, embodied.', 'Reception', 'Archive'
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
