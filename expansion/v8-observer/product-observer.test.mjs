import assert from "node:assert/strict";
import { observeProduct, proposeImprovement } from "./product-observer.mjs";

const obs=observeProduct({
  observationId:"obs-1",type:"route_health",target:"/focus",status:"degraded",
  evidenceRefs:["receipt-b","receipt-a"],observedAt:"2026-09-23T12:00:00.000Z",
});
assert.equal(obs.readOnly,true);
assert.equal(obs.canWriteProduction,false);
assert.deepEqual(obs.evidenceRefs,["receipt-a","receipt-b"]);

const proposal=proposeImprovement(obs,{
  summary:"Investigate synthetic route degradation",
  rationale:"Evidence shows degraded status; no production mutation is authorized.",
});
assert.equal(proposal.action,"human_review_required");
assert.equal(proposal.writeAuthority,false);
assert.equal(proposal.mergeAuthority,false);
assert.equal(proposal.deployAuthority,false);

console.log("V8 read-only product observer conformance: PASS");
