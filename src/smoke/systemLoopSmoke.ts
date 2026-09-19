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
    const persistence = new PersistenceManager<SystemLoopState>({ filePath: path.join(tempDirectory, "runtime-state.json") });

    const cycle1Loop = await createSystemLoop({ tickIntervalMs: 1000, replayLimit: 25 });
    await cycle1Loop.engine.emit("smoke.boot", { startedAt: Date.now(), purpose: "system-loop-runtime-smoke" }, "system-loop-smoke");
    const cycle1 = await cycle1Loop.runOnce();
    assert(cycle1.snapshot.totalNodes > 0, "Cycle 1 expected memory graph nodes.");
    assert(cycle1.timeline.totalFrames > 0, "Cycle 1 expected replay frames.");
    assert(cycle1.prediction.id, "Cycle 1 expected prediction id.");
    assert(cycle1.frame.id, "Cycle 1 expected XR frame id.");
    assert(cycle1.packets.length > 0, "Cycle 1 expected communication packets.");
    assert(cycle1.analyticsEvents.length > 0, "Cycle 1 expected analytics events.");
    assert(cycle1.state.totalRuns === 1, "Cycle 1 run count mismatch.");
    persistence.save(cycle1.state);

    const persisted1 = persistence.load();
    assert(persisted1 !== null, "Expected Cycle 1 persisted state.");
    assert(persisted1.totalRuns === 1, "Cycle 1 persisted run count mismatch.");

    const cycle2Loop = await createSystemLoop({ tickIntervalMs: 1000, replayLimit: 25, initialState: persisted1 });
    const cycle2 = await cycle2Loop.runOnce();
    assert(cycle2.state.totalRuns === 2, "Cycle 2 did not continue persisted run count.");
    assert(cycle2.prediction.id !== cycle1.prediction.id, "Cycle 2 must produce a new prediction.");
    persistence.save(cycle2.state);

    const persisted2 = persistence.load();
    assert(persisted2 !== null, "Expected Cycle 2 persisted state.");
    assert(persisted2.totalRuns === 2, "Cycle 2 persisted run count mismatch.");

    const cycle3Loop = await createSystemLoop({ tickIntervalMs: 1000, replayLimit: 25, initialState: persisted2 });
    const cycle3 = await cycle3Loop.runOnce();
    assert(cycle3.state.totalRuns === 3, "Cycle 3 did not continue persisted run count.");
    assert(cycle3.prediction.id !== cycle2.prediction.id, "Cycle 3 must produce a new prediction.");
    assert(cycle3.analyticsEvents.length > 0, "Cycle 3 expected analytics feedback.");
    persistence.save(cycle3.state);

    const persisted3 = persistence.load();
    assert(persisted3 !== null, "Expected Cycle 3 persisted state.");
    assert(persisted3.totalRuns === 3, "Cycle 3 persisted run count mismatch.");

    const removeFailure = cycle3Loop.engine.bus.on("xr.frame.rendered", () => {
      throw new Error("synthetic downstream failure");
    });

    let failureObserved = false;
    try {
      await cycle3Loop.runOnce();
    } catch (error) {
      failureObserved = String(error).includes("synthetic downstream failure");
    }
    assert(failureObserved, "Expected deliberate downstream failure.");
    assert(cycle3Loop.getState().totalRuns === 3, "Failed cycle must not falsely advance committed loop state.");
    persistence.save(cycle3Loop.getState());
    const failedPersisted = persistence.load();
    assert(failedPersisted?.totalRuns === 3, "Failure persistence must preserve last committed run count.");

    removeFailure();
    const recovered = await cycle3Loop.runOnce();
    assert(recovered.state.totalRuns === 4, "Recovery cycle did not advance from the last committed state.");
    assert(recovered.analyticsEvents.length > 0, "Recovery cycle expected analytics feedback.");
    persistence.save(recovered.state);
    const recoveredPersisted = persistence.load();
    assert(recoveredPersisted?.totalRuns === 4, "Recovered persisted run count mismatch.");

    cycle1Loop.stop();
    cycle2Loop.stop();
    cycle3Loop.stop();

    console.log("SystemLoop smoke passed", {
      cycle1Runs: cycle1.state.totalRuns,
      cycle2Runs: cycle2.state.totalRuns,
      cycle3Runs: cycle3.state.totalRuns,
      failedCycleCommittedRuns: failedPersisted.totalRuns,
      recoveredRuns: recovered.state.totalRuns,
      cycle3AnalyticsEvents: cycle3.analyticsEvents.length,
      recoveredAnalyticsEvents: recovered.analyticsEvents.length,
      failureObserved,
      persistenceOutsideRepository: !isInsideRepository(defaultPersistence.getPath()),
    });
  } finally {
    rmSync(tempDirectory, { recursive: true, force: true });
  }
}

void main().catch((error) => { console.error("SystemLoop smoke failed", error); process.exitCode = 1; });
