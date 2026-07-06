// URAI Spatial - Dashboard
// Minimal runtime observability (no external dependencies)

export class Dashboard {
  constructor(loop) {
    this.loop = loop;
  }

  start(ms = 2000) {
    if (this.timer) return;

    this.timer = setInterval(() => {
      const state = this.loop?.getState ? this.loop.getState() : {};

      const data = {
        tick: state?.totalRuns ?? 0,
        memory: this.loop?.memory?.snapshot ? this.loop.memory.snapshot().length : 0,
        prediction: this.loop?.prediction ? true : false,
        xr: this.loop?.xr ? true : false,
        bias: this.loop?.simulationState?.predictedBias ?? null
      };

      console.log("DASHBOARD", data);
    }, ms);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
  }
}
