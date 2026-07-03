export const TRANSCRIBE_WS_URL: string =
  import.meta.env.VITE_TRANSCRIBE_WS_URL ?? "ws://localhost:8000";

/** Optional dedicated TURN relay, set at build time. If all three are present
 * they take priority over the shared public fallback in peerConnection.ts.
 * VITE_TURN_URL may be a comma-separated list, e.g.
 *   "turn:relay.metered.ca:80,turn:relay.metered.ca:443,turn:relay.metered.ca:443?transport=tcp"
 * Get free dedicated credentials (50GB/mo) at metered.ca -- far more reliable
 * for real cross-network calls than the rate-limited shared openrelayproject. */
export const TURN_URL: string | undefined = import.meta.env.VITE_TURN_URL || undefined;
export const TURN_USERNAME: string | undefined = import.meta.env.VITE_TURN_USERNAME || undefined;
export const TURN_CREDENTIAL: string | undefined = import.meta.env.VITE_TURN_CREDENTIAL || undefined;
