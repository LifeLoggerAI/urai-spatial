import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  validateRelationshipGraph,
  applyRelationshipOperation,
  exportRelationshipGraph,
} from "./relationship-graph.mjs";

const fixture = JSON.parse(
  await readFile(new URL("./synthetic-relationship-graph.json", import.meta.url), "utf8"),
);

assert.equal(validateRelationshipGraph(fixture), true);

const corrected = applyRelationshipOperation(fixture, {
  type:"CORRECT_PERSON",
  targetId:"person-mentor",
  actorId:"subject-self",
  at:"2026-09-23T12:00:00.000Z",
  patch:{displayName:"Corrected Synthetic Mentor"},
});
assert.equal(corrected.people.find((x)=>x.personId==="person-mentor").displayName, "Corrected Synthetic Mentor");
assert.equal(corrected.revision, 2);
assert.equal(fixture.revision, 1);

const hidden = applyRelationshipOperation(fixture, {
  type:"HIDE_PERSON",
  targetId:"person-mentor",
  actorId:"subject-self",
  at:"2026-09-23T12:01:00.000Z",
});
assert.equal(hidden.people.find((x)=>x.personId==="person-mentor").status, "hidden");
assert.equal(hidden.edges.find((x)=>x.edgeId==="edge-mentor").status, "hidden");
assert.equal(hidden.memoryLinks.find((x)=>x.linkId==="memory-link-001").status, "hidden");

const revoked = applyRelationshipOperation(fixture, {
  type:"UNLINK_MEMORY",
  targetId:"memory-link-001",
  actorId:"subject-self",
  at:"2026-09-23T12:02:00.000Z",
});
assert.equal(revoked.memoryLinks[0].status, "revoked");

const deleted = applyRelationshipOperation(fixture, {
  type:"DELETE_PERSON",
  targetId:"person-mentor",
  actorId:"subject-self",
  at:"2026-09-23T12:03:00.000Z",
});
const exported = exportRelationshipGraph(deleted);
assert.equal(exported.people.some((x)=>x.personId==="person-mentor"), false);
assert.equal(exported.edges.some((x)=>x.edgeId==="edge-mentor"), false);
assert.equal(exported.memoryLinks.some((x)=>x.linkId==="memory-link-001"), false);
assert.equal(exported.exportSemantics.relationshipScoresPresent, false);

assert.throws(
  () => validateRelationshipGraph({ ...fixture, hiddenScore: 0.9 }),
  /Prohibited relationship scoring/,
);

assert.throws(
  () => applyRelationshipOperation(fixture, {
    type:"CORRECT_PERSON",
    targetId:"person-mentor",
    actorId:"subject-self",
    at:"2026-09-23T12:04:00.000Z",
    patch:{relationshipScore:1},
  }),
  /correction field not allowed/,
);

console.log("V3 synthetic relationship graph conformance: PASS");
