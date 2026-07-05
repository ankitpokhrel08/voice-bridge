import {
  MicIcon,
  MicOffIcon,
  VideoIcon,
  VideoOffIcon,
  ScreenShareIcon,
  PhoneOffIcon,
  ChatIcon,
  CaptionsIcon,
} from "../shared/Icons";
import styles from "./CallControls.module.css";

export type PanelMode = "captions" | "chat" | null;

interface CallControlsProps {
  micEnabled: boolean;
  videoEnabled: boolean;
  isScreenSharing: boolean;
  callConnected: boolean;
  panelMode: PanelMode;
  unreadChatCount: number;
  onToggleMic: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onTogglePanel: (mode: "captions" | "chat") => void;
  onEndCall: () => void;
}

/** Floating FaceTime-style pill over the video stage. */
export function CallControls({
  micEnabled,
  videoEnabled,
  isScreenSharing,
  callConnected,
  panelMode,
  unreadChatCount,
  onToggleMic,
  onToggleVideo,
  onToggleScreenShare,
  onTogglePanel,
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

      <span className={styles.divider} aria-hidden="true" />

      <button
        type="button"
        className={styles.button}
        data-active={panelMode === "captions"}
        onClick={() => onTogglePanel("captions")}
        aria-label={panelMode === "captions" ? "Hide captions panel" : "Show captions panel"}
      >
        <CaptionsIcon />
      </button>
      <button
        type="button"
        className={styles.button}
        data-active={panelMode === "chat"}
        onClick={() => onTogglePanel("chat")}
        aria-label={panelMode === "chat" ? "Hide chat panel" : "Show chat panel"}
      >
        <ChatIcon />
        {unreadChatCount > 0 && <span className={styles.badge}>{unreadChatCount}</span>}
      </button>

      <span className={styles.divider} aria-hidden="true" />

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
