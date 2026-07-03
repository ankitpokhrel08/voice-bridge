import type { CaptionMessage } from "../../types/transcription";
import styles from "./CaptionBubble.module.css";

interface CaptionBubbleProps {
  caption: CaptionMessage;
}

export function CaptionBubble({ caption }: CaptionBubbleProps) {
  const text = caption.translated_text || caption.original_text;

  return (
    <div className={styles.bubble}>
      <div className={styles.meta}>
        <span className={styles.speaker}>{caption.from}</span>
        <span className={styles.langChip}>
          {caption.source_lang.toUpperCase()} → {caption.target_lang.toUpperCase()}
        </span>
      </div>
      <p className={styles.text}>{text}</p>
    </div>
  );
}
