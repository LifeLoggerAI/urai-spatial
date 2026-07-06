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

  const dashboard = new SimulationDashboard(loop.engine.bus, {
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

  persistence.save(loop.getState());
  loop.start();

  const shutdown = () => {
    persistence.save(loop.getState());
    dashboard.stop();
    loop.stop();
    console.log("URAI Spatial system loop stopped", loop.getState());
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

void main().catch((error) => {
  console.error("URAI Spatial boot failed", error);
  process.exitCode = 1;
});
