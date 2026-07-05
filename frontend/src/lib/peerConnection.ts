import { TURN_URL, TURN_USERNAME, TURN_CREDENTIAL } from "../config/env";

/** STUN alone is enough for peers on the same network or behind simple NATs,
 * but fails between users on strict/symmetric NATs (common on mobile/
 * corporate networks) -- in that case ICE needs a TURN relay.
 *
 * If dedicated TURN credentials are set at build time (VITE_TURN_* -- e.g. a
 * free metered.ca project, 50GB/mo, dedicated to you) we use those: they're
 * far more reliable for real cross-network calls. Otherwise we fall back to
 * Open Relay's *shared public* credentials -- free and zero-config, but
 * heavily rate-limited, so a demo may connect on the same wifi yet fail
 * between two genuinely different networks. Set VITE_TURN_* for anything you
 * actually want people to rely on. */
function buildIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];

  if (TURN_URL && TURN_USERNAME && TURN_CREDENTIAL) {
    servers.push({
      urls: TURN_URL.split(",").map((u) => u.trim()).filter(Boolean),
      username: TURN_USERNAME,
      credential: TURN_CREDENTIAL,
    });
  } else {
    servers.push(
      { urls: "stun:stun.relay.metered.ca:80" },
      { urls: "turn:global.relay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject" },
      { urls: "turn:global.relay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject" },
      {
        urls: "turn:global.relay.metered.ca:443?transport=tcp",
        username: "openrelayproject",
        credential: "openrelayproject",
      }
    );
  }
  return servers;
}

const ICE_SERVERS: RTCIceServer[] = buildIceServers();

/** Ports today's `PeerConnection` IIFE singleton from main.js into a class
 * instantiated once per app lifetime (still only one call at a time, same as
 * before). Existing quirks are preserved on purpose, not "fixed": the
 * icecandidate handler lazily spins up a connection even without an active
 * call (see CallProvider), matching PeerConnection.getInstance()'s behavior. */
export class PeerConnectionManager {
  private pc: RTCPeerConnection | null = null;
  private readonly onIceCandidate: (candidate: RTCIceCandidate) => void;
  private readonly onRemoteStream: (stream: MediaStream) => void;
  private readonly onConnectionStateChange?: (state: RTCPeerConnectionState) => void;

  constructor(
    onIceCandidate: (candidate: RTCIceCandidate) => void,
    onRemoteStream: (stream: MediaStream) => void,
    onConnectionStateChange?: (state: RTCPeerConnectionState) => void
  ) {
    this.onIceCandidate = onIceCandidate;
    this.onRemoteStream = onRemoteStream;
    this.onConnectionStateChange = onConnectionStateChange;
  }

  /** Lazily creates (or recreates, if previously closed) the underlying
   * RTCPeerConnection and attaches all tracks from localStream. */
  ensureConnection(localStream: MediaStream): RTCPeerConnection {
    if (!this.pc || this.pc.connectionState === "closed") {
      this.pc = this.createPeerConnection(localStream);
    }
    return this.pc;
  }

  private createPeerConnection(localStream: MediaStream): RTCPeerConnection {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    localStream.getTracks().forEach((track) => {
      pc.addTrack(track, localStream);
    });

    pc.ontrack = (event) => {
      if (event.streams[0]) {
        this.onRemoteStream(event.streams[0]);
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.onIceCandidate(event.candidate);
      }
    };

    // Surfaces abrupt peer loss (tab closed, network drop) -- without this
    // the remote video freezes on its last frame forever, since no
    // call-ended signaling ever arrives for a dead peer.
    pc.onconnectionstatechange = () => {
      if (this.pc === pc) {
        this.onConnectionStateChange?.(pc.connectionState);
      }
    };

    return pc;
  }

  async createOffer(localStream: MediaStream): Promise<RTCSessionDescriptionInit> {
    const pc = this.ensureConnection(localStream);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    return pc.localDescription!;
  }

  async createAnswerFor(
    offer: RTCSessionDescriptionInit,
    localStream: MediaStream
  ): Promise<RTCSessionDescriptionInit> {
    const pc = this.ensureConnection(localStream);
    await pc.setRemoteDescription(offer);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    return pc.localDescription!;
  }

  async setRemoteAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    await this.pc?.setRemoteDescription(answer);
  }

  async addIceCandidate(candidate: RTCIceCandidateInit, localStream: MediaStream): Promise<void> {
    const pc = this.ensureConnection(localStream);
    await pc.addIceCandidate(new RTCIceCandidate(candidate));
  }

  getVideoSender(): RTCRtpSender | undefined {
    return this.pc?.getSenders().find((sender) => sender.track?.kind === "video");
  }

  async replaceVideoTrack(track: MediaStreamTrack): Promise<void> {
    await this.getVideoSender()?.replaceTrack(track);
  }

  /** Note: this deliberately does NOT stop the senders' tracks. The sender
   * tracks are the shared localStream's mic/camera tracks (added via
   * addTrack), and stopping a getUserMedia track is permanent -- doing so
   * killed local media after the first call and made every subsequent call
   * silently fail with dead audio/video. */
  close(): void {
    this.pc?.close();
    this.pc = null;
  }
}
