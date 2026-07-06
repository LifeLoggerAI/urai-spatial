import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { PersistenceManager } from "../kernel/PersistenceManager";
import { createSystemLoop, type SystemLoopState } from "../kernel/SystemLoop";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function isInsideRepository(targetPath: string): boolean {
  const relative = path.relative(process.cwd(), path.resolve(targetPath));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

async function main() {
  const defaultPersistence = new PersistenceManager<SystemLoopState>();
  assert(
    !isInsideRepository(defaultPersistence.getPath()),
    "Default runtime persistence path must remain outside the repository."
  );

  const tempDirectory = mkdtempSync(path.join(tmpdir(), "urai-v50-smoke-"));
  const statePath = path.join(tempDirectory, "runtime-state.json");

  try {
    const loop = await createSystemLoop({
      tickIntervalMs: 1000,
      replayLimit: 25,
    });

    await loop.engine.emit(
      "smoke.boot",
      {
        startedAt: Date.now(),
        purpose: "system-loop-runtime-smoke",
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

    const persistence = new PersistenceManager<SystemLoopState>({ filePath: statePath });
    persistence.save(result.state);

    const persistedState = persistence.load();
    assert(persistedState !== null, "Expected persisted SystemLoop state.");
    assert(
      persistedState.totalRuns === result.state.totalRuns,
      "Expected persisted totalRuns to match the completed cycle."
    );

    const restoredLoop = await createSystemLoop({
      tickIntervalMs: 1000,
      replayLimit: 25,
      initialState: persistedState,
    });
    const restoredResult = await restoredLoop.runOnce();

    assert(
      restoredResult.state.totalRuns === result.state.totalRuns + 1,
      "Expected restored SystemLoop state to continue from the persisted run count."
    );

    loop.stop();
    restoredLoop.stop();

    console.log("SystemLoop smoke passed", {
      tick: loop.engine.tick,
      memoryNodes: result.snapshot.totalNodes,
      replayFrames: result.timeline.totalFrames,
      predictionCandidates: result.prediction.candidates.length,
      xrObjects: result.frame.objects.length,
      packets: result.packets.length,
      analyticsEvents: result.analyticsEvents.length,
      persistedRuns: persistedState.totalRuns,
      restoredRuns: restoredResult.state.totalRuns,
      defaultPersistencePath: defaultPersistence.getPath(),
      persistenceOutsideRepository: !isInsideRepository(defaultPersistence.getPath()),
    });
  } finally {
    rmSync(tempDirectory, { recursive: true, force: true });
  }
}

void main().catch((error) => {
  console.error("SystemLoop smoke failed", error);
  process.exitCode = 1;
});
