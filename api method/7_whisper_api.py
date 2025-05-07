from pydub import AudioSegment
import requests
import io
import pandas as pd 
from time import time
# Replace this with your actual ngrok URL
API_URL = "https://5d0a-34-143-154-46.ngrok-free.app/transcribe"


# Load your full audio file (can be M4A, MP3, WAV, etc.)
audio = AudioSegment.from_file("../sample_sound/audio_sample.m4a")

lan_list = pd.read_csv("../language.csv")

# lan = input("Enter the language: ")
lan = "English"

language_code = lan_list[lan_list['Language'] == lan]['Code'].values[0]

print(language_code)
# init_prompt = input("Enter the prompt: ")
# init_prompt = "College project"
init_prompt = "Lecture on AI and ML"

# Set chunk size (in milliseconds), e.g., 5 seconds
chunk_duration = 2000 if language_code == "en" else 5000  # 5 seconds for English, 10 seconds for others

# Create audio chunks
chunks = [audio[i:i + chunk_duration] for i in range(0, len(audio), chunk_duration)]

time1 = time()
# Loop through each chunk and send it to the API
for idx, chunk in enumerate(chunks):

    print(f"▶️ Sending chunk {idx + 1}/{len(chunks)}")

    # Export chunk to memory buffer
    buffer = io.BytesIO()
    chunk.export(buffer, format="wav")
    buffer.seek(0)

    # Prepare file for upload
    files = {'file': ("chunk.wav", buffer, "audio/wav")}

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
        result = response.json().get("translation", "[No output]")
        print(f"✅ Chunk {idx + 1} response: {result}")
    except Exception as e:
        print(f"❌ Error in chunk {idx + 1}: {e}")

time2 = time()
print(f"Total time taken: {time2 - time1} seconds")
