import threading
import queue
import numpy as np
import pyaudio
import soundfile as sf
from io import BytesIO
from faster_whisper import WhisperModel
import wave 
import os

def transcribe_chunk(model, file_path):
    segments, _ = model.transcribe(file_path)
    transcription = ""
    for segment in segments:
        transcription += segment.text + " "
    return transcription.strip()    

def record_chunk(p, stream, file_path, chunk_length =1):
    frames = []
    for _ in range(0, int(16000 / 1024 * chunk_length)):
        data = stream.read(1024)
        frames.append(data)
    
    wf = wave.open(file_path, 'wb')
    wf.setnchannels(1)
    wf.setsampwidth(p.get_sample_size(pyaudio.paInt16))
    wf.setframerate(16000)
    wf.writeframes(b''.join(frames))
    wf.close()
    
def main():
    # Load the model (base/medium/large, etc.)
    model = WhisperModel("tiny.en", device='cuda', compute_type="float16")  # Use float16 if on GPU

    p = pyaudio.PyAudio()
    stream = p.open(format=pyaudio.paInt16,
                    channels=1,
                    rate=16000,
                    input=True,
                    frames_per_buffer=1024)
   
    accumulated_transcription = ""
    
    try:
        while True:
            # Record a chunk of audio
            chunk_file = "temp_chunk.wav"
            record_chunk(p, stream, chunk_file)
            transcription = transcribe_chunk(model, chunk_file)
            print(transcription)
            os.remove(chunk_file)
            
            accumulated_transcription += transcription + " "    
    except KeyboardInterrupt:
        print("\nStopping transcription...")
        with open("final_transcription.txt", "w") as f:
            f.write(accumulated_transcription)
    finally:
        print("Log:")
        print(accumulated_transcription)
        stream.stop_stream()
        stream.close()
        p.terminate()

if __name__ == "__main__":
    main()
