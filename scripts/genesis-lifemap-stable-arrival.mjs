/**
 * Evidence-only stability check after an authentic LifeMap WebGL mount.
 * A route event or one ready frame is insufficient for native capture.
 * This does not replace decoded-pixel or independent human visual review.
 */
export async function requireStableLifeMapArrival({ isReady, sleep, now = Date.now }) {
  if (typeof isReady !== 'function' || typeof sleep !== 'function' || typeof now !== 'function') {
    throw new Error('LIFEMAP_REAL_WEBGL_NOT_STABLE');
  }
  const minimumMs = 900;
  const intervalMs = 75;
  const startedAt = now();
  if (!Number.isSafeInteger(startedAt) || startedAt <= 0) throw new Error('LIFEMAP_REAL_WEBGL_NOT_STABLE');
  let lastElapsed = -1;
  let samples = 0;
  for (;;) {
    let ready = false;
    try { ready = (await isReady()) === true; } catch {}
    if (!ready) throw new Error('LIFEMAP_REAL_WEBGL_NOT_STABLE');
    const elapsed = now() - startedAt;
    samples += 1;
    // A broken or non-monotonic clock must not turn a short glance into proof.
    if (!Number.isSafeInteger(elapsed) || elapsed < lastElapsed || elapsed > 30_000 || samples > 128) {
      throw new Error('LIFEMAP_REAL_WEBGL_NOT_STABLE');
    }
    if (elapsed >= minimumMs) return Object.freeze({ stableMs: elapsed, samples });
    lastElapsed = elapsed;
    await sleep(Math.min(intervalMs, minimumMs - elapsed));
  }
}
