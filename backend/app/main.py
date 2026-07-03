import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from .config import settings
from .transcriber import Transcriber
from .translator import get_translator
from .ws_routes import router as ws_router

logging.basicConfig(level=settings.log_level.upper())
logger = logging.getLogger("transcribe.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up: loading transcription/translation backends")
    app.state.transcriber = Transcriber(settings)
    app.state.translator = get_translator(settings)
    logger.info("Startup complete")
    yield
    logger.info("Shutting down")
    app.state.transcriber.shutdown()
    aclose = getattr(app.state.translator, "aclose", None)
    if aclose is not None:
        await aclose()
    shutdown = getattr(app.state.translator, "shutdown", None)
    if shutdown is not None:
        shutdown()


app = FastAPI(title="Live Call Transcription Backend", lifespan=lifespan)
app.include_router(ws_router)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}
