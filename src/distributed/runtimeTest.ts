import { SharedEventLog } from "./sharedEventLog";
import { KernelSync } from "./kernelSync";
import { EventOrdering } from "./eventOrdering";
import { StateConvergence } from "./stateConvergence";
import { URAIKernel, URAIEvent } from "../kernel";

export class DualKernelTest {
  private log = new SharedEventLog();
  private kernelA = new URAIKernel();
  private kernelB = new URAIKernel();
  private syncA = new KernelSync(this.kernelA, this.log);
  private syncB = new KernelSync(this.kernelB, this.log);
  private ordering = new EventOrdering();

  async init() {
    this.syncA.connect();
    this.syncB.connect();

    await this.kernelA.init();
    await this.kernelB.init();

    this.syncA.bootstrap();
    this.syncB.bootstrap();
  }

  emit(event: URAIEvent) {
    this.log.append(this.ordering.stamp(event));
  }

  validate(): boolean {
    return StateConvergence.compare(
      this.kernelA.getState(),
      this.kernelB.getState(),
    );
  }

  step(event: URAIEvent) {
    this.emit(event);
  }
}
