import { createSystemLoop } from "./kernel/SystemLoop";

async function main() {
  const loop = await createSystemLoop({
    tickIntervalMs: 1000,
    replayLimit: 50
  });

  await loop.engine.emit("app.boot", {
    name: "urai-spatial",
    mode: "system-loop",
    startedAt: Date.now()
  }, "entrypoint");

  const firstRun = await loop.runOnce();

  console.log("URAI Spatial system loop online", {
    tick: loop.engine.tick,
    totalRuns: loop.getState().totalRuns,
    memoryNodes: firstRun.snapshot.totalNodes,
    predictionCandidates: firstRun.prediction.candidates.length,
    xrObjects: firstRun.frame.objects.length
  });

  loop.start();

  const shutdown = () => {
    loop.stop();
    console.log("URAI Spatial system loop stopped", loop.getState());
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error) => {
  console.error("URAI Spatial boot failed", error);
  process.exit(1);
});
