import asyncio
import sys
import numpy as np
import sounddevice as sd
from deepgram import AsyncDeepgramClient
import config

async def stream_transcribe(duration=10, language='en'):
    """
    Streams audio from the microphone to Deepgram and prints transcripts in real-time.
    """
    if not config.DEEPGRAM_API_KEY:
        print("Error: DEEPGRAM_API_KEY not found in .env")
        return ""

    try:
        async_client = AsyncDeepgramClient(api_key=config.DEEPGRAM_API_KEY)
        full_transcript = []

        # Increase safety timeout for dynamic mode
        safety_timeout = 30
        stop_event = asyncio.Event()
        detected_language = language

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

            # Buffer to store audio for AWS fallback
            audio_buffer = []
            loop = asyncio.get_event_loop()
            latest_live_transcript = ""

            print(f"\n Recording starting... Speak now! (Auto-stops when you finish, or after {safety_timeout}s)\n")

            def mic_callback(indata, frames, time, status):
                if status:
                    print(status, file=sys.stderr)
                
                # Save to buffer for AWS fallback
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
                async for message in dg_connection:
                    # 1. Check for UtteranceEnd (VAD stop signal)
                    msg_type = getattr(message, 'type', None)
                    if msg_type == 'UtteranceEnd':
                        print("\n [VAD] End of speech detected.")
                        stop_event.set()
                        break
                    
                    # 2. Safely parse transcription results
                    channel = getattr(message, 'channel', None)
                    if channel and hasattr(channel, 'alternatives'):
                        alt = channel.alternatives[0]
                        transcript = alt.transcript
                        
                        # Capture detected language from alternatives (new SDK behavior)
                        if getattr(alt, 'languages', None):
                            detected_language = alt.languages[0]
                        # Capture detected language from metadata (fallback)
                        elif hasattr(message, 'metadata') and hasattr(message.metadata, 'language'):
                            detected_language = message.metadata.language
                        
                        if transcript:
                            is_final = getattr(message, 'is_final', False)
                            speech_final = getattr(message, 'speech_final', False)
                            
                            if is_final:
                                print(f"\r Final: {transcript}")
                                full_transcript.append(transcript)
                                latest_live_transcript = ""
                                
                                if speech_final:
                                    print("\n [VAD] Speech final detected.")
                                    stop_event.set()
                                    break
                            else:
                                print(f"\r Live: {transcript}", end="", flush=True)
                                latest_live_transcript = transcript

            with stream:
                receiver_task = asyncio.create_task(receive_transcripts())
                try:
                    await asyncio.wait_for(stop_event.wait(), timeout=safety_timeout)
                except asyncio.TimeoutError:
                    print(f"\n [Timeout] Reached {safety_timeout}s safety limit.")
                
            if hasattr(dg_connection, 'send_finalize'):
                await dg_connection.send_finalize()
            
            try:
                await asyncio.wait_for(receiver_task, timeout=2.0)
            except (asyncio.TimeoutError, asyncio.CancelledError):
                pass
                
            print("\n Recording finished.")
            if latest_live_transcript:
                print(f" Auto-Flushing: {latest_live_transcript}")
                full_transcript.append(latest_live_transcript)
            
            # Save the captured audio for AWS fallback
            import scipy.io.wavfile as wav
            raw_audio_path = "temp_audio/raw_stream.wav"
            if audio_buffer:
                all_audio = np.concatenate(audio_buffer, axis=0)
                wav.write(raw_audio_path, 16000, all_audio)
            
            return " ".join(full_transcript), detected_language, raw_audio_path

    except Exception as e:
        print(f" Deepgram Streaming Error: {e}")
        return ""

if __name__ == "__main__":
    asyncio.run(stream_transcribe(duration=5))
