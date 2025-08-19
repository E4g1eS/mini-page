import React from "react";

import { Scene } from "./scene";
import { Renderer } from "./renderer";
import { createScopedLog, LogSeverity } from "./logging";
import { getGameCanvas } from "../components/GameCanvas";
import { UserInput } from "./input";

const log = createScopedLog("Game");

/** Singleton */
export class Game {
  scene: Scene;
  renderer: Renderer;
  input: UserInput;

  stopped = false;

  constructor(scene: Scene, renderer: Renderer, input: UserInput) {
    this.scene = scene;
    this.renderer = renderer;
    this.input = input;
  }

  async startGameLoop() {
    log(`Started game loop.`, LogSeverity.INFO);
    await this.scene.init();
    const canvas = await getGameCanvas();
    this.renderer.init(this.scene, canvas);
    await this.input.init();
    this.doFrame();
  }

  stopGameLoop() {
    this.stopped = true;
    log(`Stopped game loop.`, LogSeverity.INFO);
  }

  private doFrame() {
    this.scene.update();
    this.renderer.renderFrame();

    if (!this.stopped) requestAnimationFrame(this.doFrame.bind(this));
  }
}

export const GameContext = React.createContext<Game | null>(null);
