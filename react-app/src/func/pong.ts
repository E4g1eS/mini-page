import React from "react";

import * as Math from "./math";
import { Peer } from "./peer";
import { createScopedLog, LogSeverity } from "./logging";

// Currently just PONG for live update cycle

const log = createScopedLog("Pong");

class Player {
  /** How high the player is, zero is middle */
  yPosition = 0;
}

class Ball {
  position = Math.Vec2.zero();
  /** Per second */
  speed = 5;
}

export class Pong {
  private readonly DISTANCE_BETWEEN_PLAYERS = 100;
  private readonly BALL_SIZE = 5;
  private readonly PADDLE_SIZE = new Math.Vec2(2, 10);

  peer: Peer | null;

  leftPlayer = new Player();
  rightPlayer = new Player();
  ball = new Ball();

  constructor(peer: Peer | null) {
    this.peer = peer;

    log("Constructing pong...", LogSeverity.INFO);

    if (peer) this.init();
  }

  init() {}
}

export const PongContext = React.createContext<Pong>(new Pong(null));
