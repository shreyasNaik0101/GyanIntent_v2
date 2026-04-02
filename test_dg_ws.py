import asyncio
import websockets
import os
from dotenv import load_dotenv

load_dotenv()
API_KEY = os.getenv("DEEPGRAM_API_KEY")
url = "wss://api.deepgram.com/v1/listen?model=nova-3&encoding=linear16&sample_rate=16000"

async def test():
    try:
        async with websockets.connect(url, extra_headers={"Authorization": f"Token {API_KEY}"}) as ws:
            print("Connected!")
    except websockets.exceptions.InvalidStatusCode as e:
        print(f"Failed with {e.status_code}")
        print(f"Headers: {e.headers}")
    except Exception as e:
        print(f"Error: {e}")

asyncio.run(test())
