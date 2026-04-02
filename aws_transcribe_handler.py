import boto3
import time
import json
import requests
import os
from config import AWS_REGION, AWS_ACCESS_KEY, AWS_SECRET_KEY, S3_BUCKET
from record_audio import record_audio

def upload_to_s3(file_path, bucket, object_name=None):
    """
    Uploads a file to an S3 bucket.
    """
    if object_name is None:
        object_name = os.path.basename(file_path)

    s3_client = boto3.client(
        's3',
        region_name=AWS_REGION,
        aws_access_key_id=AWS_ACCESS_KEY,
        aws_secret_access_key=AWS_SECRET_KEY
    )
    
    try:
        s3_client.upload_file(file_path, bucket, object_name)
        return f"s3://{bucket}/{object_name}"
    except Exception as e:
        print(f"  S3 Upload failed: {e}")
        return None

def transcribe_audio(s3_uri):
    """
    Transcribes audio using Amazon Transcribe with Auto-Language Identification.
    Supports English, Hindi, Marathi, Kannada, and Telugu.
    """
    transcribe = boto3.client(
        'transcribe',
        region_name=AWS_REGION,
        aws_access_key_id=AWS_ACCESS_KEY,
        aws_secret_access_key=AWS_SECRET_KEY
    )
    
    job_name = f"transcription_job_{int(time.time())}"
    
    # Universal Language Options for Indian Users
    lang_options = ['en-US', 'hi-IN', 'mr-IN', 'kn-IN', 'te-IN']
    
    print(f"  Starting Universal AWS Transcribe job: {job_name}...")
    
    transcribe.start_transcription_job(
        TranscriptionJobName=job_name,
        Media={'MediaFileUri': s3_uri},
        MediaFormat='wav',
        IdentifyLanguage=True,
        LanguageOptions=lang_options
    )
    
    while True:
        status = transcribe.get_transcription_job(TranscriptionJobName=job_name)
        job_status = status['TranscriptionJob']['TranscriptionJobStatus']
        
        if job_status in ['COMPLETED', 'FAILED']:
            break
        
        print(f"  Job Status: {job_status}...", end="\r", flush=True)
        time.sleep(2)
    
    if job_status == 'COMPLETED':
        response = requests.get(status['TranscriptionJob']['Transcript']['TranscriptFileUri'])
        data = response.json()
        transcript = data['results']['transcripts'][0]['transcript']
        detected_lang = status['TranscriptionJob'].get('LanguageCode', 'en-US')
        
        # Cleanup
        try:
            s3 = boto3.resource('s3', aws_access_key_id=AWS_ACCESS_KEY, aws_secret_access_key=AWS_SECRET_KEY)
            bucket_name = s3_uri.split('/')[2]
            key = '/'.join(s3_uri.split('/')[3:])
            s3.Object(bucket_name, key).delete()
            transcribe.delete_transcription_job(TranscriptionJobName=job_name)
        except:
            pass
            
        return transcript, detected_lang
    else:
        print(f"\n  AWS Transcription failed.")
        return None, None

def record_and_transcribe_aws(input_lang=None):
    """
    High-level function to record and transcribe via AWS with Auto-Detection.
    """
    # 1. Record
    temp_wav = "temp_audio/aws_input.wav"
    record_audio(duration=7, filename=temp_wav)
    
    # 2. Upload
    s3_uri = upload_to_s3(temp_wav, S3_BUCKET)
    if not s3_uri:
        return None, None
    
    # 3. Transcribe
    transcript, language = transcribe_audio(s3_uri)
    return transcript, language

if __name__ == "__main__":
    result = record_and_transcribe_aws('hi-IN')
    print(f"\n Result: {result}")
