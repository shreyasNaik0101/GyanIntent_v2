import asyncio
import sys
import os
import numpy as np
import sounddevice as sd
from deepgram import AsyncDeepgramClient
import config

async def stream_transcribe(duration=10, language='en'):
    """
    Streams audio from the microphone to Deepgram and prints transcripts in real-time.
    Updated for deepgram-sdk v6.1.1 (Fern-generated).
    """
    if not config.DEEPGRAM_API_KEY:
        print("Error: DEEPGRAM_API_KEY not found in .env")
        return ""

    try:
        async_client = AsyncDeepgramClient(api_key=config.DEEPGRAM_API_KEY)
        full_transcript = []
        latest_live_transcript = ""
        detected_language = language
        stop_event = asyncio.Event()
        audio_buffer = []

        print(f"\n [Deepgram Live] Starting connection...")
        
        # v6.1.1 uses an async context manager for connect
        async with async_client.listen.v1.connect(
            model="nova-2",
            language=language,
            smart_format="true",
            interim_results="true",
            utterance_end_ms="2000",
            vad_events="true",
            encoding="linear16",
            sample_rate=16000
        ) as dg_connection:

            loop = asyncio.get_event_loop()

            def mic_callback(indata, frames, time, status):
                if status:
                    print(status, file=sys.stderr)
                
                audio_buffer.append(indata.copy())
                
                asyncio.run_coroutine_threadsafe(
                    dg_connection.send_media(indata.tobytes()), 
                    loop
                )

            stream = sd.InputStream(
                samplerate=16000, 
                channels=1, 
                dtype='int16', 
                callback=mic_callback
            )

            async def receive_transcripts():
                nonlocal latest_live_transcript, detected_language
                # v6.1.1 dg_connection is an async iterator
                async for message in dg_connection:
                    # Check message type
                    msg_type = getattr(message, 'type', None)
                    
                    if msg_type == 'UtteranceEnd':
                        print("\n [VAD] End of speech detected.")
                        stop_event.set()
                        break
                    
                    if hasattr(message, 'channel'):
                        alt = message.channel.alternatives[0]
                        transcript = alt.transcript
                        
                        # Capture detected language
                        if hasattr(message, 'metadata') and hasattr(message.metadata, 'language'):
                            detected_language = message.metadata.language
                        
                        if transcript:
                            if getattr(message, 'is_final', False):
                                print(f"\r Final: {transcript}")
                                full_transcript.append(transcript)
                                latest_live_transcript = ""
                                if getattr(message, 'speech_final', False):
                                    print("\n [VAD] Speech final detected.")
                                    stop_event.set()
                                    break
                            else:
                                print(f"\r Live: {transcript}", end="", flush=True)
                                latest_live_transcript = transcript

            print(f"\n Listening... Speak now! (Auto-stops when you finish)\n")

            with stream:
                receiver_task = asyncio.create_task(receive_transcripts())
                try:
                    await asyncio.wait_for(stop_event.wait(), timeout=30)
                except asyncio.TimeoutError:
                    print(f"\n [Timeout] Finished listening.")
                
                # Close receiver
                receiver_task.cancel()

            print("\n [Deepgram Live] Connection closing.")
            
        # Post-processing
        if latest_live_transcript:
            full_transcript.append(latest_live_transcript)
        
        # Save captured audio
        import scipy.io.wavfile as wav
        raw_audio_path = "temp_audio/raw_stream.wav"
        os.makedirs("temp_audio", exist_ok=True)
        if audio_buffer:
            all_audio = np.concatenate(audio_buffer, axis=0)
            wav.write(raw_audio_path, 16000, all_audio)
        
        return " ".join(full_transcript), detected_language, raw_audio_path

    except Exception as e:
        print(f" Deepgram Streaming Error: {e}")
        import traceback
        traceback.print_exc()
        return ""

if __name__ == "__main__":
    asyncio.run(stream_transcribe(duration=5))
