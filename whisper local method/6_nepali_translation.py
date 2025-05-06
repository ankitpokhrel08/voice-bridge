from pydub import AudioSegment
from faster_whisper import WhisperModel
import time
import io

# Load the faster-whisper model
model = WhisperModel("medium", device="cuda", compute_type="int8")  # Use "cpu" if needed

# Load the M4A audio
audio_path = "my_voice.m4a"  # Path to your audio file
audio = AudioSegment.from_file(audio_path, format="m4a")
audio = audio.set_channels(1).set_frame_rate(16000)  # Match Whisper's expected format

# Simulated "live" parameters
chunk_duration_ms = 5000  # 5 seconds per chunk

# Go through chunks one by one
print("🔄 Simulating live transcription...\n")

for i in range(0, len(audio), chunk_duration_ms):
    chunk = audio[i:i + chunk_duration_ms]

    # Export chunk to in-memory WAV
    buffer = io.BytesIO()
    chunk.export(buffer, format="wav")
    buffer.seek(0)

    # Transcribe the chunk
    segments, _ = model.transcribe(buffer, language="ne", task="translate")
    for seg in segments:
        print(f"{seg.text}")

    # Simulate real-time by waiting (optional)
    # time.sleep(chunk_duration_ms / 1000.0)