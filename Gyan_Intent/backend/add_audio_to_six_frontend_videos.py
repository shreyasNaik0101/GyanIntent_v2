import base64
import os
import subprocess
import tempfile
from pathlib import Path

import httpx
from dotenv import load_dotenv

load_dotenv('/Users/coder.op/Gyan_Ed/Gyan_Intent/backend/.env')

SARVAM_API_KEY = os.getenv('SARVAM_API_KEY', '')
if not SARVAM_API_KEY or SARVAM_API_KEY == 'sk-your-sarvam-key-here':
    raise RuntimeError('SARVAM_API_KEY missing in backend/.env')

VIDEOS_DIR = Path('/Users/coder.op/Gyan_Ed/Gyan_Intent/frontend/public/videos')

TOPIC_DATA = {
    'pythagorean.mp4': (
        'Pythagorean Theorem',
        "The Pythagorean theorem connects the sides of a right triangle. "
        "If a and b are the two shorter sides and c is the hypotenuse, then a squared plus b squared equals c squared. "
        "This helps us find unknown distances in geometry, maps, and engineering design. "
        "For example, if a is 3 and b is 4, then c is 5. "
        "You can use this rule whenever the angle is exactly ninety degrees."
    ),
    'photosynthesis.mp4': (
        'Photosynthesis',
        "Photosynthesis is how plants make food using sunlight. "
        "In the leaves, chlorophyll captures light energy. "
        "Plants take carbon dioxide from air and water from roots. "
        "Using light energy, they produce glucose as food and release oxygen. "
        "This process supports almost all life on Earth by providing food chains and breathable oxygen."
    ),
    'newton.mp4': (
        "Newton's Laws",
        "Newton's first law says an object stays at rest or in motion unless an external force acts. "
        "The second law says force equals mass times acceleration, so more force gives more acceleration. "
        "The third law says every action has an equal and opposite reaction. "
        "These laws explain motion in sports, vehicles, and rockets."
    ),
    'dna.mp4': (
        'DNA Replication',
        "DNA replication copies genetic information before cell division. "
        "The double helix opens, and each strand acts as a template. "
        "Complementary bases pair specifically: adenine with thymine, and guanine with cytosine. "
        "Enzymes build two identical DNA molecules so each new cell gets the same genetic code."
    ),
    'bonding.mp4': (
        'Chemical Bonding',
        "Chemical bonding happens when atoms combine to become more stable. "
        "In ionic bonding, electrons transfer from one atom to another, creating charged ions. "
        "In covalent bonding, atoms share electrons. "
        "These bonding types explain properties of compounds like salt, water, and many materials around us."
    ),
    'calculus.mp4': (
        'Calculus Basics',
        "Calculus studies change and accumulation. "
        "A derivative measures how quickly a quantity changes at a point. "
        "An integral measures accumulated quantity, like area under a curve. "
        "Together, derivatives and integrals help solve problems in physics, economics, machine learning, and engineering."
    ),
}


def tts_to_wav(text: str, out_wav: Path) -> None:
    payload = {
        'text': text,
        'target_language_code': 'en-IN',
        'model': 'bulbul:v3',
        'speaker': 'shubh',
        'pace': 1.0,
        'speech_sample_rate': 24000,
    }

    resp = httpx.post(
        'https://api.sarvam.ai/text-to-speech',
        json=payload,
        headers={
            'api-subscription-key': SARVAM_API_KEY,
            'Content-Type': 'application/json',
        },
        timeout=60.0,
    )
    resp.raise_for_status()

    data = resp.json()
    audio_b64 = data['audios'][0]
    out_wav.write_bytes(base64.b64decode(audio_b64))


def mux_audio(video_path: Path, wav_path: Path) -> None:
    tmp_out = video_path.with_suffix('.voiced.tmp.mp4')
    cmd = [
        'ffmpeg', '-y',
        '-i', str(video_path),
        '-i', str(wav_path),
        '-map', '0:v:0',
        '-map', '1:a:0',
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-shortest',
        str(tmp_out),
    ]
    subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    tmp_out.replace(video_path)


def verify_has_audio(video_path: Path) -> bool:
    cmd = [
        'ffprobe',
        '-v', 'error',
        '-select_streams', 'a',
        '-show_entries', 'stream=codec_type',
        '-of', 'csv=p=0',
        str(video_path),
    ]
    result = subprocess.run(cmd, check=False, capture_output=True, text=True)
    return 'audio' in result.stdout


def main() -> None:
    if not VIDEOS_DIR.exists():
        raise FileNotFoundError(f'Missing videos dir: {VIDEOS_DIR}')

    with tempfile.TemporaryDirectory(prefix='six_voice_') as tmpdir:
        tmpdir_path = Path(tmpdir)
        for filename, (topic, narration) in TOPIC_DATA.items():
            video_path = VIDEOS_DIR / filename
            if not video_path.exists():
                raise FileNotFoundError(f'Missing target video: {video_path}')

            wav_path = tmpdir_path / f'{video_path.stem}.wav'
            print(f'Generating TTS for {topic}...')
            tts_to_wav(narration, wav_path)

            print(f'Adding audio to {filename}...')
            mux_audio(video_path, wav_path)

            if not verify_has_audio(video_path):
                raise RuntimeError(f'Audio stream missing after mux: {video_path}')

            print(f'Done: {filename}')

    print('SUCCESS: All 6 videos now include voice audio.')


if __name__ == '__main__':
    main()
