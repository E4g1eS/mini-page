import React from "react";

import * as QM from "./math";
import { Peer } from "./peer";
import { createScopedLog, LogSeverity } from "./logging";

export interface Scene {
  init: () => Promise<void>
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
  speed = 0.01;
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

  constructor(peer: Peer | null) {
    this.peer = peer;

    log("Constructing pong...", LogSeverity.INFO);

    if (peer) this.init();
  }

  async init() {}

  update() {}
}

export const PongContext = React.createContext<PongScene>(new PongScene(null));
