import { createSystemLoop } from "../kernel/SystemLoop";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const loop = await createSystemLoop({
    tickIntervalMs: 1000,
    replayLimit: 25
  });

  await loop.engine.emit(
    "smoke.boot",
    {
      startedAt: Date.now(),
      purpose: "system-loop-runtime-smoke"
    },
    "system-loop-smoke"
  );

  const result = await loop.runOnce();

  assert(result.snapshot.totalNodes > 0, "Expected memory graph to record at least one node.");
  assert(result.timeline.totalFrames > 0, "Expected replay timeline to contain at least one frame.");
  assert(result.prediction.id, "Expected prediction result id.");
  assert(result.frame.id, "Expected XR frame id.");
  assert(result.packets.length > 0, "Expected communications packets.");
  assert(result.analyticsEvents.length > 0, "Expected analytics events.");

  loop.stop();

  console.log("SystemLoop smoke passed", {
    tick: loop.engine.tick,
    memoryNodes: result.snapshot.totalNodes,
    replayFrames: result.timeline.totalFrames,
    predictionCandidates: result.prediction.candidates.length,
    xrObjects: result.frame.objects.length,
    packets: result.packets.length,
    analyticsEvents: result.analyticsEvents.length
  });
}

main().catch((error) => {
  console.error("SystemLoop smoke failed", error);
  process.exit(1);
});
