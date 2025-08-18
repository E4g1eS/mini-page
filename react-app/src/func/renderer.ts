import { Pong } from "./pong";
import { createScopedLog, LogSeverity } from "./logging";

// This renders the game

const log = createScopedLog("Renderer");

export class Renderer {
  pong: Pong | null = null;
  ctx: CanvasRenderingContext2D | null = null;

  async startRendering(pong: Pong, canvasPromise: Promise<HTMLCanvasElement>) {
    this.pong = pong;
    this.ctx = (await canvasPromise).getContext("2d");

    while (true) {
      const startFrame = performance.now();
      await this.render();
      const endFrame = performance.now();
      log(`Frame rendered in ${endFrame - startFrame} ms.`, LogSeverity.VERBOSE);
    }
  }

  private async render() {
    if (!this.pong || !this.ctx)
      throw new Error("Renderer is not initialized.");

    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height)
    this.ctx.moveTo(0, 0);
    this.ctx.lineTo(this.ctx.canvas.width, this.ctx.canvas.height);
    this.ctx.stroke();
  }
}
