import React from "react";
import "./Connection.css";

export const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    {
      urls: "stun:relay.metered.ca:80",
    },
    {
      urls: "stun:stun.l.google.com:19302",
    },
    // {
    //     urls: "turn:relay.metered.ca:80",
    //     username: "bded59281eff9f4dbbcce696",
    //     credential: "yEOvO7UQK43EhF0B",
    // },
    // {
    //     urls: "turn:relay.metered.ca:443",
    //     username: "bded59281eff9f4dbbcce696",
    //     credential: "yEOvO7UQK43EhF0B",
    // },
    // {
    //     urls: "turn:relay.metered.ca:443?transport=tcp",
    //     username: "bded59281eff9f4dbbcce696",
    //     credential: "yEOvO7UQK43EhF0B",
    // },
  ],
};

enum LogSeverity {
  DEBUG = "DEBUG",
  INFO = "INFO",
  WARNING = "WARNING",
  ERROR = "ERROR",
}

function debugLog(text: string, severity: LogSeverity = LogSeverity.DEBUG) {
  const logText = `[${new Date().toISOString()}] [${severity}] ${text}`;
  console.log(logText);
}

// Info sent from one peer to another during the connection process
// This is used to store the description and ICE candidates which is "local" for the sending peer and "remote" for the receiving peer
class RemoteInfo {
  description: RTCSessionDescriptionInit;
  iceCandidates: RTCIceCandidate[];

  constructor(
    description: RTCSessionDescriptionInit,
    iceCandidates: RTCIceCandidate[]
  ) {
    this.description = description;
    this.iceCandidates = iceCandidates;
  }

  static parse(): RemoteInfo | null {
    const textInput = document.getElementById("textInput") as HTMLInputElement;
    if (!textInput) {
      debugLog("Text input element not found.", LogSeverity.ERROR);
      return null;
    }

    let remoteInfo: RemoteInfo | null = null;

    try {
      remoteInfo = JSON.parse(textInput.value) as RemoteInfo;
    } catch (error) {
      debugLog(`Error parsing remote info: ${error}`, LogSeverity.ERROR);
      return null;
    }

    return remoteInfo;
  }
}

class Peer {
  connection: RTCPeerConnection | null = null;
  dataChannel: RTCDataChannel | null = null;
  iceCandidates: RTCIceCandidate[] = [];

  constructor() {
    this.connection = new RTCPeerConnection(RTC_CONFIG);
    this.connection.addEventListener("connectionstatechange", () => {
      debugLog(
        `Connection state changed: ${this.connection?.connectionState}`,
        LogSeverity.INFO
      );
    });
    this.connection.addEventListener("icecandidate", (event) => {
      if (event.candidate) {
        debugLog(
          `New ICE candidate: ${JSON.stringify(event.candidate)}`,
          LogSeverity.INFO
        );
        this.iceCandidates.push(event.candidate);
      } else {
        debugLog("All ICE candidates have been discovered.", LogSeverity.INFO);
        this.printRemoteInfo();
      }
    });
  }

  printRemoteInfo() {
    if (!this.connection) {
      debugLog("Connection is not initialized.", LogSeverity.ERROR);
      return;
    }

    if (!this.connection.localDescription) {
      debugLog("Local description is not set.", LogSeverity.ERROR);
      return;
    }

    const remoteInfo = new RemoteInfo(
      this.connection.localDescription,
      this.iceCandidates
    );
    debugLog(`Remote info: ${JSON.stringify(remoteInfo)}`, LogSeverity.INFO);
  }

  recieveRemoteInfo(remoteInfo: RemoteInfo) {
    if (!this.connection) {
      debugLog("Connection is not initialized.", LogSeverity.ERROR);
      return;
    }

    if (remoteInfo.description) {
      this.connection.setRemoteDescription(remoteInfo.description).then(
        () => {
          debugLog("Remote description set successfully.", LogSeverity.INFO);
        },
        (error) => {
          debugLog(
            `Error setting remote description: ${error}`,
            LogSeverity.ERROR
          );
        }
      );
    }

    remoteInfo.iceCandidates.forEach((candidate) => {
      this.connection!.addIceCandidate(candidate).catch((error) => {
        debugLog(`Error adding ICE candidate: ${error}`, LogSeverity.ERROR);
      });
    });
  }
}

class Host extends Peer {
  constructor() {
    super();

    if (!this.connection) {
      throw new Error("Connection is not initialized.");
    }

    this.dataChannel = this.connection.createDataChannel("orderedData", {
      ordered: true,
    });
    this.dataChannel.addEventListener("open", () => {
      debugLog(
        "Data channel is open. Ready to send messages.",
        LogSeverity.INFO
      );
      this.dataChannel!.send("Hello from the host!");
    });

    this.connection.createOffer().then(
      (offer) => {
        this.connection!.setLocalDescription(offer).then(
          () => {
            debugLog("Local description set successfully.", LogSeverity.INFO);
          },
          (error) => {
            debugLog(
              `Error setting local description: ${error}`,
              LogSeverity.ERROR
            );
          }
        );

        const offerString = JSON.stringify(offer);
        debugLog(`Created offer: ${offerString}`, LogSeverity.INFO);
      },
      (error) => {
        debugLog(`Error creating offer: ${error}`, LogSeverity.ERROR);
      }
    );
  }
}

class Client extends Peer {
  constructor(remoteInfo: RemoteInfo) {
    super();

    if (!this.connection) {
      throw new Error("Connection is not initialized.");
    }

    this.connection.setRemoteDescription(remoteInfo.description).then(
      () => {
        debugLog("Remote description set successfully.", LogSeverity.INFO);
      },
      (error) => {
        debugLog(
          `Error setting remote description: ${error}`,
          LogSeverity.ERROR
        );
      }
    );

    remoteInfo.iceCandidates.forEach((candidate) => {
      this.connection!.addIceCandidate(candidate).catch((error) => {
        debugLog(`Error adding ICE candidate: ${error}`, LogSeverity.ERROR);
      });
    });

    this.connection.createAnswer().then(
      (answer) => {
        this.connection!.setLocalDescription(answer).catch((error) => {
          debugLog(
            `Error setting local description: ${error}`,
            LogSeverity.ERROR
          );
        });

        const answerString = JSON.stringify(answer);
        debugLog(`Created answer: ${answerString}`, LogSeverity.INFO);
      },
      (error) => {
        debugLog(`Error creating answer: ${error}`, LogSeverity.ERROR);
      }
    );

    this.connection.addEventListener("datachannel", (event) => {
      debugLog(
        `Data channel received from host: ${event.channel.label}`,
        LogSeverity.INFO
      );
      this.dataChannel = event.channel;
      this.dataChannel.addEventListener("message", (event) => {
        debugLog(`Received message: ${event.data}`, LogSeverity.INFO);
      });
    });
  }
}

let peer: Host | Client | null = null;

function createHost() {
  if (peer) {
    debugLog("Peer already exists.", LogSeverity.WARNING);
    return;
  }

  peer = new Host();
}

function addRemoteInfo() {
  const remoteInfo = RemoteInfo.parse();
  if (!remoteInfo) {
    debugLog("Remote info is null or invalid.", LogSeverity.ERROR);
    return;
  }

  if (!peer) {
    // It is assumed that this is the client side and host already sent the remote description
    peer = new Client(remoteInfo);
  } else if (peer instanceof Host) {
    // If the peer is a host, we assume it is waiting for a client to connect
    peer.recieveRemoteInfo(remoteInfo);
  }
}

function Connection() {
  return (
    <div className="Connection">
      <button onClick={() => createHost()}>Create Host</button>
      <input
        id="textInput"
        type="text"
        placeholder="Enter Remote Description 2"
      ></input>
      <button onClick={() => addRemoteInfo()}>Add Remote Info</button>
    </div>
  );
}

export default Connection;
