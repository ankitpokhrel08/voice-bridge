# Voice Bridge frontend

React + TypeScript + Vite client for Voice Bridge. See the [root README](../README.md) for the full project overview and setup.

```bash
npm install
npm run dev      # dev server on :5173 (proxies /socket.io to the Node server on :9000)
npm run build    # production build to dist/, served by ../server.js
```

Config: `VITE_TRANSCRIBE_WS_URL` in `.env` points at the FastAPI transcription backend (`ws://localhost:8000` in dev; use `wss://...` in production).

Structure notes:

- `src/lib/` -- framework-agnostic classes (peer connection, transcription session, ringtone).
- `src/context/CallProvider.tsx` -- the call state machine; orchestrates signaling, WebRTC, and transcription in explicit order.
- `public/pcm-audio-worklet.js` -- unbundled `AudioWorkletProcessor` that downsamples mic audio to 16kHz PCM for the backend (can't be a TS module; worklets run in a separate global scope).
