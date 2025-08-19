import React from "react";

import "./Game.css";

import { GameCanvas } from "./GameCanvas";
import { ConnectionContext } from "../func/connectionContext";
import { PeerType } from "../func/peer";
import { Connection } from "./Connection";
import { createScopedLog, LogSeverity } from "../func/logging";
import { Game, GameContext } from "../func/game";
import { PongScene } from "../func/scene";
import { PongRenderer } from "../func/renderer";
import { UserInput } from "../func/input";

const log = createScopedLog("GameContainer");

const USER_INPUT_CLASS = "GameContainer";

/** A container for the game, including connection buttons (host/client) and canvas. */
export function GameContainer() {
  const [peer, setPeer] = React.useState<PeerType>(null);

  const gameRef: React.RefObject<Game | null> = React.useRef(null);

  React.useEffect(() => {
    if (peer) {
      gameRef.current = new Game(
        new PongScene(peer),
        new PongRenderer(),
        new UserInput(USER_INPUT_CLASS)
      );
      gameRef.current.startGameLoop().catch((error) => {
        log(`Game loop thrown: ${error}`, LogSeverity.WARNING);
      });
    }
    return () => {
      if (gameRef.current) gameRef.current.stopGameLoop();
    };
  });

  return (
    <div className="GameContainer" tabIndex={0}>
      <ConnectionContext value={{ peer, setPeer }}>
        <GameContext value={gameRef.current}>
          <Connection />
          <GameCanvas />
        </GameContext>
        <input
          type="button"
          value="Stop game"
          onClick={(event) => {
            if (gameRef.current) gameRef.current.stopGameLoop();
          }}
        />
      </ConnectionContext>
    </div>
  );
}
