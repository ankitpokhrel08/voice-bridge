import { useCallback, useRef, useState } from "react";
import type { PeerConnectionManager } from "../lib/peerConnection";

/** getDisplayMedia + replaceTrack swap on the peer connection's video sender,
 * no renegotiation -- matches today's screen-share behavior exactly. */
export function useScreenShare(pcManager: PeerConnectionManager | null, localStream: MediaStream | null) {
  const [displayStream, setDisplayStream] = useState<MediaStream | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const screenStreamRef = useRef<MediaStream | null>(null);

  const stop = useCallback(async () => {
    const screenStream = screenStreamRef.current;
    if (!screenStream) return;
    screenStream.getTracks().forEach((track) => track.stop());
    screenStreamRef.current = null;

    const videoTrack = localStream?.getVideoTracks()[0];
    if (videoTrack && pcManager) {
      await pcManager.replaceVideoTrack(videoTrack);
    }
    setDisplayStream(null);
    setIsSharing(false);
  }, [localStream, pcManager]);

  const start = useCallback(async () => {
    if (!pcManager) return;
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      screenStreamRef.current = screenStream;
      const videoTrack = screenStream.getVideoTracks()[0];
      await pcManager.replaceVideoTrack(videoTrack);
      setDisplayStream(screenStream);
      setIsSharing(true);
      videoTrack.onended = () => {
        void stop();
      };
    } catch (err) {
      console.error("Error sharing screen:", err);
    }
  }, [pcManager, stop]);

  const toggle = useCallback(() => {
    if (isSharing) {
      void stop();
    } else {
      void start();
    }
  }, [isSharing, start, stop]);

  /** Hard teardown for call end: stops the screen tracks and clears state
   * without replaceTrack -- the peer connection is being closed anyway. */
  const reset = useCallback(() => {
    screenStreamRef.current?.getTracks().forEach((track) => track.stop());
    screenStreamRef.current = null;
    setDisplayStream(null);
    setIsSharing(false);
  }, []);

  return { displayStream, isSharing, toggle, reset };
}
