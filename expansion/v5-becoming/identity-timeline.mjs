const EVENT_KINDS = new Set([
  "memory_observed",
  "reflection",
  "goal",
  "milestone",
  "preference_change",
  "relationship_context",
  "user_correction",
]);

function clone(value) {
  return structuredClone(value);
}

export function validateIdentityTimeline(timeline) {
  if (timeline?.version !== "1.0.0") throw new Error("Unsupported identity timeline version");
  if (timeline.synthetic !== true) throw new Error("Prelaunch identity timeline must be synthetic");
  if (!Array.isArray(timeline.events)) throw new Error("events array required");

  const ids = new Set();
  for (const event of timeline.events) {
    if (!event.eventId || ids.has(event.eventId)) throw new Error("unique eventId required");
    if (!EVENT_KINDS.has(event.kind)) throw new Error("unsupported identity event kind");
    if (!["active","corrected","revoked","deleted"].includes(event.status)) throw new Error("invalid event status");
    if (!event.occurredAt || !Array.isArray(event.provenance) || event.provenance.length === 0) {
      throw new Error("event time and provenance required");
    }
    if (event.inference === true) throw new Error("prelaunch real inference is prohibited");
    ids.add(event.eventId);
  }
  return true;
}

export function correctIdentityEvent(timeline, { eventId, patch, actorId, at }) {
  validateIdentityTimeline(timeline);
  const next = clone(timeline);
  const original = next.events.find((x) => x.eventId === eventId);
  if (!original) throw new Error("event not found");

  const allowed = new Set(["label","summary","occurredAt"]);
  for (const key of Object.keys(patch ?? {})) {
    if (!allowed.has(key)) throw new Error("correction field not allowed: " + key);
  }

  original.status = "corrected";
  const corrected = {
    ...original,
    ...patch,
    eventId: eventId + ":correction:" + String((next.corrections?.length ?? 0) + 1),
    kind: "user_correction",
    status: "active",
    inference: false,
    provenance: [
      ...original.provenance,
      { type:"user_correction", actorId, at, corrects:eventId },
    ],
  };
  next.events.push(corrected);
  next.corrections = [...(next.corrections ?? []), { from:eventId, to:corrected.eventId, actorId, at }];
  next.revision = (Number(next.revision) || 0) + 1;
  validateIdentityTimeline(next);
  return next;
}

export function revokeIdentityEvent(timeline, { eventId, actorId, at }) {
  validateIdentityTimeline(timeline);
  const next = clone(timeline);
  const event = next.events.find((x) => x.eventId === eventId);
  if (!event) throw new Error("event not found");
  event.status = "revoked";
  event.provenance.push({ type:"revocation", actorId, at });
  next.revision = (Number(next.revision) || 0) + 1;
  validateIdentityTimeline(next);
  return next;
}

export function deleteIdentityEvent(timeline, { eventId, actorId, at }) {
  validateIdentityTimeline(timeline);
  const next = clone(timeline);
  const event = next.events.find((x) => x.eventId === eventId);
  if (!event) throw new Error("event not found");
  event.status = "deleted";
  event.provenance.push({ type:"deletion", actorId, at });
  next.revision = (Number(next.revision) || 0) + 1;
  validateIdentityTimeline(next);
  return next;
}

export function exportBecomingArc(timeline) {
  validateIdentityTimeline(timeline);
  return {
    version: timeline.version,
    timelineId: timeline.timelineId,
    revision: timeline.revision,
    events: timeline.events.filter((event) => !["deleted","revoked"].includes(event.status)),
    corrections: timeline.corrections ?? [],
    semantics: {
      syntheticOnly: true,
      sensitiveInferenceActive: false,
      correctionPreserved: true,
      revocationHonored: true,
      deletionHonored: true,
    },
  };
}
