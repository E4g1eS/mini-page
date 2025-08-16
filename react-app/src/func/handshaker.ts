import { log, LogSeverity } from "./logging";
import { sleep } from "./utils";

export interface DescriptionWithPeerName {
  description: RTCSessionDescriptionInit;
  peerName: string;
}

export interface Handshaker {
  /**
   * The command to "start" a host.
   * Sends an RTC offer and fullfills with an answer and client name.
   */
  sendOffer(
    hostName: string,
    offer: RTCSessionDescriptionInit
  ): Promise<DescriptionWithPeerName>;

  /**
   * The commmand to "start" a client. Receives an RTC offer.
   * The "host" must have already called `sendOffer`.
   * Fulfills with an RTC answer and the client name
   * (so that means the name of "self").
   */
  getOffer(hostName: string): Promise<DescriptionWithPeerName>;

  /**
   * The command to send an answer to the host.
   */
  sendAnswer(
    hostName: string,
    answer: RTCSessionDescriptionInit
  ): Promise<void>;

  /**
   * @param selfName The name of the peer sending the ICE candidate.
   * @param candidate The ICE candidate to send. If null, it indicates the end of candidates.
   */
  sendIceCandidate(
    selfName: string,
    candidate: RTCIceCandidateInit | null
  ): Promise<void>;

  /**
   * Registers a listener for incoming ICE candidates.
   * @param peerName The name of the peer to listen for candidates from.
   * @param candidateListener The function to call when a candidate is received.
   */
  registerIceCandidateListener(
    peerName: string,
    candidateListener: (candidate: RTCIceCandidateInit) => void
  ): void;
}

/** Edit to return currently used handshaker */
export function getHandshaker(): Handshaker {
  return new HttpHandshaker();
}

class HttpHandshaker implements Handshaker {
  private readonly API_URL = process.env.REACT_APP_WEBRTC_URL;
  /** In miliseconds. */
  private readonly REQUEST_REPEAT_TIMEOUT = 5000;
  private readonly ICE_CANDIDATE_STOP = "end";

  async sendOffer(
    hostName: string,
    offer: RTCSessionDescriptionInit
  ): Promise<DescriptionWithPeerName> {
    const offerResponse = await (
      await fetch(`${this.API_URL}/webrtc`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messageType: "offer",
          peerName: hostName,
          payload: JSON.stringify(offer),
        }),
      })
    ).json();
    if (!offerResponse.success) throw new Error("Failed to send offer.");

    log(`Successfully sent offer`);

    while (true) {
      const answerResponse = await (
        await fetch(`${this.API_URL}/webrtc/answer`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json", // Indicate JSON body
            peerName: offerResponse.clientName,
          },
        })
      ).json();

      if (answerResponse.success)
        return {
          description: JSON.parse(answerResponse.answer),
          peerName: offerResponse.clientName,
        };

      log("Waiting for answer...", LogSeverity.VERBOSE);
      await sleep(this.REQUEST_REPEAT_TIMEOUT);
    }
  }

  async getOffer(hostName: string): Promise<DescriptionWithPeerName> {
    const response = await (
      await fetch(`${this.API_URL}/webrtc/offer`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          peerName: hostName,
        },
      })
    ).json();
    if (!response.success) throw new Error("Failed to get offer.");
    return {
      description: JSON.parse(response.offer),
      peerName: response.clientName,
    };
  }

  async sendAnswer(
    hostName: string,
    answer: RTCSessionDescriptionInit
  ): Promise<void> {
    const response = await (
      await fetch(`${this.API_URL}/webrtc`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageType: "answer",
          peerName: hostName,
          payload: JSON.stringify(answer),
        }),
      })
    ).json();
    if (!response.success) throw new Error("Failed to send answer.");
  }

  async sendIceCandidate(
    selfName: string,
    candidate: RTCIceCandidateInit | null
  ): Promise<void> {
    const payload =
      candidate === null ? this.ICE_CANDIDATE_STOP : JSON.stringify(candidate);
    const response = await (
      await fetch(`${this.API_URL}/webrtc`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageType: "candidate",
          peerName: selfName,
          payload: payload,
        }),
      })
    ).json();
    if (!response.success) throw new Error("Failed to send ice candidate.");
  }

  registerIceCandidateListener(
    peerName: string,
    candidateListener: (candidate: RTCIceCandidateInit) => void
  ): void {
    this.listenToIceCandidates(peerName, candidateListener).then(
      () => {
        log("End of listening to ICE candidates.", LogSeverity.INFO);
      },
      (error) => {
        log(
          `Error while listening to ICE candidates: ${error}`,
          LogSeverity.ERROR
        );
      }
    );
  }

  private async listenToIceCandidates(
    peerName: string,
    candidateListener: (candidate: RTCIceCandidateInit) => void
  ) {
    while (true) {
      const response = await (
        await fetch(`${this.API_URL}/webrtc/ice_candidates`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            peerName: peerName,
          },
        })
      ).json();
      if (!response.success) throw new Error("Failed to get ice candidates.");

      for (let candidateString of response.candidates) {
        if (candidateString === this.ICE_CANDIDATE_STOP) return;

        const candidate = JSON.parse(candidateString);
        candidateListener(candidate);
      }

      log("Waiting for ICE candidates...", LogSeverity.VERBOSE);
      await sleep(this.REQUEST_REPEAT_TIMEOUT);
    }
  }
}
