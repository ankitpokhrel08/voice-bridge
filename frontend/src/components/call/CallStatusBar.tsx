import { GithubIcon } from "../shared/Icons";
import type { CallStatus } from "../../types/call";
import type { TranscriptionStatus } from "../../types/transcription";
import styles from "./CallStatusBar.module.css";

interface CallStatusBarProps {
  callStatus: CallStatus;
  peerName: string | null;
  lastEndedPeer: string | null;
  durationLabel: string;
  transcriptionStatus: TranscriptionStatus;
}

export function CallStatusBar({
  callStatus,
  peerName,
  lastEndedPeer,
  durationLabel,
  transcriptionStatus,
}: CallStatusBarProps) {
  let statusText: string;
  let ended = false;
  switch (callStatus) {
    case "connected":
      statusText = `Call with ${peerName}`;
      break;
    case "calling":
      statusText = `Calling ${peerName}...`;
      break;
    case "incoming-ringing":
      statusText = "Incoming call...";
      break;
    default:
      if (lastEndedPeer) {
        statusText = `Call with ${lastEndedPeer} ended`;
        ended = true;
      } else {
        statusText = "No active call";
      }
  }

  return (
    <div className={styles.bar}>
      <div className={styles.left}>
        <span className={styles.liveDot} data-status={transcriptionStatus} aria-hidden="true" />
        {callStatus === "connected" && <span className={styles.duration}>{durationLabel}</span>}
        <span className={ended ? styles.peerEnded : styles.peer} data-idle={callStatus === "idle" && !ended}>
          {statusText}
        </span>
      </div>
      <a
        className={styles.githubLink}
        href="https://github.com/ankitpokhrel08/voice-bridge"
        target="_blank"
        rel="noreferrer"
        aria-label="View source on GitHub"
      >
        <GithubIcon width={18} height={18} />
      </a>
    </div>
  );
}
