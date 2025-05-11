import numpy as np
import pyaudio
import whisper

model = whisper.load_model("base")

CHUNK = 1024
RATE = 16000
CHANNELS = 1

p = pyaudio.PyAudio()
stream = p.open(format=pyaudio.paInt16,
                channels=CHANNELS,
                rate=RATE,
                input=True,
                frames_per_buffer=CHUNK)

print("🎤 Listening...")

while True:
    frames = []

    for _ in range(0, int(RATE / CHUNK * 5)):  # 5 seconds
        data = stream.read(CHUNK)
        frames.append(data)

    # Convert to NumPy array
    audio_bytes = b''.join(frames)
    audio_np = np.frombuffer(audio_bytes, np.int16).astype(np.float32) / 32768.0  # Normalize to [-1, 1]

    # Transcribe directly
    result = model.transcribe(audio_np)
    print("📝", result['text'])
