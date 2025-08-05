import React from "react";
import "./Connection.css";

const RTC_CONFIG: RTCConfiguration = {
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

const RTC_API_URL = process.env.REACT_APP_WEBRTC_URL;

function generateRandomString(length: number): string {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

enum LogSeverity {
  DEBUG = "DEBUG",
  INFO = "INFO",
  WARNING = "WARNING",
  ERROR = "ERROR",
}

function log(text: string, severity: LogSeverity = LogSeverity.DEBUG) {
  const logText = `[${new Date().toISOString()}] [${severity}] ${text}`;

  switch (severity) {
    case LogSeverity.DEBUG:
      console.debug(logText);
      break;
    case LogSeverity.INFO:
      console.info(logText);
      break;
    case LogSeverity.WARNING:
      console.warn(logText);
      break;
    case LogSeverity.ERROR:
      console.error(logText);
      break;
    default:
      console.log(logText);
      break;
  }
}

class Peer {
  connection: RTCPeerConnection;
  orderedData: RTCDataChannel | null = null;
  unorderedData: RTCDataChannel | null = null;

  localName: string;
  remoteName: string;

  constructor(localName: string, remoteName: string) {
    this.localName = localName;
    this.remoteName = remoteName;

    this.connection = new RTCPeerConnection(RTC_CONFIG);
    this.connection.addEventListener("connectionstatechange", () => {
      log(
        `Connection state changed: ${this.connection?.connectionState}`,
        LogSeverity.INFO
      );
    });
    this.connection.addEventListener(
      "icecandidate",
      this.iceCandidateDiscovered.bind(this)
    );
  }

  iceCandidateDiscovered(iceEvent: RTCPeerConnectionIceEvent) {
    if (iceEvent.candidate) {
      log(
        `New ICE candidate: ${JSON.stringify(iceEvent.candidate)}`,
        LogSeverity.INFO
      );
      fetch(`${RTC_API_URL}/webrtc`, {
        method: "POST",
        body: JSON.stringify({
          peerName: this.localName,
          iceCandidate: iceEvent.candidate,
        }),
      }).catch((error) => {
        log(`Error sending ICE candidate: ${error}`, LogSeverity.ERROR);
      });
    } else {
      log("All ICE candidates have been discovered.", LogSeverity.INFO);
      fetch(`${RTC_API_URL}/webrtc`, {
        method: "POST",
        body: JSON.stringify({
          peerName: this.localName,
          iceCandidate: null,
        }),
      }).catch((error) => {
        log(`Error ICE candidate stop: ${error}`, LogSeverity.ERROR);
      });
    }
  }
}

class Host extends Peer {
  constructor(hostName: string) {
    super(hostName);

    this.orderedData = this.connection.createDataChannel("orderedData", {
      ordered: true,
    });
    this.orderedData.addEventListener("open", () => {
      log(
        "Ordered data channel is open. Ready to send messages.",
        LogSeverity.INFO
      );
      this.orderedData!.send("Hello from the host!");
    });

    this.unorderedData = this.connection.createDataChannel("unorderedData", {
      ordered: false,
    });
    this.unorderedData.addEventListener("open", () => {
      log(
        "Unordered data channel is open. Ready to send messages.",
        LogSeverity.INFO
      );
      this.unorderedData!.send("Hello from the host (unordered)!");
    });

    this.connection.createOffer().then(
      (offer) => {
        this.connection!.setLocalDescription(offer).then(
          () => {
            log("Local description set successfully.", LogSeverity.INFO);
          },
          (error) => {
            log(`Error setting local description: ${error}`, LogSeverity.ERROR);
          }
        );

        const offerString = JSON.stringify(offer);
        log(`Created offer: ${offerString}`, LogSeverity.INFO);
      },
      (error) => {
        log(`Error creating offer: ${error}`, LogSeverity.ERROR);
      }
    );
  }
}

class Client extends Peer {
  constructor(hostName: string) {
    super(hostName);

    this.connection.setRemoteDescription(remoteInfo.description).then(
      () => {
        log("Remote description set successfully.", LogSeverity.INFO);
      },
      (error) => {
        log(`Error setting remote description: ${error}`, LogSeverity.ERROR);
      }
    );

    remoteInfo.iceCandidates.forEach((candidate) => {
      this.connection!.addIceCandidate(candidate).catch((error) => {
        log(`Error adding ICE candidate: ${error}`, LogSeverity.ERROR);
      });
    });

    this.connection.createAnswer().then(
      (answer) => {
        this.connection!.setLocalDescription(answer).catch((error) => {
          log(`Error setting local description: ${error}`, LogSeverity.ERROR);
        });

        const answerString = JSON.stringify(answer);
        log(`Created answer: ${answerString}`, LogSeverity.INFO);
      },
      (error) => {
        log(`Error creating answer: ${error}`, LogSeverity.ERROR);
      }
    );

    this.connection.addEventListener("datachannel", (event) => {
      log(
        `Data channel received from host: ${event.channel.label}`,
        LogSeverity.INFO
      );
      this.orderedData = event.channel;
      this.orderedData.addEventListener("message", (event) => {
        log(`Received message: ${event.data}`, LogSeverity.INFO);
      });
    });
  }
}

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

function Connection() {
  const [peer, setPeer] = React.useState<Host | Client | null>(null);

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

export default Connection;
