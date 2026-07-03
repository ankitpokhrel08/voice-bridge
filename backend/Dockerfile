# Transcription/translation backend.
# Build from the backend/ directory:  docker build -t voice-bridge-backend backend/
#
# Hugging Face Spaces notes (free Docker Space works well for this service):
# - Spaces route traffic to port 7860, which is the default here.
# - Runs as a non-root user (uid 1000), required by Spaces.
# - Whisper + Argos models download on first boot (~500MB); the first start
#   takes a few minutes, then they're cached in the container's home dir.

FROM python:3.12-slim

RUN useradd -m -u 1000 appuser

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

USER appuser
ENV HOME=/home/appuser

ENV PORT=7860
EXPOSE 7860

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
