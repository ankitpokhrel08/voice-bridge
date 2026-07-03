export type CallStatus = "idle" | "calling" | "incoming-ringing" | "connected";

export interface IncomingCall {
  from: string;
  to: string;
  offer: RTCSessionDescriptionInit;
}

export interface CallState {
  status: CallStatus;
  peer: string | null;
  incomingCall: IncomingCall | null;
  connectedAt: number | null;
  /** Set when a call ends (either side), so the UI can say "Call with X ended"
   * instead of silently going blank. Cleared when the next call starts. */
  lastEndedPeer: string | null;
}

export const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es", label: "Español (Spanish)" },
  { code: "fr", label: "Français (French)" },
  { code: "de", label: "Deutsch (German)" },
  { code: "hi", label: "हिन्दी (Hindi)" },
  { code: "ja", label: "日本語 (Japanese)" },
  { code: "zh", label: "中文 (Chinese)" },
  { code: "pt", label: "Português (Portuguese)" },
  { code: "ar", label: "العربية (Arabic)" },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]["code"];
