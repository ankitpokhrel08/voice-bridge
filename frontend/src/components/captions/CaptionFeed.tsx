import { useEffect, useRef } from "react";
import { CaptionBubble } from "./CaptionBubble";
import type { CaptionMessage, TranscriptionStatus } from "../../types/transcription";
import styles from "./CaptionFeed.module.css";

interface CaptionFeedProps {
  captions: CaptionMessage[];
  localLevel: number;
  remoteLevel: number;
  status: TranscriptionStatus;
}

/** The visual hero of the in-call screen. The signal strip above the feed
 * is a real, honest VU-meter-style readout of both participants' live mic
 * activity (via useAudioLevel), not a decorative animation -- it visualizes
 * the same speech-activity signal the backend's VAD is acting on. */
export function CaptionFeed({ captions, localLevel, remoteLevel, status }: CaptionFeedProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [captions]);

  return (
    <div className={styles.feed}>
      <div className={styles.signalStrip} aria-hidden="true">
        <div className={styles.track}>
          <span
            className={styles.fill}
            data-channel="local"
            style={{ transform: `scaleX(${Math.max(0.015, localLevel)})` }}
          />
        </div>
        <div className={styles.track}>
          <span
            className={styles.fill}
            data-channel="remote"
            style={{ transform: `scaleX(${Math.max(0.015, remoteLevel)})` }}
          />
        </div>
      </div>

      <div className={styles.scroll} ref={scrollRef}>
        {captions.length === 0 ? (
          <p className={styles.empty}>
            {status === "active"
              ? "Listening for speech..."
              : status === "error"
                ? "Captions unavailable -- check that the transcription service is running."
                : "Start a call to see live translated captions."}
          </p>
        ) : (
          captions.map((caption) => <CaptionBubble key={`${caption.from}-${caption.segment_id}`} caption={caption} />)
        )}
      </div>
    </div>
  );
}
