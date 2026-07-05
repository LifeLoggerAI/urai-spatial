/**
 * URAI v60 Distributed Layer
 * Runtime Determinism Test Harness
 *
 * This simulates TWO independent kernels consuming the SAME event stream
 * and verifies deterministic convergence of world state.
 */

import { SharedEventLog } from "./sharedEventLog";
import { KernelSync } from "./kernelSync";
import { EventOrdering } from "./eventOrdering";
import { StateConvergence } from "./stateConvergence";
import { URAIKernel, URAIEvent } from "../kernel";

// =========================
// Mock dual-node environment
// =========================

export class DualKernelTest {
  private log = new SharedEventLog();

  private kernelA = new URAIKernel();
  private kernelB = new URAIKernel();

  private syncA = new KernelSync(this.kernelA, this.log);
  private syncB = new KernelSync(this.kernelB, this.log);

  private ordering = new EventOrdering();

  /**
   * Initialize both kernels into shared deterministic mode
   */
  init() {
    this.syncA.connect();
    this.syncB.connect();

    this.syncA.bootstrap();
    this.syncB.bootstrap();
  }

  /**
   * Inject event into distributed system
   */
  emit(event: URAIEvent) {
    const stamped = this.ordering.stamp(event);
    this.log.append(stamped);
  }

  /**
   * Run deterministic validation across both kernels
   */
  validate(): boolean {
    const stateA = this.kernelA.getState();
    const stateB = this.kernelB.getState();

    const ok = StateConvergence.compare(stateA, stateB);

    if (!ok) {
      const report = StateConvergence.diagnose([stateA, stateB]);
      console.error("❌ DIVERGENCE DETECTED", report);
    } else {
      console.log("✅ DETERMINISTIC CONVERGENCE CONFIRMED");
    }

    return ok;
  }

  /**
   * Run a sample simulation step
   */
  step(event: URAIEvent) {
    this.emit(event);
  }
}

/**
 * DESIGN NOTE (v60 FINAL VALIDATION LAYER):
 *
 * This is the first full distributed determinism test:
 *
 * - Two independent kernels
 * - One shared event log
 * - Identical ordering rules
 * - Convergence verification
 *
 * SUCCESS CONDITION:
 * BOTH kernels produce identical state from identical event stream
 */