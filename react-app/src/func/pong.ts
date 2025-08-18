import React from "react";

import * as QM from "./math";
import { Peer } from "./peer";
import { createScopedLog, LogSeverity } from "./logging";

export interface Scene {
  init: () => Promise<void>;
  update: () => void;
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
  speed = new QM.Vec2(0.01, 0.01);
}

/** Is kind of a "Scene", probably should be called that in the future. */
export class PongScene implements Scene {
  readonly DISTANCE_BETWEEN_PLAYERS = 0.8;
  readonly BALL_SIZE = 0.05;
  readonly PADDLE_SIZE = new QM.Vec2(0.05, 0.5);

  peer: Peer | null;

  leftPlayer = new Player();
  rightPlayer = new Player();
  ball = new Ball();

  lastUpdateTime = performance.now();

  constructor(peer: Peer | null) {
    this.peer = peer;
  }

  async init() {
    log("Initialized.", LogSeverity.INFO);
  }

  update() {
    const newBallPosition = QM.Vec2.plus(this.ball.position, this.ball.speed);

    const leftPaddle = 0.5 - this.DISTANCE_BETWEEN_PLAYERS / 2;
    const rightPaddle = 0.5 + this.DISTANCE_BETWEEN_PLAYERS / 2;

    if (newBallPosition.x < leftPaddle)
    {
      
      //if (newBallPosition.y)
    }
    else if (newBallPosition.x > rightPaddle)
    {

    }

    this.ball.position = QM.Vec2.plus(this.ball.position, this.ball.speed);
  }
}

export const PongContext = React.createContext<PongScene>(new PongScene(null));
