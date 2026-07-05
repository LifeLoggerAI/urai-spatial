/**
 * URAI Runtime Bootstrap
 * Step 4 + 6 + 8: full runtime integration (kernel + input + spatial)
 */

import { URAIKernel } from "./kernel";
import { EventStore } from "./eventStore";
import { startSpatialRuntime } from "./spatialLoop";
import { bindInputToKernel } from "./input";

async function main() {
  // =========================
  // 1. Initialize persistence layer
  // =========================
  const eventStore = new EventStore();

  // =========================
  // 2. Create kernel with persistence
  // =========================
  const kernel = new URAIKernel(eventStore);

  // =========================
  // 3. Rebuild system state from history
  // =========================
  await kernel.init();

  console.log("URAI Kernel initialized");
  console.log("Current state:", kernel.getState());

  // =========================
  // 4. Bind INPUT LAYER (USER → EVENT)
  // =========================
  bindInputToKernel(kernel);

  // =========================
  // 5. First synthetic system event (sanity test)
  // =========================
  kernel.emit({
    id: "boot-event-1",
    type: "WORLD_UPDATE",
    timestamp: Date.now(),
    userId: "system",
    worldId: "default-world",
    payload: {
      status: "booted",
      version: "v50-kernel-alpha",
    },
  });

  // =========================
  // 6. Verify state transition
  // =========================
  console.log("State after boot event:", kernel.getState());

  // =========================
  // 7. START SPATIAL RUNTIME LOOP (FIRST LIVE SYSTEM LOOP)
  // =========================
  await startSpatialRuntime(kernel);
}

main().catch((err) => {
  console.error("URAI bootstrap failed:", err);
});