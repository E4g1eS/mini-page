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

//class HttpHandshaker implements Handshaker {}
