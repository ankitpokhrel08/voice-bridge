import { useEffect, useRef } from "react";
import { LocalVideoTile } from "./LocalVideoTile";
import { CaptionOverlay } from "../captions/CaptionOverlay";
import type { CallStatus } from "../../types/call";
import type { CaptionMessage } from "../../types/transcription";
import styles from "./VideoStage.module.css";

const SPEAKING_THRESHOLD = 0.08;

interface VideoStageProps {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  displayStream: MediaStream | null;
  videoEnabled: boolean;
  peerName: string | null;
  ownName: string;
  localLevel: number;
  remoteLevel: number;
  callStatus: CallStatus;
  captions: CaptionMessage[];
}

/** The FaceTime-style hero: remote video fills the stage edge to edge, with
 * the local self-view docked as a small PiP tile and the peer's translated
 * speech overlaid as broadcast-style subtitles (CaptionOverlay). Outside a
 * call the stage shows the mirrored local camera preview, so the screen is
 * never a dead panel. */
export function VideoStage({
  localStream,
  remoteStream,
  displayStream,
  videoEnabled,
  peerName,
  ownName,
  localLevel,
  remoteLevel,
  callStatus,
  captions,
}: VideoStageProps) {
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);

  const connected = callStatus === "connected" && remoteStream !== null;
  const showPreview = !connected && localStream !== null && videoEnabled;

  useEffect(() => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, connected]);

  useEffect(() => {
    if (previewVideoRef.current) {
      previewVideoRef.current.srcObject = localStream;
    }
  }, [localStream, showPreview]);

  let hint: string | null = null;
  if (!connected) {
    switch (callStatus) {
      case "calling":
        hint = `Calling ${peerName}…`;
        break;
      case "incoming-ringing":
        hint = "Incoming call…";
        break;
      default:
        hint = localStream ? "No active call — pick a contact to start one" : "Waiting for camera and microphone…";
    }
  }

  return (
    <div className={styles.stage} data-speaking={connected && remoteLevel > SPEAKING_THRESHOLD ? "true" : undefined}>
      {connected ? (
        <video ref={remoteVideoRef} autoPlay playsInline className={styles.remoteVideo} />
      ) : showPreview ? (
        <video ref={previewVideoRef} autoPlay playsInline muted className={styles.previewVideo} />
      ) : (
        <div className={styles.noCamera}>
          <span className={styles.initial}>{ownName.slice(0, 1).toUpperCase()}</span>
        </div>
      )}

      {!connected && <div className={styles.scrim} aria-hidden="true" />}
      {hint && <p className={styles.hint}>{hint}</p>}

      {connected && peerName && <span className={styles.peerTag}>{peerName}</span>}
      {connected && <CaptionOverlay captions={captions} />}

      {connected && (
        <div className={styles.pip}>
          <LocalVideoTile
            stream={localStream}
            displayStream={displayStream}
            videoEnabled={videoEnabled}
            label={ownName}
            level={localLevel}
          />
        </div>
      )}
    </div>
  );
}
