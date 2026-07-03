import { useEffect, useRef } from "react";
import { SpeakingIndicator } from "./SpeakingIndicator";
import styles from "./VideoTile.module.css";

interface LocalVideoTileProps {
  stream: MediaStream | null;
  displayStream: MediaStream | null;
  videoEnabled: boolean;
  label: string;
  level: number;
}

export function LocalVideoTile({ stream, displayStream, videoEnabled, label, level }: LocalVideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const activeStream = displayStream ?? stream;

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = activeStream;
    }
  }, [activeStream]);

  const showVideo = Boolean(activeStream) && (videoEnabled || Boolean(displayStream));

  return (
    <div className={styles.tile}>
      <SpeakingIndicator level={level} />
      {showVideo ? (
        <video ref={videoRef} autoPlay playsInline muted className={styles.video} />
      ) : (
        <div className={styles.placeholder}>{label.slice(0, 1).toUpperCase()}</div>
      )}
      <span className={styles.label}>{label}</span>
    </div>
  );
}
