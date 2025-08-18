import React from "react";
import "./Connection.css";

import { generateRandomString } from "../func/utils";
import { log, LogSeverity } from "../func/logging";
import { Host, Client } from "../func/peer";

import { ConnectionContext } from "../func/connectionContext";

function getServerName(): string {
  const serverNameInput = document.getElementById("serverNameInput");
  if (!serverNameInput || !(serverNameInput instanceof HTMLInputElement)) {
    log("Server name input not found.", LogSeverity.ERROR);
    return "";
  }

  if (!serverNameInput.value.trim())
    serverNameInput.value = generateRandomString(8);

  return serverNameInput.value.trim();
}

export function Connection() {
  const { peer, setPeer } = React.useContext(ConnectionContext);

  return (
    <div className="Connection">
      <input
        id="serverNameInput"
        type="text"
        placeholder="Server Name"
        disabled={peer !== null}
      ></input>
      <button
        onClick={() => setPeer(new Host(getServerName()))}
        id="btnCreateServer"
        disabled={peer !== null}
      >
        Create Server
      </button>
      <button
        onClick={() => setPeer(new Client(getServerName()))}
        id="btnJoinServer"
        disabled={peer !== null}
      >
        Join Server
      </button>
    </div>
  );
}
