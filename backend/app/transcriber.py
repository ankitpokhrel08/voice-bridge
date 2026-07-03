"""faster-whisper singleton wrapper.

A single WhisperModel instance backs a single, global, single-worker
ThreadPoolExecutor shared across every connection/call in the process. This
deliberately serializes all transcription calls: one GPU/model instance
should not be hit concurrently from multiple threads. Under load, calls
across different calls queue behind each other -- an accepted trade-off for
this prototype (see CLAUDE.md / plan notes), revisit if scaling beyond a
handful of concurrent calls.
"""

import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass

import numpy as np
from faster_whisper import WhisperModel

from .config import Settings

logger = logging.getLogger("transcribe.stt")


@dataclass
class TranscriptionResult:
    text: str
    language: str
    language_probability: float


class Transcriber:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        logger.info(
            "Loading faster-whisper model=%s device=%s compute_type=%s",
            settings.whisper_model_size,
            settings.whisper_device,
            settings.whisper_compute_type,
        )
        self._model = WhisperModel(
            settings.whisper_model_size,
            device=settings.whisper_device,
            compute_type=settings.whisper_compute_type,
        )
        self._executor = ThreadPoolExecutor(
            max_workers=settings.transcribe_executor_workers,
            thread_name_prefix="whisper",
        )
        self._warm_up()

    def _warm_up(self) -> None:
        """Pay cold-start cost once at boot, not on the first real segment.

        Critically, this must run *through the executor*, not on the calling
        thread: ctranslate2 pays a large one-time setup cost (~20s+ observed
        locally) the first time a model is invoked from a given native
        thread, and is fast on every call after that from the same thread.
        Warming up on the wrong thread leaves that cost to land on a live
        user's first segment instead.
        """
        silence = np.zeros(self._settings.sample_rate, dtype=np.int16)
        try:
            self._executor.submit(self._transcribe_blocking, silence.tobytes(), "en").result()
        except Exception:
            logger.exception("Whisper warm-up transcription failed")
        else:
            logger.info("Whisper model warmed up")

    async def transcribe(self, pcm16_bytes: bytes, language_hint: str | None) -> TranscriptionResult:
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(
            self._executor, self._transcribe_blocking, pcm16_bytes, language_hint
        )

    def _transcribe_blocking(self, pcm16_bytes: bytes, language_hint: str | None) -> TranscriptionResult:
        audio = np.frombuffer(pcm16_bytes, dtype=np.int16).astype(np.float32) / 32768.0
        language = None if language_hint in (None, "auto") else language_hint

        # vad_filter=False: we already externally VAD-segmented this audio; whisper's
        # own internal VAD would double-gate it and can clip segment edges unpredictably.
        # condition_on_previous_text=False: segments are independent conversational turns,
        # not one continuous transcript -- avoid hallucinated carry-over between them.
        segments, info = self._model.transcribe(
            audio,
            language=language,
            beam_size=self._settings.whisper_beam_size,
            vad_filter=False,
            condition_on_previous_text=False,
        )
        # Whisper hallucinates plausible-sounding text ("Thank you.", "Bye.")
        # on breaths/noise/near-silence. Its own per-segment signals catch
        # most of it: skip segments the model itself thinks are probably not
        # speech AND was unconfident decoding (the standard whisper heuristic).
        kept: list[str] = []
        for seg in segments:
            if seg.no_speech_prob > 0.6 and seg.avg_logprob < -1.0:
                logger.debug(
                    "Dropping likely hallucination (no_speech_prob=%.2f, avg_logprob=%.2f): %r",
                    seg.no_speech_prob,
                    seg.avg_logprob,
                    seg.text,
                )
                continue
            kept.append(seg.text.strip())
        text = " ".join(kept).strip()
        return TranscriptionResult(
            text=text,
            language=info.language,
            language_probability=info.language_probability,
        )

    def shutdown(self) -> None:
        self._executor.shutdown(wait=True)
