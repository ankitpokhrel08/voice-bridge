---
title: Voice Bridge Transcription Backend
emoji: 🎙️
colorFrom: blue
colorTo: green
sdk: docker
app_port: 7860
pinned: false
---

<!--
The YAML frontmatter above is Hugging Face Spaces config -- required when this
directory is pushed as the root of a Space repo (see ../DEPLOY.md). Harmless
elsewhere; GitHub/editors just render it as a normal markdown file below it.
-->

# Live call transcription backend

FastAPI service that gives a two-party call near-real-time, bidirectional
captions: each participant streams their own mic audio over a WebSocket, the
backend runs voice-activity detection to find speech segments, transcribes
them with local `faster-whisper`, translates the result into the *other*
participant's preferred language, and relays it to them as a caption message.

The same WebSocket also carries **text chat**: a client sends
`{"type": "chat", "text": "...", "client_id": "..."}`, and the backend
translates it into the peer's preferred language and relays it as a `chat`
message (same wire shape as captions, including the `from` alias). The sender
gets an immediate untranslated echo carrying `client_id` back, confirming
delivery of the client's optimistic bubble. The source language is
script-checked before translating (`ws_routes._detect_chat_source_lang`) --
plain Latin text from a non-Latin-script profile is treated as English, and
native-script text is trusted over the profile setting -- because translating
from the wrong source garbles output. Per-sender ordering is preserved by
chaining each message's relay task behind the previous one, so a slow
translation can't reorder messages or block the audio receive loop.

This is a standalone service: it never talks to the Node/Socket.io signaling
server (`../server.js`) -- the browser client connects to both independently.
The React frontend (`../frontend`) is the real consumer; `scripts/simulate_call.py`
lets you exercise the full pipeline without a browser.

## Setup

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

If `pip install` can't find `faster-whisper`/`ctranslate2` wheels for your
Python version, use a 3.11 or 3.12 virtualenv instead -- this service doesn't
share an interpreter with anything else in the repo.

Default translation provider is **Argos Translate** (`TRANSCRIBE_TRANSLATION_PROVIDER=argos`)
-- fully offline, no API key, no billing. It needs internet access the first
time a given language *pair* is used (to download that pair's model, typically
tens of MB), then works fully offline for that pair afterwards. Google Cloud
Translation (`TRANSCRIBE_TRANSLATION_PROVIDER=google` + an API key) remains
available as an opt-in alternative for higher quality/coverage if you have a
billed key; with neither configured correctly, translation falls back to a
passthrough translator (original text relayed unchanged) so the pipeline is
always testable.

## Running

```bash
uvicorn app.main:app --reload --port 8000
```

Check `GET /health` returns `{"status": "ok"}`. Startup logs should show the
whisper model loading and a successful warm-up transcription.

## Testing without a frontend

`scripts/simulate_call.py` opens two fake WebSocket clients ("alice" speaking,
"bob" listening) and streams a WAV file as alice's mic audio, printing every
caption bob receives.

Generate a real-speech sample (macOS):

```bash
say -o sample.aiff "Hello, this is a test of the transcription pipeline."
ffmpeg -i sample.aiff -ar 16000 -ac 1 -sample_fmt s16 sample.wav
```

Run the harness:

```bash
python scripts/simulate_call.py --wav sample.wav --server ws://localhost:8000
```

You should see `bob` print `caption` messages transcribing alice's sentence.
With `--speaker-lang`/`--listener-lang` set to different languages (Argos is
the default provider, no key needed), `translated_text` should differ from
`original_text` -- the first request for a new language pair will pause
while Argos downloads that pair's model, subsequent requests for the same
pair are fast and fully offline. If `translated_text` still equals
`original_text`, check the backend logs for "No usable Argos Translate
package path" (that language pair isn't available) or "Failed to update
Argos Translate package index" (no internet on first use).

## A real gotcha we hit locally

`ctranslate2` pays a large one-time setup cost -- 20s+ observed on this
machine -- the *first* time it's invoked from a given native thread, and is
fast on every call after that from the same thread. This affects **both**
`faster-whisper` (`transcriber.py`) and Argos Translate (`translator.py`,
`ArgosTranslateClient` -- Argos models also run on ctranslate2), since both
sit on the same underlying engine. Both run through a dedicated
single-worker `ThreadPoolExecutor`, and both deliberately run their warm-up
call *through that same executor* rather than on the main thread --
warming up on the wrong thread just moves the 20s+ tax onto a live user's
first segment/caption instead of eating it at boot. If you see a request
that looks hung for ~15-25s (easy to mistake for a deadlock -- it isn't),
this is why; don't "fix" it by dropping a warm-up call or moving it back to
the main thread.

## GPU notes

`TRANSCRIBE_WHISPER_DEVICE`/`TRANSCRIBE_WHISPER_COMPUTE_TYPE` default to
`cpu`/`int8` for portability. On a deployment host with an NVIDIA GPU, set
`TRANSCRIBE_WHISPER_DEVICE=cuda` and `TRANSCRIBE_WHISPER_COMPUTE_TYPE=float16`.
`faster-whisper` (via `ctranslate2`) needs a matching NVIDIA driver and
**cuDNN 8** -- a version mismatch typically fails at the first `.transcribe()`
call, not at `pip install` time, so always verify the CPU path works first,
then flip to `cuda` and re-run `scripts/simulate_call.py` against the GPU
host before assuming it works.

## Known limitations (by design, this phase)

- Two-party calls only; a third distinct `user_id` joining a call is rejected.
- In-memory room registry -- a server restart drops all active state (same
  posture as the existing Node signaling server's `allusers` dict).
- No auth on the WebSocket endpoint -- anyone who knows a `call_id` and an
  open `user_id` slot can join. Fine for a prototype, must not be exposed
  publicly as-is.
- No transcript persistence, no TTS, no multi-party calls, no speaker
  diarization (unnecessary -- each participant's audio is already a separate
  stream).
- Argos Translate's quality/coverage is lower than Google Cloud Translation
  for some language pairs, and low-resource pairs may only be reachable by
  pivoting through English (see `ArgosTranslateClient._ensure_pair_installed`),
  which compounds translation error across two hops. Google Cloud Translation
  remains available (and is billed per character) as an opt-in alternative if
  quality matters more than cost for your use case.
