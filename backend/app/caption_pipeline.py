"""Per-connection consumer: VAD -> STT -> translate -> relay.

One coroutine per connected participant, spawned by ws_routes.py. Segments
are processed strictly sequentially (`await` each stage before pulling the
next segment off the queue) -- this is the ordering guarantee: two segments
from the same speaker cannot be relayed out of order, no sequence/reorder
buffer needed. Trade-off: under sustained speech with a slow model, a later
segment's relay waits for an earlier one's full round trip even though its
audio is already buffered in the queue underneath.
"""

import logging
import time

from .config import Settings
from .rooms import Participant, Room
from .schemas import CaptionMessage, ErrorMessage
from .transcriber import Transcriber, TranscriptionResult
from .translator import Translator
from .vad_segmenter import VADSegmenter

logger = logging.getLogger("transcribe.pipeline")


async def run_participant_pipeline(
    room: Room,
    participant: Participant,
    transcriber: Transcriber,
    translator: Translator,
    settings: Settings,
) -> None:
    segmenter = VADSegmenter(
        sample_rate=settings.sample_rate,
        frame_ms=settings.vad_frame_ms,
        aggressiveness=settings.vad_aggressiveness,
        start_frames=settings.vad_start_frames,
        silence_ms=settings.vad_silence_ms,
        max_segment_ms=settings.max_segment_ms,
        min_segment_ms=settings.min_segment_ms,
    )

    while True:
        chunk = await participant.frame_queue.get()
        if chunk is None:
            trailing = segmenter.flush()
            if trailing is not None:
                await process_segment(room, participant, trailing, transcriber, translator, settings)
            return

        for segment in segmenter.feed(chunk):
            await process_segment(room, participant, segment, transcriber, translator, settings)


async def process_segment(
    room: Room,
    participant: Participant,
    pcm16_bytes: bytes,
    transcriber: Transcriber,
    translator: Translator,
    settings: Settings,
) -> None:
    segment_id = participant.next_segment_id
    participant.next_segment_id += 1

    try:
        result = await transcriber.transcribe(pcm16_bytes, participant.spoken_language)
    except Exception:
        logger.exception("Transcription failed for segment %d (%s)", segment_id, participant.user_id)
        await _send(participant, ErrorMessage(message=f"transcription failed for segment {segment_id}").model_dump())
        return

    logger.debug("Segment %d (%s) transcribed: %r", segment_id, participant.user_id, result.text)

    if not result.text:
        return

    source_lang = _resolve_source_lang(participant, result, settings)

    for recipient in _recipients(room, participant, settings):
        if recipient is participant:
            target_lang = source_lang
            translated_text = result.text
        else:
            target_lang = recipient.preferred_language
            translated_text = (
                result.text
                if target_lang == source_lang
                else await translator.translate(result.text, target_lang, source_lang)
            )

        message = CaptionMessage(
            segment_id=segment_id,
            from_user=participant.user_id,
            original_text=result.text,
            translated_text=translated_text,
            source_lang=source_lang,
            target_lang=target_lang,
            ts=time.time(),
        )
        await _send(recipient, message.to_wire())


def _resolve_source_lang(participant: Participant, result: TranscriptionResult, settings: Settings) -> str:
    if participant.spoken_language not in (None, "auto"):
        return participant.spoken_language
    if result.language_probability >= settings.min_language_confidence:
        participant.sticky_source_lang = result.language
        return result.language
    return participant.sticky_source_lang or result.language


def _recipients(room: Room, participant: Participant, settings: Settings) -> list[Participant]:
    recipients: list[Participant] = []
    peer = room.peer_of(participant.user_id)
    if peer is not None:
        recipients.append(peer)
    if settings.relay_to_self:
        recipients.append(participant)
    return recipients


async def _send(participant: Participant, data: dict) -> None:
    try:
        await participant.websocket.send_json(data)
    except Exception:
        logger.debug("Failed to send message to %s (likely disconnected)", participant.user_id, exc_info=True)
