import { useCallback, useEffect, useState } from "react";

/** Acquires the local mic+camera stream once on mount (mirrors today's
 * startMyVideo(), called immediately on load) and exposes mute toggles that
 * just flip track.enabled, matching today's behavior (no renegotiation). */
export function useLocalMedia() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({
        // Explicit audio processing constraints matter for transcription
        // quality: without echo cancellation, the peer's voice playing out
        // of the speakers leaks back into this mic, gets streamed to the
        // transcription backend, and shows up as captions attributed to the
        // wrong speaker (worst when both callers share a room/machine).
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: true,
      })
      .then((mediaStream) => {
        if (cancelled) {
          mediaStream.getTracks().forEach((track) => track.stop());
          return;
        }
        setStream(mediaStream);
      })
      .catch((err: unknown) => {
        console.error("Error accessing media devices.", err);
        setError(err instanceof Error ? err : new Error(String(err)));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleMic = useCallback(() => {
    const track = stream?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMicEnabled(track.enabled);
  }, [stream]);

  const toggleVideo = useCallback(() => {
    const track = stream?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setVideoEnabled(track.enabled);
  }, [stream]);

  return { stream, micEnabled, videoEnabled, toggleMic, toggleVideo, error };
}
