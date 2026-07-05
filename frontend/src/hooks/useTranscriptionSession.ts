import { useCallback, useEffect, useRef, useState } from "react";
import { TranscriptionSession } from "../lib/transcriptionSession";
import type { CaptionMessage, ChatDisplayMessage, TranscriptionStatus } from "../types/transcription";

interface StartOptions {
  callId: string;
  userId: string;
  preferredLanguage: string;
  spokenLanguage: string;
  stream: MediaStream;
}

const CHAT_DELIVERY_TIMEOUT_MS = 10_000;

function newClientId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Owns the TranscriptionSession for the current call. start()/stop() are
 * called explicitly by CallProvider at the exact points the original code
 * called startTranscriptionSession/stopTranscriptionSession -- not tied to
 * this hook's own mount/unmount -- so a prior session is always fully
 * stopped before a new one starts, even across fast end-call-then-new-call
 * sequences. */
export function useTranscriptionSession() {
  const sessionRef = useRef<TranscriptionSession | null>(null);
  const selfRef = useRef({ userId: "", preferredLanguage: "" });
  const [status, setStatus] = useState<TranscriptionStatus>("idle");
  const [captions, setCaptions] = useState<CaptionMessage[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatDisplayMessage[]>([]);

  const start = useCallback((opts: StartOptions) => {
    sessionRef.current?.stop();
    selfRef.current = { userId: opts.userId, preferredLanguage: opts.preferredLanguage };
    setCaptions([]);
    setChatMessages([]);
    setStatus("connecting");
    const session = new TranscriptionSession({
      ...opts,
      onStatusChange: setStatus,
      onCaption: (caption) => setCaptions((prev) => [...prev, caption]),
      onChat: (message) =>
        setChatMessages((prev) => {
          // The sender's echo confirms delivery of an optimistic bubble.
          if (message.client_id) {
            const pendingIndex = prev.findIndex((m) => m.client_id === message.client_id);
            if (pendingIndex >= 0) {
              const next = [...prev];
              next[pendingIndex] = message;
              return next;
            }
          }
          return [...prev, message];
        }),
    });
    sessionRef.current = session;
    session.start();
  }, []);

  const stop = useCallback(() => {
    sessionRef.current?.stop();
    sessionRef.current = null;
    setStatus("idle");
  }, []);

  /** Optimistic send: the message renders immediately as pending, flips to
   * confirmed when the server echo arrives, and to failed if no echo comes
   * back in time -- so a typed message is never silently invisible. */
  const sendChat = useCallback((text: string): boolean => {
    const clientId = newClientId();
    if (!(sessionRef.current?.sendChat(text, clientId) ?? false)) return false;

    const { userId, preferredLanguage } = selfRef.current;
    setChatMessages((prev) => [
      ...prev,
      {
        type: "chat",
        message_id: -1,
        from: userId,
        original_text: text,
        translated_text: text,
        source_lang: preferredLanguage,
        target_lang: preferredLanguage,
        ts: Date.now() / 1000,
        client_id: clientId,
        pending: true,
      },
    ]);

    window.setTimeout(() => {
      setChatMessages((prev) =>
        prev.map((m) => (m.client_id === clientId && m.pending ? { ...m, pending: false, failed: true } : m))
      );
    }, CHAT_DELIVERY_TIMEOUT_MS);

    return true;
  }, []);

  useEffect(() => {
    return () => {
      sessionRef.current?.stop();
    };
  }, []);

  return { start, stop, sendChat, status, captions, chatMessages };
}
