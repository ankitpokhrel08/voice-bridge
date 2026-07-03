#!/usr/bin/env python3
"""End-to-end test harness for the live transcription backend.

Opens two fake WebSocket clients against the backend: "alice" streams a WAV
file as her mic audio, "bob" just listens and prints whatever captions he
receives. No frontend or real audio hardware needed -- this is how the
VAD -> STT -> translate -> relay pipeline gets validated before any
frontend work happens.

Usage:
    python scripts/simulate_call.py --wav sample.wav --server ws://localhost:8000

If you don't have a WAV handy, generate a real speech sample on macOS with:
    say -o sample.aiff "Hello, this is a test of the transcription pipeline."
    ffmpeg -i sample.aiff -ar 16000 -ac 1 -sample_fmt s16 sample.wav
"""

import argparse
import asyncio
import json
import sys
import wave

import websockets
from websockets.exceptions import ConnectionClosed

REQUIRED_SAMPLE_RATE = 16000
REQUIRED_CHANNELS = 1
REQUIRED_SAMPLE_WIDTH = 2  # bytes (16-bit)
FRAME_MS = 30
BYTES_PER_FRAME = int(REQUIRED_SAMPLE_RATE * FRAME_MS / 1000) * REQUIRED_SAMPLE_WIDTH


def load_pcm16(wav_path: str) -> bytes:
    with wave.open(wav_path, "rb") as wf:
        if (
            wf.getframerate() != REQUIRED_SAMPLE_RATE
            or wf.getnchannels() != REQUIRED_CHANNELS
            or wf.getsampwidth() != REQUIRED_SAMPLE_WIDTH
        ):
            print(
                f"ERROR: {wav_path} must be {REQUIRED_SAMPLE_RATE}Hz mono 16-bit PCM, got "
                f"{wf.getframerate()}Hz, {wf.getnchannels()} channel(s), {wf.getsampwidth() * 8}-bit.\n\n"
                f"Fix with:\n  ffmpeg -i {wav_path} -ar {REQUIRED_SAMPLE_RATE} -ac 1 -sample_fmt s16 fixed.wav",
                file=sys.stderr,
            )
            sys.exit(1)
        return wf.readframes(wf.getnframes())


async def speaker(server: str, call_id: str, user_id: str, spoken_language: str, pcm: bytes) -> None:
    url = f"{server}/ws/call/{call_id}/{user_id}"
    async with websockets.connect(url) as ws:
        await ws.send(
            json.dumps(
                {
                    "type": "config",
                    "preferred_language": spoken_language,
                    "spoken_language": spoken_language,
                    "sample_rate": REQUIRED_SAMPLE_RATE,
                }
            )
        )
        ready = json.loads(await ws.recv())
        print(f"[{user_id}] handshake: {ready}")

        frame_duration_s = FRAME_MS / 1000
        for offset in range(0, len(pcm), BYTES_PER_FRAME):
            await ws.send(pcm[offset : offset + BYTES_PER_FRAME])
            await asyncio.sleep(frame_duration_s)

        await ws.send(json.dumps({"type": "end"}))
        print(f"[{user_id}] finished streaming, waiting for trailing segment to flush...")
        await asyncio.sleep(5)


async def listener(server: str, call_id: str, user_id: str, preferred_language: str, listen_s: float) -> None:
    url = f"{server}/ws/call/{call_id}/{user_id}"
    async with websockets.connect(url) as ws:
        await ws.send(
            json.dumps(
                {
                    "type": "config",
                    "preferred_language": preferred_language,
                    "spoken_language": "auto",
                    "sample_rate": REQUIRED_SAMPLE_RATE,
                }
            )
        )
        ready = json.loads(await ws.recv())
        print(f"[{user_id}] handshake: {ready}")

        try:
            async with asyncio.timeout(listen_s):
                async for raw in ws:
                    msg = json.loads(raw)
                    if msg.get("type") == "caption":
                        print(
                            f"[{user_id} sees] {msg['from']} ({msg['source_lang']}) -> "
                            f"{msg['target_lang']}: {msg['translated_text']!r} "
                            f"(original: {msg['original_text']!r})"
                        )
                    else:
                        print(f"[{user_id}] {msg}")
        except (TimeoutError, ConnectionClosed):
            pass


async def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--wav", required=True, help="16kHz mono 16-bit PCM WAV file of speech")
    parser.add_argument("--server", default="ws://localhost:8000", help="backend base URL")
    parser.add_argument("--call-id", default="sim-call-1")
    parser.add_argument("--speaker-lang", default="en", help="language alice is speaking")
    parser.add_argument("--listener-lang", default="es", help="language bob wants captions in")
    args = parser.parse_args()

    pcm = load_pcm16(args.wav)
    duration_s = len(pcm) / (REQUIRED_SAMPLE_RATE * REQUIRED_SAMPLE_WIDTH)
    print(f"Loaded {args.wav}: {duration_s:.1f}s of audio")

    await asyncio.gather(
        listener(args.server, args.call_id, "bob", args.listener_lang, listen_s=duration_s + 15),
        speaker(args.server, args.call_id, "alice", args.speaker_lang, pcm),
    )


if __name__ == "__main__":
    asyncio.run(main())
