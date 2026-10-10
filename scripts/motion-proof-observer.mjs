// Read-only browser observation. These samples never drive a product camera.
// rAF intervals describe this recording environment, not a physical-device FPS claim.
export function installMotionProofObserver() {
  const startedAt = performance.now()
  const samples = [], frames = [], longTasks = [], marks = []
  let stopped = false, frame = 0, previous = null, lastSample = -Infinity
  const attributes = (node, prefixes) => node ? Object.fromEntries(
    node.getAttributeNames().filter(name => prefixes.some(prefix => name.startsWith(prefix)))
      .map(name => [name, node.getAttribute(name)]),
  ) : null
  const read = (now) => {
    const world = document.querySelector('[data-testid="urai-persistent-world-shell"]')
    const home = world?.querySelector('[data-home-primary-owner="asset-driven"]')
    const map = document.querySelector('[data-testid="urai-true-3d-life-map"]')
    const focus = world?.querySelector('[data-testid="urai-final-focus-chamber"]')
    const replay = world?.querySelector('[data-testid="cinematic-replay-client"]')
    const realm = replay ? 'replay' : focus ? 'focus' : map ? 'life-map' : home ? 'home' : 'unavailable'
    const canvas = (replay || focus || map || home)?.querySelector('canvas')
    return {
      ms: Math.round((now - startedAt) * 100) / 100,
      pathname: location.pathname,
      realm,
      world: attributes(world, ['data-world-', 'data-camera-checkpoint', 'data-entry-portal']),
      home: attributes(home, ['data-home-camera-', 'data-home-player-', 'data-home-atmosphere-', 'data-home-return-', 'data-home-scene-phase', 'data-home-input-', 'data-home-ascent-', 'data-home-portal-sequence']),
      map: attributes(map, ['data-life-map-camera-', 'data-life-map-target-', 'data-life-map-fov', 'data-life-map-phase', 'data-life-map-render-', 'data-life-map-input-', 'data-life-map-interaction-', 'data-life-map-source', 'data-life-map-selected', 'data-memory-id', 'data-star-id']),
      focus: attributes(focus, ['data-focus-camera-', 'data-focus-target-', 'data-focus-fov', 'data-focus-input-', 'data-focus-render-', 'data-focus-moving', 'data-focus-entry-', 'data-memory-id', 'data-star-id', 'data-manifest-id', 'data-webgl-state']),
      replay: attributes(replay, ['data-replay-camera-', 'data-replay-arrival-', 'data-replay-interaction-', 'data-replay-media-', 'data-replay-spatial-', 'data-playing', 'data-current-time-', 'data-memory-id', 'data-star-id', 'data-manifest-id', 'data-webgl-state']),
      canvas: canvas ? { width: canvas.width, height: canvas.height, cssTransform: getComputedStyle(canvas).transform, firstFrame: attributes(canvas, ['data-focus-first-frame', 'data-replay-first-frame', 'data-replay-camera-']) } : null,
      focused: document.activeElement?.getAttribute('aria-label') || document.activeElement?.getAttribute('data-testid') || document.activeElement?.tagName || null,
      media: Array.from(document.querySelectorAll('audio,video')).map(node => ({ kind: node.tagName, paused: node.paused, ended: node.ended, muted: node.muted, currentTime: node.currentTime })),
    }
  }
  const observe = now => {
    if (stopped) return
    if (previous !== null && frames.length < 36_000) frames.push({ ms: now - startedAt, intervalMs: now - previous })
    previous = now
    if (now - lastSample >= 32 && samples.length < 18_000) { samples.push(read(now)); lastSample = now }
    frame = requestAnimationFrame(observe)
  }
  let longTaskObserver = null
  try {
    longTaskObserver = new PerformanceObserver(entries => {
      for (const entry of entries.getEntries()) if (longTasks.length < 10_000) longTasks.push({ ms: entry.startTime - startedAt, durationMs: entry.duration })
    })
    longTaskObserver.observe({ type: 'longtask', buffered: true })
  } catch { /* Browser may not support the Long Tasks API. */ }
  window.__uraiMotionProof = {
    mark(id) { const snapshot = read(performance.now()); marks.push({ id, ...snapshot }); return snapshot },
    snapshot() { return { source: 'live-application-dom-and-browser-performance', startedAt, browserHints:{hardwareConcurrency:navigator.hardwareConcurrency,deviceMemory:navigator.deviceMemory??null}, reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches, samples, frames, longTasks, marks } },
    stop() { stopped = true; cancelAnimationFrame(frame); longTaskObserver?.disconnect(); return this.snapshot() },
  }
  frame = requestAnimationFrame(observe)
}

export async function markMotionProof(page, id) {
  return page.evaluate(id => window.__uraiMotionProof?.mark(id) ?? null, id)
}

export function summarizeMotionProof(proof) {
  const values = proof.frames.map(row => row.intervalMs).filter(Number.isFinite).sort((a,b) => a-b)
  const percentile = fraction => values.length ? values[Math.min(values.length-1, Math.floor((values.length-1)*fraction))] : null
  const numericCameraValues = []
  for (const sample of proof.samples) {
    for (const realm of ['home','map','focus','replay']) {
      for (const [name, value] of Object.entries(sample[realm] ?? {})) {
        if (/camera-(x|y|z|qx|qy|qz|qw|height|yaw|pitch|fov|frame-delta)$|target-(x|y|z)$|life-map-fov$/.test(name)) numericCameraValues.push({ realm, name, value: Number(value) })
        if (/camera-(position|quaternion|target)$/.test(name)) for (const part of value.split(',')) numericCameraValues.push({ realm, name, value: Number(part) })
      }
    }
    for (const [name,value] of Object.entries(sample.canvas?.firstFrame ?? {})) {
      if (/camera-(position|quaternion|target)$/.test(name)) for (const part of value.split(',')) numericCameraValues.push({ realm: sample.realm, name, value: Number(part) })
      if (/camera-fov$/.test(name)) numericCameraValues.push({ realm: sample.realm, name, value: Number(value) })
    }
  }
  const framesByState = {}
  let sampleIndex = 0
  for (const row of proof.frames) {
    while (sampleIndex + 1 < proof.samples.length && proof.samples[sampleIndex+1].ms <= row.ms) sampleIndex++
    const sample = proof.samples[sampleIndex]
    const phase = sample?.realm === 'home' ? sample.home?.['data-home-scene-phase']
      : sample?.realm === 'life-map' ? sample.map?.['data-life-map-phase']
      : sample?.world?.['data-world-transition']
    const state = sample ? `${sample.realm}:${phase || 'unknown'}` : 'unavailable'
    ;(framesByState[state] ??= []).push(row.intervalMs)
  }
  const stateFrameIntervals = Object.fromEntries(Object.entries(framesByState).map(([state, intervals]) => {
    intervals.sort((a,b) => a-b)
    return [state, { count: intervals.length, medianMs: intervals[Math.floor((intervals.length-1)*.5)], p95Ms: intervals[Math.floor((intervals.length-1)*.95)], maxMs: intervals.at(-1) }]
  }))
  return {
    source: proof.source,
    browserHints: proof.browserHints ?? null,
    durationMs: proof.frames.at(-1)?.ms ?? 0,
    sampleCount: proof.samples.length,
    frameIntervalCount: values.length,
    frameIntervalMs: { median: percentile(.5), p95: percentile(.95), p99: percentile(.99), max: values.at(-1) ?? null },
    framesOver33Ms: values.filter(value => value > 33.333).length,
    framesOver50Ms: values.filter(value => value > 50).length,
    longTaskCount: proof.longTasks.length,
    numericCameraSamples: numericCameraValues.length,
    nonFiniteCameraSamples: numericCameraValues.filter(row => !Number.isFinite(row.value)),
    stateFrameIntervals,
    reducedMotion: proof.reducedMotion,
    limitation: 'Browser rAF intervals from the genuine recorded application include development compilation, screenshots, video capture, and software WebGL; they are not physical-device GPU render times. Fields absent from the application are retained as unavailable, never inferred camera transforms.',
  }
}
