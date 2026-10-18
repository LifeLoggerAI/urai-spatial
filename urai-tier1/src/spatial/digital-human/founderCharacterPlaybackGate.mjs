/**
 * UrAi Founder-only render/playback lifetime gate.
 * Presentation boundary only. The original Adam runtime and backend must
 * independently validate model, identity, consent, and voice provider authority.
 * Never bind Council personas here.
 */
const SHA = /^[a-f0-9]{64}$/;
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const epochValid = x => typeof x === 'string' && ID.test(x);
const validSeconds = x => typeof x === 'number' && Number.isFinite(x) && x >= 0;
export function createFounderCharacterPlaybackGate({
  ownerAccountId, getAuthority, verifyAuthorizedVoice, onFaceFrame, onNeutral, abortConversation,
} = {}) {
  if (!epochValid(ownerAccountId) || typeof getAuthority !== 'function'
    || typeof verifyAuthorizedVoice !== 'function' || typeof onFaceFrame !== 'function'
    || typeof onNeutral !== 'function' || typeof abortConversation !== 'function') {
    throw new TypeError('founder-playback-gate-requires-trusted-injected-authority');
  }
  let sequence = 0, turn = null, disposed = false;
  const readAuthority = () => { try { return getAuthority(); } catch { return null; } };
  const currentActor = (s, requireVoice = false) => {
    if (disposed || !s || s.accountId !== ownerAccountId || s.subjectId !== 'adam'
      || s.identityKind !== 'founder' || !epochValid(s.actorEpoch) || s.aiConsent !== true
      || s.likenessApproved !== true || s.modelAdmitted !== true
      || !SHA.test(String(s.modelSha256 ?? '')) || s.providerEnabled !== true
      || s.revoked === true || (requireVoice && (s.voiceConsent !== true || s.voiceAdmitted !== true
        || !ID.test(String(s.approvedVoiceId ?? ''))
        || !SHA.test(String(s.voiceApprovalSha256 ?? ''))))) return null;
    return s;
  };
  const snapshot = () => Object.freeze({ generation:sequence, hasTurn:Boolean(turn),
    speaking:Boolean(turn?.speaking), disposed });
  const current = (id, requireVoice = false) => {
    const auth = currentActor(readAuthority(), requireVoice);
    return Boolean(auth && turn && turn.id === id && turn.actorEpoch === auth.actorEpoch
      && turn.accountId === auth.accountId && turn.modelSha256 === auth.modelSha256
      && (!requireVoice || (turn.voiceId === auth.approvedVoiceId
        && turn.approvalSha256 === auth.voiceApprovalSha256)));
  };
  const end = (reason = 'interrupted') => {
    sequence += 1;
    const active = turn; turn = null;
    if (active?.media) { try { active.media.pause(); } catch { /* fail closed */ } }
    try { abortConversation(reason); } finally { onNeutral(reason); }
    return snapshot();
  };
  return Object.freeze({
    snapshot,
    beginTurn() {
      const auth = currentActor(readAuthority());
      if (!auth || turn) return null;
      const id = ++sequence;
      turn = {id,actorEpoch:auth.actorEpoch,accountId:auth.accountId,
        modelSha256:auth.modelSha256,speaking:false,media:null,audioAttempted:false};
      return id;
    },
    async startAuthorizedAudio({id,media,audioSha256,voiceId,voiceApprovalSha256,providerReceipt} = {}) {
      const auth = currentActor(readAuthority(), true);
      if (!auth || !current(id, false) || !media || typeof media.play !== 'function'
        || typeof media.pause !== 'function' || !SHA.test(String(audioSha256 ?? ''))
        || !ID.test(String(voiceId ?? '')) || !SHA.test(String(voiceApprovalSha256 ?? ''))
        || voiceId !== auth.approvedVoiceId
        || voiceApprovalSha256 !== auth.voiceApprovalSha256) return false;
      // Deny concurrent verification and replacement audio for the same turn.
      if (turn.audioAttempted) return false;
      turn.audioAttempted = true;
      const ticket = sequence, authEpoch = turn.actorEpoch;
      let accepted = false;
      try {
        accepted = await verifyAuthorizedVoice({accountId:ownerAccountId,subjectId:'adam',
          actorEpoch:authEpoch,turnId:id,audioSha256,voiceId,voiceApprovalSha256,providerReceipt}) === true;
      } catch { accepted = false; }
      if (!accepted || ticket !== sequence || !current(id, false)
        || !currentActor(readAuthority(), true)) return false;
      turn.voiceId = voiceId;
      turn.approvalSha256 = voiceApprovalSha256;
      turn.audioSha256 = audioSha256;
      turn.media = media;
      try { await media.play(); }
      catch {
        if (ticket === sequence && turn?.id === id) end('audio-playback-failed');
        else try { media.pause(); } catch { /* old audio never owns a new turn */ }
        return false;
      }
      if (ticket !== sequence || !current(id, true) || media.paused) {
        if (ticket === sequence) end('stale-voice-playback');
        else try { media.pause(); } catch { /* stale audio */ }
        return false;
      }
      turn.speaking = true;
      return true;
    },
    frame(id) {
      if (!current(id, true) || !turn?.speaking) {
        if (turn?.speaking) end('authority-changed');
        return false;
      }
      const media = turn.media;
      if (!media || media.paused || media.ended || media.muted || !validSeconds(media.currentTime)) {
        end(media?.muted ? 'muted' : 'audio-not-playing');
        return false;
      }
      const payload = Object.freeze({accountId:ownerAccountId,subjectId:'adam',
        actorEpoch:turn.actorEpoch,turnId:id,modelSha256:turn.modelSha256,
        voiceId:turn.voiceId,audioSha256:turn.audioSha256,
        audioSeconds:media.currentTime,playing:true});
      try { onFaceFrame(payload); return true; }
      catch { end('facial-render-failed'); return false; }
    },
    finish(id) { if (!current(id)) return false; end('completed'); return true; },
    interrupt() { return end('interrupted'); },
    dispose() { if (!disposed) { end('disposed'); disposed = true; } return snapshot(); },
  });
}