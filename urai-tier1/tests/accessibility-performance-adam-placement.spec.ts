import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test'
import { createHash } from 'node:crypto'

for (const viewport of [{ width: 320, height: 700 }, { width: 844, height: 390 }]) {
  test(`Founder helper stays in flow on text surfaces at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    const pageErrors: string[] = []
    page.on('pageerror', error => pageErrors.push(error.message))
    await page.setViewportSize(viewport)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    for (const route of ['/about', '/support', '/status', '/location-map', '/adam']) {
      await page.goto(route, { waitUntil: 'domcontentloaded' })
      // The canonical founder route intentionally opens its panel on entry.
      // Verify that accessible entry before exercising its inline launcher.
      if (route === '/adam') {
        const panel = page.getByRole('complementary', { name: 'Adam founder presence' })
        const close = panel.getByRole('button', { name: 'Close Adam', exact: true })
        await expect(panel).toBeVisible()
        await expect(close).toBeFocused()
        await page.keyboard.press('Escape')
        await expect(panel).toHaveCount(0)
        await expect(page.locator('[data-urai-adam-launcher]')).toBeFocused()
        await assertCanonicalFounderPaint(page, viewport)
      }
      const launcher = page.locator('[data-urai-adam-launcher]')
      await expect(launcher).toHaveAttribute('data-adam-launcher-placement', 'inline-slot')
      await launcher.scrollIntoViewIfNeeded()
      const geometry = await launcher.evaluate(element => {
        const r = element.getBoundingClientRect()
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
        const textOverlaps = [...document.querySelectorAll('main h1, main p')].filter(node => {
          const text = node.getBoundingClientRect()
          return text.width > 2 && text.height > 2 && r.left < text.right && r.right > text.left && r.top < text.bottom && r.bottom > text.top
        }).map(node => node.textContent?.trim())
        return { width: r.width, height: r.height, left: r.left, right: r.right, viewportWidth: innerWidth, position: getComputedStyle(element).position, pointerReachable: hit === element || element.contains(hit), textOverlaps }
      })
      expect(geometry.position).toBe('static')
      expect(geometry.width).toBeGreaterThanOrEqual(48)
      expect(geometry.height).toBeGreaterThanOrEqual(48)
      expect(geometry.left).toBeGreaterThanOrEqual(0)
      expect(geometry.right).toBeLessThanOrEqual(geometry.viewportWidth)
      expect(geometry.pointerReachable).toBe(true)
      expect(geometry.textOverlaps, `${route} helper must not cover the page's text`).toEqual([])
      await launcher.focus()
      await page.keyboard.press('Enter')
      const about = page.getByText('About Adam', { exact: true })
      await expect(about).toBeVisible()
      expect((await about.boundingBox())!.height).toBeGreaterThanOrEqual(48)
      await about.focus()
      await page.keyboard.press('Enter')
      await expect(about.locator('..')).toHaveAttribute('open', '')
      await page.getByRole('button', { name: 'Close Adam', exact: true }).click()
      await expect(launcher).toHaveAttribute('data-adam-launcher-placement', 'inline-slot')
      expect(pageErrors, `${route} must hydrate without runtime errors`).toEqual([])
      await test.info().attach(`founder-${route.slice(1)}-${viewport.width}-geometry.json`, { body: JSON.stringify(geometry), contentType: 'application/json' })
    }
  })
}

async function assertCanonicalFounderPaint(page: Page, viewport: { width: number; height: number }) {
  const main = page.locator('[data-urai-adam-route="canonical"]:visible')
  await expect(main).toHaveCount(1)
  const paint = await main.evaluate(element => {
    const runtime = element.closest('.urai-world-runtime')
    const atmosphere = runtime?.querySelector(':scope > .urai-world-atmosphere')
    const copy = element.querySelector('section > p:last-of-type')
    const rgba = (value: string) => {
      const channels = value.match(/[\d.]+/g)?.map(Number) ?? []
      return { rgb: channels.slice(0, 3), alpha: channels[3] ?? 1 }
    }
    const luminance = (rgb: number[]) => rgb.map(channel => {
      const value = channel / 255
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
    }).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0)
    const mainStyle = getComputedStyle(element)
    const copyStyle = copy ? getComputedStyle(copy) : null
    const foreground = rgba(copyStyle?.color ?? '')
    const stops = [...mainStyle.backgroundImage.matchAll(/rgba?\(([^)]+)\)/g)].map(match => rgba(match[0]))
    const ancestorOpacities: number[] = []
    for (let node: Element | null = copy; node; node = node.parentElement) ancestorOpacities.push(Number(getComputedStyle(node).opacity))
    const contrast = stops.map(stop => {
      const composite = foreground.rgb.map((channel, index) => channel * foreground.alpha + stop.rgb[index] * (1 - foreground.alpha))
      const a = luminance(composite), b = luminance(stop.rgb)
      return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
    })
    const pseudoLayers = [{ owner: 'runtime', node: runtime }, { owner: 'main', node: element }, { owner: 'atmosphere', node: atmosphere }].flatMap(({ owner, node }) => ['::before', '::after'].map(pseudo => {
      const style = node ? getComputedStyle(node, pseudo) : null
      return { owner, pseudo, content: style?.content ?? null, display: style?.display ?? null, visibility: style?.visibility ?? null, opacity: Number(style?.opacity), position: style?.position ?? null, zIndex: Number(style?.zIndex) }
    }))
    return {
      ownership: { mainOwnedByRuntime: element.parentElement === runtime, atmosphereOwnedByRuntime: atmosphere?.parentElement === runtime },
      main: { position: mainStyle.position, zIndex: Number(mainStyle.zIndex), backgroundImage: mainStyle.backgroundImage },
      atmosphere: { zIndex: atmosphere ? Number(getComputedStyle(atmosphere).zIndex) : Number.NaN, isolation: atmosphere ? getComputedStyle(atmosphere).isolation : null },
      copy: { text: copy?.textContent?.trim() ?? '', fontSize: copyStyle?.fontSize ?? null, foreground, gradientStops: stops, contrasts: contrast },
      ancestorOpacities, pseudoLayers,
      contrastBasis: 'Actual RGBA copy over every opaque gradient stop after asserting its main paints above the isolated atmosphere; literal inspection remains required',
    }
  })
  expect(paint.ownership.mainOwnedByRuntime).toBe(true)
  expect(paint.ownership.atmosphereOwnedByRuntime).toBe(true)
  expect(paint.main.position).not.toBe('static')
  expect(Number.isFinite(paint.main.zIndex)).toBe(true)
  expect(Number.isFinite(paint.atmosphere.zIndex)).toBe(true)
  expect(paint.main.zIndex, 'The real founder disclosure must paint above its atmosphere').toBeGreaterThan(paint.atmosphere.zIndex)
  expect(paint.atmosphere.isolation).toBe('isolate')
  expect(paint.ancestorOpacities.every(value => value === 1)).toBe(true)
  expect(paint.copy.text).toContain('still require the human founder.')
  expect(paint.copy.foreground.rgb).toHaveLength(3)
  expect(paint.copy.gradientStops.length).toBeGreaterThan(0)
  expect(paint.copy.gradientStops.every(stop => stop.rgb.length === 3 && stop.alpha === 1)).toBe(true)
  for (const contrast of paint.copy.contrasts) expect(contrast, 'The small founder disclosure must retain 4.5:1 contrast over the brightest declared backing').toBeGreaterThanOrEqual(4.5)
  for (const layer of paint.pseudoLayers) {
    expect(layer.content).not.toBeNull()
    const generated = layer.content !== 'none' && layer.content !== 'normal'
    if (!generated || layer.display === 'none' || layer.visibility !== 'visible' || layer.opacity <= 0) continue
    expect(Number.isFinite(layer.zIndex), `${layer.owner}${layer.pseudo} visible painting must be explicit`).toBe(true)
    expect(layer.position).not.toBe('static')
    if (layer.owner === 'runtime') expect(paint.main.zIndex).toBeGreaterThan(layer.zIndex)
  }
  await test.info().attach(`founder-adam-paint-${viewport.width}x${viewport.height}.json`, { body: JSON.stringify(paint), contentType: 'application/json' })
  await test.info().attach(`founder-adam-closed-${viewport.width}x${viewport.height}.png`, { body: await page.screenshot(), contentType: 'image/png' })
}


async function assertSettingsStatusPaint(page: Page, info: TestInfo, viewport: { width: number; height: number }) {
  const main = page.locator('main[data-route-owner="device-settings"]:visible')
  await expect(main, 'The rendered Settings page must have exactly one visible owner').toHaveCount(1)
  const status = main.locator('#language-review-status:visible')
  await expect(status).toHaveCount(1)
  await expect(status).toHaveText('English source language. Other languages are available as working translation previews.')
  expect(await status.evaluate(element => Boolean(element.closest('[hidden], [inert], canvas'))), 'Settings copy must not come from streamed or inactive fallback markup').toBe(false)
  const geometry = await assertCopyIsUnobstructed(status)
  const paint = await status.evaluate(element => {
    const owner = element.closest('main[data-route-owner="device-settings"]')!
    const runtime = owner.closest('.urai-world-runtime')
    const atmosphere = runtime?.querySelector(':scope > .urai-world-atmosphere')
    const rgba = (value: string) => {
      const channels = value.match(/[\d.]+/g)?.map(Number) ?? []
      return { rgb: channels.slice(0, 3), alpha: channels[3] ?? 1 }
    }
    const luminance = (rgb: number[]) => rgb.map(channel => {
      const value = channel / 255
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
    }).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0)
    const mainStyle = getComputedStyle(owner)
    const foreground = rgba(getComputedStyle(element).color)
    const stops = [...mainStyle.backgroundImage.matchAll(/rgba?\(([^)]+)\)/g)].map(match => rgba(match[0]))
    const backing: { color: ReturnType<typeof rgba>; image: string }[] = []
    const ancestors: { opacity: number; filter: string; blend: string }[] = []
    for (let node: Element | null = element; node; node = node.parentElement) {
      const style = getComputedStyle(node)
      ancestors.push({ opacity: Number(style.opacity), filter: style.filter, blend: style.mixBlendMode })
      if (node === owner) break
      backing.push({ color: rgba(style.backgroundColor), image: style.backgroundImage })
    }
    const contrasts = stops.map(stop => {
      const background = [...backing].reverse().reduce((rgb, layer) => layer.color.rgb.map((channel, index) => channel * layer.color.alpha + rgb[index] * (1 - layer.color.alpha)), stop.rgb)
      const composite = foreground.rgb.map((channel, index) => channel * foreground.alpha + background[index] * (1 - foreground.alpha))
      const a = luminance(composite), b = luminance(background)
      return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
    })
    return {
      ownership: { mainOwnedByRuntime: owner.parentElement === runtime, atmosphereOwnedByRuntime: atmosphere?.parentElement === runtime },
      main: { position: mainStyle.position, zIndex: Number(mainStyle.zIndex), backgroundImage: mainStyle.backgroundImage },
      atmosphere: { zIndex: atmosphere ? Number(getComputedStyle(atmosphere).zIndex) : Number.NaN, isolation: atmosphere ? getComputedStyle(atmosphere).isolation : null },
      foreground, stops, backing, ancestors, contrasts,
      contrastBasis: 'Actual status RGBA and intermediate panel backgrounds over all opaque Settings gradient stops, after asserting the actual main paints above its atmosphere; literal after-image inspection remains required',
    }
  })
  expect(paint.ownership.mainOwnedByRuntime).toBe(true)
  expect(paint.ownership.atmosphereOwnedByRuntime).toBe(true)
  expect(paint.main.position).not.toBe('static')
  expect(Number.isFinite(paint.main.zIndex)).toBe(true)
  expect(Number.isFinite(paint.atmosphere.zIndex)).toBe(true)
  expect(paint.main.zIndex, 'The actual language review disclosure must paint above its decorative atmosphere').toBeGreaterThan(paint.atmosphere.zIndex)
  expect(paint.atmosphere.isolation).toBe('isolate')
  expect(paint.ancestors.every(style => style.opacity === 1 && style.filter === 'none' && style.blend === 'normal')).toBe(true)
  expect(paint.foreground.rgb).toHaveLength(3)
  expect(paint.stops.length).toBeGreaterThan(0)
  expect(paint.stops.every(stop => stop.rgb.length === 3 && stop.alpha === 1)).toBe(true)
  expect(paint.backing.every(layer => layer.color.rgb.length === 3 && layer.color.alpha >= 0 && layer.color.alpha <= 1 && layer.image === 'none')).toBe(true)
  for (const contrast of paint.contrasts) expect(contrast, 'The real Settings status must retain at least 4.5:1 contrast on every declared backing').toBeGreaterThanOrEqual(4.5)
  await attachPlacement(page, info, `settings-language-status-paint-${viewport.width}x${viewport.height}`, { route: '/settings/', geometry, paint })
}

async function assertInlineLauncher(page: Page, slot: string) {
  const launcher = page.locator('[data-urai-adam-launcher]')
  const anchor = page.locator(`[data-urai-adam-launcher-slot="${slot}"]:visible`)
  await expect(anchor, 'Exactly one actual visible founder slot must own the launcher').toHaveCount(1)
  await expect(anchor).toHaveAttribute('data-urai-adam-launcher-ready', 'true')
  await expect(anchor.locator('[data-urai-adam-launcher]')).toHaveCount(1)
  await expect(launcher).toHaveAttribute('data-adam-launcher-placement', 'inline-slot')
  await launcher.scrollIntoViewIfNeeded()
  const geometry = await launcher.evaluate(element => {
    const rect = element.getBoundingClientRect()
    const style = getComputedStyle(element)
    const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
    return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height, position: style.position, animation: style.animationName, transform: style.transform, viewportWidth: innerWidth, viewportHeight: innerHeight, reachable: hit === element || element.contains(hit) }
  })
  expect(geometry.position).toBe('static')
  expect(geometry.transform).toBe('none')
  expect(geometry.animation).toBe('none')
  expect(geometry.width).toBeGreaterThanOrEqual(48)
  expect(geometry.height).toBeGreaterThanOrEqual(48)
  expect(geometry.left).toBeGreaterThanOrEqual(0)
  expect(geometry.right).toBeLessThanOrEqual(geometry.viewportWidth + 1)
  expect(geometry.top).toBeGreaterThanOrEqual(0)
  expect(geometry.bottom).toBeLessThanOrEqual(geometry.viewportHeight + 1)
  expect(geometry.reachable).toBe(true)
  return { launcher, geometry }
}

async function assertCopyIsUnobstructed(copy: Locator) {
  await copy.scrollIntoViewIfNeeded()
  const geometry = await copy.evaluate(element => {
    const text = element.getBoundingClientRect()
    const launcher = document.querySelector('[data-urai-adam-launcher]')
    const button = launcher?.getBoundingClientRect()
    return { text: element.textContent, top: text.top, bottom: text.bottom, viewportHeight: innerHeight, coveredByLauncher: Boolean(button && text.left < button.right && text.right > button.left && text.top < button.bottom && text.bottom > button.top) }
  })
  expect(geometry.top).toBeGreaterThanOrEqual(-1)
  expect(geometry.bottom).toBeLessThanOrEqual(geometry.viewportHeight + 1)
  expect(geometry.coveredByLauncher, `Adam must not cover ${geometry.text}`).toBe(false)
  return geometry
}

async function assertScrollTargetClearOfOrb(target: Locator, scrollboxSelector = '.passportVault') {
  await target.scrollIntoViewIfNeeded()
  const geometry = await target.evaluate((element, selector) => {
    const rect = element.getBoundingClientRect()
    const scrollbox = element.closest(selector)!.getBoundingClientRect()
    const orb = document.querySelector('.urai-world-companion__orb')!.getBoundingClientRect()
    const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
    return { text: element.textContent?.trim(), width: rect.width, height: rect.height, top: rect.top, bottom: rect.bottom, scrollboxBottom: scrollbox.bottom, viewportHeight: innerHeight, coveredByOrb: rect.left < orb.right && rect.right > orb.left && rect.top < orb.bottom && rect.bottom > orb.top, pointerReachable: hit === element || element.contains(hit) }
  }, scrollboxSelector)
  expect(geometry.top).toBeGreaterThanOrEqual(-1)
  expect(geometry.bottom).toBeLessThanOrEqual(Math.min(geometry.scrollboxBottom, geometry.viewportHeight) + 1)
  expect(geometry.coveredByOrb, `The persistent Orb must not cover ${scrollboxSelector} controls or copy`).toBe(false)
  expect(geometry.pointerReachable).toBe(true)
  return geometry
}

async function exerciseKeyboardPanel(page: Page, slot: string, capture = true) {
  let { launcher } = await assertInlineLauncher(page, slot)
  await launcher.focus()
  await page.keyboard.press('Enter')
  const panel = page.getByRole('complementary', { name: 'Adam founder presence' })
  const close = panel.getByRole('button', { name: 'Close Adam', exact: true })
  await expect(close).toBeFocused()
  const closeBounds = await close.boundingBox()
  expect(closeBounds!.width).toBeGreaterThanOrEqual(48)
  expect(closeBounds!.height).toBeGreaterThanOrEqual(48)
  const openingUrl = page.url()
  await page.keyboard.press('Escape')
  await expect(panel).toHaveCount(0)
  await expect(page.locator('[data-urai-adam-launcher]')).toBeFocused()
  expect(page.url(), 'Escape on Close must dismiss the panel before any realm return').toBe(openingUrl)
  await page.keyboard.press('Enter')
  await expect(close).toBeFocused()
  await page.keyboard.press('Tab')
  const about = panel.getByText('About Adam', { exact: true })
  await expect(about).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(about.locator('..')).toHaveAttribute('open', '')
  const panelGeometry = await panel.evaluate(element => {
    const rect = element.getBoundingClientRect()
    return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, viewportWidth: innerWidth, viewportHeight: innerHeight, horizontalOverflow: element.scrollWidth > element.clientWidth + 1, hasVerticalOverflow: element.scrollHeight > element.clientHeight + 1, overflowY: getComputedStyle(element).overflowY }
  })
  expect(panelGeometry.left).toBeGreaterThanOrEqual(0)
  expect(panelGeometry.right).toBeLessThanOrEqual(panelGeometry.viewportWidth + 1)
  expect(panelGeometry.top).toBeGreaterThanOrEqual(0)
  expect(panelGeometry.bottom).toBeLessThanOrEqual(panelGeometry.viewportHeight + 1)
  expect(panelGeometry.horizontalOverflow).toBe(false)
  if (panelGeometry.hasVerticalOverflow) expect(panelGeometry.overflowY).toMatch(/^(auto|scroll)$/)
  if (capture) await attachPlacement(page, test.info(), `${slot}-panel-open-${panelGeometry.viewportWidth}x${panelGeometry.viewportHeight}`, panelGeometry)
  await page.keyboard.press('Tab')
  await expect(panel.getByRole('textbox', { name: 'Message Adam', exact: true })).toBeFocused()
  const voice = panel.getByRole('button', { name: 'Mute voice', exact: true })
  await voice.scrollIntoViewIfNeeded()
  const controlGeometry = await voice.evaluate(element => {
    const rect = element.getBoundingClientRect()
    const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
    return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height, viewportWidth: innerWidth, viewportHeight: innerHeight, reachable: hit === element || element.contains(hit) }
  })
  expect(controlGeometry.width).toBeGreaterThanOrEqual(48)
  expect(controlGeometry.height).toBeGreaterThanOrEqual(48)
  expect(controlGeometry.left).toBeGreaterThanOrEqual(0)
  expect(controlGeometry.right).toBeLessThanOrEqual(controlGeometry.viewportWidth + 1)
  expect(controlGeometry.top).toBeGreaterThanOrEqual(0)
  expect(controlGeometry.bottom).toBeLessThanOrEqual(controlGeometry.viewportHeight + 1)
  expect(controlGeometry.reachable).toBe(true)
  await expect(close).toBeInViewport({ ratio: 1 })
  if (capture) await attachPlacement(page, test.info(), `${slot}-panel-controls-${controlGeometry.viewportWidth}x${controlGeometry.viewportHeight}`, controlGeometry)
  const actions = panel.getByRole('button').filter({ hasNotText: '×' })
  const actionCount = await actions.count()
  expect(actionCount).toBe(4)
  const actionBounds = []
  for (let index = 0; index < actionCount; index++) {
    const action = actions.nth(index)
    await action.scrollIntoViewIfNeeded()
    await expect(action).toBeInViewport({ ratio: 1 })
    const bounds = await action.evaluate(element => {
      const r = element.getBoundingClientRect()
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
      return { label: element.textContent?.trim(), width: r.width, height: r.height, reachable: hit === element || element.contains(hit) }
    })
    expect(bounds.width).toBeGreaterThanOrEqual(48)
    expect(bounds.height).toBeGreaterThanOrEqual(48)
    expect(bounds.reachable, `${bounds.label} must remain reachable above the persistent Orb`).toBe(true)
    actionBounds.push(bounds)
  }
  for (const consent of await panel.getByRole('checkbox').all()) {
    const label = consent.locator('..')
    await label.scrollIntoViewIfNeeded()
    expect((await label.boundingBox())!.height).toBeGreaterThanOrEqual(48)
  }
  await test.info().attach(`${slot}-actual-panel-action-targets.json`, { body: JSON.stringify(actionBounds), contentType: 'application/json' })
  await expect(close).toBeInViewport({ ratio: 1 })
  await page.keyboard.press('Escape')
  await expect(panel).toHaveCount(0)
  launcher = page.locator('[data-urai-adam-launcher]')
  await expect(launcher).toBeFocused()
  await assertInlineLauncher(page, slot)
  await page.keyboard.press('Enter')
  await expect(close).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(panel).toHaveCount(0)
  await expect(page.locator('[data-urai-adam-launcher]')).toBeFocused()
}

async function attachPlacement(page: Page, info: TestInfo, name: string, evidence: unknown) {
  await info.attach(`${name}.json`, { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' })
  await info.attach(`${name}.png`, { body: await page.screenshot(), contentType: 'image/png' })
}

const placementViewports = [{ width: 320, height: 568 }, { width: 844, height: 390 }, { width: 1280, height: 800 }]
for (const viewport of placementViewports) {
  test(`Settings founder helper never covers privacy text at ${viewport.width}x${viewport.height}`, async ({ page }, info) => {
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    await page.setViewportSize(viewport)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const serverResponse = await page.request.get('/settings/')
    expect(serverResponse.status()).toBe(200)
    const serverHtml = await serverResponse.text()
    const deniedServerText = 'Session authority is unavailable. Emotional Weather remains off.'
    expect(serverHtml, 'The exact exported settings consumer must start with denied session authority').toContain(deniedServerText)
    await page.goto('/settings', { waitUntil: 'domcontentloaded' })
    const weather = page.locator('[data-manual-weather-preference="session-only"]')
    const weatherStatus = weather.getByRole('status')
    await expect(weatherStatus, 'A resolved local session changes ready state only after the consumer hydrates').toHaveText('Emotional Weather is off.')
    const weatherToggle = weather.getByRole('checkbox', { name: 'Show my manual description in Home', exact: true })
    await expect(weatherToggle).not.toBeChecked()
    await expect(weatherToggle).toBeEnabled()
    await expect(weather.getByRole('combobox', { name: 'My description', exact: true })).toBeDisabled()
    await expect(weather.getByRole('button', { name: 'Reset and turn off', exact: true })).toBeDisabled()
    await info.attach(`settings-streamed-hydration-${viewport.width}x${viewport.height}.json`, {
      body: JSON.stringify({ serverHtmlSha256: createHash('sha256').update(serverHtml).digest('hex'), deniedServerText, streamedBoundaryIds: [...serverHtml.matchAll(/id="(S:\d+)"/g)].map(match => match[1]), clientText: await weatherStatus.innerText(), clientEnabled: await weatherToggle.isEnabled(), clientChecked: await weatherToggle.isChecked(), pageErrors: [...errors] }),
      contentType: 'application/json',
    })
    await assertSettingsStatusPaint(page, info, viewport)
    const initial = await assertInlineLauncher(page, 'device-settings')
    const privacyCopy = page.getByText('Local sensory preferences live on this device. Private data permissions remain in the Consent Sanctuary, and ownership controls remain in Passport.', { exact: true })
    const privacy = await assertCopyIsUnobstructed(privacyCopy)
    await attachPlacement(page, info, `settings-privacy-${viewport.width}x${viewport.height}`, { launcher: initial.geometry, privacy })
    await exerciseKeyboardPanel(page, 'device-settings')
    const ownershipCopy = page.getByText('Inspect identity, ownership, export and account boundaries.', { exact: true })
    const ownership = await assertCopyIsUnobstructed(ownershipCopy)
    await attachPlacement(page, info, `settings-ownership-${viewport.width}x${viewport.height}`, { ownership })
    await assertInlineLauncher(page, 'device-settings')
    expect(errors).toEqual([])
  })

  for (const state of ['signed-out', 'demo']) {
    test(`Passport founder helper keeps every zone and deletion copy clear in ${state} at ${viewport.width}x${viewport.height}`, async ({ page }, info) => {
      test.setTimeout(60000)
      const errors: string[] = []
      page.on('pageerror', error => errors.push(error.message))
      await page.setViewportSize(viewport)
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.goto(`/passport${state === 'demo' ? '?demo=1' : ''}`, { waitUntil: 'domcontentloaded' })
      const owner = page.locator('[data-route-owner="passport-ownership-vault"]')
      await expect(owner).toHaveAttribute('data-passport-source', state === 'demo' ? 'demo' : /^(signed-out|unavailable)$/)
      const initial = await assertInlineLauncher(page, 'passport-controls')
      const zones = page.getByRole('navigation', { name: 'Ownership Vault zones' }).getByRole('button')
      const zoneCount = await zones.count()
      expect(zoneCount).toBe(9)
      for (let index = 0; index < zoneCount; index++) {
        const zone = zones.nth(index)
        await zone.focus()
        await page.keyboard.press('Enter')
        await expect(zone).toHaveAttribute('aria-pressed', 'true')
      }
      await exerciseKeyboardPanel(page, 'passport-controls')
      const deletionCopy = page.getByText('Deletion is scoped, revision-safe, queued through the trusted backend, and leaves an append-only privacy-safe receipt. Provider and legal retention exceptions are disclosed rather than hidden.', { exact: true })
      const deletion = await assertCopyIsUnobstructed(deletionCopy)
      await attachPlacement(page, info, `passport-deletion-${state}-${viewport.width}x${viewport.height}`, { launcher: initial.geometry, deletion, zoneCount })
      await expect(page.locator('.urai-world-companion__orb')).toBeVisible()
      const operationTargets = []
      for (const target of await page.locator('.passportDanger > label > select, .passportDanger > label > input, .passportDanger > button').all()) {
        const geometry = await assertScrollTargetClearOfOrb(target)
        expect(geometry.width).toBeGreaterThanOrEqual(48)
        expect(geometry.height).toBeGreaterThanOrEqual(48)
        operationTargets.push(geometry)
      }
      expect(operationTargets).toHaveLength(3)
      await attachPlacement(page, info, `passport-operation-fields-${state}-${viewport.width}x${viewport.height}`, operationTargets)
      const ownershipInformation = await assertScrollTargetClearOfOrb(page.locator('.passportKey span'))
      await info.attach(`passport-ownership-orb-clear-${state}-${viewport.width}x${viewport.height}.json`, { body: JSON.stringify(ownershipInformation), contentType: 'application/json' })
      const action = owner.getByRole('button', { name: 'Unlock and create deletion request', exact: true })
      await expect(action).toBeDisabled()
      await action.scrollIntoViewIfNeeded()
      const actionBounds = await action.boundingBox()
      expect(actionBounds!.height).toBeGreaterThanOrEqual(48)
      await attachPlacement(page, info, `passport-last-control-${state}-${viewport.width}x${viewport.height}`, { actionBounds })
      await assertInlineLauncher(page, 'passport-controls')
      expect(errors).toEqual([])
    })
  }
}

test('Passport no-WebGL keeps the founder slot and protected deletion text clear at 320px', async ({ page }, info) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', { value: function(contextId: string, ...args: unknown[]) {
      if (['webgl', 'webgl2', 'experimental-webgl'].includes(contextId)) return null
      return Reflect.apply(original, this, [contextId, ...args])
    } })
  })
  await page.setViewportSize({ width: 320, height: 568 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/passport?demo=1', { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('Vault controls remain available without WebGL.', { exact: true })).toBeVisible()
  const initial = await assertInlineLauncher(page, 'passport-controls')
  await exerciseKeyboardPanel(page, 'passport-controls')
  const deletion = await assertCopyIsUnobstructed(page.locator('.passportDanger > p'))
  await expect(page.locator('.urai-world-companion__orb')).toBeVisible()
  const confirmation = await assertScrollTargetClearOfOrb(page.locator('.passportDanger > label > input'))
  expect(confirmation.height).toBeGreaterThanOrEqual(48)
  await attachPlacement(page, info, 'passport-no-webgl-operation-field-320x568', confirmation)
  await assertCopyIsUnobstructed(page.locator('.passportDanger > p'))
  await attachPlacement(page, info, 'passport-no-webgl-320x568', { launcher: initial.geometry, deletion })
})

const protectedRoutes: Array<{ route: string; slot: string; noWebGL?: boolean; fallbackSlot?: string }> = [
  { route: '/privacy-policy', slot: 'privacy-policy' },
  { route: '/privacy', slot: 'privacy-legal' },
  { route: '/terms', slot: 'terms-legal' },
  { route: '/account-deletion', slot: 'account-deletion' },
  { route: '/sms-opt-in', slot: 'sms-opt-in' },
  { route: '/settings/communications', slot: 'communications-settings' },
  { route: '/spatial/ar-vr', slot: 'xr-portals' },
  { route: '/xr', slot: 'xr-portals' },
  { route: '/council', slot: 'council-fallback', noWebGL: true },
  { route: '/spatial/captured-reality', slot: 'captured-reality-fallback' },
  { route: '/spatial/interpretive-world', slot: 'interpretive-world-fallback' },
  { route: '/spatial/memory-world', slot: 'memory-world-unavailable' },
  { route: '/life-movie', slot: 'life-movie-unavailable' },
  { route: '/mirror', slot: 'mirror-entry' },
  { route: '/possible-futures', slot: 'possible-futures-controls' },
  { route: '/launch', slot: 'launch-actions' },
  { route: '/life-map', slot: 'life-map-unsigned-controls', fallbackSlot: 'life-map-signed-out' },
  { route: '/unwind', slot: 'life-map-unsigned-controls', fallbackSlot: 'life-map-signed-out' },
  { route: '/ground', slot: 'ground-semantic-routes', noWebGL: true },
]

async function disableWebGL(page: Page) {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', { value: function(contextId: string, ...args: unknown[]) {
      if (['webgl', 'webgl2', 'experimental-webgl'].includes(contextId)) return null
      return Reflect.apply(original, this, [contextId, ...args])
    } })
  })
}

async function inspectTextAndControls(page: Page, slot: string) {
  const { launcher, geometry } = await assertInlineLauncher(page, slot)
  const overlaps = await launcher.evaluate(element => {
    const r = element.getBoundingClientRect()
    return [...document.querySelectorAll('main h1, main h2, main p, main label, main input, main textarea, main button, main a, [data-testid="urai-life-map-signed-out-disclosure"] strong, [data-testid="urai-life-map-signed-out-disclosure"] span, [data-testid="urai-life-map-signed-out-disclosure"] button')].filter(target => {
      if (target === element || target.contains(element)) return false
      // HTML canvas fallback and closed details retain semantic descendants but
      // do not paint them. Inspect their real visible states separately below.
      if (target.closest('canvas,[hidden],[inert],[aria-hidden="true"]')) return false
      const closedDetails = target.closest('details:not([open])')
      if (closedDetails && !closedDetails.querySelector('summary')?.contains(target)) return false
      const t = target.getBoundingClientRect()
      let left = t.left, right = t.right, top = t.top, bottom = t.bottom
      for (let parent = target.parentElement; parent; parent = parent.parentElement) {
        const style = getComputedStyle(parent)
        if (style.display === 'none' || style.visibility === 'hidden') return false
        const clip = parent.getBoundingClientRect()
        if (/^(auto|scroll|hidden|clip)$/.test(style.overflowX)) { left = Math.max(left, clip.left); right = Math.min(right, clip.right) }
        if (/^(auto|scroll|hidden|clip)$/.test(style.overflowY)) { top = Math.max(top, clip.top); bottom = Math.min(bottom, clip.bottom) }
      }
      return right - left > 2 && bottom - top > 2 && r.left < right && r.right > left && r.top < bottom && r.bottom > top
    }).map(target => ({ tag: target.tagName, text: target.textContent?.trim() }))
  })
  expect(overlaps, `${slot} founder launcher must not cover copy or another control`).toEqual([])
  if (slot === 'possible-futures-controls') {
    const scrollbox = 'section[aria-label="Possible Future controls"]'
    for (const target of await page.locator(scrollbox).locator('textarea, button').all()) {
      const control = await assertScrollTargetClearOfOrb(target, scrollbox)
      expect(control.width).toBeGreaterThanOrEqual(48)
      expect(control.height).toBeGreaterThanOrEqual(48)
    }
    await assertScrollTargetClearOfOrb(launcher, scrollbox)
  }
  return geometry
}

for (const profile of [
  { width: 320, height: 568, noWebGL: false },
  { width: 844, height: 390, noWebGL: false },
  { width: 390, height: 844, noWebGL: true },
]) {
  for (const surface of protectedRoutes) {
    test(`Founder launcher protects ${surface.route} text and controls at ${profile.width}x${profile.height}${profile.noWebGL ? ' without WebGL' : ''}`, async ({ page }, info) => {
      test.setTimeout(60000)
      const errors: string[] = []
      page.on('pageerror', error => errors.push(error.message))
      await page.setViewportSize(profile)
      await page.emulateMedia({ reducedMotion: 'reduce' })
      if (profile.noWebGL || surface.noWebGL) await disableWebGL(page)
      await page.goto(surface.route, { waitUntil: 'domcontentloaded' })
      const slot = profile.noWebGL && surface.fallbackSlot ? surface.fallbackSlot : surface.slot
      const anchor = page.locator(`[data-urai-adam-launcher-slot="${slot}"]:visible`)
      await expect(anchor, 'Exactly one actual visible founder slot must own the launcher').toHaveCount(1)
      await expect(anchor).toHaveAttribute('data-urai-adam-launcher-ready', 'true')
      await expect(anchor.locator('[data-urai-adam-launcher]')).toHaveCount(1)
      await expect(page.locator('canvas [data-urai-adam-launcher], [hidden] [data-urai-adam-launcher], [inert] [data-urai-adam-launcher]')).toHaveCount(0)
      if (slot === 'xr-portals') {
        const paint = await page.locator('[aria-label="XR and comfort controls"]').evaluate(panel => {
          const rgba = (value: string) => {
            const values = value.match(/[\d.]+/g)?.map(Number) ?? []
            return { rgb: values.slice(0, 3), alpha: values[3] ?? 1 }
          }
          const luminance = (rgb: number[]) => rgb.map(channel => {
            const value = channel / 255
            return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
          }).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0)
          const style = getComputedStyle(panel)
          const background = rgba(style.backgroundColor)
          const world = panel.closest('[data-testid="urai-quest-explorable-world"]')
          const runtime = world?.closest('.urai-world-runtime')
          const atmosphere = runtime?.querySelector(':scope > .urai-world-atmosphere')
          const zIndex = (node: Element | null | undefined) => node ? Number(getComputedStyle(node).zIndex) : Number.NaN
          const stacking = {
            runtime: zIndex(runtime), atmosphere: zIndex(atmosphere), world: zIndex(world), panel: zIndex(panel),
          }
          const ownership = {
            panelInWorld: Boolean(world?.contains(panel)),
            worldInRuntime: Boolean(runtime?.contains(world!)),
            atmosphereInRuntime: Boolean(atmosphere && atmosphere.parentElement === runtime),
            runtimeIsolation: runtime ? getComputedStyle(runtime).isolation : null,
            worldIsolation: world ? getComputedStyle(world).isolation : null,
            atmosphereIsolation: atmosphere ? getComputedStyle(atmosphere).isolation : null,
          }
          const pseudoLayers = [
            { owner: 'runtime', node: runtime }, { owner: 'world', node: world }, { owner: 'atmosphere', node: atmosphere },
          ].flatMap(({ owner, node }) => ['::before', '::after'].map(pseudo => {
            if (!node) return { owner, pseudo, content: null, display: null, visibility: null, opacity: Number.NaN, position: null, zIndex: Number.NaN }
            const computed = getComputedStyle(node, pseudo)
            return { owner, pseudo, content: computed.content, display: computed.display, visibility: computed.visibility,
              opacity: Number(computed.opacity), position: computed.position, zIndex: Number(computed.zIndex) }
          }))
          const ancestorOpacities: number[] = []
          for (let node: Element | null = panel; node; node = node.parentElement) {
            ancestorOpacities.push(Number(getComputedStyle(node).opacity))
          }
          const text = [...panel.querySelectorAll('[data-testid="urai-quest-vr-entry-control"] label, [data-testid="urai-quest-vr-entry-control"] p')].map(node => {
            const color = rgba(getComputedStyle(node).color)
            const fore = luminance(color.rgb), back = luminance(background.rgb)
            return { text: node.textContent?.trim(), color: getComputedStyle(node).color, alpha: color.alpha, contrast: (Math.max(fore, back) + 0.05) / (Math.min(fore, back) + 0.05) }
          })
          return { background: style.backgroundColor, backgroundAlpha: background.alpha, backgroundImage: style.backgroundImage, stacking, ownership, pseudoLayers, ancestorOpacities, text }
        })
        for (const layer of Object.values(paint.stacking)) expect(Number.isFinite(layer), 'Actual XR decorative and UI layers require explicit numeric stacking positions').toBe(true)
        expect(paint.ownership.panelInWorld).toBe(true)
        expect(paint.ownership.worldInRuntime).toBe(true)
        expect(paint.ownership.atmosphereInRuntime).toBe(true)
        expect(paint.ownership.runtimeIsolation).toBe('isolate')
        expect(paint.ownership.worldIsolation).toBe('isolate')
        expect(paint.ownership.atmosphereIsolation).toBe('isolate')
        expect(paint.stacking.runtime, 'The XR runtime must retain its explicit layer above the shared atmosphere').toBeGreaterThan(paint.stacking.atmosphere)
        expect(paint.stacking.world, 'The complete XR scene must paint above its sibling shared atmosphere').toBeGreaterThan(paint.stacking.atmosphere)
        expect(paint.pseudoLayers).toHaveLength(6)
        for (const layer of paint.pseudoLayers) {
          const label = `${layer.owner}${layer.pseudo}`
          expect(layer.content, `${label} requires actual computed pseudo-element evidence`).not.toBeNull()
          expect(Number.isFinite(layer.opacity), `${label} opacity must be known`).toBe(true)
          expect(layer.opacity).toBeGreaterThanOrEqual(0)
          expect(layer.opacity).toBeLessThanOrEqual(1)
          // content:none/normal does not generate a pseudo-element. Retain the
          // exact computed record as N/A rather than inventing a painted layer.
          const generated = layer.content !== 'none' && layer.content !== 'normal'
          const visible = generated && layer.display !== 'none' && layer.visibility === 'visible' && layer.opacity > 0
          if (!visible) continue
          expect(Number.isFinite(layer.zIndex), `${label} is generated and visible; its stacking position must be explicit`).toBe(true)
          expect(layer.position, `${label} visible stacking must actually apply to a positioned layer`).not.toBe('static')
          if (layer.owner === 'runtime') expect(paint.stacking.world, `${label} must paint behind the complete XR scene`).toBeGreaterThan(layer.zIndex)
          if (layer.owner === 'world') expect(paint.stacking.panel, `${label} must paint behind the opaque consent and comfort controls`).toBeGreaterThan(layer.zIndex)
          if (layer.owner === 'atmosphere') expect(paint.stacking.world, `${label} stays within its isolated atmosphere behind the XR scene`).toBeGreaterThan(paint.stacking.atmosphere)
        }
        expect(paint.backgroundAlpha, 'XR consent backing must block the animated world').toBe(1)
        expect(paint.backgroundImage).toBe('none')
        expect(paint.ancestorOpacities.every(value => value === 1), 'XR backing cannot be faded by an ancestor').toBe(true)
        expect(paint.text).toHaveLength(2)
        for (const copy of paint.text) {
          expect(copy.alpha).toBe(1)
          expect(copy.contrast, 'XR consent and status copy must retain 4.5:1 contrast on the opaque backing').toBeGreaterThanOrEqual(4.5)
        }
        await info.attach(`xr-consent-paint-${profile.width}x${profile.height}.json`, { body: JSON.stringify(paint), contentType: 'application/json' })
      }
      await info.attach(`${slot}-${profile.width}x${profile.height}-initial.png`, { body: await page.screenshot(), contentType: 'image/png' })
      const launcher = await inspectTextAndControls(page, slot)
      await attachPlacement(page, info, `${slot}-${profile.width}x${profile.height}-flow`, launcher)
      const urlBefore = page.url()
      await exerciseKeyboardPanel(page, slot, profile.width === 320 && ['xr-portals', 'mirror-entry', 'possible-futures-controls'].includes(slot))
      expect(page.url(), 'Closing the founder panel must preserve the current route').toBe(urlBefore)
      const headings = page.locator('main h1, main h2')
      for (let index = 0; index < await headings.count(); index++) {
        const heading = headings.nth(index)
        const box = await heading.boundingBox()
        if (!box || box.width <= 2 || box.height <= 2) continue
        await heading.scrollIntoViewIfNeeded()
        const collision = await heading.evaluate(element => {
          const a = element.getBoundingClientRect()
          const launcher = document.querySelector('[data-urai-adam-launcher]')?.getBoundingClientRect()
          return Boolean(launcher && a.left < launcher.right && a.right > launcher.left && a.top < launcher.bottom && a.bottom > launcher.top)
        })
        expect(collision, `${surface.route} heading must remain clear after scrolling`).toBe(false)
      }
      if (slot === 'xr-portals') {
        const groups = await page.locator('main').evaluate(element => {
          const selectors = ['header', '[aria-label="XR and comfort controls"]', '[aria-label="Accessible portal equivalents"]', '[aria-label="Touch movement controls"]']
          return selectors.map(selector => element.querySelector(selector)).filter((node): node is Element => Boolean(node)).map(node => {
            const r = node.getBoundingClientRect()
            return { label: node.getAttribute('aria-label') ?? 'XR status and consent HUD', left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height }
          }).filter(rect => rect.width > 2 && rect.height > 2)
        })
        for (let a = 0; a < groups.length; a++) for (let b = a + 1; b < groups.length; b++) {
          const first = groups[a], second = groups[b]
          const collides = first.left < second.right && first.right > second.left && first.top < second.bottom && first.bottom > second.top
          expect(collides, `${first.label} must not cover ${second.label}`).toBe(false)
        }
        await info.attach(`xr-safe-flow-${profile.width}x${profile.height}.json`, { body: JSON.stringify(groups), contentType: 'application/json' })
        const comfort = page.getByRole('button', { name: /^(Reduced motion on|Reduce motion)$/ })
        await comfort.scrollIntoViewIfNeeded()
        const accessible = await comfort.evaluate(element => {
          const r = element.getBoundingClientRect()
          const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
          return { width: r.width, height: r.height, reachable: hit === element || element.contains(hit) }
        })
        expect(accessible.width).toBeGreaterThanOrEqual(48)
        expect(accessible.height).toBeGreaterThanOrEqual(48)
        expect(accessible.reachable, 'XR reduced-motion control must remain reachable').toBe(true)
        await attachPlacement(page, info, `xr-comfort-${profile.width}x${profile.height}`, accessible)
      }
      if (slot === 'possible-futures-controls') {
        const paint = await page.getByTestId('urai-possible-futures').evaluate(world => {
          const runtime = world.closest('.urai-world-runtime')
          const atmosphere = runtime?.querySelector(':scope > .urai-world-atmosphere')
          const controls = world.querySelector(':scope > section')
          const caption = controls?.querySelector('footer > span:last-child')
          const launcher = controls?.querySelector('[data-urai-adam-launcher]')
          const zIndex = (node: Element | null | undefined) => node ? Number(getComputedStyle(node).zIndex) : Number.NaN
          const pseudoLayers = [{ owner: 'runtime', node: runtime }, { owner: 'world', node: world }, { owner: 'atmosphere', node: atmosphere }].flatMap(({ owner, node }) => ['::before', '::after'].map(pseudo => {
            const style = node ? getComputedStyle(node, pseudo) : null
            return { owner, pseudo, content: style?.content ?? null, display: style?.display ?? null, visibility: style?.visibility ?? null, opacity: Number(style?.opacity), position: style?.position ?? null, zIndex: Number(style?.zIndex) }
          }))
          const ancestorOpacities: number[] = []
          for (let node: Element | null = caption?.parentElement ?? controls; node; node = node.parentElement) ancestorOpacities.push(Number(getComputedStyle(node).opacity))
          const rgba = (value: string) => {
            const values = value.match(/[\d.]+/g)?.map(Number) ?? []
            return { rgb: values.slice(0, 3), alpha: values[3] ?? 1 }
          }
          const luminance = (rgb: number[]) => rgb.map(channel => {
            const value = channel / 255
            return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
          }).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0)
          const worldStyle = getComputedStyle(world)
          const background = rgba(worldStyle.backgroundColor)
          const captionStyle = caption ? getComputedStyle(caption) : null
          const foreground = rgba(captionStyle?.color ?? '')
          const alpha = foreground.alpha * Number(captionStyle?.opacity)
          const composite = foreground.rgb.map((channel, index) => channel * alpha + background.rgb[index] * (1 - alpha))
          const foregroundLuminance = luminance(composite), backgroundLuminance = luminance(background.rgb)
          return {
            ownership: { runtimeContainsWorld: Boolean(runtime?.contains(world)), worldContainsControls: controls?.parentElement === world, controlsCount: world.querySelectorAll(':scope > section').length, worldContainsLauncher: Boolean(launcher && world.contains(launcher)), controlsContainLauncher: Boolean(launcher && controls?.contains(launcher)), controlsContainCaption: Boolean(caption && controls?.contains(caption)), atmosphereOwnedByRuntime: atmosphere?.parentElement === runtime },
            isolation: { runtime: runtime ? getComputedStyle(runtime).isolation : null, atmosphere: atmosphere ? getComputedStyle(atmosphere).isolation : null },
            stacking: { runtime: zIndex(runtime), world: zIndex(world), atmosphere: zIndex(atmosphere), controls: zIndex(controls) },
            worldPosition: worldStyle.position, controlsPosition: controls ? getComputedStyle(controls).position : null, backgroundAlpha: background.alpha, ancestorOpacities, pseudoLayers,
            caption: { text: caption?.textContent?.trim() ?? '', opacity: Number(captionStyle?.opacity), foregroundAlpha: foreground.alpha, contrast: (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) / (Math.min(foregroundLuminance, backgroundLuminance) + 0.05) },
            contrastBasis: 'Source RGBA composited over the opaque scene background; literal after-image inspection remains independently required',
          }
        })
        expect(paint.ownership.runtimeContainsWorld, 'The actual Possible Futures scene must be owned by the runtime').toBe(true)
        expect(paint.ownership.worldContainsControls, 'The actual Possible Futures control section must be owned by its scene').toBe(true)
        expect(paint.ownership.controlsCount, 'The control section must be unique in the actual scene').toBe(1)
        expect(paint.ownership.worldContainsLauncher, 'The actual Possible Futures scene must own its launcher').toBe(true)
        expect(paint.ownership.controlsContainLauncher, 'The measured control section must own its actual launcher').toBe(true)
        expect(paint.ownership.controlsContainCaption, 'The measured control section must own its actual horizon caption').toBe(true)
        expect(paint.ownership.atmosphereOwnedByRuntime, 'The measured atmosphere must belong to that runtime').toBe(true)
        expect(paint.isolation.runtime).toBe('isolate')
        expect(paint.isolation.atmosphere).toBe('isolate')
        for (const [label, value] of Object.entries(paint.stacking)) expect(Number.isFinite(value), `${label} stacking must be explicit`).toBe(true)
        expect(paint.worldPosition, 'Scene stacking must apply to a positioned element').not.toBe('static')
        expect(paint.controlsPosition, 'Control stacking must apply to the actual positioned section').not.toBe('static')
        expect(paint.stacking.controls, 'The actual controls must paint above unlayered scene content').toBeGreaterThan(0)
        expect(paint.stacking.runtime, 'The full scene must not be dimmed by the global atmosphere').toBeGreaterThan(paint.stacking.atmosphere)
        expect(paint.stacking.world, 'Possible Futures controls must paint above the isolated atmosphere').toBeGreaterThan(paint.stacking.atmosphere)
        for (const layer of paint.pseudoLayers) {
          const label = `${layer.owner}${layer.pseudo}`
          expect(layer.content, `${label} requires actual computed pseudo-element evidence`).not.toBeNull()
          expect(Number.isFinite(layer.opacity), `${label} opacity must be known`).toBe(true)
          expect(layer.opacity).toBeGreaterThanOrEqual(0)
          expect(layer.opacity).toBeLessThanOrEqual(1)
          const generated = layer.content !== 'none' && layer.content !== 'normal'
          const visible = generated && layer.display !== 'none' && layer.visibility === 'visible' && layer.opacity > 0
          if (!visible) continue
          expect(Number.isFinite(layer.zIndex), `${label} visible stacking must be explicit`).toBe(true)
          expect(layer.position, `${label} visible stacking requires a positioned layer`).not.toBe('static')
          if (layer.owner === 'runtime') expect(paint.stacking.world, `${label} must paint behind the complete Possible Futures scene`).toBeGreaterThan(layer.zIndex)
          if (layer.owner === 'world') expect(paint.stacking.controls, `${label} must paint behind the actual Possible Futures controls`).toBeGreaterThan(layer.zIndex)
          if (layer.owner === 'atmosphere') expect(layer.zIndex, `${label} must remain within the lower isolated atmosphere`).toBeLessThanOrEqual(paint.stacking.atmosphere)
        }
        expect(paint.ancestorOpacities.every(value => value === 1), 'Possible Futures cannot be faded by an ancestor').toBe(true)
        expect(paint.backgroundAlpha).toBe(1)
        expect(paint.caption.text.length, 'The real horizon/scenario caption must be present').toBeGreaterThan(0)
        expect(paint.caption.foregroundAlpha).toBe(1)
        expect(paint.caption.contrast, 'The horizon/scenario caption must retain at least 4.5:1 contrast on the scene background').toBeGreaterThanOrEqual(4.5)
        await info.attach(`possible-futures-paint-${profile.width}x${profile.height}.json`, { body: JSON.stringify(paint), contentType: 'application/json' })
        if (!profile.noWebGL) await expect(page.getByTestId('possible-futures-canvas')).toHaveAttribute('data-render-cadence', 'reduced-motion-demand')
        const question = page.getByRole('textbox', { name: 'What do you want to explore?', exact: true })
        await question.scrollIntoViewIfNeeded()
        await question.fill('A privately held hypothetical question')
        await assertCopyIsUnobstructed(question)
        await exerciseKeyboardPanel(page, slot, false)
        await expect(question).toHaveValue('A privately held hypothetical question')
        await question.scrollIntoViewIfNeeded()
        await attachPlacement(page, info, `possible-futures-input-${profile.width}x${profile.height}`, { unchangedQuestion: true })
        if (!profile.noWebGL && profile.width === 844) {
          await page.emulateMedia({ reducedMotion: 'no-preference' })
          await expect(page.getByTestId('possible-futures-canvas')).toHaveAttribute('data-render-cadence', 'continuous')
          await page.emulateMedia({ reducedMotion: 'reduce' })
          await expect(page.getByTestId('possible-futures-canvas')).toHaveAttribute('data-render-cadence', 'reduced-motion-demand')
          await expect(question).toHaveValue('A privately held hypothetical question')
        }
      }
      if (slot === 'mirror-entry') {
        const choices = page.getByRole('navigation', { name: 'Mirror entry choices', exact: true }).getByRole('link')
        expect(await choices.count()).toBe(3)
        for (let index = 0; index < await choices.count(); index++) {
          const choice = choices.nth(index)
          await choice.scrollIntoViewIfNeeded()
          const target = await choice.evaluate(element => {
            const r = element.getBoundingClientRect()
            const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
            return { width: r.width, height: r.height, reachable: hit === element || element.contains(hit) }
          })
          expect(target.width).toBeGreaterThanOrEqual(48)
          expect(target.height).toBeGreaterThanOrEqual(48)
          expect(target.reachable, 'Every Mirror recovery choice must remain reachable above the Orb').toBe(true)
        }
      }
      if (surface.fallbackSlot) {
        await expect(page).toHaveURL(/\/life-map/)
        const returnHome = page.getByRole('button', { name: 'Return Home', exact: true }).first()
        await returnHome.scrollIntoViewIfNeeded()
        const bounds = await returnHome.boundingBox()
        expect(bounds!.width).toBeGreaterThanOrEqual(48)
        expect(bounds!.height).toBeGreaterThanOrEqual(48)
        await expect(returnHome).toBeInViewport({ ratio: 1 })
        await assertCopyIsUnobstructed(returnHome)
        await attachPlacement(page, info, `life-map-return-${profile.width}x${profile.height}`, bounds)
      }
      if (slot === 'ground-semantic-routes') {
        await expect(page.getByTestId('urai-ground-accessible-fallback')).toBeVisible()
        const paint = await page.getByTestId('urai-ground-accessible-fallback').evaluate(fallback => {
          const root = fallback.closest('.ground-spatial-root')
          const runtime = root?.closest('.urai-world-runtime')
          const atmosphere = runtime?.querySelector(':scope > .urai-world-atmosphere')
          const zIndex = (node: Element | null | undefined) => node ? Number(getComputedStyle(node).zIndex) : Number.NaN
          const pseudoLayers = [{ owner: 'runtime', node: runtime }, { owner: 'ground', node: root }].flatMap(({ owner, node }) => ['::before', '::after'].map(pseudo => {
            const style = node ? getComputedStyle(node, pseudo) : null
            return { owner, pseudo, content: style?.content ?? null, display: style?.display ?? null, visibility: style?.visibility ?? null, opacity: style ? Number(style.opacity) : Number.NaN, position: style?.position ?? null, zIndex: style ? Number(style.zIndex) : Number.NaN }
          }))
          return {
            stacking: { runtime: zIndex(runtime), atmosphere: zIndex(atmosphere), ground: zIndex(root), fallback: zIndex(fallback) },
            ownership: { rootInRuntime: Boolean(root && runtime?.contains(root)), atmosphereInRuntime: Boolean(atmosphere && atmosphere.parentElement === runtime), runtimeIsolation: runtime ? getComputedStyle(runtime).isolation : null, rootIsolation: root ? getComputedStyle(root).isolation : null },
            mode: root?.getAttribute('data-ground-renderer'), pseudoLayers,
          }
        })
        expect(paint.mode).toBe('fallback')
        expect(paint.ownership.rootInRuntime).toBe(true)
        expect(paint.ownership.atmosphereInRuntime).toBe(true)
        expect(paint.ownership.runtimeIsolation).toBe('isolate')
        expect(paint.ownership.rootIsolation).toBe('isolate')
        for (const layer of Object.values(paint.stacking)) expect(Number.isFinite(layer), 'Ground fallback paint layers require actual numeric stacking evidence').toBe(true)
        expect(paint.stacking.runtime).toBeGreaterThan(paint.stacking.atmosphere)
        expect(paint.stacking.ground, 'The isolated accessible Ground fallback must paint above its sibling atmosphere').toBeGreaterThan(paint.stacking.atmosphere)
        for (const layer of paint.pseudoLayers) {
          expect(layer.content).not.toBeNull()
          expect(Number.isFinite(layer.opacity)).toBe(true)
          const visible = layer.content !== 'none' && layer.content !== 'normal' && layer.display !== 'none' && layer.visibility === 'visible' && layer.opacity > 0
          if (!visible) continue // Non-generated/hidden pseudo-elements retain their exact N/A evidence.
          expect(Number.isFinite(layer.zIndex)).toBe(true)
          expect(layer.position).not.toBe('static')
          expect(layer.owner === 'runtime' ? paint.stacking.ground : paint.stacking.fallback, 'Decorative Ground layers must paint behind the accessible fallback').toBeGreaterThan(layer.zIndex)
        }
        await info.attach(`ground-fallback-paint-${profile.width}x${profile.height}.json`, { body: JSON.stringify(paint), contentType: 'application/json' })
        const routes = page.getByRole('navigation', { name: 'Direct Ground routes', exact: true }).getByRole('link')
        expect(await routes.count()).toBeGreaterThanOrEqual(10)
        const routeBounds = []
        for (let index = 0; index < await routes.count(); index++) {
          const route = routes.nth(index)
          await route.scrollIntoViewIfNeeded()
          const bounds = await route.evaluate(element => {
            const r = element.getBoundingClientRect()
            const collisions = [...document.querySelectorAll('[data-urai-adam-launcher], .urai-world-companion__orb')].filter(control => {
              const c = control.getBoundingClientRect()
              return r.left < c.right && r.right > c.left && r.top < c.bottom && r.bottom > c.top
            }).map(control => control.getAttribute('aria-label') ?? control.textContent?.trim())
            const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
            return { label: element.textContent?.trim(), left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height, viewportWidth: innerWidth, viewportHeight: innerHeight, collisions, reachable: hit === element || element.contains(hit) }
          })
          expect(bounds.height).toBeGreaterThanOrEqual(48)
          expect(bounds.width).toBeGreaterThanOrEqual(48)
          expect(bounds.left).toBeGreaterThanOrEqual(0)
          expect(bounds.right).toBeLessThanOrEqual(bounds.viewportWidth)
          expect(bounds.top).toBeGreaterThanOrEqual(0)
          expect(bounds.bottom).toBeLessThanOrEqual(bounds.viewportHeight + 1)
          expect(bounds.collisions, `${bounds.label} must not be covered by founder or Orb`).toEqual([])
          expect(bounds.reachable).toBe(true)
          routeBounds.push(bounds)
        }
        await attachPlacement(page, info, `ground-route-list-${profile.width}x${profile.height}`, routeBounds)
      }
      await inspectTextAndControls(page, slot)
      expect(errors).toEqual([])
    })
  }
}

for (const viewport of placementViewports) {
  test(`Exported 404 has readable recovery and no debug frame at ${viewport.width}x${viewport.height}`, async ({ page }, info) => {
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    await page.setViewportSize(viewport)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const response = await page.goto('/404.html', { waitUntil: 'domcontentloaded' })
    expect(response?.status(), 'Existing static server must deliver the real exported file').toBe(200)
    const html = await response!.text()
    expect(await page.locator('body').innerText()).not.toMatch(/legacy Pages Router shim|static builds always emit/i)
    const heading = page.getByRole('heading', { name: 'This place isn’t part of your world', exact: true })
    await expect(heading).toBeVisible()
    await expect(page.getByText('The address may have changed, or this view may no longer be available.', { exact: true })).toBeVisible()
    const recovery = page.getByRole('link', { name: 'Return home', exact: true })
    await expect(recovery).toHaveAttribute('href', '/')
    const geometry = await page.locator('main').evaluate(element => {
      const r = element.getBoundingClientRect()
      const body = getComputedStyle(document.body)
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, viewportWidth: innerWidth, viewportHeight: innerHeight, documentWidth: document.documentElement.scrollWidth, bodyMargin: body.margin, bodyBackground: body.backgroundColor }
    })
    expect(geometry.left).toBe(0)
    expect(geometry.top).toBe(0)
    expect(geometry.right).toBe(geometry.viewportWidth)
    expect(geometry.bottom).toBeGreaterThanOrEqual(geometry.viewportHeight)
    expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.viewportWidth)
    expect(geometry.bodyMargin).toBe('0px')
    expect(geometry.bodyBackground).toBe('rgb(8, 3, 15)')
    const bounds = await recovery.boundingBox()
    expect(bounds!.width).toBeGreaterThanOrEqual(48)
    expect(bounds!.height).toBeGreaterThanOrEqual(48)
    await page.keyboard.press('Tab')
    await expect(recovery).toBeFocused()
    const focus = await recovery.evaluate(element => {
      const style = getComputedStyle(element), r = element.getBoundingClientRect()
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
      const outlineInset = parseFloat(style.outlineWidth) + Math.max(0, parseFloat(style.outlineOffset))
      return { outlineWidth: parseFloat(style.outlineWidth), outlineStyle: style.outlineStyle, reachable: hit === element || element.contains(hit), boundsAfterFocus: { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height }, outlineInset, fullOutlineVisible: r.left - outlineInset >= 0 && r.right + outlineInset <= innerWidth && r.top - outlineInset >= 0 && r.bottom + outlineInset <= innerHeight }
    })
    expect(focus.outlineWidth).toBeGreaterThanOrEqual(3)
    expect(focus.outlineStyle).toBe('solid')
    expect(focus.reachable).toBe(true)
    expect(focus.boundsAfterFocus.width).toBeGreaterThanOrEqual(48)
    expect(focus.boundsAfterFocus.height).toBeGreaterThanOrEqual(48)
    expect(focus.fullOutlineVisible, 'The complete recovery button and focus ring must remain inside the viewport after keyboard focus').toBe(true)
    // DOM geometry can exist before Chromium has a painted surface. Await real
    // document readiness and two animation frames, then capture exactly once.
    await page.waitForLoadState('load')
    const paint = await page.evaluate(async () => {
      await document.fonts.ready
      const first = await new Promise<number>(resolve => requestAnimationFrame(resolve))
      const second = await new Promise<number>(resolve => requestAnimationFrame(resolve))
      return { firstFrame: first, secondFrame: second, readyState: document.readyState, visibilityState: document.visibilityState, fonts: document.fonts.status }
    })
    expect(paint.readyState).toBe('complete')
    expect(paint.visibilityState).toBe('visible')
    expect(paint.fonts).toBe('loaded')
    expect(paint.secondFrame).toBeGreaterThan(paint.firstFrame)
    await attachPlacement(page, info, `exported-404-${viewport.width}x${viewport.height}`, { response: { path: '/404.html', status: response!.status(), contentType: response!.headers()['content-type'], htmlSha256: createHash('sha256').update(html).digest('hex') }, geometry, bounds, focus, paint, productionAuthenticationVerified: false })
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/(?:home\/?)?$/)
    await expect(page.getByRole('heading', { name: 'This place isn’t part of your world', exact: true })).toHaveCount(0)
    expect(errors).toEqual([])
  })
}

for (const profile of [{ width: 390, height: 844, noWebGL: false }, { width: 568, height: 320, noWebGL: true }, { width: 320, height: 568, noWebGL: true }]) {
  test(`Founder launcher preserves disclosed Memory World controls at ${profile.width}x${profile.height}${profile.noWebGL ? ' without WebGL' : ''}`, async ({ page }, info) => {
    test.setTimeout(60000)
    await page.setViewportSize(profile)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    if (profile.noWebGL) await disableWebGL(page)
    await page.goto('/spatial/memory-world?demo=1&memoryId=demo%3Aquiet-reset&manifestId=replay-recovery-thread&node=quiet-reset', { waitUntil: 'domcontentloaded' })
    const slot = profile.noWebGL ? 'memory-world-fallback' : 'memory-world-controls'
    const geometry = await inspectTextAndControls(page, slot)
    await expect(page.locator('canvas [data-urai-adam-launcher]')).toHaveCount(0)
    await attachPlacement(page, info, `memory-world-${profile.width}x${profile.height}-flow`, geometry)
    const before = page.url()
    await exerciseKeyboardPanel(page, slot, false)
    expect(page.url()).toBe(before)
    const provenance = profile.noWebGL ? page.getByTestId('memory-world-renderer-fallback').getByText('Truth & provenance', { exact: true }) : page.getByTestId('memory-world-runtime').locator('header').getByText('Truth & provenance', { exact: true })
    await provenance.scrollIntoViewIfNeeded()
    await provenance.click()
    await expect(provenance.locator('..')).toHaveAttribute('open', '')
    const expandedGeometry = await inspectTextAndControls(page, slot)
    await attachPlacement(page, info, `memory-world-${profile.width}x${profile.height}-provenance-open`, expandedGeometry)
    await provenance.click()
    for (const name of ['Correct this world', 'Guided capture']) {
      const summary = page.getByTestId('memory-world-authoring-tools').getByText(name, { exact: true })
      await summary.click()
      await expect(summary.locator('..')).toHaveAttribute('open', '')
      await summary.click()
      await expect(summary.locator('..')).not.toHaveAttribute('open', '')
    }
    const exit = page.getByRole('button', { name: profile.noWebGL ? 'Return to Replay' : '← Replay', exact: true })
    await exit.scrollIntoViewIfNeeded()
    await expect(exit).toBeInViewport({ ratio: 1 })
    expect((await exit.boundingBox())!.height).toBeGreaterThanOrEqual(48)
    await exit.click()
    await expect(page).toHaveURL(/\/replay/)
  })
}
