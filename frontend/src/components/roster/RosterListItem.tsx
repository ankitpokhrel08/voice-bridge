import { PhoneIcon } from "../shared/Icons";
import styles from "./RosterList.module.css";

interface RosterListItemProps {
  username: string;
  isSelf: boolean;
  onCall: () => void;
  disabled: boolean;
}

export function RosterListItem({ username, isSelf, onCall, disabled }: RosterListItemProps) {
  return (
    <li className={styles.item}>
      <span className={styles.name}>
        {username}
        {isSelf && <span className={styles.youTag}>you</span>}
      </span>
      {!isSelf && (
        <button
          type="button"
          className={styles.callButton}
          onClick={onCall}
          disabled={disabled}
          aria-label={`Call ${username}`}
        >
          <PhoneIcon width={16} height={16} />
        </button>
      )}
    </li>
  );
}
