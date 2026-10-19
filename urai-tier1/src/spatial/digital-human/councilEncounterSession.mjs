/** Council preview encounter lifecycle. No Founder identity, voice, or provider authority. */
export function createCouncilEncounterSession() {
  let actor = null, generation = 0, selected = null, near = false, consent = false, active = null, disposed = false;
  const cancel = () => { generation++; active = null; };
  return Object.freeze({
    snapshot: () => Object.freeze({ actor, generation, selected, near, consent, active, disposed }),
    update({ actorGeneration, agentId, inRange, processingConsent }) {
      if (disposed) return false;
      if (!Number.isSafeInteger(actorGeneration) || actorGeneration < 0 || typeof agentId !== 'string' || !agentId) {
        cancel(); actor = null; selected = null; near = false; consent = false; return false;
      }
      const nextNear = inRange === true, nextConsent = processingConsent === true;
      const changed = actor !== actorGeneration || selected !== agentId || (near && !nextNear) || (consent && !nextConsent);
      if (changed) cancel();
      actor = actorGeneration; selected = agentId; near = nextNear; consent = nextConsent;
      return changed;
    },
    begin({ actorGeneration, agentId }) {
      if (disposed || active !== null || !near || !consent || actor !== actorGeneration || selected !== agentId) return null;
      active = ++generation;
      return active;
    },
    isCurrent(turn, actorGeneration, agentId) {
      return !disposed && Number.isSafeInteger(turn) && active === turn && actor === actorGeneration && selected === agentId && near && consent;
    },
    finish(turn) {
      if (disposed || !Number.isSafeInteger(turn) || turn < 1 || turn !== active) return false;
      active = null;
      return true;
    },
    interrupt() { if (!disposed) cancel(); },
    dispose() {
      if (disposed) return;
      disposed = true; cancel(); actor = null; selected = null; near = false; consent = false;
    },
  });
}
