import { DualKernelTest } from "./runtimeTest";
import { URAIEvent } from "../kernel";

export async function runDistributedDemo() {
  const system = new DualKernelTest();

  await system.init();

  const events: URAIEvent[] = [
    { id: "e1", type: "USER_JOIN", timestamp: 0, userId: "u1", worldId: "w1" },
    { id: "e2", type: "MOVE", timestamp: 0, userId: "u1", worldId: "w1" },
    { id: "e3", type: "USER_ACTION", timestamp: 0, userId: "u2", worldId: "w1" },
    { id: "e4", type: "INTERACT", timestamp: 0, userId: "u1", worldId: "w1" },
    { id: "e5", type: "STATE_UPDATE", timestamp: 0, userId: "u2", worldId: "w1" },
  ];

  for (const event of events) {
    system.step(event);
  }

  const ok = system.validate();

  console.log(
    ok
      ? "🚀 v60 DISTRIBUTED DEMO: SUCCESS"
      : "❌ v60 DISTRIBUTED DEMO: FAILURE",
  );

  return ok;
}
