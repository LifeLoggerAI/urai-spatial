/**
 * URAI Runtime Bootstrap
 * Step 4: first real system execution loop
 *
 * This wires:
 * - Kernel
 * - EventStore
 * - Initialization (replay)
 * - First event emission
 *
 * This is the first point where URAI becomes a running system.
 */

import { URAIKernel } from "./kernel";
import { EventStore } from "./eventStore";

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
  // 4. First synthetic system event (sanity test)
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
  // 5. Verify state transition
  // =========================
  console.log("State after boot event:", kernel.getState());

  // =========================
  // 6. Hook point for urai-spatial integration
  // (next step: bind rendering loop to kernel state)
  // =========================

  // Example placeholder:
  // setInterval(() => {
  //   const state = kernel.getState();
  //   // spatial.render(state)
  // }, 16);
}

main().catch((err) => {
  console.error("URAI bootstrap failed:", err);
});
