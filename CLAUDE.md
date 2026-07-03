# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Three services, run in separate terminals for local development:

```bash
npm start                                            # repo root: Node/Express + Socket.io signaling, :9000
cd backend && source .venv/bin/activate && \
  uvicorn app.main:app --port 8000                   # FastAPI transcription/translation backend, :8000
cd frontend && npm run dev                           # Vite dev server (React/TS), :5173, HMR
```

Frontend production build (served by the Node server instead of Vite's dev server):
```bash
cd frontend && npm run build   # emits frontend/dist
npm start                      # from repo root -- server.js serves frontend/dist at :9000
```

Backend test harness (no frontend/browser needed, validates VAD -> STT -> translate -> relay end to end):
```bash
cd backend && source .venv/bin/activate
python scripts/simulate_call.py --wav sample.wav --server ws://localhost:8000
```

No test suite is configured for the Node server or the frontend. The frontend has TypeScript compiler checks (`cd frontend && npx tsc -b`) but no unit tests. The backend has no automated tests beyond the manual `simulate_call.py` harness.

## Architecture

Three independently-run services:

### `server.js` — Socket.io signaling (unchanged since the project's original build)
- Express serves the built React app from `frontend/dist` in production; in dev, the frontend runs its own Vite server and proxies `/socket.io` (including the WS upgrade) to this server.
- Socket.io handles **signaling only** — it never touches media or audio data. Actual audio/video flows peer-to-peer via WebRTC once signaling completes.
- `allusers` is an in-memory object (`{ username: { username, id: socketId } }`) mapping usernames to socket IDs. This is the entire user directory — there is no database, no auth, and usernames are not unique-checked or persisted. Restarting the server clears all users.
- Signaling events relayed between peers by username lookup into `allusers`: `join-user`, `offer`, `answer`, `call-rejected`, `end-call` (unused no-op), `call-ended`, `icecandidate`. Note: `icecandidate` is broadcast to *all* connected sockets, not scoped to the calling pair — a known, harmless-at-this-scale quirk, preserved intentionally rather than "fixed."

### `backend/` — FastAPI transcription/translation service (see `backend/README.md` for full detail)
- WebSocket endpoint `/ws/call/{call_id}/{user_id}`. Each call participant streams their own mic audio (PCM16LE/16kHz) over their own connection; the backend runs voice-activity detection to find speech segments, transcribes with local `faster-whisper`, translates into the *other* participant's preferred language (default provider: offline **Argos Translate**, no API key needed; Google Cloud Translation available as an opt-in alternative), and relays the result as a `caption` message. Captions are peer-only — a participant never receives an echo of their own speech.
- `app/transcriber.py` and `app/translator.py` both run on `ctranslate2` under the hood and both warm up *through their dedicated single-worker executor thread*, not the main thread — ctranslate2 pays a large one-time setup cost the first time it's invoked from a given thread, and warming up on the wrong thread just moves that cost onto a live user's first segment/caption. Don't "fix" this by removing the warm-up indirection.
- Two-party calls only; in-memory room registry (`app/rooms.py`); no auth on the WS endpoint. Same trust/persistence posture as `server.js`, not a regression.

### `frontend/` — React + TypeScript client (Vite)
- Distinctive design system (not a generic template): dark charcoal-teal base, warm amber accent for "live/speaking now" state, muted cyan accent for "translated caption" state, `Fraunces` (display serif, wordmark/hero only) + `IBM Plex Sans` (UI) + `IBM Plex Mono` (captions/status, styled like broadcast telemetry). Tokens live in `src/styles/tokens.css`; each component has a colocated CSS Module.
- `src/lib/` holds framework-agnostic classes ported near-verbatim from the project's original vanilla-JS implementation: `PeerConnectionManager` (one `RTCPeerConnection` at a time, STUN-only, lazy create/recreate), `TranscriptionSession` (owns the WS + `AudioContext` + `AudioWorkletNode` pipeline that streams mic audio to the FastAPI backend and surfaces captions via callbacks), `Ringtone` (Audio element with a synthesized Web Audio fallback beep).
- `public/pcm-audio-worklet.js` is a plain, unbundled static file (not TypeScript, not under `src/`) — `AudioWorkletProcessor` modules run in a separate global scope and can't import app code or be bundled. It downsamples mic audio to 16kHz mono PCM16LE in ~20ms chunks. Referenced by absolute path (`/pcm-audio-worklet.js`), resolving correctly in both dev and prod.
- State: `CallProvider` (`src/context/CallProvider.tsx`) is the orchestrator — a `useReducer` call-state machine (`idle | calling | incoming-ringing | connected`) plus explicit async handler functions (`startCall`, `acceptIncomingCall`, `handleAnswer`, `endCall`, ...) that perform WebRTC's inherently-ordered signaling steps in explicit sequence. This is deliberate: independent `useEffect`s across sibling hooks have no guaranteed relative ordering, which would reintroduce signaling-order bugs. `PeerConnectionManager`/`TranscriptionSession` instances are held in stable `useRef`s (see `usePeerConnection`/`useTranscriptionSession`), not recreated per render.
- `useAudioLevel` (`AnalyserNode`-based, sampled via `requestAnimationFrame`) drives the "speaking now" video-tile glow and the caption feed's live signal-strip meter with **real** mic/speaker activity — not a decorative/simulated animation.
- `types/transcription.ts`'s `CaptionMessage` matches `backend/app/schemas.py`'s wire format exactly, including the `from` field name (the backend's Pydantic alias via `to_wire(by_alias=True)`).
