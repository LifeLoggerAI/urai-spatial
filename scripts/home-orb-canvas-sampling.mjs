// The mobile Ground shortcut is part of the admitted Home HUD. Its one sampled
// point is recorded separately; no other covering element is accepted.
export function inspectHomeOrbCanvasSamples(canvas, points) {
  const rect = canvas.getBoundingClientRect()
  const selected = []
  const excludedHud = []
  const blocked = []
  for (const point of points) {
    const [x, y] = point
    const hit = document.elementFromPoint(rect.x + rect.width * x, rect.y + rect.height * y)
    if (hit === canvas) { selected.push(point); continue }
    const control = hit?.closest?.('nav.home-semantic-navigation[data-home-navigation-owner="runtime-boundary"] > a[data-testid="home-semantic-ground"]')
    const bounds = control?.getBoundingClientRect()
    const href = control ? new URL(control.getAttribute('href'), document.baseURI) : null
    const style = control ? getComputedStyle(control) : null
    const recognized = point[0] === .88 && point[1] === .82
      && control?.tagName === 'A' && control.contains(hit)
      && href.origin === new URL(document.baseURI).origin && /^\/ground\/?$/.test(href.pathname)
      && href.searchParams.get('entryPortal') === 'home-ground'
      && href.searchParams.get('cameraCheckpoint') === 'home-ground-descent'
      && style.display !== 'none' && style.visibility === 'visible' && style.pointerEvents !== 'none'
      && Number.parseFloat(style.opacity) > 0 && bounds.width >= 48 && bounds.width <= 160
      && bounds.height >= 48 && bounds.height <= 80
      && bounds.width * bounds.height <= rect.width * rect.height * .08
    if (recognized) excludedHud.push({ point, testId: 'home-semantic-ground', tag: 'A', pathname: href.pathname,
      entryPortal: 'home-ground', cameraCheckpoint: 'home-ground-descent', hitConfirmed: true,
      bounds: { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height } })
    else blocked.push({ point, hitTag: hit?.tagName ?? null })
  }
  return { accepted: blocked.length === 0 && excludedHud.length <= 1 && selected.length >= 11,
    samplePoints: selected, originalSampleCount: points.length, unobstructedSampleCount: selected.length,
    unobstructedSampleFraction: selected.length / points.length, excludedHud, blocked }
}

// Measure the now-visible, deliberately small navigation HUD instead of
// requiring its retired almost-transparent presentation.
export function inspectVisibleHomeNavigation(nav) {
  const bounds = nav.getBoundingClientRect()
  const controls = [...nav.querySelectorAll(':scope > button, :scope > a')].map(control => {
    const box = control.getBoundingClientRect(), style = getComputedStyle(control)
    const testId = control.getAttribute('data-testid')
    const href = control.tagName === 'A' ? new URL(control.getAttribute('href'), document.baseURI) : null
    const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2)
    let opacity = 1
    for (let owner = control; owner; owner = owner.parentElement) opacity *= Number.parseFloat(getComputedStyle(owner).opacity)
    const known = testId === 'home-semantic-orb' ? control.tagName === 'BUTTON'
      : testId === 'home-semantic-ground' ? control.tagName === 'A' && /^\/ground\/?$/.test(href.pathname) && href.searchParams.get('entryPortal') === 'home-ground' && href.searchParams.get('cameraCheckpoint') === 'home-ground-descent'
      : testId === 'home-semantic-life-map' ? control.tagName === 'A' && /^\/life-map\/?$/.test(href.pathname) && href.searchParams.get('entryPortal') === 'home-sky' && href.searchParams.get('cameraCheckpoint') === 'home-sky-ascent-complete' : false
    return { testId, tag: control.tagName, pathname: href?.pathname ?? null,
      recognized: Boolean(known && (!href || href.origin === new URL(document.baseURI).origin)),
      label: control.getAttribute('aria-label'), width: box.width, height: box.height,
      bounds: { left: box.left, right: box.right, top: box.top, bottom: box.bottom },
      visible: style.display !== 'none' && style.visibility === 'visible' && opacity >= .99,
      enabled: !control.disabled && control.getAttribute('aria-disabled') !== 'true',
      inViewport: box.left >= 0 && box.right <= innerWidth && box.top >= 0 && box.bottom <= innerHeight,
      hitConfirmed: Boolean(hit && (hit === control || control.contains(hit))) }
  })
  const areaFraction = bounds.width * bounds.height / (innerWidth * innerHeight)
  const passed = controls.length === 3 && new Set(controls.map(c => c.testId)).size === 3
    && Number.isFinite(areaFraction) && areaFraction > 0 && areaFraction <= .1
    && bounds.left >= 0 && bounds.right <= innerWidth && bounds.top >= 0 && bounds.bottom <= innerHeight
    && controls.every(c => c.recognized && c.label && c.visible && c.enabled && c.inViewport && c.hitConfirmed && c.width >= 48 && c.height >= 48)
  return { passed, areaFraction, bounds: { left: bounds.left, right: bounds.right, top: bounds.top, bottom: bounds.bottom }, controls }
}
