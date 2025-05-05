import sounddevice as sd
import numpy as np
import whisper
import tempfile
import scipy.io.wavfile as wav

# Load Whisper model (small is faster, you can use 'base', 'small', 'medium', 'large')
model = whisper.load_model("small")

# Settings
duration = 5  # seconds
samplerate = 16000  # Whisper expects 16000 Hz audio

def record_audio(duration, samplerate):
    print("Recording...")
    audio = sd.rec(int(duration * samplerate), samplerate=samplerate, channels=1, dtype='float32')
    sd.wait()
    print("Recording complete.")
    return audio.flatten()

def transcribe(audio, samplerate):
    # Save audio temporarily
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=True) as tmpfile:
        wav.write(tmpfile.name, samplerate, audio)
        result = model.transcribe(tmpfile.name)
        return result['text']

def main():
    while True:
        audio = record_audio(duration, samplerate)
        text = transcribe(audio, samplerate)
        print("You said:", text)
        print("-" * 40)

if __name__ == "__main__":
    main()
