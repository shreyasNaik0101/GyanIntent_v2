from gtts import gTTS
import boto3
import os
import time
from config import AWS_REGION, AWS_ACCESS_KEY, AWS_SECRET_KEY, AUDIO_OUTPUT_DIR

def text_to_speech(text, language='en'):
    """
    Multilingual TTS with Polly (AWS) and gTTS (Google) fallback.
    """
    os.makedirs(AUDIO_OUTPUT_DIR, exist_ok=True)
    output_path = os.path.join(AUDIO_OUTPUT_DIR, "explanation.wav")
    
    # Use gTTS for Kannada or if Polly fails
    if language == 'kn':
        try:
            print(f"  Using gTTS for Kannada...")
            tts = gTTS(text=text, lang='kn')
            tts.save(output_path)
            return output_path
        except Exception as e:
            print(f"  gTTS failed for Kannada: {e}")
            # Continue to try Polly as last resort
            
    polly = boto3.client('polly', 
                         region_name=AWS_REGION,
                         aws_access_key_id=AWS_ACCESS_KEY,
                         aws_secret_access_key=AWS_SECRET_KEY)
    
    voice_map = {
        'en': 'Joanna',
        'hi': 'Kajal',
        'mr': 'Aditi',
        'te': 'Sravani',
        'kn': 'Kajal'
    }
    voice_id = voice_map.get(language, 'Joanna')
    
    # Use SSML for Polly to add a break
    ssml_text = f"<speak><break time='500ms'/>{text}</speak>"
    
    try:
        # Try Polly Neural
        response = polly.synthesize_speech(
            Text=ssml_text,
            TextType='ssml',
            OutputFormat='mp3',
            VoiceId=voice_id,
            Engine='neural'
        )
    except Exception:
        try:
            # Try Polly Standard
            response = polly.synthesize_speech(
                Text=ssml_text,
                TextType='ssml',
                OutputFormat='mp3',
                VoiceId=voice_id,
                Engine='standard'
            )
        except Exception as e:
            print(f"  Polly failed for {language}: {e}. Trying gTTS as ultimate fallback...")
            try:
                tts = gTTS(text=text, lang=language)
                tts.save(output_path)
                return output_path
            except Exception as e2:
                print(f"  Ultimate gTTS fallback failed: {e2}")
                return None

    try:
        with open(output_path, "wb") as f:
            f.write(response['AudioStream'].read())
        return output_path
    except Exception as e:
        print(f"  Failed to save Polly audio: {e}")
        return None
