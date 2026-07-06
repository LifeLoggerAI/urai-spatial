import { createSystemLoop, type SystemLoopState } from "./kernel/SystemLoop";
import { PersistenceManager } from "./kernel/PersistenceManager";
import { SimulationDashboard } from "./dashboard/SimulationDashboard";

async function main() {
  const persistence = new PersistenceManager<SystemLoopState>();
  const savedState = persistence.load();

  const loop = await createSystemLoop({
    tickIntervalMs: 1000,
    replayLimit: 50,
    initialState: savedState ?? undefined,
  });

  const dashboard = new SimulationDashboard(loop.engine as never, {
    enabled: true,
    logIntervalMs: 2000,
  });

  dashboard.attach();

  await loop.engine.emit(
    "app.boot",
    {
      name: "urai-spatial",
      mode: "system-loop",
      restored: savedState !== null,
      persistencePath: persistence.getPath(),
      startedAt: Date.now(),
    },
    "entrypoint"
  );

  const firstRun = await loop.runOnce();

  console.log("URAI Spatial system loop online", {
    tick: loop.engine.tick,
    totalRuns: loop.getState().totalRuns,
    memoryNodes: firstRun.snapshot.totalNodes,
    predictionCandidates: firstRun.prediction.candidates.length,
    xrObjects: firstRun.frame.objects.length,
    persistencePath: persistence.getPath(),
  });

  try {
    persistence.save(loop.getState());
  } catch (error) {
    console.error("Failed to persist simulation state", error);
  }

  loop.start();

  const shutdown = () => {
    try {
      persistence.save(loop.getState());
    } catch (error) {
      console.error("Failed to persist on shutdown", error);
    }

    dashboard.stop();
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
