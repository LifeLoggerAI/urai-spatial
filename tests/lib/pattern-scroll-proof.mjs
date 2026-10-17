// Proof input follows the actual tab start rather than briefly revealing its
// far edge before CSS scroll snapping returns it to the previous position.
export function patternScrollRequest(metrics) {
  const { left, right, viewportLeft, viewportRight, scrollLeft, scrollWidth, clientWidth } = metrics
  if (left >= viewportLeft - 0.5 && right <= viewportRight + 0.5) return 0
  const target = Math.max(0, Math.min(scrollWidth - clientWidth, scrollLeft + left - viewportLeft))
  const delta = target - scrollLeft
  if (Math.abs(delta) < 0.5) throw new Error('Clipped reflection tab has no remaining horizontal scroll range')
  return delta
}

export function armPatternScrollEnd(element) {
  if (!('onscrollend' in element)) throw new Error('This browser must support native scrollend for settled reflection proof')
  const key = Symbol.for('urai:mirror-proof-scrollend')
  if (element[key]) throw new Error('A reflection scroll proof is already armed')
  const listener = event => { if (event.target === element) element[key].done = true }
  element[key] = { done: false, dispose: () => element.removeEventListener('scrollend', listener) }
  element.addEventListener('scrollend', listener)
}

export function disarmPatternScrollEnd(element) {
  const key = Symbol.for('urai:mirror-proof-scrollend')
  element[key]?.dispose()
  delete element[key]
}
