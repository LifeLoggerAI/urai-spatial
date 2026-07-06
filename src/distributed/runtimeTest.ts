/**
 * URAI v60 Runtime Test
 * Executes the same ordered shared stream through two kernels and asserts convergence.
 */

import { EventStore } from "../eventStore";
import { URAIEvent, URAIKernel } from "../kernel";
import { EventOrdering } from "./eventOrdering";
import { KernelSync } from "./kernelSync";
import { SharedEventLog } from "./sharedEventLog";
import { StateConvergence } from "./stateConvergence";

export class DualKernelTest {
  private sharedLog = new SharedEventLog();
  private ordering = new EventOrdering();
  private convergence = new StateConvergence();
  private kernelA = new URAIKernel(new EventStore());
  private kernelB = new URAIKernel(new EventStore());
  private syncA = new KernelSync(this.kernelA, this.sharedLog);
  private syncB = new KernelSync(this.kernelB, this.sharedLog);

  async init() {
    await this.kernelA.init();
    await this.kernelB.init();
    this.syncA.connect();
    this.syncB.connect();
  }

  step(event: URAIEvent) {
    this.syncA.publish(this.ordering.stamp(event));
  }

  validate(): boolean {
    this.convergence.assert(this.kernelA.getState(), this.kernelB.getState());
    return true;
  }

  states() {
    return {
      kernelA: this.kernelA.getState(),
      kernelB: this.kernelB.getState(),
      eventLog: this.sharedLog.getHistory(),
    };
  }
}
