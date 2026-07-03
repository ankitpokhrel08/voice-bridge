import { RosterListItem } from "./RosterListItem";
import type { Roster } from "../../types/socket";
import styles from "./RosterList.module.css";

interface RosterListProps {
  roster: Roster;
  ownUsername: string;
  onCall: (username: string) => void;
  disabled: boolean;
  inCall: boolean;
}

export function RosterList({ roster, ownUsername, onCall, disabled, inCall }: RosterListProps) {
  const entries = Object.values(roster);

  return (
    <aside className={inCall ? `${styles.sidebar} ${styles.collapsed}` : styles.sidebar}>
      <div className={styles.brand}>
        <span className={styles.brandDot} aria-hidden="true" />
        <span className={styles.wordmark}>Voice Bridge</span>
      </div>
      <div className={styles.header}>
        <h2 className={styles.title}>Contacts</h2>
        <span className={styles.status}>
          <span className={styles.statusDot} aria-hidden="true" />
          Online
        </span>
      </div>
      <ul className={styles.list}>
        {entries.length === 0 && <li className={styles.empty}>Waiting for others to join...</li>}
        {entries.map((entry) => (
          <RosterListItem
            key={entry.username}
            username={entry.username}
            isSelf={entry.username === ownUsername}
            onCall={() => onCall(entry.username)}
            disabled={disabled}
          />
        ))}
      </ul>
    </aside>
  );
}
