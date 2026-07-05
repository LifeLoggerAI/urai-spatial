/**
 * URAI v60 Distributed System Entry
 *
 * This file wires all distributed primitives into a single coherent runtime.
 */

import { SharedEventLog } from "./sharedEventLog";
import { KernelSync } from "./kernelSync";
import { EventOrdering } from "./eventOrdering";
import { StateConvergence } from "./stateConvergence";
import { ConflictResolution } from "./conflictResolution";
import { DualKernelTest } from "./runtimeTest";

/**
 * v60 Distributed Runtime Bootstrap
 */
export function createDistributedRuntime() {
  const log = new SharedEventLog();

  const kernelA = new (require("../kernel").URAIKernel)();
  const kernelB = new (require("../kernel").URAIKernel)();

  const syncA = new KernelSync(kernelA, log);
  const syncB = new KernelSync(kernelB, log);

  const ordering = new EventOrdering();

  syncA.connect();
  syncB.connect();

  syncA.bootstrap();
  syncB.bootstrap();

  return {
    log,
    kernelA,
    kernelB,
    syncA,
    syncB,
    ordering,

    /**
     * Inject event into distributed world
     */
    emit(event: any) {
      const stamped = ordering.stamp(event);
      log.append(stamped);
    },

    /**
     * Validate deterministic convergence
     */
    validate() {
      const stateA = kernelA.getState();
      const stateB = kernelB.getState();

      return StateConvergence.compare(stateA, stateB);
    },

    /**
     * Run full system test
     */
    test() {
      const test = new DualKernelTest();
      test.init();

      const ok = test.validate();

      return {
        ok,
        report: ok
          ? "v60 DISTRIBUTED SYSTEM OK"
          : "v60 DIVERGENCE DETECTED",
      };
    },
  };
}

/**
 * DESIGN NOTE:
 * This is the first unified v60 runtime bootstrap layer.
 * It connects all distributed primitives into a single executable system.
 */