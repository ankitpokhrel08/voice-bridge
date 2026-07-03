from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="TRANSCRIBE_")

    host: str = "0.0.0.0"
    port: int = 8000
    log_level: str = "info"

    whisper_model_size: str = "small"
    whisper_device: str = "cpu"
    whisper_compute_type: str = "int8"
    # Greedy decoding: near-identical accuracy to beam 5 on the small model,
    # but keeps latency headroom when whisper shares the CPU with a live call.
    whisper_beam_size: int = 1
    transcribe_executor_workers: int = 1

    sample_rate: int = 16000
    vad_aggressiveness: int = 2
    vad_frame_ms: int = 30
    vad_start_frames: int = 3
    vad_silence_ms: int = 600
    max_segment_ms: int = 9000
    min_segment_ms: int = 250

    translation_provider: str = "argos"  # "argos" (free, offline) | "google" | "passthrough"
    google_translate_api_key: str | None = None
    translation_timeout_s: float = 5.0
    min_language_confidence: float = 0.6

    frame_queue_maxsize: int = 200
    relay_to_self: bool = False


settings = Settings()
