"""Pure, synchronous speech-segment state machine.

Deliberately kept free of asyncio so it's trivial to reason about and unit
test in isolation: feed raw PCM16LE mono bytes in arbitrary chunk sizes,
get back zero or more finalized speech segments (also raw PCM16LE bytes).
"""

import logging
from collections import deque

import webrtcvad

logger = logging.getLogger("transcribe.vad")

VALID_FRAME_MS = (10, 20, 30)
BYTES_PER_SAMPLE = 2  # PCM16
PREROLL_FRAMES = 10  # ~300ms at 30ms/frame, prevents clipping the onset of speech
CAP_OVERLAP_FRAMES = 10  # ~300ms carried into the continuation after a forced max-cap split


class VADSegmenter:
    def __init__(
        self,
        sample_rate: int,
        frame_ms: int,
        aggressiveness: int,
        start_frames: int,
        silence_ms: int,
        max_segment_ms: int,
        min_segment_ms: int,
    ) -> None:
        if frame_ms not in VALID_FRAME_MS:
            raise ValueError(f"frame_ms must be one of {VALID_FRAME_MS}, got {frame_ms}")

        self.sample_rate = sample_rate
        self.frame_ms = frame_ms
        self.start_frames = start_frames
        self.silence_frames = max(1, silence_ms // frame_ms)
        self.max_segment_frames = max(1, max_segment_ms // frame_ms)
        self.min_segment_frames = max(1, min_segment_ms // frame_ms)

        self.bytes_per_frame = int(sample_rate * frame_ms / 1000) * BYTES_PER_SAMPLE
        self._vad = webrtcvad.Vad(aggressiveness)

        self._pending = bytearray()
        self._preroll: deque[bytes] = deque(maxlen=PREROLL_FRAMES)
        self._segment = bytearray()
        self._segment_frame_count = 0
        self._voiced_run = 0
        self._silence_run = 0
        self._speaking = False

    def feed(self, chunk: bytes) -> list[bytes]:
        self._pending.extend(chunk)
        finalized: list[bytes] = []

        while len(self._pending) >= self.bytes_per_frame:
            frame = bytes(self._pending[: self.bytes_per_frame])
            del self._pending[: self.bytes_per_frame]
            is_speech = self._vad.is_speech(frame, self.sample_rate)

            if not self._speaking:
                self._preroll.append(frame)
                self._voiced_run = self._voiced_run + 1 if is_speech else 0
                if self._voiced_run >= self.start_frames:
                    self._start_segment()
            else:
                self._segment.extend(frame)
                self._segment_frame_count += 1
                self._silence_run = 0 if is_speech else self._silence_run + 1

                silence_reached = self._silence_run >= self.silence_frames
                max_reached = self._segment_frame_count >= self.max_segment_frames
                if silence_reached or max_reached:
                    segment = self._finalize_segment(keep_speaking=max_reached and not silence_reached)
                    if segment is not None:
                        finalized.append(segment)

        return finalized

    def flush(self) -> bytes | None:
        if not self._speaking or self._segment_frame_count == 0:
            return None
        return self._finalize_segment(keep_speaking=False)

    def _start_segment(self) -> None:
        self._speaking = True
        self._segment = bytearray()
        for frame in self._preroll:
            self._segment.extend(frame)
        self._segment_frame_count = len(self._preroll)
        self._preroll.clear()
        self._voiced_run = 0
        self._silence_run = 0

    def _finalize_segment(self, keep_speaking: bool) -> bytes | None:
        segment_bytes = bytes(self._segment)
        frame_count = self._segment_frame_count

        if keep_speaking:
            # Forced split at the max-segment cap, mid-speech: the cut almost
            # certainly lands mid-word, garbling the tail of this segment and
            # the head of the next. Seed the continuation with a short tail
            # overlap so whisper gets the severed word whole on the next pass
            # (the duplicated ~300ms is far less damaging than a lost word).
            overlap_bytes = self._segment[-(self.bytes_per_frame * CAP_OVERLAP_FRAMES) :]
            self._segment = bytearray(overlap_bytes)
            self._segment_frame_count = min(frame_count, CAP_OVERLAP_FRAMES)
        else:
            self._segment = bytearray()
            self._segment_frame_count = 0
            self._preroll.clear()

        self._silence_run = 0
        self._voiced_run = 0
        self._speaking = keep_speaking

        if frame_count < self.min_segment_frames:
            logger.debug("Discarding short segment (%d frames)", frame_count)
            return None
        return segment_bytes
