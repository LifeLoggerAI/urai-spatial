/**
 * URAI v60 Kernel Sync
 * Connects a URAIKernel to a shared event log.
 */

import { URAIEvent, URAIKernel } from "../kernel";
import { SharedEventLog } from "./sharedEventLog";

export class KernelSync {
  constructor(
    private kernel: URAIKernel,
    private sharedLog: SharedEventLog
  ) {}

  connect() {
    this.sharedLog.subscribe((event: URAIEvent) => {
      this.kernel.emit(event);
    });
  }

  publish(event: URAIEvent) {
    this.sharedLog.append(event);
  }
}
