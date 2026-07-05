import { useEffect, useRef } from "react";
import type { ChatMessage } from "../../types/transcription";
import { ChatComposer } from "./ChatComposer";
import styles from "./ChatPanel.module.css";

interface ChatPanelProps {
  messages: ChatMessage[];
  ownUserId: string;
  /** This user's preferred language -- drives the composer's typing helper. */
  languageCode: string;
  canSend: boolean;
  onSend: (text: string) => boolean;
}

/** In-call text chat. Messages travel over the same per-call WebSocket as
 * captions and arrive already translated: the peer's messages show in this
 * user's language (with the original underneath), and this user's own
 * messages come back as a server echo -- there is no local append, so what
 * renders is exactly what was delivered. */
export function ChatPanel({ messages, ownUserId, languageCode, canSend, onSend }: ChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className={styles.panel}>
      <div className={styles.scroll} ref={scrollRef}>
        {messages.length === 0 ? (
          <p className={styles.empty}>
            {canSend
              ? "Messages you type are delivered in your peer's language, and theirs arrive in yours."
              : "Start a call to chat with live translation."}
          </p>
        ) : (
          messages.map((message) => (
            <ChatBubble
              key={`${message.from}-${message.message_id}`}
              message={message}
              own={message.from === ownUserId}
            />
          ))
        )}
      </div>
      <ChatComposer disabled={!canSend} languageCode={languageCode} onSend={onSend} />
    </div>
  );
}

function ChatBubble({ message, own }: { message: ChatMessage; own: boolean }) {
  const text = message.translated_text || message.original_text;
  const wasTranslated = !own && message.translated_text !== message.original_text;

  return (
    <div className={styles.row} data-own={own || undefined}>
      <div className={styles.bubble} data-own={own || undefined}>
        <div className={styles.meta}>
          <span className={styles.sender}>{own ? "You" : message.from}</span>
          {wasTranslated && (
            <span className={styles.langChip}>
              {message.source_lang.toUpperCase()} → {message.target_lang.toUpperCase()}
            </span>
          )}
        </div>
        <p className={styles.text} dir="auto">
          {text}
        </p>
        {wasTranslated && (
          <p className={styles.original} dir="auto">
            {message.original_text}
          </p>
        )}
      </div>
    </div>
  );
}
