import { LocalVideoTile } from "./LocalVideoTile";
import { RemoteVideoTile } from "./RemoteVideoTile";
import styles from "./VideoStage.module.css";

interface VideoStageProps {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  displayStream: MediaStream | null;
  videoEnabled: boolean;
  peerName: string | null;
  ownName: string;
  localLevel: number;
  remoteLevel: number;
}

/** Video is intentionally secondary here -- small, docked tiles rather than
 * a full-screen grid -- because captions, not video, are this product's
 * actual value. See CallScreen for the caption feed that dominates instead. */
export function VideoStage({
  localStream,
  remoteStream,
  displayStream,
  videoEnabled,
  peerName,
  ownName,
  localLevel,
  remoteLevel,
}: VideoStageProps) {
  return (
    <div className={styles.stage}>
      <RemoteVideoTile stream={remoteStream} label={peerName} level={remoteLevel} />
      <LocalVideoTile
        stream={localStream}
        displayStream={displayStream}
        videoEnabled={videoEnabled}
        label={ownName}
        level={localLevel}
      />
    </div>
  );
}
