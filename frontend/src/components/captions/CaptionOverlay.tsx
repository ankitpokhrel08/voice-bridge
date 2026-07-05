import { useEffect, useRef, useState } from "react";
import type { CaptionMessage } from "../../types/transcription";
import styles from "./CaptionOverlay.module.css";

const LINGER_MS = 8000;

/** Broadcast-style lower-third: the peer's most recent translated speech,
 * overlaid on the video like live subtitles. Lines linger briefly after the
 * last caption, then clear so the video stays unobstructed. The full history
 * lives in the Captions side panel. */
export function CaptionOverlay({ captions }: { captions: CaptionMessage[] }) {
  const [visible, setVisible] = useState<CaptionMessage[]>([]);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (captions.length === 0) {
      setVisible([]);
      return;
    }
    setVisible(captions.slice(-2));
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setVisible([]), LINGER_MS);
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, [captions]);

  if (visible.length === 0) return null;

  return (
    <div className={styles.overlay} aria-live="polite">
      {visible.map((caption) => (
        <div key={`${caption.from}-${caption.segment_id}`} className={styles.line}>
          <span className={styles.chip}>
            {caption.source_lang.toUpperCase()} → {caption.target_lang.toUpperCase()}
          </span>
          <p className={styles.text} dir="auto">
            {caption.translated_text || caption.original_text}
          </p>
        </div>
      ))}
    </div>
  );
}
