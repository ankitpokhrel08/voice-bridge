import asyncio
import logging
from dataclasses import dataclass, field

from starlette.websockets import WebSocket

logger = logging.getLogger("transcribe.rooms")

MAX_PARTICIPANTS_PER_ROOM = 2


@dataclass
class Participant:
    user_id: str
    websocket: WebSocket
    preferred_language: str
    spoken_language: str
    frame_queue: "asyncio.Queue[bytes | None]"
    consumer_task: asyncio.Task | None = None
    next_segment_id: int = 0
    sticky_source_lang: str | None = None
    next_chat_id: int = 0
    # Tail of this participant's chat-relay task chain: each chat message's
    # relay task awaits the previous one, so translations (which can be slow)
    # never reorder messages and never block the audio receive loop.
    chat_relay_tail: asyncio.Task | None = None


@dataclass
class Room:
    call_id: str
    participants: dict[str, Participant] = field(default_factory=dict)

    def peer_of(self, user_id: str) -> Participant | None:
        for other_id, participant in self.participants.items():
            if other_id != user_id:
                return participant
        return None


class RoomRegistry:
    """In-memory, single-process registry of active call rooms.

    All mutation happens synchronously (no `await` inside critical sections),
    so plain dict access is safe under asyncio's single-threaded event loop
    without needing an explicit lock.
    """

    def __init__(self) -> None:
        self._rooms: dict[str, Room] = {}

    def room_is_full(self, call_id: str, user_id: str) -> bool:
        room = self._rooms.get(call_id)
        if room is None:
            return False
        if user_id in room.participants:
            return False
        return len(room.participants) >= MAX_PARTICIPANTS_PER_ROOM

    def add_participant(self, call_id: str, participant: Participant) -> Room:
        room = self._rooms.setdefault(call_id, Room(call_id=call_id))
        room.participants[participant.user_id] = participant
        return room

    def get_room(self, call_id: str) -> Room | None:
        return self._rooms.get(call_id)

    def remove_participant(self, call_id: str, user_id: str, expected: Participant | None = None) -> None:
        """Remove a participant from its room.

        `expected` guards against a delayed cleanup evicting a NEWER
        connection for the same user_id: when a client reconnects (same
        user, new socket) while the old connection's consumer task is still
        draining (e.g. stuck behind a whisper backlog), the old connection's
        cleanup fires *after* the replacement joined. Without this check it
        would remove the fresh participant, leaving the new call's captions
        with no peer to relay to.
        """
        room = self._rooms.get(call_id)
        if room is None:
            return
        current = room.participants.get(user_id)
        if expected is not None and current is not expected:
            logger.debug("Skipping stale cleanup for %s in room %s (already replaced)", user_id, call_id)
            return
        room.participants.pop(user_id, None)
        if not room.participants:
            del self._rooms[call_id]
            logger.debug("Room %s emptied and removed", call_id)


registry = RoomRegistry()
