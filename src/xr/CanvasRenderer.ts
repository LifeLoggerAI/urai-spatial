// URAI Spatial - Canvas Renderer
// Lightweight visualization layer for simulation frames

export class CanvasRenderer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  constructor(container: HTMLElement) {
    this.canvas = document.createElement("canvas");
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;

    const ctx = this.canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported");

    this.ctx = ctx;
    container.appendChild(this.canvas);

    window.addEventListener("resize", () => this.resize());
  }

  applyFrame(frame: any) {
    const ctx = this.ctx;

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const nodes = frame?.nodes || [];

    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];

      const x = (n.x || 0) * 50 + this.canvas.width / 2;
      const y = (n.y || 0) * 50 + this.canvas.height / 2;

      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fillStyle = "#00ffcc";
      ctx.fill();
    }
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }
}
