import os
import argparse
import time
import asyncio
from dotenv import load_dotenv
import config

# Module imports
from deepgram_stt import speech_to_text as dg_stt
from generate_manim_code import generate_manim_code
from deepgram_streaming import stream_transcribe
from run_manim import run_manim, ManimError
from deepgram_tts import text_to_speech
from merge_with_ffmpeg import merge_with_ffmpeg
from aws_transcribe_handler import record_and_transcribe_aws

# Load environment variables
load_dotenv()

def run_pipeline(audio_file=None, text_input=None, target_lang='en', input_lang=None, use_mic=False, mic_duration=10):
    """
    Main orchestration function for the AI tutor pipeline.
    """
    print("\n" + "=" * 60)
    print("GYAN INTENTAWS - Multilingual Visual AI Tutor")
    print("=" * 60)

    start_time = time.time()

    # STEP 0: Speech Input (Microphone)
    if use_mic:
        # ALL-AWS Universal Smart Path:
        # Provides 100% Accuracy for Regional Languages + Live Feedback for English.
        from aws_streaming import amazon_stream_transcribe
        print(f"\n STEP 0: Universal AWS Streaming (Accuracy + Live Feedback)")
        user_text, language_full = asyncio.run(amazon_stream_transcribe(duration=mic_duration))
        
        # Normalize language
        language = (language_full or 'en').split('-')[0]
        audio_file = None
    # STEP 1: Speech to Text (if audio provided and no streaming)
    elif audio_file:
        print(f"\n STEP 1: Speech-to-Text Processing")
        stt_result = dg_stt(audio_file, force_lang=input_lang)
        user_text = stt_result["transcript"]
        language = stt_result["language"]
    elif text_input:
        print(f"\n STEP 1: Text Input (skipping STT)")
        user_text = text_input
        language = input_lang or target_lang or "en"
    else:
        print("Error: No input provided (audio, text, or mic)")
        return None

    if not user_text:
        print("Error: Could not obtain text input")
        return None

    # Normalize language codes (e.g., 'hi-IN' -> 'hi')
    if language:
        language = language.split('-')[0]
    
    # If target_lang is not explicitly set, use the spoken language (or 'en')
    target_lang = (target_lang or language or 'en').split('-')[0]
    
    # Hinglish Intelligence: Detect Hindi phonetic markers in English-classified transcripts
    hinglish_markers = [
        "samjhao", "samjow", "somehow", "batao", "bataiye", "kya", "hai", "kaise", 
        "karo", "dikhao", "dikhaiye", "bolo", "mujhe", "muge", "shuru", "karo", "please"
    ]
    if target_lang == 'en':
        lower_text = user_text.lower()
        # Use substring check to handle punctuation (e.g., "somehow.")
        if any(marker in lower_text for marker in hinglish_markers):
            print(f"  [Auto-Switch] Common Hindi/Hinglish markers detected in: '{user_text}'")
            target_lang = 'hi'

    print(f" INPUT TEXT: {user_text}")
    print(f" LANGUAGE: {language}")
    print(f" TARGET LANGUAGE: {target_lang}")

    # STEP 2: Generate Manim Code via LLM
    print(f"\n STEP 2: AI Content Generation (Newton Engine)")
    llm_result = generate_manim_code(user_text, language, target_language=target_lang)
    
    if not llm_result or "code" not in llm_result:
        print("Error: LLM failed to generate content")
        return None

    # STEP 3: Text to Speech (Narration)
    print(f"\n STEP 3: Generating Narration (Voice Synthesis)")
    audio_path = text_to_speech(llm_result["explanation"], target_lang)

    # STEP 4: Run Manim Animation
    print(f"\n STEP 4: Rendering Animation (Manim Engine)")
    video_path = run_manim(llm_result["code"])

    # STEP 5: Final Merge (Video + Audio)
    if video_path and audio_path:
        print(f"\n STEP 5: Finalizing Video (Merging Media)")
        output_file = merge_with_ffmpeg(video_path, audio_path)
        abs_output_path = os.path.abspath(output_file)
        print(f"\n SUCCESS: Final video ready at: file:///{abs_output_path.replace(os.sep, '/')}")
    else:
        print("\n WARNING: Pipeline partially failed (Video or Audio missing)")

    total_time = time.time() - start_time
    print(f"\n Pipeline completed in {total_time:.1f}s")
    return True

def main():
    parser = argparse.ArgumentParser(description="Multilingual Visual AI Tutor Pipeline")
    parser.add_argument("--audio", help="Path to input audio file")
    parser.add_argument("--text", help="Direct text input")
    parser.add_argument("--mic", action="store_true", help="Use microphone for real-time streaming")
    parser.add_argument("--duration", type=int, default=10, help="Mic recording duration")
    parser.add_argument("--target-lang", default=None, help="Target output language (en, hi, mr, te, kn)")
    parser.add_argument("--input-lang", help="Explicitly sets input language")
    
    args = parser.parse_args()
    run_pipeline(audio_file=args.audio, text_input=args.text, target_lang=args.target_lang, input_lang=args.input_lang, use_mic=args.mic, mic_duration=args.duration)

if __name__ == "__main__":
    main()
