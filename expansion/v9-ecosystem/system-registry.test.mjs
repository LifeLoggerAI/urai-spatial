import assert from "node:assert/strict";
import { EcosystemRegistry } from "./system-registry.mjs";

const registry=new EcosystemRegistry();
registry.register({
  systemId:"spatial",
  repository:"LifeLoggerAI/urai-spatial",
  status:"active",
  dependencies:["content"],
  capabilities:["scene"],
  evidenceRefs:["synthetic:spatial"],
  observedAt:"2026-09-23T12:00:00.000Z",
});
registry.register({
  systemId:"content",
  repository:"LifeLoggerAI/urai-content",
  status:"gated",
  dependencies:[],
  capabilities:["catalog","exports"],
  evidenceRefs:["synthetic:content"],
  observedAt:"2026-09-23T12:00:00.000Z",
});

assert.equal(registry.snapshot().length,2);
assert.deepEqual(registry.dependencyHealth("spatial"),[
  {systemId:"content",known:true,status:"gated"},
]);
assert.throws(()=>registry.register({
  systemId:"bad",
  repository:"synthetic",
  writeAuthority:true,
}),/read-only/);

console.log("V9 read-only ecosystem registry conformance: PASS");
