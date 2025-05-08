from pydub import AudioSegment
import requests
import io
import pandas as pd 
from time import time
from dotenv import load_dotenv
import os
import re

load_dotenv()

GIST_ID = os.getenv("GIST_ID")
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")


def get_ngrok_from_gist(gist_id, token):
    try:
        response = requests.get(
            f"https://api.github.com/gists/{gist_id}",
            headers={"Authorization": f"token {token}"}
        )
        response.raise_for_status()
        gist_data = response.json()
        content = gist_data["files"]["ngrok-url.txt"]["content"]
        return content.strip()
    except Exception as e:
        print("❌ Failed to get Ngrok URL from Gist:", e)
        return None

ngrok_url = get_ngrok_from_gist(GIST_ID, GITHUB_TOKEN)
if not ngrok_url:
    raise Exception("Ngrok URL not found. Aborting...")

API_URL = re.search(r'"(https://[a-zA-Z0-9\-]+\.ngrok-free\.app)"', ngrok_url).group(1) + "/transcribe"



lan_list = pd.read_csv("../language.csv")

# lan = input("Enter the language: ")
lan = "Nepali"

language_code = lan_list[lan_list['Language'] == lan]['Code'].values[0]

print(language_code)
# init_prompt = input("Enter the prompt: ")
# init_prompt = "College project"
init_prompt = "College project"


# Load your full audio file (can be M4A, MP3, WAV, etc.)
audio = AudioSegment.from_file("../sample_sound/my_voice.m4a")

# Set chunk size (in milliseconds), e.g., 5 seconds
chunk_duration = 3000 if language_code == "en" else 5000  # 5 seconds for English, 10 seconds for others

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
