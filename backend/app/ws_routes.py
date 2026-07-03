import asyncio
import json
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import ValidationError

from .caption_pipeline import run_participant_pipeline
from .config import settings
from .rooms import Participant, registry
from .schemas import ConfigMessage, ReadyMessage

logger = logging.getLogger("transcribe.ws")

router = APIRouter()

CLOSE_ROOM_FULL = 1008
CLOSE_BAD_HANDSHAKE = 1003


@router.websocket("/ws/call/{call_id}/{user_id}")
async def call_socket(websocket: WebSocket, call_id: str, user_id: str) -> None:
    await websocket.accept()

    if registry.room_is_full(call_id, user_id):
        await websocket.close(code=CLOSE_ROOM_FULL, reason="room already has 2 participants")
        return

    config = await _do_handshake(websocket)
    if config is None:
        return

    existing_room = registry.get_room(call_id)
    if existing_room is not None and user_id in existing_room.participants:
        stale = existing_room.participants[user_id]
        logger.info("Replacing stale connection for %s in room %s", user_id, call_id)
        _signal_shutdown(stale)
        try:
            await stale.websocket.close()
        except Exception:
            pass

    participant = Participant(
        user_id=user_id,
        websocket=websocket,
        preferred_language=config.preferred_language,
        spoken_language=config.spoken_language,
        frame_queue=asyncio.Queue(maxsize=settings.frame_queue_maxsize),
    )
    room = registry.add_participant(call_id, participant)

    transcriber = websocket.app.state.transcriber
    translator = websocket.app.state.translator
    participant.consumer_task = asyncio.create_task(
        run_participant_pipeline(room, participant, transcriber, translator, settings)
    )

    await websocket.send_json(ReadyMessage().model_dump())
    logger.info("Participant %s joined room %s (%d total)", user_id, call_id, len(room.participants))

    dropped_frame_count = 0
    try:
        while True:
            message = await websocket.receive()
            if message["type"] == "websocket.disconnect":
                break

            if "bytes" in message and message["bytes"] is not None:
                try:
                    participant.frame_queue.put_nowait(message["bytes"])
                except asyncio.QueueFull:
                    dropped_frame_count += 1
                    if dropped_frame_count % 50 == 1:
                        logger.warning(
                            "frame_queue full for %s in room %s, dropping frames (total dropped: %d)",
                            user_id,
                            call_id,
                            dropped_frame_count,
                        )
            elif "text" in message and message["text"] is not None:
                await _handle_text_frame(message["text"], participant)
    except WebSocketDisconnect:
        pass
    finally:
        await _cleanup(call_id, participant)


async def _do_handshake(websocket: WebSocket) -> ConfigMessage | None:
    try:
        first = await websocket.receive()
    except WebSocketDisconnect:
        return None

    if first.get("type") == "websocket.disconnect" or "text" not in first or first["text"] is None:
        await websocket.close(code=CLOSE_BAD_HANDSHAKE, reason="expected JSON config message first")
        return None

    try:
        payload = json.loads(first["text"])
        config = ConfigMessage.model_validate(payload)
    except (json.JSONDecodeError, ValidationError) as exc:
        logger.info("Bad handshake: %s", exc)
        await websocket.close(code=CLOSE_BAD_HANDSHAKE, reason="invalid config message")
        return None

    if config.sample_rate is not None and config.sample_rate != settings.sample_rate:
        await websocket.close(
            code=CLOSE_BAD_HANDSHAKE,
            reason=f"sample_rate must be {settings.sample_rate}",
        )
        return None

    return config


async def _handle_text_frame(text: str, participant: Participant) -> None:
    try:
        payload = json.loads(text)
    except json.JSONDecodeError:
        logger.debug("Ignoring non-JSON text frame from %s", participant.user_id)
        return

    if payload.get("type") == "end":
        _signal_shutdown(participant)
    else:
        logger.debug("Ignoring unrecognized text frame type from %s: %r", participant.user_id, payload.get("type"))


def _signal_shutdown(participant: Participant) -> None:
    """Push the None sentinel, guaranteed to get through even if the queue is full."""
    try:
        participant.frame_queue.put_nowait(None)
    except asyncio.QueueFull:
        try:
            participant.frame_queue.get_nowait()
        except asyncio.QueueEmpty:
            pass
        try:
            participant.frame_queue.put_nowait(None)
        except asyncio.QueueFull:
            logger.warning("Could not deliver shutdown sentinel to %s, queue full", participant.user_id)


async def _cleanup(call_id: str, participant: Participant) -> None:
    if participant.consumer_task is not None and not participant.consumer_task.done():
        _signal_shutdown(participant)
        try:
            await asyncio.wait_for(participant.consumer_task, timeout=settings.max_segment_ms / 1000 + 2)
        except asyncio.TimeoutError:
            participant.consumer_task.cancel()

    registry.remove_participant(call_id, participant.user_id, expected=participant)
    logger.info("Participant %s left room %s", participant.user_id, call_id)
