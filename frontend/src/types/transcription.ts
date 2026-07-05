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
}

export interface ErrorMessage {
  type: "error";
  message: string;
}

export type TranscriptionServerMessage = ReadyMessage | CaptionMessage | ChatMessage | ErrorMessage;
export type TranscriptionClientMessage = ConfigMessage | EndMessage | ChatSendMessage;
export type TranscriptionStatus = "idle" | "connecting" | "active" | "error";
