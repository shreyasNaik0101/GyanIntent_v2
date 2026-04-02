import asyncio
import sys
import sounddevice as sd
from amazon_transcribe.client import TranscribeStreamingClient
from amazon_transcribe.model import TranscriptResultStream
from amazon_transcribe.handlers import TranscriptResultStreamHandler
from config import AWS_REGION, AWS_ACCESS_KEY, AWS_SECRET_KEY

class MyEventHandler(TranscriptResultStreamHandler):
    def __init__(self, transcript_result_stream: TranscriptResultStream):
        super().__init__(transcript_result_stream)
        self.full_transcript = []
        self.latest_live = ""
        self.detected_language = "en"
        self.stop_event = asyncio.Event()

    async def handle_transcript_event(self, transcript_event):
        results = transcript_event.transcript.results
        for result in results:
            # Capture the identified language code if available
            if hasattr(result, 'language_code') and result.language_code:
                self.detected_language = result.language_code

            if result.alternatives:
                transcript = result.alternatives[0].transcript
                
                if not result.is_partial:
                    print(f"\r Final: {transcript}")
                    self.full_transcript.append(transcript)
                    self.latest_live = ""
                else:
                    print(f"\r Live: {transcript}", end="", flush=True)
                    self.latest_live = transcript

async def mic_stream(queue, loop):
    """
    Callback for sounddevice to put chunks into the queue.
    """
    def callback(indata, frames, time, status):
        if status:
            print(status, file=sys.stderr)
        # Use the captured loop to safely put data into the queue from a separate thread
        loop.call_soon_threadsafe(queue.put_nowait, indata.tobytes())

    stream = sd.InputStream(
        samplerate=16000,
        channels=1,
        dtype="int16",
        callback=callback
    )
    with stream:
        while True:
            await asyncio.sleep(0.1)

async def write_chunks(queue, stream):
    """
    Take chunks from queue and yield them to AWS.
    """
    while True:
        chunk = await queue.get()
        if chunk is None:
            break
        await stream.input_stream.send_audio_event(audio_chunk=chunk)
    await stream.input_stream.end_stream()

async def amazon_stream_transcribe(duration=30):
    """
    Starts live AWS Transcribe Streaming.
    """
    client = TranscribeStreamingClient(region=AWS_REGION)
    
    # Identify multiple languages (English and Major Indian ones)
    stream = await client.start_stream_transcription(
        language_code=None,
        media_sample_rate_hz=16000,
        media_encoding="pcm",
        identify_language=True,
        language_options=['en-US', 'hi-IN', 'mr-IN', 'kn-IN', 'te-IN']
    )

    handler = MyEventHandler(stream.output_stream)
    queue = asyncio.Queue()

    print(f"\n [AWS LIVE] Recording... Speak now! (Auto-stops when you finish, or after {duration}s)\n")

    # Run mic and sender in parallel
    loop = asyncio.get_event_loop()
    mic_task = asyncio.create_task(mic_stream(queue, loop))
    sender_task = asyncio.create_task(write_chunks(queue, stream))
    
    # Handle the transcript events
    try:
        await asyncio.wait_for(handler.handle_events(), timeout=duration)
    except asyncio.TimeoutError:
        print("\n [Timeout] Finished listening.")
    except Exception as e:
        if "CANCELLED" not in str(e):
            print(f"\n Error: {e}")
    finally:
        # 1. Stop the microphone
        mic_task.cancel()
        
        # 2. Signal end of stream to AWS
        await queue.put(None)
        
        # 3. Wait for sender to finish sending the 'end_stream' event
        try:
            await asyncio.wait_for(sender_task, timeout=2.0)
        except:
            pass

    # Extract results
    final_text = " ".join(handler.full_transcript)
    if handler.latest_live and not final_text.endswith(handler.latest_live):
        final_text += " " + handler.latest_live
        
    return final_text.strip(), handler.detected_language

if __name__ == "__main__":
    asyncio.run(amazon_stream_transcribe(15))
