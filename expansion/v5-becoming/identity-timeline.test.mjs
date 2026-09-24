import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  validateIdentityTimeline,
  correctIdentityEvent,
  revokeIdentityEvent,
  deleteIdentityEvent,
  exportBecomingArc,
} from "./identity-timeline.mjs";

const fixture = JSON.parse(
  await readFile(new URL("./synthetic-identity-timeline.json", import.meta.url), "utf8"),
);

assert.equal(validateIdentityTimeline(fixture),true);

const corrected=correctIdentityEvent(fixture,{
  eventId:"identity-event-001",
  patch:{label:"Corrected synthetic milestone"},
  actorId:"subject-self",
  at:"2026-09-23T12:00:00.000Z",
});
assert.equal(corrected.events.find((x)=>x.eventId==="identity-event-001").status,"corrected");
assert.equal(corrected.corrections.length,1);
assert.equal(exportBecomingArc(corrected).semantics.sensitiveInferenceActive,false);

const revoked=revokeIdentityEvent(fixture,{
  eventId:"identity-event-002",actorId:"subject-self",at:"2026-09-23T12:01:00.000Z",
});
assert.equal(exportBecomingArc(revoked).events.some((x)=>x.eventId==="identity-event-002"),false);

const deleted=deleteIdentityEvent(fixture,{
  eventId:"identity-event-001",actorId:"subject-self",at:"2026-09-23T12:02:00.000Z",
});
assert.equal(exportBecomingArc(deleted).events.some((x)=>x.eventId==="identity-event-001"),false);

assert.throws(
  ()=>validateIdentityTimeline({...fixture,synthetic:false}),
  /must be synthetic/,
);
assert.throws(
  ()=>validateIdentityTimeline({
    ...fixture,
    events:[{...fixture.events[0],inference:true}],
  }),
  /inference is prohibited/,
);

console.log("V5 Mirror of Becoming synthetic conformance: PASS");
