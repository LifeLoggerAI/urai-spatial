/**
 * URAI v60 Distributed Layer
 * Kernel Sync Adapter
 *
 * Connects URAIKernel instances to SharedEventLog
 * ensuring deterministic multi-node state convergence.
 */

import { SharedEventLog } from "./sharedEventLog";
import { URAIKernel, URAIEvent } from "../kernel";

export class KernelSync {
  private log: SharedEventLog;
  private kernel: URAIKernel;

  private isSyncing = false;

  constructor(kernel: URAIKernel, log: SharedEventLog) {
    this.kernel = kernel;
    this.log = log;
  }

  /**
   * Attach kernel to global event stream
   * All external events flow through SharedEventLog
   */
  connect() {
    // consume global events
    this.log.subscribe((event: URAIEvent) => {
      this.isSyncing = true;
      this.kernel.emit(event);
      this.isSyncing = false;
    });
  }

  /**
   * Publish local kernel events to shared log
   * This replaces direct multi-node communication
   */
  publish(event: URAIEvent) {
    if (this.isSyncing) return;

    this.log.append(event);
  }

  /**
   * Boot sync by replaying global history into kernel
   */
  bootstrap() {
    this.log.replay((event) => {
      this.kernel.emit(event);
    });
  }
}