import { useCallback, useEffect, useRef, useState } from "react";
import { TranscriptionSession } from "../lib/transcriptionSession";
import type { CaptionMessage, ChatMessage, TranscriptionStatus } from "../types/transcription";

interface StartOptions {
  callId: string;
  userId: string;
  preferredLanguage: string;
  spokenLanguage: string;
  stream: MediaStream;
}

/** Owns the TranscriptionSession for the current call. start()/stop() are
 * called explicitly by CallProvider at the exact points the original code
 * called startTranscriptionSession/stopTranscriptionSession -- not tied to
 * this hook's own mount/unmount -- so a prior session is always fully
 * stopped before a new one starts, even across fast end-call-then-new-call
 * sequences. */
export function useTranscriptionSession() {
  const sessionRef = useRef<TranscriptionSession | null>(null);
  const [status, setStatus] = useState<TranscriptionStatus>("idle");
  const [captions, setCaptions] = useState<CaptionMessage[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const start = useCallback((opts: StartOptions) => {
    sessionRef.current?.stop();
    setCaptions([]);
    setChatMessages([]);
    setStatus("connecting");
    const session = new TranscriptionSession({
      ...opts,
      onStatusChange: setStatus,
      onCaption: (caption) => setCaptions((prev) => [...prev, caption]),
      onChat: (message) => setChatMessages((prev) => [...prev, message]),
    });
    sessionRef.current = session;
    session.start();
  }, []);

  const stop = useCallback(() => {
    sessionRef.current?.stop();
    sessionRef.current = null;
    setStatus("idle");
  }, []);

  const sendChat = useCallback((text: string): boolean => {
    return sessionRef.current?.sendChat(text) ?? false;
  }, []);

  useEffect(() => {
    return () => {
      sessionRef.current?.stop();
    };
  }, []);

  return { start, stop, sendChat, status, captions, chatMessages };
}
