import { MicIcon, MicOffIcon, VideoIcon, VideoOffIcon, ScreenShareIcon, PhoneOffIcon } from "../shared/Icons";
import styles from "./CallControls.module.css";

interface CallControlsProps {
  micEnabled: boolean;
  videoEnabled: boolean;
  isScreenSharing: boolean;
  callConnected: boolean;
  onToggleMic: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onEndCall: () => void;
}

export function CallControls({
  micEnabled,
  videoEnabled,
  isScreenSharing,
  callConnected,
  onToggleMic,
  onToggleVideo,
  onToggleScreenShare,
  onEndCall,
}: CallControlsProps) {
  return (
    <div className={styles.controls}>
      <button
        type="button"
        className={styles.button}
        data-off={!micEnabled}
        onClick={onToggleMic}
        aria-label={micEnabled ? "Mute microphone" : "Unmute microphone"}
      >
        {micEnabled ? <MicIcon /> : <MicOffIcon />}
      </button>
      <button
        type="button"
        className={styles.button}
        data-off={!videoEnabled}
        onClick={onToggleVideo}
        aria-label={videoEnabled ? "Turn off camera" : "Turn on camera"}
      >
        {videoEnabled ? <VideoIcon /> : <VideoOffIcon />}
      </button>
      <button
        type="button"
        className={styles.button}
        data-active={isScreenSharing}
        onClick={onToggleScreenShare}
        disabled={!callConnected}
        aria-label={isScreenSharing ? "Stop screen share" : "Share screen"}
      >
        <ScreenShareIcon />
      </button>
      <button
        type="button"
        className={`${styles.button} ${styles.end}`}
        onClick={onEndCall}
        disabled={!callConnected}
        aria-label="End call"
      >
        <PhoneOffIcon />
      </button>
    </div>
  );
}
