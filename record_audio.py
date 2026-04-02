import sounddevice as sd
import scipy.io.wavfile as wav
import numpy as np
import time
import os

def record_audio(duration=7, filename="temp_audio/input.wav", samplerate=16000):
    """
    Records audio from the microphone for a fixed duration.
    """
    os.makedirs(os.path.dirname(filename), exist_ok=True)
    
    print(f"\n Recording for {duration} seconds... Speak now!")
    
    # Record audio
    recording = sd.rec(int(duration * samplerate), samplerate=samplerate, channels=1, dtype='int16')
    
    # Simple countdown
    for i in range(duration, 0, -1):
        print(f"\r  {i} seconds remaining...", end="", flush=True)
        time.sleep(1)
    
    sd.wait()  # Wait until recording is finished
    print("\n Recording finished.")
    
    # Save as WAV file
    wav.write(filename, samplerate, recording)
    return filename

if __name__ == "__main__":
    record_audio(5, "test.wav")
