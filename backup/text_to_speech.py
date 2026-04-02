import boto3
import os
from config import AWS_REGION, AWS_ACCESS_KEY, AWS_SECRET_KEY, AUDIO_OUTPUT_DIR

def text_to_speech(text, language='en'):
    """
    AWS Polly Text-to-Speech fallback.
    """
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
    
    os.makedirs(AUDIO_OUTPUT_DIR, exist_ok=True)
    output_path = os.path.join(AUDIO_OUTPUT_DIR, "explanation.wav")
    
    try:
        # Try Neural engine first for high quality
        response = polly.synthesize_speech(
            Text=text,
            OutputFormat='mp3',
            VoiceId=voice_id,
            Engine='neural'
        )
    except Exception as e:
        # Fallback to standard engine if neural is not supported for this voice/region
        print(f"  Neural engine not supported for {voice_id}, falling back to standard...")
        response = polly.synthesize_speech(
            Text=text,
            OutputFormat='mp3',
            VoiceId=voice_id,
            Engine='standard'
        )
    
    try:
        with open(output_path, "wb") as f:
            f.write(response['AudioStream'].read())
            
        print(f"  Saved fallback audio to {output_path}")
        return output_path
    except Exception as e:
        print(f"  Fallback TTS failed: {e}")
        return None
