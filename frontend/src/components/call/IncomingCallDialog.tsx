import { PhoneIcon, PhoneOffIcon } from "../shared/Icons";
import styles from "./IncomingCallDialog.module.css";

interface IncomingCallDialogProps {
  callerName: string;
  onAccept: () => void;
  onReject: () => void;
}

export function IncomingCallDialog({ callerName, onAccept, onReject }: IncomingCallDialogProps) {
  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Incoming call">
      <div className={styles.card}>
        <span className={styles.pulseIcon} aria-hidden="true">
          <PhoneIcon width={22} height={22} />
        </span>
        <p className={styles.caller}>{callerName} is calling</p>
        <div className={styles.actions}>
          <button type="button" className={styles.reject} onClick={onReject}>
            <PhoneOffIcon width={18} height={18} />
            Decline
          </button>
          <button type="button" className={styles.accept} onClick={onAccept}>
            <PhoneIcon width={18} height={18} />
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
