import { Pong } from "./pong";
import { createScopedLog, LogSeverity } from "./logging";

// This renders the game

const log = createScopedLog("Renderer");

export class Renderer {
  pong: Pong | null = null;
  ctx: CanvasRenderingContext2D | null = null;

  private stopped = false;

  async startRendering(pong: Pong, canvasPromise: Promise<HTMLCanvasElement>) {
    this.pong = pong;
    this.ctx = (await canvasPromise).getContext("2d");

    if (!this.ctx)
      throw new Error("Renderer could not get 2D context from canvas.");

    requestAnimationFrame(this.renderFrame.bind(this));
  }

  stopRendering() {
    this.stopped = true;
  }

  tmpTest = 0;

  private renderFrame() {
    if (!this.pong || !this.ctx)
      throw new Error("Renderer is not initialized.");

    const startTime = performance.now();

    this.tmpTest = (this.tmpTest + 1) % this.ctx.canvas.width;

    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    this.ctx.beginPath();
    this.ctx.moveTo(this.tmpTest, 0);
    this.ctx.lineTo(this.ctx.canvas.width, this.ctx.canvas.height);
    this.ctx.stroke();

    const endTime = performance.now();
    log(`Frame rendered in ${endTime - startTime} ms.`, LogSeverity.VERBOSE);

    requestAnimationFrame(this.renderFrame.bind(this));
  }
}
