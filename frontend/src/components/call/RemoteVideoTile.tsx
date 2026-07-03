import { useEffect, useRef } from "react";
import { PhoneIcon } from "../shared/Icons";
import { SpeakingIndicator } from "./SpeakingIndicator";
import styles from "./VideoTile.module.css";

interface RemoteVideoTileProps {
  stream: MediaStream | null;
  /** null when no call is connected yet -- renders a waiting state instead
   * of deriving a placeholder letter from a sentinel string. */
  label: string | null;
  level: number;
}

export function RemoteVideoTile({ stream, label, level }: RemoteVideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className={`${styles.tile} ${styles.remote}`}>
      <SpeakingIndicator level={level} />
      {stream ? (
        <video ref={videoRef} autoPlay playsInline className={styles.video} />
      ) : label ? (
        <div className={styles.placeholder}>{label.slice(0, 1).toUpperCase()}</div>
      ) : (
        <div className={styles.waiting}>
          <PhoneIcon width={20} height={20} />
        </div>
      )}
      <span className={styles.label}>{label ?? "Waiting..."}</span>
    </div>
  );
}
