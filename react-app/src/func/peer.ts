import { log, LogSeverity } from "./logging";
import { Handshaker, getHandshaker } from "./handshaker";

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    {
      urls: "stun:relay.metered.ca:80",
    },
    {
      urls: "stun:stun.l.google.com:19302",
    },
  ],
};

export class Peer {
  handshaker: Handshaker;
  connection: RTCPeerConnection;
  orderedData: RTCDataChannel | null = null;
  unorderedData: RTCDataChannel | null = null;

  localName: string | null = null;
  remoteName: string | null = null;

  constructor() {
    this.handshaker = getHandshaker();
    this.connection = new RTCPeerConnection(RTC_CONFIG);

    this.connection.addEventListener("connectionstatechange", () => {
      log(
        `Connection state changed: ${this.connection?.connectionState}`,
        LogSeverity.INFO
      );
    });

    this.connection.addEventListener("icecandidate", (iceEvent) => {
      if (!this.localName) {
        log(
          "Local name is not set, cannot send ICE candidate.",
          LogSeverity.ERROR
        );
        return;
      }

      log(
        `A local ICE candidate found: ${JSON.stringify(iceEvent.candidate)}`,
        LogSeverity.VERBOSE
      );

      this.handshaker.sendIceCandidate(this.localName, iceEvent.candidate);
    });
  }

  handleOrderedData(event: MessageEvent) {
    log(`Received ordered message: ${event.data}`, LogSeverity.INFO);
  }

  handleUnorderedData(event: MessageEvent) {
    log(`Received unordered message: ${event.data}`, LogSeverity.INFO);
  }

  printInfo() {
    log(
      `This peer info: localName=${this.localName}, remoteName=${this.remoteName}`,
      LogSeverity.INFO
    );
  }

  async getIceCandidates() {
    if (!this.remoteName)
      throw new Error("Remote name is not set. Cannot get ICE candidates.");

    this.handshaker.registerIceCandidateListener(
      this.remoteName,
      (candidate) => {
        this.connection.addIceCandidate(candidate).then(
          () => {
            log(`Added a remote ICE candidate.`, LogSeverity.VERBOSE);
          },
          (error) => {
            log(`Failed to add an ICE candidate: ${error}`, LogSeverity.ERROR);
          }
        );
      }
    );
  }
}

export class Host extends Peer {
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

    this.init().catch((error) => {
      log(
        `Could not initialize host properly due to: ${error}`,
        LogSeverity.ERROR
      );
    });
  }

  async init() {
    const localDescription = await this.connection.createOffer();
    await this.connection.setLocalDescription(localDescription);
    log(`Set local description.`, LogSeverity.INFO);
    if (!this.localName) throw new Error("Local name is not set.");
    const remoteInfo = await this.handshaker.sendOffer(
      this.localName,
      localDescription
    );
    await this.connection.setRemoteDescription(remoteInfo.description);
    log(`Set remote description.`, LogSeverity.INFO);
    this.remoteName = remoteInfo.peerName;

    this.printInfo();
    await this.getIceCandidates();
    log(`Host initialized succesfully.`, LogSeverity.INFO);
  }
}

export class Client extends Peer {
  constructor(hostName: string) {
    super();
    this.remoteName = hostName;

    this.connection.addEventListener(
      "datachannel",
      this.handleReceiveDataChannel.bind(this)
    );

    this.init().catch((error) => {
      log(
        `Could not initialize client properly due to: ${error}`,
        LogSeverity.ERROR
      );
    });
  }

  async init() {
    if (!this.remoteName)
      throw new Error("Remote name is not set. Cannot get offer.");

    const offerResponse = await this.handshaker.getOffer(this.remoteName);
    this.localName = offerResponse.peerName;
    await this.connection.setRemoteDescription(offerResponse.description);
    log(`Set remote description.`, LogSeverity.INFO);

    const answer = await this.connection.createAnswer();
    await this.connection.setLocalDescription(answer);
    log(`Set local description.`, LogSeverity.INFO);
    await this.handshaker.sendAnswer(this.remoteName, answer);

    this.printInfo();
    await this.getIceCandidates();
    log(`Client initialized succesfully.`, LogSeverity.INFO);
  }

  handleReceiveDataChannel(event: RTCDataChannelEvent) {
    if (event.channel.ordered) {
      this.orderedData = event.channel;
      this.orderedData.addEventListener(
        "message",
        this.handleOrderedData.bind(this)
      );
      log(
        `Ordered data channel established: ${event.channel.label}`,
        LogSeverity.INFO
      );
    } else {
      this.unorderedData = event.channel;
      this.unorderedData.addEventListener(
        "message",
        this.handleUnorderedData.bind(this)
      );
      log(
        `Unordered data channel established: ${event.channel.label}`,
        LogSeverity.INFO
      );
    }
  }
}
