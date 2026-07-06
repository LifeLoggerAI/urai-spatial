import { createSystemLoop } from "./kernel/SystemLoop";
import { PersistenceManager } from "./kernel/PersistenceManager";

async function main() {
  const persistence = new PersistenceManager();

  // Load previous simulation state (if exists)
  const savedState = persistence.load();

  const loop = await createSystemLoop({
    tickIntervalMs: 1000,
    replayLimit: 50
  });

  await loop.engine.emit("app.boot", {
    name: "urai-spatial",
    mode: "system-loop",
    restored: persistence.exists(),
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

  // Persist state after initial cycle
  try {
    persistence.save(loop.getState());
  } catch (err) {
    console.error("Failed to persist simulation state", err);
  }

  loop.start();

  const shutdown = () => {
    try {
      persistence.save(loop.getState());
    } catch (err) {
      console.error("Failed to persist on shutdown", err);
    }

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