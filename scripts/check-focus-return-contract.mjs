// Source-level guard for the canonical Focus -> Life Map Escape path.
// Deliberately constrain checks to the actual unwind and Escape handlers.
function boundedBlock(source, startMarker, endMarker, name, failures) {
  const start = source.indexOf(startMarker)
  if (start < 0) { failures.push(name + ' handler missing'); return '' }
  const end = source.indexOf(endMarker, start + startMarker.length)
  if (end < 0) { failures.push(name + ' handler boundary missing'); return '' }
  return source.slice(start, end)
}
function requireInside(source, tokens, name, failures) {
  for (const token of tokens) if (!source.includes(token)) {
    failures.push(name + ' missing ' + token)
  }
}
export function auditFocusReturnContract(focusSource) {
  const failures = []
  const unwind = boundedBlock(focusSource,
    'const unwind = useCallback(() => {', '  }, [memory])',
    'Focus unwind', failures)
  requireInside(unwind, [
    'requestUraiWorldTravel({',
    "destination: 'life-map'",
    'href: `/life-map?${query.toString()}`',
    "entryPortal: 'focus-life-map-return'",
    "cameraCheckpoint: 'life-map-overview'",
    "query.set('memoryId', memory.demo ? memory.star.id : memory.id)",
    "query.set('node', memory.star.id)",
    "query.set('manifestId', memory.replayManifest.id)",
    'replayManifestId: memory.replayManifest.id',
  ], 'Focus unwind', failures)
  const escape = boundedBlock(focusSource,
    'const onEscape = (event: KeyboardEvent) => {',
    "window.addEventListener('keydown', onEscape)", 'Focus Escape', failures)
  requireInside(escape, [
    "event.key !== 'Escape'",
    "document.querySelector('[role=\"dialog\"][aria-modal=\"true\"]')",
    'event.preventDefault()',
    'unwind()',
  ], 'Focus Escape', failures)
  return failures
}
