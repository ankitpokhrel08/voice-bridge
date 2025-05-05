from pydub import AudioSegment
import requests
import io

# Replace this with your actual ngrok URL
API_URL = "https://cfdb-34-173-65-36.ngrok-free.app/transcribe"

# Load your full audio file (can be M4A, MP3, WAV, etc.)
audio = AudioSegment.from_file("../sample audio/my_voice.m4a")


# Set chunk size (in milliseconds), e.g., 5 seconds
chunk_duration = 5000

# Create audio chunks
chunks = [audio[i:i + chunk_duration] for i in range(0, len(audio), chunk_duration)]

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
        response = requests.post(API_URL, files=files)
        response.raise_for_status()
        result = response.json().get("translation", "[No output]")
        print(f"✅ Chunk {idx + 1} response: {result}")
    except Exception as e:
        print(f"❌ Error in chunk {idx + 1}: {e}")
