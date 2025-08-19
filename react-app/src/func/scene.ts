import React from "react";

import * as QM from "./math";
import { Peer } from "./peer";
import { createScopedLog, LogSeverity } from "./logging";

export interface Scene {
  init: () => Promise<void>;
  update: () => void;
}

export class EmptyScene implements Scene {
  async init() {}
  update() {}
}

// Currently just PONG for live update cycle

const log = createScopedLog("Pong");

class Player {
  /** How high the player is, zero is middle */
  yPosition = 0.5;
}

class Ball {
  position = new QM.Vec2(0.5, 0.5);
  /** Per second */
  speed = new QM.Vec2(0.01, 0.005);
}

/** Is kind of a "Scene", probably should be called that in the future. */
export class PongScene implements Scene {
  readonly DISTANCE_BETWEEN_PLAYERS = 0.8;
  readonly BALL_SIZE = 0.05;
  readonly PADDLE_SIZE = new QM.Vec2(0.05, 1);

  peer: Peer;

  leftPlayer = new Player();
  rightPlayer = new Player();
  ball = new Ball();

  lastUpdateTime = performance.now();

  constructor(peer: Peer) {
    this.peer = peer;
  }

  async init() {
    log("Initialized.", LogSeverity.INFO);
  }

  update() {
    const potentialPosition = QM.Vec2.plus(this.ball.position, this.ball.speed);

    const leftPaddle = 0.5 - this.DISTANCE_BETWEEN_PLAYERS / 2;
    const rightPaddle = 0.5 + this.DISTANCE_BETWEEN_PLAYERS / 2;

    const leftPaddleLow = this.leftPlayer.yPosition - this.PADDLE_SIZE.y / 2;
    const leftPaddleHigh = this.leftPlayer.yPosition + this.PADDLE_SIZE.y / 2;
    const rightPaddleLow = this.rightPlayer.yPosition - this.PADDLE_SIZE.y / 2;
    const rightPaddleHigh = this.rightPlayer.yPosition + this.PADDLE_SIZE.y / 2;

    if (potentialPosition.x < leftPaddle) {
      if (
        potentialPosition.y > leftPaddleLow &&
        potentialPosition.y < leftPaddleHigh
      ) {
        log(`Left player ponged`, LogSeverity.VERBOSE);
        this.ball.speed = new QM.Vec2(-this.ball.speed.x, this.ball.speed.y);
      }
    } else if (potentialPosition.x > rightPaddle) {
      if (
        potentialPosition.y > rightPaddleLow &&
        potentialPosition.y < rightPaddleHigh
      ) {
        log("Right player ponged", LogSeverity.VERBOSE);
        this.ball.speed = new QM.Vec2(-this.ball.speed.x, this.ball.speed.y);
      }
    }

    if (potentialPosition.y < 0 || potentialPosition.y > 1)
      this.ball.speed = new QM.Vec2(this.ball.speed.x, -this.ball.speed.y);

    this.ball.position = QM.Vec2.plus(this.ball.position, this.ball.speed);
  }
}
