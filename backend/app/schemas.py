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


class ErrorMessage(BaseModel):
    type: Literal["error"] = "error"
    message: str
