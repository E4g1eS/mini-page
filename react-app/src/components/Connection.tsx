import React from "react";
import "./Connection.css";
import { generateRandomString } from "../func/utils";

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

enum LogSeverity {
  VERBOSE = "VERBOSE",
  INFO = "INFO",
  WARNING = "WARNING",
  ERROR = "ERROR",
}

function log(text: string, severity: LogSeverity = LogSeverity.VERBOSE) {
  const logText = `[${new Date().toISOString()}] [${severity}] ${text}`;

  switch (severity) {
    case LogSeverity.VERBOSE:
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

  timerForGettingIceCandidates: ReturnType<typeof setInterval> | null = null;

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
  }

  iceCandidateDiscovered(iceEvent: RTCPeerConnectionIceEvent) {
    if (iceEvent.candidate) {
      const fetchBody = JSON.stringify({
        messageType: "candidate",
        peerName: this.localName,
        payload: JSON.stringify(iceEvent.candidate),
      });
      log(`New ICE candidate: ${fetchBody}`, LogSeverity.INFO);
      fetch(`${RTC_API_URL}/webrtc`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json", // Indicate JSON body
        },
        body: fetchBody,
      }).then(
        () => {
          log("ICE candidate sent successfully.", LogSeverity.INFO);
        },
        (error) => {
          log(`Error sending ICE candidate: ${error}`, LogSeverity.ERROR);
        }
      );
    } else {
      log("All ICE candidates have been discovered.", LogSeverity.INFO);
      fetch(`${RTC_API_URL}/webrtc`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json", // Indicate JSON body
        },
        body: JSON.stringify({
          messageType: "candidate",
          peerName: this.localName,
          payload: "end",
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

  startGettingIceCandidates() {
    this.timerForGettingIceCandidates = setInterval(
      this.getRemoteIceCandidates.bind(this),
      REQUEST_REPEAT_TIMEOUT
    );
  }

  getRemoteIceCandidates() {
    if (!this.remoteName) {
      // Not an error, just no remote name set yet
      return;
    }

    fetch(`${RTC_API_URL}/webrtc/ice_candidates`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json", // Indicate JSON body
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
          log(
            `Received candidate data: ${JSON.stringify(data)}`,
            LogSeverity.VERBOSE
          );
          data.candidates.forEach((candidate: string) => {
            if (candidate === "end") {
              log("No more ICE candidates to add.", LogSeverity.INFO);
              clearInterval(this.timerForGettingIceCandidates!);
              return;
            }

            const candidateObj = JSON.parse(candidate);
            this.connection.addIceCandidate(candidateObj).then(
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
  timerForGettingAnswer: ReturnType<typeof setInterval> | null = null;

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

    this.createOffer();
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

        const fetchBody = JSON.stringify({
          messageType: "offer",
          peerName: this.localName,
          payload: JSON.stringify(offer),
        });
        log(`Created offer: ${fetchBody}`, LogSeverity.INFO);

        fetch(`${RTC_API_URL}/webrtc`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json", // Indicate JSON body
          },
          body: fetchBody,
        }).then(
          (response) => {
            if (!response.ok) {
              log(
                `Error sending offer: ${response.statusText}`,
                LogSeverity.ERROR
              );
              return;
            }
            response.json().then((data) => {
              this.remoteName = data.clientName;
              log(`Remote name set to: ${this.remoteName}`, LogSeverity.INFO);
            });
            log("Offer sent successfully.", LogSeverity.INFO);
          },
          (error) => {
            log(`Error sending offer: ${error}`, LogSeverity.ERROR);
          }
        );
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
        "Content-Type": "application/json", // Indicate JSON body
        peerName: this.remoteName,
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
          log(
            `Received answer data: ${JSON.stringify(data)}`,
            LogSeverity.VERBOSE
          );

          if (data.answer === null) {
            // Not an error, client has not sent an answer yet
            return;
          }

          this.connection.setRemoteDescription(JSON.parse(data.answer)).then(
            () => {
              log("Remote description set successfully.", LogSeverity.INFO);
              if (this.timerForGettingAnswer === null) return;
              clearInterval(this.timerForGettingAnswer);
              this.startGettingIceCandidates();
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
        "Content-Type": "application/json", // Indicate JSON body
        peerName: this.remoteName,
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
          this.connection.setRemoteDescription(JSON.parse(data.offer)).then(
            () => {
              log("Remote description set successfully.", LogSeverity.INFO);
              this.startGettingIceCandidates();
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
          headers: {
            "Content-Type": "application/json", // Indicate JSON body
          },
          body: JSON.stringify({
            messageType: "answer",
            peerName: this.remoteName,
            payload: JSON.stringify(answer),
          }),
        }).then(
          (response) => {
            if (!response.ok) {
              log(
                `Error sending answer: ${response.statusText}`,
                LogSeverity.ERROR
              );
              return;
            }
            response.json().then((data) => {
              log(
                `Answer sent successfully. Success: ${data.success}`,
                LogSeverity.INFO
              );
            });
          },
          (error) => {
            log(`Error sending answer: ${error}`, LogSeverity.ERROR);
          }
        );
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
