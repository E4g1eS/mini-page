import React from "react";

import "./GameCanvas.css";

import { createScopedLog, LogSeverity } from "../func/logging";
import { PongContext } from "../func/pong";
import { PongRenderer } from "../func/renderer";
import { getTypedElementById, sleep } from "../func/utils";

const log = createScopedLog("GameCanvas");

export async function getGameCanvas(): Promise<HTMLCanvasElement> {
  const WAIT_FOR_CANVAS_DELAY = 1000;

  while (true) {
    const canvas = getTypedElementById("gameCanvas", HTMLCanvasElement);
    if (canvas) {
      log(`Successfully found game canvas.`, LogSeverity.INFO);
      return canvas;
    }

    await sleep(WAIT_FOR_CANVAS_DELAY);
  }
}

export function GameCanvas() {
  return (
    <div className="GameCanvas">
      <canvas id="gameCanvas" className="gameCanvas" width="800" height="800"></canvas>
    </div>
  );
}
