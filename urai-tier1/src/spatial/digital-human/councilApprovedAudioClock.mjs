/**
 * Playback clock for an independently approved Council speaker. No voice synthesis
 * or likeness approval occurs here. Requires SHA-verified audio and live authority.
 */
const SHA = /^[a-f0-9]{64}$/;
const mintedProofs = new WeakSet();
const validId = x => typeof x === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(x);
const validTime = x => typeof x === 'number' && Number.isFinite(x) && x >= 0;

export async function verifyCouncilAudioBytes(bytes, expectedSha256) {
  if (!SHA.test(String(expectedSha256 ?? ''))) return null;
  const payload = bytes instanceof ArrayBuffer ? new Uint8Array(bytes)
    : ArrayBuffer.isView(bytes) ? new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength) : null;
  if (!payload || payload.byteLength < 64 || payload.byteLength > 32 * 1024 * 1024 || !globalThis.crypto?.subtle) return null;
  const hash = Array.from(new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', payload)),
    b => b.toString(16).padStart(2, '0')).join('');
  if (hash !== expectedSha256) return null;
  const proof = Object.freeze({ audioSha256: hash, byteLength: payload.byteLength });
  mintedProofs.add(proof);
  return proof;
}

/** Browser speechSynthesis events are not audio samples and are not used as an audio clock. */
export function createCouncilApprovedAudioClock({ media, proof, speaker, getAuthority, getRms, onFrame, onNeutral } = {}) {
  if (!media || typeof media.play !== 'function' || typeof media.pause !== 'function') throw new TypeError('audio-element-required');
  if (!proof || !mintedProofs.has(proof) || !speaker || !validId(speaker.accountId)
    || !validId(speaker.agentId) || !validId(speaker.voiceId)
    || !Number.isSafeInteger(speaker.turnId) || speaker.turnId < 1
    || !SHA.test(String(speaker.voiceApprovalSha256 ?? ''))
    || !Number.isSafeInteger(speaker.actorGeneration) || speaker.actorGeneration < 1
    || speaker.audioSha256 !== proof.audioSha256) throw new Error('council-voice-not-admitted');
  if (typeof getAuthority !== 'function' || typeof onFrame !== 'function' || typeof onNeutral !== 'function')
    throw new TypeError('playback-lifetime-callbacks-required');
  let disposed = false, stopped = false, played = false, epoch = 0, starting = false;
  let status = 'idle';
  function authorized() {
    try {
      const a = getAuthority();
      return !disposed && !stopped && a?.accountId === speaker.accountId
        && a?.actorGeneration === speaker.actorGeneration && a?.agentId === speaker.agentId
        && a?.turnId === speaker.turnId && a?.voiceId === speaker.voiceId
        && a?.voiceApprovalSha256 === speaker.voiceApprovalSha256
        && a?.aiConsent === true && a?.voiceConsent === true && a?.providerEnabled === true
        && a?.revoked !== true;
    } catch { return false; }
  }
  function neutral(reason) { status = reason; onNeutral(reason); }
  function end(reason = 'stopped') {
    if (disposed || stopped) return;
    stopped = true; epoch++;
    try { media.pause(); } catch { /* stop fails closed */ }
    neutral(reason);
  }
  function tick() {
    if (!authorized()) {
      if (!stopped && !disposed) end('authority-revoked');
      return { mode: 'neutral', status };
    }
    if (!played || media.paused || media.ended || media.muted || !validTime(media.currentTime)) {
      neutral(media.muted ? 'muted' : 'audio-not-playing');
      return { mode: 'neutral', status };
    }
    const rms = typeof getRms === 'function' ? getRms() : null;
    const frame = Object.freeze({
      actorGeneration: speaker.actorGeneration, agentId: speaker.agentId,
      turnId: speaker.turnId, audioSha256: proof.audioSha256,
      audioSeconds: media.currentTime, playing: true, rms: Number.isFinite(rms) ? rms : null,
    });
    onFrame(frame);
    status = 'playing';
    return { mode: 'audio-clock', audioSeconds: frame.audioSeconds, status };
  }
  async function start() {
    if (!authorized() || disposed) { end('authority-revoked'); return false; }
    // Only one pending media.play() per speaker. Competing promises could
    // resume revoked audio or wrongly pause a newer authorized playback.
    if (starting || (played && !media.paused)) return false;
    starting = true;
    const ticket = ++epoch;
    try { await media.play(); } catch {
      starting = false;
      if (!disposed && !stopped) end('audio-playback-failed');
      return false;
    }
    starting = false;
    if (ticket !== epoch || !authorized() || media.paused) {
      // A late play() fulfillment may begin audio *after* interrupt/dispose.
      // Re-pause even when end() already marked the turn terminal.
      try { media.pause(); } catch { /* no frames or authority resurrected */ }
      if (!disposed && !stopped) end('stale-audio-start');
      return false;
    }
    played = true; status = 'playing'; return true;
  }
  const ended = () => end('audio-ended');
  const error = () => end('audio-error');
  const pause = () => { if (!stopped) neutral('audio-paused'); };
  const events = [['ended', ended], ['error', error], ['pause', pause]];
  for (const [event, handler] of events) media.addEventListener?.(event, handler);
  return Object.freeze({
    snapshot() { return Object.freeze({ status, stopped, disposed, played, agentId: speaker.agentId, actorGeneration: speaker.actorGeneration }); },
    start, tick, interrupt() { end('interrupted'); },
    dispose() {
      if (disposed) return;
      end('disposed'); disposed = true;
      for (const [event, handler] of events) media.removeEventListener?.(event, handler);
    },
  });
}

/** Bind an independently admitted, isolated morph driver to audible sample time. */
export function bindCouncilAudioMorph({ clock, morphDriver, turnId, audioSha256, timeline, reducedMotion = false } = {}) {
  if (!clock || !morphDriver || !Number.isSafeInteger(turnId) || turnId < 1
    || !SHA.test(String(audioSha256 ?? ''))) throw new TypeError('admitted-morph-and-clock-required');
  let active = true, disposed = false;
  return Object.freeze({
    start() { return Boolean(active && morphDriver.beginAudio({ turnId, audioSha256 })); },
    tick() { return active ? clock.tick() : { mode: 'neutral' }; },
    onFrame(frame) {
      if (!active || frame.turnId !== turnId || frame.audioSha256 !== audioSha256) return { mode: 'neutral' };
      return morphDriver.frame({ turnId, audioSeconds: frame.audioSeconds, audioSha256: frame.audioSha256,
        rms: frame.rms, playing: frame.playing, timeline, reducedMotion });
    },
    stop() { if (!active) return; active = false; clock.interrupt(); morphDriver.interrupt(); },
    dispose() {
      if (disposed) return;
      disposed = true;
      const wasActive = active;
      active = false;
      // stop() interrupts the turn but cannot suppress listener cleanup.
      clock.dispose();
      if (wasActive) morphDriver.interrupt();
    },
  });
}