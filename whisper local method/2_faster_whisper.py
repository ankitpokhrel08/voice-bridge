import pyaudio
import wave
import numpy as np
import tempfile
import time
import threading
import os
from faster_whisper import WhisperModel

# Load faster-whisper model (use "base", "small", etc.)
model = WhisperModel("base", compute_type="int8")  # Use "float16" or "int8_float16" if on GPU

# Audio input configuration
CHUNK = 1024
FORMAT = pyaudio.paInt16
CHANNELS = 1
RATE = 16000  # required for Whisper

p = pyaudio.PyAudio()

stream = p.open(format=FORMAT,
                channels=CHANNELS,
                rate=RATE,
                input=True,
                frames_per_buffer=CHUNK)

print("🎙️ Listening with faster-whisper... Press Ctrl+C to stop.")

# Define a custom temporary directory
CUSTOM_TEMP_DIR = "d:\\SIC-Coding and Programming\\1_project\\temp"
os.makedirs(CUSTOM_TEMP_DIR, exist_ok=True)

def record_and_transcribe(interval=3):
    count = 0  # Initialize count
    terminate = 5  # Set the limit for recordings
    while count < terminate:
        print(f"\n⏱️ Recording {interval} seconds... (Attempt {count + 1}/{terminate})")
        frames = []

        for _ in range(0, int(RATE / CHUNK * interval)):
            data = stream.read(CHUNK)
            frames.append(data)

        # Save to custom temp WAV file
        try:
            with tempfile.NamedTemporaryFile(suffix=".wav", dir=CUSTOM_TEMP_DIR, delete=False) as tmpfile:
                wf = wave.open(tmpfile.name, 'wb')
                wf.setnchannels(CHANNELS)
                wf.setsampwidth(p.get_sample_size(FORMAT))
                wf.setframerate(RATE)
                wf.writeframes(b''.join(frames))
                wf.close()

                # Transcribe with faster-whisper
                print("🧠 Transcribing...")
                segments, info = model.transcribe(tmpfile.name)
                print("📝 Output:")
                for segment in segments:
                    print(f"[{segment.start:.2f} - {segment.end:.2f}] {segment.text}")
        except PermissionError as e:
            print(f"❌ Permission Error: {e}")
        except Exception as e:
            print(f"❌ Unexpected Error: {e}")
        finally:
            if os.path.exists(tmpfile.name):
                os.remove(tmpfile.name)
        count += 1  # Increment count

    print("✅ Recording and transcription completed.")
    stream.stop_stream()
    stream.close()
    p.terminate()

try:
    thread = threading.Thread(target=record_and_transcribe)
    thread.start()
except KeyboardInterrupt:
    print("🛑 Stopped")
    stream.stop_stream()
    stream.close()
    p.terminate()
