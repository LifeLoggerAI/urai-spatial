import assert from "node:assert/strict";
import { LocalFirstQueue, degradedCapabilityState } from "./local-first.mjs";

const queue = new LocalFirstQueue();
assert.equal(queue.enqueue({
  eventId:"event-1",subjectId:"subject-1",idempotencyKey:"idem-1",payload:{value:1},
}).accepted,true);
assert.equal(queue.enqueue({
  eventId:"event-duplicate",subjectId:"subject-1",idempotencyKey:"idem-1",payload:{value:2},
}).accepted,false);

let result = await queue.flush({
  online:false,
  executor:async()=>({receipt:"never"}),
});
assert.equal(result.flushed,0);
assert.equal(result.retained,1);

let calls=0;
result = await queue.flush({
  online:true,
  maxAttempts:2,
  executor:async()=>{
    calls += 1;
    if (calls === 1) throw Object.assign(new Error("temporary"),{transient:true,code:"TEMP"});
    return {receipt:"synthetic-commit"};
  },
});
assert.equal(result.flushed,1);
assert.equal(result.retained,0);
assert.equal(calls,2);

queue.enqueue({eventId:"event-2",subjectId:"subject-2",idempotencyKey:"idem-2",payload:{}});
result = await queue.flush({
  online:true,
  executor:async()=>({conflict:true}),
});
assert.equal(result.flushed,0);
assert.equal(result.retained,1);
assert.equal(result.receipts[0].strategy,"retain_for_review");

assert.equal(queue.purgeSubject("subject-2"),1);
assert.equal(queue.snapshot().length,0);

const degraded = degradedCapabilityState({
  online:false,webgl:false,localAssets:true,storageHealthy:true,
});
assert.equal(degraded.rendering,"static-fallback");
assert.equal(degraded.cloudOnlyFeaturesAvailable,false);
assert.equal(degraded.canReadLocalPrivacyControls,true);

console.log("Offline/local-first synthetic conformance: PASS");
