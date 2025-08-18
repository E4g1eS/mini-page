import React from "react";

import "./Game.css";

import { GameCanvas } from "./GameCanvas";
import { ConnectionContext } from "../func/connectionContext";
import { PeerType } from "../func/peer";
import { Connection } from "./Connection";
import { Pong, PongContext } from "../func/pong";

export function Game() {
  const [peer, setPeer] = React.useState<PeerType>(null);
  const pong = new Pong(peer);

  return (
    <ConnectionContext value={{ peer, setPeer }}>
      <PongContext value={pong}>
        <Connection />
        <GameCanvas />
      </PongContext>
    </ConnectionContext>
  );
}
