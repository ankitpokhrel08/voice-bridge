import pyaudio
import wave
import requests
import io
import threading
import time
import pandas as pd

API_URL = "https://ea41-34-125-72-78.ngrok-free.app/transcribe"

# Load language CSV and set language
lan_list = pd.read_csv("../language.csv")
lan = "Nepali"
language_code = lan_list[lan_list['Language'] == lan]['Code'].values[0]
init_prompt = "College project"

# Audio stream settings
CHUNK = 1024 * 2           # Frame size
FORMAT = pyaudio.paInt16   # 16-bit PCM
CHANNELS = 1               # Mono audio
RATE = 16000               # Sampling rate
RECORD_SECONDS = 5         # How often to send audio (in seconds)

p = pyaudio.PyAudio()

# Open microphone stream
stream = p.open(format=FORMAT,
                channels=CHANNELS,
                rate=RATE,
                input=True,
                frames_per_buffer=CHUNK)

print("🎙️ Listening and sending real-time audio... Press Ctrl+C to stop.")

def send_audio_chunk(frames):
    buffer = io.BytesIO()
    wf = wave.open(buffer, 'wb')
    wf.setnchannels(CHANNELS)
    wf.setsampwidth(p.get_sample_size(FORMAT))
    wf.setframerate(RATE)
    wf.writeframes(b''.join(frames))
    wf.close()
    buffer.seek(0)

    files = {'file': ('chunk.wav', buffer, 'audio/wav')}
    try:
        response = requests.post(
            API_URL,
            files=files,
            data={
                'lan_code': language_code,
                'prompt': init_prompt
            }
        )
        response.raise_for_status()
        text = response.json().get("translation", "[No output]")
        print(f"✅ Transcription: {text}")
    except Exception as e:
        print(f"❌ API Error: {e}")

try:
    while True:
        frames = []
        start_time = time.time()

        # Record audio chunk
        for _ in range(0, int(RATE / CHUNK * RECORD_SECONDS)):
            data = stream.read(CHUNK)
            frames.append(data)

        # Send chunk in a new thread to avoid blocking recording
        threading.Thread(target=send_audio_chunk, args=(frames,), daemon=True).start()

except KeyboardInterrupt:
    print("\n🛑 Stopped by user.")

finally:
    stream.stop_stream()
    stream.close()
    p.terminate()
