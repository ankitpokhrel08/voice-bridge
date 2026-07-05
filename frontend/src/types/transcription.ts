/** Wire contract for the FastAPI transcription backend's WebSocket -- must match
 * backend/app/schemas.py exactly, including the `from` field name (the backend's
 * Pydantic alias, used via CaptionMessage.to_wire()'s by_alias=True). */

export interface ConfigMessage {
  type: "config";
  preferred_language: string;
  spoken_language: "auto" | string;
  sample_rate: number;
}

export interface EndMessage {
  type: "end";
}

export interface ReadyMessage {
  type: "ready";
}

export interface CaptionMessage {
  type: "caption";
  segment_id: number;
  from: string;
  original_text: string;
  translated_text: string;
  source_lang: string;
  target_lang: string;
  is_final: boolean;
  ts: number;
}

export interface ChatSendMessage {
  type: "chat";
  text: string;
  /** Client-generated id, echoed back so the sender's UI can reconcile its
   * optimistic pending bubble with the confirmed delivery. */
  client_id?: string;
}

/** Server -> client chat relay. The sender gets an echo (target_lang ==
 * source_lang) confirming delivery; the peer gets the translated copy. */
export interface ChatMessage {
  type: "chat";
  message_id: number;
  from: string;
  original_text: string;
  translated_text: string;
  source_lang: string;
  target_lang: string;
  ts: number;
  /** Present only on the sender's echo. */
  client_id?: string | null;
}

/** UI-side chat entry: a wire ChatMessage plus optimistic-send state. Own
 * messages render immediately as `pending`, flip to confirmed when the
 * server echo arrives, and to `failed` if no echo comes back in time. */
export interface ChatDisplayMessage extends ChatMessage {
  pending?: boolean;
  failed?: boolean;
}

export interface ErrorMessage {
  type: "error";
  message: string;
}

export type TranscriptionServerMessage = ReadyMessage | CaptionMessage | ChatMessage | ErrorMessage;
export type TranscriptionClientMessage = ConfigMessage | EndMessage | ChatSendMessage;
export type TranscriptionStatus = "idle" | "connecting" | "active" | "error";
