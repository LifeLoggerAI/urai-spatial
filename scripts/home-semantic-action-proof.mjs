const NAV_SELECTOR = '.home-semantic-navigation[data-home-navigation-owner="runtime-boundary"]'
const RUNTIME_SELECTOR = '.urai-home-spatial-runtime-layer[data-home-context-owner="world-local-context-only"]'
const WORLD_SELECTOR = '.urai-asset-home-world[data-home-primary-owner="asset-driven"]'

export const HOME_SEMANTIC_ACTIONS = Object.freeze({
  orb: Object.freeze({ role: 'button', name: 'Open URAI Orb companion', tag: 'BUTTON', testId: 'home-semantic-orb' }),
  ground: Object.freeze({ role: 'link', name: 'Open Ground directly', tag: 'A', testId: 'home-semantic-ground', pathname: '/ground/', query: { entryPortal: 'home-ground', cameraCheckpoint: 'home-ground-descent' } }),
  lifeMap: Object.freeze({ role: 'link', name: 'Open Life Map directly', tag: 'A', testId: 'home-semantic-life-map', pathname: '/life-map/', query: { from: 'home-sky', entryPortal: 'home-sky', cameraCheckpoint: 'home-sky-ascent-complete' } }),
})

function exactOwnedUrl(href, base, pathname, query) {
  try {
    const authority = new URL(base)
    const url = new URL(href, authority)
    return ['http:', 'https:'].includes(authority.protocol)
      && !authority.username && !authority.password
      && url.origin === authority.origin
      && !url.username && !url.password && !url.hash
      && url.pathname === pathname
      && [...url.searchParams].length === Object.keys(query).length
      && Object.entries(query).every(([key, value]) => url.searchParams.getAll(key).length === 1 && url.searchParams.get(key) === value)
  } catch {
    return false
  }
}

function targetIsInteractive(target, viewport) {
  const bounds = target?.bounds
  return target?.connected === true && target.visible === true
    && target.disabled === false && Number.isInteger(target.tabIndex) && target.tabIndex >= 0
    && target.pointerEvents !== 'none' && target.centerHit === true
    && bounds && [bounds.x, bounds.y, bounds.width, bounds.height].every(Number.isFinite)
    && bounds.width >= 48 && bounds.height >= 48
    && bounds.x >= 0 && bounds.y >= 0
    && Number.isFinite(viewport?.width) && Number.isFinite(viewport?.height)
    && viewport.width > 0 && viewport.height > 0
    && bounds.x + bounds.width <= viewport.width
    && bounds.y + bounds.height <= viewport.height
}

// Direct accessible navigation is distinct from physical sky Ascent. This proof
// observes native roles/names through Playwright, not text in a WebGL subtree.
export function verifyHomeSemanticSnapshot(snapshot, base) {
  const errors = []
  let disclosedDemo = false
  try { disclosedDemo = JSON.stringify(new URL(snapshot?.url).searchParams.getAll('demo')) === '["1"]' } catch {}
  const demoQuery = disclosedDemo ? { demo: '1' } : {}
  const contextPassed = snapshot?.url === snapshot?.finalUrl
    && exactOwnedUrl(snapshot?.url, base, '/home/', { homeAssetReview: '1', homePrivateFixture: '1', ...demoQuery })
    && snapshot?.runtimeCount === 1 && snapshot?.worldCount === 1
    && snapshot?.runtime?.visible === true
    && snapshot.runtime.contextOwner === 'world-local-context-only'
    && snapshot.runtime.visualOwner === 'asset-driven-personalized-sanctuary'
    && snapshot.runtime.assetsReady === 'true' && snapshot.runtime.webglReady === 'true'
    && snapshot.runtime.containsWorld === true
    && snapshot?.world?.primaryOwner === 'asset-driven'
    && snapshot.world.assetsReady === 'true'
    && snapshot.world.visibleWorld === 'authored-coherent-three-dimensional-sanctuary'
    && snapshot.world.movement === 'walk-keyboard-click-touch'
    && snapshot.world.scenePhase === 'HOME' && snapshot.world.cameraMode === 'embodied-first-person'
    && snapshot.world.inputLocked === 'false' && snapshot.world.embodiedSelf === 'privacy-preserving-shadow'
  if (!contextPassed) errors.push('current-home-runtime-context')

  const navigationPassed = snapshot?.navigationCount === 1 && snapshot?.accessibleNavigationCount === 1
    && snapshot?.navigation?.tag === 'NAV'
    && [null, 'navigation'].includes(snapshot.navigation.explicitRole)
    && snapshot.navigation.owner === 'runtime-boundary'
    && snapshot.navigation.nonDominant === 'true'
    && snapshot.navigation.visible === true
    && snapshot.navigation.interactiveCount === 3
    && snapshot.navigation.sharedRuntimeParent === true
    && snapshot.navigation.outsideWorld === true
  if (!navigationPassed) errors.push('single-accessible-runtime-navigation')

  const actions = {}
  for (const [id, expected] of Object.entries(HOME_SEMANTIC_ACTIONS)) {
    const observed = snapshot?.controls?.[id]
    const identityPassed = observed?.domMatches === 1 && observed.accessibleMatches === 1
      && observed.globalAccessibleMatches === 1 && observed.roleMatchIsOwned === true
      && observed.tag === expected.tag && observed.testId === expected.testId
      && [null, expected.role].includes(observed.explicitRole)
      && (expected.tag !== 'BUTTON' || observed.type === 'button')
      && observed.belongsToNavigation === true
    const routePassed = expected.tag === 'BUTTON'
      ? observed?.href === null
      : typeof observed?.href === 'string' && exactOwnedUrl(observed.href, base, expected.pathname, { ...expected.query, ...demoQuery })
        && !observed.download && ['', '_self'].includes(observed.target)
    const interactivePassed = targetIsInteractive(observed, snapshot?.viewport)
    const passed = contextPassed && navigationPassed && identityPassed && routePassed && interactivePassed
    actions[id] = { expectedRole: expected.role, expectedName: expected.name, identityPassed, routePassed, interactivePassed, passed }
    if (!passed) errors.push(`native-owned-${id}-action`)
  }
  return { schemaVersion: 'urai-home-semantic-action-proof-v1', passed: errors.length === 0, contextPassed, navigationPassed, disclosedDemo, actions, errors, observed: snapshot }
}

export async function collectHomeSemanticActionProof(page, { base }) {
  const snapshot = await page.evaluate(({ navSelector, runtimeSelector, worldSelector, actions }) => {
    const navs = [...document.querySelectorAll(navSelector)]
    const runtimes = [...document.querySelectorAll(runtimeSelector)]
    const worlds = [...document.querySelectorAll(worldSelector)]
    const nav = navs.length === 1 ? navs[0] : null
    const runtime = runtimes.length === 1 ? runtimes[0] : null
    const world = worlds.length === 1 ? worlds[0] : null
    const visible = (element) => {
      if (!element?.isConnected) return false
      const bounds = element.getBoundingClientRect()
      if (bounds.width <= 0 || bounds.height <= 0) return false
      for (let node = element; node instanceof Element; node = node.parentElement) {
        const style = getComputedStyle(node)
        if (node.hasAttribute('hidden') || node.hasAttribute('inert') || node.getAttribute('aria-hidden')?.toLowerCase() === 'true'
          || style.display === 'none' || ['hidden', 'collapse'].includes(style.visibility)
          || style.contentVisibility === 'hidden' || Number(style.opacity) === 0) return false
      }
      return true
    }
    const disabled = (element) => {
      for (let node = element; node instanceof Element; node = node.parentElement) {
        if (node.matches(':disabled') || node.getAttribute('aria-disabled')?.toLowerCase() === 'true') return true
      }
      return false
    }
    const controls = {}
    for (const [id, expected] of Object.entries(actions)) {
      const nodes = [...document.querySelectorAll(`[data-testid="${expected.testId}"]`)]
      const node = nodes.length === 1 ? nodes[0] : null
      if (!node) { controls[id] = { domMatches: nodes.length }; continue }
      const bounds = node.getBoundingClientRect()
      const hit = document.elementFromPoint(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)
      controls[id] = {
        domMatches: nodes.length, connected: node.isConnected, visible: visible(node),
        tag: node.tagName, explicitRole: node.getAttribute('role'), type: node.getAttribute('type'),
        testId: node.getAttribute('data-testid'), belongsToNavigation: nav?.contains(node) === true,
        disabled: disabled(node),
        tabIndex: node.tabIndex, pointerEvents: getComputedStyle(node).pointerEvents,
        centerHit: hit === node || node.contains(hit),
        bounds: { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height },
        href: node.getAttribute('href'), target: node.getAttribute('target') || '', download: node.hasAttribute('download'),
      }
    }
    return {
      url: location.href, viewport: { width: innerWidth, height: innerHeight },
      navigationCount: navs.length, runtimeCount: runtimes.length, worldCount: worlds.length,
      navigation: nav ? { tag: nav.tagName, explicitRole: nav.getAttribute('role'), owner: nav.getAttribute('data-home-navigation-owner'), nonDominant: nav.getAttribute('data-home-navigation-non-dominant'), visible: visible(nav), interactiveCount: nav.querySelectorAll('button,a,input,select,textarea,[role="button"],[role="link"],[tabindex]').length, sharedRuntimeParent: nav.parentElement === runtime?.parentElement, outsideWorld: !world?.contains(nav) } : null,
      runtime: runtime ? { visible: visible(runtime), contextOwner: runtime.getAttribute('data-home-context-owner'), visualOwner: runtime.getAttribute('data-home-visual-owner'), assetsReady: runtime.getAttribute('data-home-assets-ready'), webglReady: runtime.getAttribute('data-webgl-ready'), containsWorld: runtime.contains(world) } : null,
      world: world ? { primaryOwner: world.getAttribute('data-home-primary-owner'), assetsReady: world.getAttribute('data-home-assets-ready'), visibleWorld: world.getAttribute('data-home-visible-world'), movement: world.getAttribute('data-home-movement'), scenePhase: world.getAttribute('data-home-scene-phase'), cameraMode: world.getAttribute('data-home-camera-mode'), inputLocked: world.getAttribute('data-home-input-locked'), embodiedSelf: world.getAttribute('data-home-embodied-self') } : null,
      controls,
    }
  }, { navSelector: NAV_SELECTOR, runtimeSelector: RUNTIME_SELECTOR, worldSelector: WORLD_SELECTOR, actions: HOME_SEMANTIC_ACTIONS })

  snapshot.accessibleNavigationCount = await page.getByRole('navigation', { name: 'Accessible Home destinations', exact: true }).count()
  const navigation = page.locator(NAV_SELECTOR)
  snapshot.accessibleNavigationSnapshot = snapshot.navigationCount === 1 ? await navigation.ariaSnapshot() : null
  for (const [id, expected] of Object.entries(HOME_SEMANTIC_ACTIONS)) {
    const target = navigation.getByRole(expected.role, { name: expected.name, exact: true })
    const observed = snapshot.controls[id]
    observed.accessibleMatches = await target.count()
    observed.globalAccessibleMatches = await page.getByRole(expected.role, { name: expected.name, exact: true }).count()
    observed.roleMatchIsOwned = observed.accessibleMatches === 1 && await target.evaluate((node, testId) => node === document.querySelector(`[data-testid="${testId}"]`), expected.testId)
  }
  snapshot.finalUrl = page.url()
  return verifyHomeSemanticSnapshot(snapshot, base)
}
