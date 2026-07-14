/**
 * URAI v60 Distributed Layer
 * Run Distributed Demo
 *
 * Entry point to validate full multi-kernel deterministic system.
 */

import { DualKernelTest } from "./runtimeTest";
import { URAIEvent } from "../kernel";

export function runDistributedDemo() {
  const system = new DualKernelTest();

  system.init();

  // Use current kernel-schema events with explicit payloads so this proof
  // exercises accepted state transitions rather than two empty kernels.
  const events: URAIEvent[] = [
    {
      id: "e1",
      type: "SYSTEM_BOOT",
      timestamp: 0,
      userId: "system",
      worldId: "w1",
      payload: { source: "v60-distributed-demo" },
    },
    {
      id: "e2",
      type: "USER_UPDATE",
      timestamp: 0,
      userId: "u1",
      worldId: "w1",
      payload: { presence: "active" },
    },
    {
      id: "e3",
      type: "WORLD_UPDATE",
      timestamp: 0,
      userId: "system",
      worldId: "w1",
      payload: { phase: "ready" },
    },
    {
      id: "e4",
      type: "USER_INPUT",
      timestamp: 0,
      userId: "u1",
      worldId: "w1",
      payload: { action: "move", direction: "forward" },
    },
    {
      id: "e5",
      type: "USER_INPUT",
      timestamp: 0,
      userId: "u2",
      worldId: "w1",
      payload: { action: "interact", target: "memory-star" },
    },
  ];

  for (const event of events) {
    system.step(event);
  }

  const ok = system.validate(events.length);

  if (ok) {
    console.log("🚀 v60 DISTRIBUTED DEMO: SUCCESS");
  } else {
    console.error("❌ v60 DISTRIBUTED DEMO: FAILURE");
  }

  return ok;
}

/**
 * DESIGN NOTE (v60 FINAL STEP):
 *
 * This file executes the full distributed simulation stack:
 * - shared event log
 * - kernel synchronization
 * - ordering system
 * - convergence validation
 * - dual-kernel execution
 *
 * If this passes, v60 distributed core is functionally complete.
 */
