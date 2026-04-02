import os
from deepgram import DeepgramClient
import config

def speech_to_text(audio_file_path: str, force_lang: str = None) -> dict:
    """
    Convert speech audio file to text using Deepgram (Pre-recorded).
    """
    if not config.DEEPGRAM_API_KEY:
        raise ValueError("DEEPGRAM_API_KEY not found in environment")

    try:
        client = DeepgramClient(api_key=config.DEEPGRAM_API_KEY)

        with open(audio_file_path, "rb") as file:
            buffer_data = file.read()

        # Handle language selection
        lang = force_lang if force_lang else "hi" 
        if lang == "hi-en":
            lang = "hi"

        print(f"  Transcribing with Deepgram ({config.DEEPGRAM_STT_MODEL})...")
        response = client.listen.v1.media.transcribe_file(
            request=buffer_data,
            model=config.DEEPGRAM_STT_MODEL,
            smart_format=True,
            language=lang,
        )
        
        transcript = response.results.channels[0].alternatives[0].transcript
        detected_lang = response.metadata.get("language", lang)

        print(f"  Deepgram STT Complete")
        print(f"  Detected language: {detected_lang}")
        print(f"  Transcript: {transcript[:100]}...")

        return {
            "transcript": transcript,
            "language": detected_lang
        }

    except Exception as e:
        print(f"  Deepgram STT Error: {e}")
        raise

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        res = speech_to_text(sys.argv[1])
        print(res)
    else:
        print("Usage: python deepgram_stt.py <audio_file>")
