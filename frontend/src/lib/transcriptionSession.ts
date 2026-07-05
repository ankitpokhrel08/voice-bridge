import { TRANSCRIBE_WS_URL } from "../config/env";
import type { CaptionMessage, ChatMessage, TranscriptionStatus } from "../types/transcription";

interface TranscriptionSessionOptions {
  callId: string;
  userId: string;
  preferredLanguage: string;
  /** BCP-47-ish language code the user says they speak, or "auto" to let
   * whisper detect it per segment. Chosen at onboarding. */
  spokenLanguage: string;
  stream: MediaStream;
  onStatusChange: (status: TranscriptionStatus) => void;
  onCaption: (caption: CaptionMessage) => void;
  onChat: (message: ChatMessage) => void;
}

/** Owns one call's WebSocket + AudioContext + AudioWorkletNode lifecycle,
 * streaming this participant's own mic audio to the transcription backend
 * and surfacing translated captions of the peer's speech via callbacks.
 * Ported near-verbatim from the original vanilla-JS TranscriptionSession. */
export class TranscriptionSession {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private silentGain: GainNode | null = null;
  private closedByUs = false;
  private readonly options: TranscriptionSessionOptions;

  constructor(options: TranscriptionSessionOptions) {
    this.options = options;
  }

  start(): void {
    const { callId, userId, preferredLanguage, spokenLanguage, onStatusChange, onCaption, onChat } = this.options;
    const url = `${TRANSCRIBE_WS_URL}/ws/call/${encodeURIComponent(callId)}/${encodeURIComponent(userId)}`;
    const ws = new WebSocket(url);
    ws.binaryType = "arraybuffer";
    this.ws = ws;

    ws.addEventListener("open", () => {
      ws.send(
        JSON.stringify({
          type: "config",
          preferred_language: preferredLanguage,
          spoken_language: spokenLanguage,
          sample_rate: 16000,
        })
      );
    });

    ws.addEventListener("message", (event) => {
      let msg: { type: string } & Record<string, unknown>;
      try {
        msg = JSON.parse(event.data as string);
      } catch {
        return;
      }
      if (msg.type === "ready") {
        onStatusChange("active");
        this.startAudioPipeline().catch((err: unknown) => {
          console.error("Failed to start mic capture pipeline:", err);
          onStatusChange("error");
        });
      } else if (msg.type === "caption") {
        onCaption(msg as unknown as CaptionMessage);
      } else if (msg.type === "chat") {
        onChat(msg as unknown as ChatMessage);
      } else if (msg.type === "error") {
        console.error("Transcription backend error:", msg.message);
        onStatusChange("error");
      }
    });

    ws.addEventListener("error", (event) => {
      console.error("Transcription WebSocket error:", event);
      onStatusChange("error");
    });

    ws.addEventListener("close", (event) => {
      if (!this.closedByUs) {
        console.warn("Transcription WebSocket closed unexpectedly:", event.code, event.reason);
        onStatusChange("error");
      }
    });
  }

  private async startAudioPipeline(): Promise<void> {
    const AudioContextCtor =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const audioContext = new AudioContextCtor({ sampleRate: 16000 });
    this.audioContext = audioContext;
    console.log("Transcription AudioContext actual sampleRate:", audioContext.sampleRate);

    await audioContext.audioWorklet.addModule("/pcm-audio-worklet.js");

    const sourceNode = audioContext.createMediaStreamSource(this.options.stream);
    const workletNode = new AudioWorkletNode(audioContext, "pcm-downsampler", {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      channelCount: 1,
      channelCountMode: "explicit",
      channelInterpretation: "speakers",
    });
    this.sourceNode = sourceNode;
    this.workletNode = workletNode;

    workletNode.port.onmessage = (event: MessageEvent<ArrayBuffer>) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(event.data);
      }
    };

    // Route through a muted GainNode into destination. Gain is 0 (no audible
    // output) -- this just keeps the worklet node part of the "live" render
    // graph, since nodes with no path to destination can be throttled/
    // stopped by the browser.
    const silentGain = audioContext.createGain();
    silentGain.gain.value = 0;
    this.silentGain = silentGain;

    sourceNode.connect(workletNode);
    workletNode.connect(silentGain);
    silentGain.connect(audioContext.destination);
  }

  /** Send a typed chat message over the same call WebSocket. The backend
   * translates it into the peer's preferred language and relays it; the
   * sender gets an echo back (rendered via onChat), so no local append is
   * needed. Returns false if the socket isn't open. */
  sendChat(text: string): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return false;
    try {
      this.ws.send(JSON.stringify({ type: "chat", text }));
      return true;
    } catch {
      return false;
    }
  }

  stop(): void {
    this.closedByUs = true;

    if (this.ws) {
      if (this.ws.readyState === WebSocket.OPEN) {
        try {
          this.ws.send(JSON.stringify({ type: "end" }));
        } catch {
          /* ignore */
        }
      }
      try {
        this.ws.close();
      } catch {
        /* ignore */
      }
      this.ws = null;
    }

    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch {
        /* ignore */
      }
      this.sourceNode = null;
    }
    if (this.workletNode) {
      this.workletNode.port.onmessage = null;
      try {
        this.workletNode.disconnect();
      } catch {
        /* ignore */
      }
      this.workletNode = null;
    }
    if (this.silentGain) {
      try {
        this.silentGain.disconnect();
      } catch {
        /* ignore */
      }
      this.silentGain = null;
    }
    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch {
        /* ignore */
      }
      this.audioContext = null;
    }
  }
}
