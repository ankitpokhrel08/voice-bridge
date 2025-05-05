import threading
import queue
import numpy as np
import pyaudio
import soundfile as sf
from io import BytesIO
from faster_whisper import WhisperModel

# Load the model (base/medium/large, etc.)
model = WhisperModel("tiny.en", device='cuda', compute_type="float16")  # Use float16 if on GPU

# Audio parameters
RATE = 16000
CHANNELS = 1
FORMAT = pyaudio.paInt16
CHUNK = 1024
RECORD_SECONDS = 3  # how much audio per chunk to transcribe

# Thread-safe queue
audio_queue = queue.Queue()

# Event to signal threads to stop
stop_event = threading.Event()

# Start PyAudio
p = pyaudio.PyAudio()
stream = p.open(format=FORMAT,
                channels=CHANNELS,
                rate=RATE,
                input=True,
                frames_per_buffer=CHUNK)

print("🎙️ Starting live transcription...")

# 🎧 Thread 1: Recorder
def record_audio():
    while not stop_event.is_set():
        frames = []
        for _ in range(0, int(RATE / CHUNK * RECORD_SECONDS)):
            if stop_event.is_set():
                break
            data = stream.read(CHUNK)
            frames.append(data)

        if frames:
            # Convert to bytes then NumPy array
            audio_bytes = b''.join(frames)
            audio_np = np.frombuffer(audio_bytes, np.int16).astype(np.float32) / 32768.0  # Normalize
            audio_queue.put(audio_np)  # Send to transcriber thread

# 🧠 Thread 2: Transcriber
def transcribe_audio():
    while not stop_event.is_set():
        try:
            audio_np = audio_queue.get(timeout=1)  # Wait for audio from queue
        except queue.Empty:
            continue

        # Convert NumPy audio to in-memory WAV using BytesIO
        buffer = BytesIO()
        sf.write(buffer, audio_np, RATE, format="WAV")
        buffer.seek(0)

        print("🧠 Transcribing...")
        segments, info = model.transcribe(buffer)
        print("📝 Transcription:")
        for segment in segments:
            print(f"[{segment.start:.2f}s - {segment.end:.2f}s]: {segment.text}")

# Start both threads
recorder_thread = threading.Thread(target=record_audio, daemon=True)
transcriber_thread = threading.Thread(target=transcribe_audio, daemon=True)

recorder_thread.start()
transcriber_thread.start()

# Keep main thread alive
try:
    while True:
        pass
except KeyboardInterrupt:
    print("🛑 Exiting...")
    stop_event.set()  # Signal threads to stop
    recorder_thread.join()  # Wait for recorder thread to finish
    transcriber_thread.join()  # Wait for transcriber thread to finish
    stream.stop_stream()
    stream.close()
    p.terminate()