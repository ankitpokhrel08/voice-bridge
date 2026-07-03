import { useEffect, useRef } from "react";
import { PeerConnectionManager } from "../lib/peerConnection";

/** Owns one PeerConnectionManager for the app's lifetime (lazy ref, matching
 * today's module-level singleton but scoped to React). The manager instance
 * is stable across renders; onIceCandidate/onRemoteStream are read through
 * refs so the manager always calls the latest closure without needing to be
 * reconstructed when those callbacks change identity across renders. */
export function usePeerConnection(
  onIceCandidate: (candidate: RTCIceCandidate) => void,
  onRemoteStream: (stream: MediaStream) => void
): PeerConnectionManager {
  const onIceCandidateRef = useRef(onIceCandidate);
  const onRemoteStreamRef = useRef(onRemoteStream);
  onIceCandidateRef.current = onIceCandidate;
  onRemoteStreamRef.current = onRemoteStream;

  const managerRef = useRef<PeerConnectionManager | null>(null);
  if (!managerRef.current) {
    managerRef.current = new PeerConnectionManager(
      (candidate) => onIceCandidateRef.current(candidate),
      (stream) => onRemoteStreamRef.current(stream)
    );
  }

  useEffect(() => {
    return () => {
      managerRef.current?.close();
    };
  }, []);

  return managerRef.current;
}
