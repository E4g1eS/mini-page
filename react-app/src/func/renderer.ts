import { Pong } from "./pong";
import { createScopedLog, LogSeverity } from "./logging";
import * as QM from "./math";

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

  private renderFrame() {
    if (!this.pong || !this.ctx)
      throw new Error("Renderer is not initialized.");

    const startTime = performance.now();

    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    this.renderPong();

    const endTime = performance.now();
    log(`Frame rendered in ${endTime - startTime} ms.`, LogSeverity.VERBOSE);

    requestAnimationFrame(this.renderFrame.bind(this));
  }

  /**
   * Converts relative size (0-1 in respect to canvas size) into absolute pixel size.
   * Assumes square canvas.
   */
  private convertToAbsolute(relativeSize: number) {
    const canvasSize = this.ctx!.canvas.width;
    return relativeSize * canvasSize;
  }

  private renderPong() {
    const pong = this.pong!;
    const ctx = this.ctx!;

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(ctx.canvas.width, ctx.canvas.height);
    ctx.stroke();

    // Draw players
    const HALF_PADDLE_SIZE = new QM.Vec2(
      pong.PADDLE_SIZE.x / 2,
      pong.PADDLE_SIZE.y / 2
    );

    // Draw left player
    const leftCenter = new QM.Vec2(
      0.5 - pong.DISTANCE_BETWEEN_PLAYERS / 2 - pong.PADDLE_SIZE.x / 2,
      pong.leftPlayer.yPosition
    );

    ctx.fillRect(
      this.convertToAbsolute(leftCenter.x - HALF_PADDLE_SIZE.x),
      this.convertToAbsolute(leftCenter.y - HALF_PADDLE_SIZE.y),
      this.convertToAbsolute(pong.PADDLE_SIZE.x),
      this.convertToAbsolute(pong.PADDLE_SIZE.y)
    );

    // Draw right player
    const rightCenter = new QM.Vec2(
      0.5 + pong.DISTANCE_BETWEEN_PLAYERS / 2 + pong.PADDLE_SIZE.x / 2,
      pong.rightPlayer.yPosition
    );

    ctx.fillRect(
      this.convertToAbsolute(rightCenter.x - HALF_PADDLE_SIZE.x),
      this.convertToAbsolute(rightCenter.y - HALF_PADDLE_SIZE.y),
      this.convertToAbsolute(pong.PADDLE_SIZE.x),
      this.convertToAbsolute(pong.PADDLE_SIZE.y)
    );

    // Draw ball
    ctx.fillRect(
      this.convertToAbsolute(pong.ball.position.x - pong.BALL_SIZE / 2),
      this.convertToAbsolute(pong.ball.position.y - pong.BALL_SIZE / 2),
      this.convertToAbsolute(pong.BALL_SIZE),
      this.convertToAbsolute(pong.BALL_SIZE)
    );
  }
}
