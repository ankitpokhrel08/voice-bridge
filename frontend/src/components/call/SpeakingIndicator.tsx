import styles from "./SpeakingIndicator.module.css";

interface SpeakingIndicatorProps {
  /** Real mic/speaker activity level, 0-1, from useAudioLevel -- not simulated. */
  level: number;
}

const ACTIVITY_THRESHOLD = 0.08;

export function SpeakingIndicator({ level }: SpeakingIndicatorProps) {
  const active = level > ACTIVITY_THRESHOLD;
  return (
    <span
      className={styles.ring}
      style={{ opacity: active ? Math.min(1, 0.4 + level) : 0 }}
      aria-hidden="true"
    />
  );
}
