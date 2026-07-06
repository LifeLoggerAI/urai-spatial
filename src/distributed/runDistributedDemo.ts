/**
 * URAI v60 Distributed Demo
 * Executable CI entry point for deterministic multi-kernel convergence.
 */

import { URAIEvent } from "../kernel";
import { DualKernelTest } from "./runtimeTest";

export async function runDistributedDemo(): Promise<boolean> {
  const system = new DualKernelTest();
  await system.init();

  const events: URAIEvent[] = [
    {
      id: "e1",
      type: "USER_UPDATE",
      timestamp: 0,
      userId: "u1",
      worldId: "w1",
      payload: { name: "Adam", role: "founder" },
    },
    {
      id: "e2",
      type: "WORLD_UPDATE",
      timestamp: 0,
      userId: "system",
      worldId: "w1",
      payload: { phase: "v60", mode: "distributed" },
    },
    {
      id: "e3",
      type: "USER_INPUT",
      timestamp: 0,
      userId: "u1",
      worldId: "w1",
      payload: { action: "enter-spatial-world" },
    },
  ];

  for (const event of events) {
    system.step(event);
  }

  const ok = system.validate();
  console.log("v60 distributed convergence validated", JSON.stringify(system.states()));
  return ok;
}

runDistributedDemo()
  .then((ok) => {
    if (!ok) {
      throw new Error("v60 distributed convergence failed");
    }

    console.log("v60 DISTRIBUTED DEMO: SUCCESS");
  })
  .catch((error) => {
    console.error("v60 DISTRIBUTED DEMO: FAILURE", error);
    process.exit(1);
  });
