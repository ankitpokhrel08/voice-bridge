from typing import Literal

from pydantic import BaseModel, Field


class ConfigMessage(BaseModel):
    """First text frame a client must send after connecting."""

    type: Literal["config"] = "config"
    preferred_language: str
    spoken_language: str = "auto"
    sample_rate: int | None = None


class EndMessage(BaseModel):
    """Client signals it is done streaming audio; server flushes and closes."""

    type: Literal["end"] = "end"


class ReadyMessage(BaseModel):
    type: Literal["ready"] = "ready"


class CaptionMessage(BaseModel):
    type: Literal["caption"] = "caption"
    segment_id: int
    from_user: str = Field(alias="from")
    original_text: str
    translated_text: str
    source_lang: str
    target_lang: str
    is_final: bool = True
    ts: float

    model_config = {"populate_by_name": True}

    def to_wire(self) -> dict:
        return self.model_dump(by_alias=True)


class ChatSendMessage(BaseModel):
    """Client -> server: a typed chat message from this participant."""

    type: Literal["chat"] = "chat"
    text: str
    # Client-generated id, echoed back so the sender's UI can reconcile its
    # optimistic pending bubble with the confirmed delivery.
    client_id: str | None = None


class ChatRelayMessage(BaseModel):
    """Server -> client: a chat message, translated for its recipient.

    The sender receives an echo (target_lang == source_lang, translated_text ==
    original_text) confirming delivery; the peer receives the translated copy.
    Mirrors CaptionMessage's wire shape, including the `from` alias.
    """

    type: Literal["chat"] = "chat"
    message_id: int
    from_user: str = Field(alias="from")
    original_text: str
    translated_text: str
    source_lang: str
    target_lang: str
    ts: float
    # Present only on the sender's echo (see ChatSendMessage.client_id).
    client_id: str | None = None

    model_config = {"populate_by_name": True}

    def to_wire(self) -> dict:
        return self.model_dump(by_alias=True)


class ErrorMessage(BaseModel):
    type: Literal["error"] = "error"
    message: str
