import boto3
from config import AWS_REGION, AWS_ACCESS_KEY, AWS_SECRET_KEY

def speech_to_text(audio_file_path, force_lang=None):
    """
    AWS Transcribe fallback placeholder.
    """
    print("  AWS Transcribe fallback triggered (Placeholder)")
    return {"transcript": "", "language": "en"}
