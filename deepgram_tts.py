import os
from deepgram import DeepgramClient
from config import DEEPGRAM_API_KEY, DEEPGRAM_TTS_EN_VOICE, AUDIO_OUTPUT_DIR
from text_to_speech import text_to_speech as aws_tts

def text_to_speech(text, language='en'):
    """
    Converts text to speech using Deepgram Aura for English, 
    with fallback to AWS Polly/gTTS for regional Indian languages.
    """
    os.makedirs(AUDIO_OUTPUT_DIR, exist_ok=True)
    output_path = os.path.join(AUDIO_OUTPUT_DIR, "explanation.wav")

    # Use Deepgram for English
    if language.startswith('en'):
        print(f"  Using Deepgram Aura: {DEEPGRAM_TTS_EN_VOICE}")
        try:
            client = DeepgramClient(api_key=DEEPGRAM_API_KEY)
            
            response = client.speak.v1.audio.generate(
                text=text,
                model=DEEPGRAM_TTS_EN_VOICE,
            )
            
            with open(output_path, "wb") as f:
                for chunk in response:
                    f.write(chunk)
            
            print(f"  Audio saved via Deepgram: {output_path}")
            return output_path
        except Exception as e:
            print(f"  Deepgram TTS failed, falling back: {e}")
            return aws_tts(text, language)
    else:
        # Fallback to AWS Polly/gTTS for regional languages
        print(f"  Using Fallback TTS (Polly/gTTS) for language: {language}")
        return aws_tts(text, language)

if __name__ == "__main__":
    text_to_speech("Deepgram is now active.", "en")
