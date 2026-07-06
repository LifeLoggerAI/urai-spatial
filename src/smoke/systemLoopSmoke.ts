import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { PersistenceManager } from "../kernel/PersistenceManager";
import { createSystemLoop, type SystemLoopState } from "../kernel/SystemLoop";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const isInsideRepository = (targetPath: string) => {
  const relative = path.relative(process.cwd(), path.resolve(targetPath));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
};

async function main() {
  const defaultPersistence = new PersistenceManager<SystemLoopState>();
  assert(!isInsideRepository(defaultPersistence.getPath()), "Default runtime persistence path must remain outside the repository.");
  const tempDirectory = mkdtempSync(path.join(tmpdir(), "urai-v50-smoke-"));
  try {
    const loop = await createSystemLoop({ tickIntervalMs: 1000, replayLimit: 25 });
    await loop.engine.emit("smoke.boot", { startedAt: Date.now(), purpose: "system-loop-runtime-smoke" }, "system-loop-smoke");
    const result = await loop.runOnce();
    assert(result.snapshot.totalNodes > 0, "Expected memory graph nodes.");
    assert(result.timeline.totalFrames > 0, "Expected replay frames.");
    assert(result.prediction.id, "Expected prediction id.");
    assert(result.frame.id, "Expected XR frame id.");
    assert(result.packets.length > 0, "Expected communication packets.");
    assert(result.analyticsEvents.length > 0, "Expected analytics events.");

    const persistence = new PersistenceManager<SystemLoopState>({ filePath: path.join(tempDirectory, "runtime-state.json") });
    persistence.save(result.state);
    const persisted = persistence.load();
    assert(persisted !== null, "Expected persisted state.");
    assert(persisted.totalRuns === result.state.totalRuns, "Persisted run count mismatch.");

    const restored = await createSystemLoop({ tickIntervalMs: 1000, replayLimit: 25, initialState: persisted });
    const restoredResult = await restored.runOnce();
    assert(restoredResult.state.totalRuns === result.state.totalRuns + 1, "Restored run count did not continue.");
    loop.stop();
    restored.stop();

    console.log("SystemLoop smoke passed", {
      memoryNodes: result.snapshot.totalNodes,
      replayFrames: result.timeline.totalFrames,
      predictionCandidates: result.prediction.candidates.length,
      xrObjects: result.frame.objects.length,
      persistedRuns: persisted.totalRuns,
      restoredRuns: restoredResult.state.totalRuns,
      persistenceOutsideRepository: !isInsideRepository(defaultPersistence.getPath()),
    });
  } finally {
    rmSync(tempDirectory, { recursive: true, force: true });
  }
}

void main().catch((error) => { console.error("SystemLoop smoke failed", error); process.exitCode = 1; });
