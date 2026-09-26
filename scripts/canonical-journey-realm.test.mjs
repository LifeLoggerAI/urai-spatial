import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createRequire } from 'node:module'
import { worldRealm } from './canonical-journey-realm.mjs'

const requireFromTierOne = createRequire(new URL('../urai-tier1/package.json', import.meta.url))
const { chromium } = requireFromTierOne('playwright')

test('journey locators exclude hidden streamed payloads without accepting duplicate mounted realms', async () => {
  const browser = await chromium.launch({
    executablePath: process.env.URAI_PROOF_CHROMIUM_EXECUTABLE_PATH || undefined,
    headless: true,
  })
  try {
    const page = await browser.newPage()
    const ready = '<main data-testid="urai-final-focus-chamber" data-chamber-state="ready" data-memory-id="demo:quiet-reset">Selected memory</main>'
    const streamed = '<div hidden id="S:0"><main data-testid="urai-final-focus-chamber" data-chamber-state="loading">Loading</main></div>'
    await page.setContent(`<div data-testid="urai-persistent-world-shell">${ready}</div>${streamed}`)
    await assert.rejects(page.getByTestId('urai-final-focus-chamber').waitFor({ state: 'visible', timeout: 500 }), /strict mode violation/)
    const focus = worldRealm(page, 'urai-final-focus-chamber')
    await focus.waitFor({ state: 'visible', timeout: 500 })
    assert.equal(await focus.getAttribute('data-memory-id'), 'demo:quiet-reset')
    assert.equal(await focus.getAttribute('data-chamber-state'), 'ready')

    // A real duplicate inside the mounted world is still a failure.
    await page.setContent(`<div data-testid="urai-persistent-world-shell">${ready}${ready}</div>${streamed}`)
    await assert.rejects(focus.waitFor({ state: 'visible', timeout: 500 }), /strict mode violation/)

    // Two world owners must not be concealed either.
    await page.setContent(`<div data-testid="urai-persistent-world-shell">${ready}</div><div data-testid="urai-persistent-world-shell">${ready}</div>`)
    await assert.rejects(focus.waitFor({ state: 'visible', timeout: 500 }), /strict mode violation/)

    // A streamed payload by itself cannot satisfy route readiness.
    await page.setContent(streamed)
    assert.equal(await focus.count(), 0)
    await assert.rejects(focus.waitFor({ state: 'visible', timeout: 500 }), /Timeout/)
  } finally {
    await browser.close()
  }
})
