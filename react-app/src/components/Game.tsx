import React from "react";

import "./Game.css";

import { GameCanvas, getGameCanvas } from "./GameCanvas";
import { ConnectionContext } from "../func/connectionContext";
import { PeerType } from "../func/peer";
import { Connection } from "./Connection";
import { Scene, PongScene, PongContext } from "../func/pong";
import { Renderer, PongRenderer } from "../func/renderer";
import { createScopedLog, LogSeverity } from "../func/logging";

const log = createScopedLog("Game");

function doFrame(scene: Scene, renderer: Renderer) {
  scene.update();
  renderer.renderFrame();

  requestAnimationFrame(() => {
    doFrame(scene, renderer);
  });
}

async function gameLoop(scene: Scene, renderer: Renderer) {
  await scene.init();
  const canvas = await getGameCanvas();
  renderer.init(scene, canvas);

  requestAnimationFrame(() => {
    doFrame(scene, renderer);
  });
}

/** A container for the game, including connection buttons (host/client) and canvas. */
export function Game() {
  const [peer, setPeer] = React.useState<PeerType>(null);
  const scene = new PongScene(peer);
  const renderer = new PongRenderer();

  gameLoop(scene, renderer).catch((error) => {
    log(`Game loop thrown: ${error}`, LogSeverity.WARNING);
  });

  return (
    <ConnectionContext value={{ peer, setPeer }}>
      <PongContext value={scene}>
        <Connection />
        <GameCanvas />
      </PongContext>
    </ConnectionContext>
  );
}
