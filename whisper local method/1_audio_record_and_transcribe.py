import whisper
import pyaudio
import wave
import numpy as np
import tempfile
import time
import threading
import os
import signal

# Load Whisper model (base/small/medium/large depending on your system)
model = whisper.load_model("tiny")

# Audio config
CHUNK = 1024  # Buffer size
FORMAT = pyaudio.paInt16
CHANNELS = 1
RATE = 16000  # Whisper prefers 16000 Hz

# Create PyAudio stream
p = pyaudio.PyAudio()

stream = p.open(format=FORMAT,
                channels=CHANNELS,
                rate=RATE,
                input=True,
                frames_per_buffer=CHUNK)

print("🎤 Listening... Press Ctrl+C to stop.")

# Define a custom temporary directory
CUSTOM_TEMP_DIR = "d:\\SIC-Coding and Programming\\1_project\\temp"
os.makedirs(CUSTOM_TEMP_DIR, exist_ok=True)

# Termination flag
terminate = False

def signal_handler(signum, frame):
    global terminate
    terminate = True
    print("\n🛑 Stopping...")

# Register signal handler for graceful termination
signal.signal(signal.SIGINT, signal_handler)

def record_and_transcribe(interval=5):
    count = 0
    global terminate
    while not terminate:
        print(f"\n⏱️ Recording {interval} seconds...")
        frames = []

        for _ in range(0, int(RATE / CHUNK * interval)):
            if terminate:
                break
            data = stream.read(CHUNK)
            frames.append(data)

        if terminate:
            break

        # Save to custom temp WAV file
        try:
            with tempfile.NamedTemporaryFile(suffix=".wav", dir=CUSTOM_TEMP_DIR, delete=False) as tmpfile:
                wf = wave.open(tmpfile.name, 'wb')
                wf.setnchannels(CHANNELS)
                wf.setsampwidth(p.get_sample_size(FORMAT))
                wf.setframerate(RATE)
                wf.writeframes(b''.join(frames))
                wf.close()

                # Transcribe with Whisper
                print("🧠 Transcribing...")
                result = model.transcribe(tmpfile.name)
                print("📝", result['text'])
                count += 1
                if count == 5:
                    print("🛑 Stopping after 5 recordings.")
                    terminate = True
        except PermissionError as e:
            print(f"❌ Permission Error: {e}")
        except Exception as e:
            print(f"❌ Unexpected Error: {e}")

    print("🛑 Recording stopped.")

# Run in separate thread to allow graceful termination
try:
    thread = threading.Thread(target=record_and_transcribe)
    thread.start()
    thread.join()  # Wait for the thread to finish
except Exception as e:
    print(f"❌ Error: {e}")
finally:
    stream.stop_stream()
    stream.close()
    p.terminate()
