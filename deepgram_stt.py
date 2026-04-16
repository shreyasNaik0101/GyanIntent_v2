import os
from deepgram import DeepgramClient
import config

def speech_to_text(audio_file_path: str, force_lang: str = None) -> dict:
    """
    Transcribes a local audio file using Deepgram STT Nova.
    Supports English and Hindi.
    Updated for deepgram-sdk v6.1.1.
    """
    if not os.path.exists(audio_file_path):
        print(f"Error: Audio file not found at {audio_file_path}")
        return None

    try:
        client = DeepgramClient(api_key=config.DEEPGRAM_API_KEY)

        with open(audio_file_path, "rb") as file:
            buffer_data = file.read()

        # Determine language
        lang = "en"
        if force_lang and force_lang.lower() == 'hi':
            lang = "hi"
        elif getattr(config, 'MANIM_LANGUAGE', 'en') == 'hi':
            lang = "hi"

        print(f"  Transcribing with Deepgram ({config.DEEPGRAM_STT_MODEL})...")
        
        # v6.1.1 uses keyword arguments for the media client
        response = client.listen.v1.media.transcribe_file(
            request=buffer_data,
            model=config.DEEPGRAM_STT_MODEL,
            smart_format=True,
            language=lang,
        )
        
        transcript = response.results.channels[0].alternatives[0].transcript
        detected_lang = getattr(response.metadata, "language", lang)

        print(f"  Deepgram STT Complete")
        
        return {
            "text": transcript,
            "language": detected_lang
        }

    except Exception as e:
        print(f"  Deepgram STT Error: {e}")
        return None

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        res = speech_to_text(sys.argv[1])
        if res:
            print(f"Result: {res}")
