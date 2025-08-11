import React from "react";
import "./Connection.css";
import { clearInterval } from "timers";
import { error } from "console";

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

const REQUEST_REPEAT_TIMEOUT = 5000;

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

  localName: string | null = null;
  remoteName: string | null = null;

  timerForGettingIceCandidates: NodeJS.Timer | null = null;

  constructor() {
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

    this.timerForGettingIceCandidates = setInterval(
      this.getRemoteIceCandidates.bind(this),
      REQUEST_REPEAT_TIMEOUT
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
          messageType: "candidate",
          peer_name: this.localName,
          payload: iceEvent.candidate,
        }),
      }).catch((error) => {
        log(`Error sending ICE candidate: ${error}`, LogSeverity.ERROR);
      });
    } else {
      log("All ICE candidates have been discovered.", LogSeverity.INFO);
      fetch(`${RTC_API_URL}/webrtc`, {
        method: "POST",
        body: JSON.stringify({
          messageType: "candidate",
          peer_name: this.localName,
          payload: { end: true },
        }),
      }).catch((error) => {
        log(`Error ICE candidate stop: ${error}`, LogSeverity.ERROR);
      });
    }
  }

  handleOrderedDataChannel(event: MessageEvent) {
    log(`Received ordered message: ${event.data}`, LogSeverity.INFO);
  }

  handleUnorderedDataChannel(event: MessageEvent) {
    log(`Received unordered message: ${event.data}`, LogSeverity.INFO);
  }

  getRemoteIceCandidates() {
    if (!this.remoteName) {
      // Not an error, just no remote name set yet
      return;
    }

    fetch(`${RTC_API_URL}/webrtc/ice_candidates`, {
      method: "GET",
      headers: {
        peerName: this.remoteName,
      },
    })
      .then((response) => {
        if (!response.ok) {
          log(
            `Error fetching ICE candidates: ${response.statusText}`,
            LogSeverity.ERROR
          );
          return;
        }

        response.json().then((data) => {
          data.candidates.forEach((candidate: RTCIceCandidateInit) => {
            if (Object.hasOwn(candidate, "end")) {
              log("No more ICE candidates to add.", LogSeverity.INFO);
              clearInterval(this.timerForGettingIceCandidates!);
              return;
            }

            this.connection.addIceCandidate(candidate).then(
              () => {
                log(
                  `Remote ICE candidate added: ${JSON.stringify(candidate)}`,
                  LogSeverity.INFO
                );
              },
              (error) => {
                log(`Error adding ICE candidate: ${error}`, LogSeverity.ERROR);
              }
            );
          });
        });
      })
      .catch((error) => {
        log(`Error fetching ICE candidates: ${error}`, LogSeverity.ERROR);
      });
  }
}

class Host extends Peer {
  timerForGettingAnswer: NodeJS.Timer | null = null;

  constructor(hostName: string) {
    super();
    this.localName = hostName;

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
  }

  createOffer() {
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
        fetch(`${RTC_API_URL}/webrtc`, {
          method: "POST",
          body: JSON.stringify({
            messageType: "offer",
            peerName: this.localName,
            payload: offer,
          }),
        }).catch((error) => {
          log(`Error sending offer: ${error}`, LogSeverity.ERROR);
        });
      },
      (error) => {
        log(`Error creating offer: ${error}`, LogSeverity.ERROR);
      }
    );

    this.timerForGettingAnswer = setInterval(
      this.getAnswer.bind(this),
      REQUEST_REPEAT_TIMEOUT
    );
  }

  getAnswer() {
    if (!this.remoteName) {
      log("Remote name is not set. Cannot get answer.", LogSeverity.ERROR);
      return;
    }

    fetch(`${RTC_API_URL}/webrtc/answer`, {
      method: "GET",
      headers: {
        peer_name: this.remoteName,
      },
    }).then(
      (response) => {
        if (!response.ok) {
          log(
            `Error fetching answer: ${response.statusText}`,
            LogSeverity.ERROR
          );
          return;
        }

        response.json().then((data) => {
          this.connection.setRemoteDescription(data.answer).then(
            () => {
              log("Remote description set successfully.", LogSeverity.INFO);
              if (this.timerForGettingAnswer === null) return;
              clearInterval(this.timerForGettingAnswer);
            },
            (error) => {
              log(
                `Error setting remote description: ${error}`,
                LogSeverity.ERROR
              );
            }
          );
        });
      },
      (error) => {
        log(`Error fetching answer: ${error}`, LogSeverity.ERROR);
      }
    );
  }
}

class Client extends Peer {
  constructor(hostName: string) {
    super();
    this.remoteName = hostName;

    this.connection.addEventListener(
      "datachannel",
      this.handleReceiveDataChannel.bind(this)
    );

    fetch(`${RTC_API_URL}/webrtc/offer`, {
      method: "GET",
      headers: {
        peer_name: this.remoteName,
      },
    }).then(
      (response) => {
        if (!response.ok) {
          log(
            `Error fetching offer: ${response.statusText}`,
            LogSeverity.ERROR
          );
          return;
        }
        response.json().then((data) => {
          this.localName = data.clientName;
          this.connection.setRemoteDescription(data.offer).then(
            () => {
              log("Remote description set successfully.", LogSeverity.INFO);
            },
            (error) => {
              log(
                `Error setting remote description: ${error}`,
                LogSeverity.ERROR
              );
            }
          );
          this.createAnwer();
        });
      },
      (error) => {
        log(`Error fetching offer: ${error}`, LogSeverity.ERROR);
      }
    );
  }

  createAnwer() {
    this.connection.createAnswer().then(
      (answer) => {
        this.connection!.setLocalDescription(answer).catch((error) => {
          log(`Error setting local description: ${error}`, LogSeverity.ERROR);
        });

        const answerString = JSON.stringify(answer);
        log(`Created answer: ${answerString}`, LogSeverity.INFO);

        fetch(`${RTC_API_URL}/webrtc`, {
          method: "POST",
          body: JSON.stringify({
            messageType: "answer",
            peerName: this.localName,
            payload: answer,
          }),
        }).catch((error) => {
          log(`Error sending answer: ${error}`, LogSeverity.ERROR);
        });
      },
      (error) => {
        log(`Error creating answer: ${error}`, LogSeverity.ERROR);
      }
    );
  }

  handleReceiveDataChannel(event: RTCDataChannelEvent) {
    if (event.channel.ordered) {
      this.orderedData = event.channel;
      this.orderedData.addEventListener(
        "message",
        this.handleOrderedDataChannel.bind(this)
      );
      log(
        `Ordered data channel established: ${event.channel.label}`,
        LogSeverity.INFO
      );
    } else {
      this.unorderedData = event.channel;
      this.unorderedData.addEventListener(
        "message",
        this.handleUnorderedDataChannel.bind(this)
      );
      log(
        `Unordered data channel established: ${event.channel.label}`,
        LogSeverity.INFO
      );
    }
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
