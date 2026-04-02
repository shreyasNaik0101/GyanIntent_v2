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

OUT_DIR = Path('/Users/coder.op/Gyan_Ed/Gyan_Intent/frontend/public/videos')
OUT_DIR.mkdir(parents=True, exist_ok=True)

TOPICS = [
    {
        'file': 'dna.mp4',
        'title': 'DNA Replication',
        'points': [
            'DNA unwinds into two strands',
            'Each strand becomes a template',
            'A pairs with T, G pairs with C',
            'Two identical DNA molecules form',
        ],
        'narration': (
            'DNA replication copies genetic information before cell division. '
            'The double helix opens into two template strands. '
            'New nucleotides pair by rules: adenine with thymine, guanine with cytosine. '
            'Enzymes assemble two identical DNA molecules so each daughter cell gets the same code.'
        ),
    },
    {
        'file': 'bonding.mp4',
        'title': 'Chemical Bonding',
        'points': [
            'Atoms bond to become stable',
            'Ionic bond: electron transfer',
            'Covalent bond: electron sharing',
            'Bond type changes material properties',
        ],
        'narration': (
            'Chemical bonding describes how atoms combine for stability. '
            'In ionic bonding, electrons transfer and ions attract each other. '
            'In covalent bonding, atoms share electrons. '
            'These bonding types explain properties of compounds like salt, water, and many materials.'
        ),
    },
    {
        'file': 'calculus.mp4',
        'title': 'Calculus Basics',
        'points': [
            'Derivative = rate of change',
            'Integral = total accumulation',
            'Slope from derivatives',
            'Area from integrals',
        ],
        'narration': (
            'Calculus studies change and accumulation. '
            'A derivative measures instantaneous rate of change. '
            'An integral measures total accumulation, like area under a curve. '
            'Together they solve real problems in science, engineering, and data analysis.'
        ),
    },
]


def build_manim_code(title: str, points: list[str]) -> str:
    bullet_lines = "\n".join([
        f"        b{i} = Text('{p}', font_size=34).next_to(prev, DOWN, aligned_edge=LEFT, buff=0.35)\n"
        f"        self.play(FadeIn(b{i}, shift=RIGHT*0.2), run_time=0.8)\n"
        f"        prev = b{i}"
        for i, p in enumerate(points, start=1)
    ])

    return f"""from manim import *

class Scene(Scene):
    def construct(self):
        title = Text('{title}', font_size=60)
        title.set_color_by_gradient(BLUE, TEAL)
        self.play(Write(title), run_time=2)
        self.play(title.animate.to_edge(UP), run_time=1)

        prev = title
{bullet_lines}

        self.wait(2)
"""


def render_manim_video(code: str, temp_dir: Path) -> Path:
    scene_file = temp_dir / 'scene.py'
    scene_file.write_text(code)

    cmd = [
        'manim',
        '-qm',
        '--media_dir', str(temp_dir / 'media'),
        str(scene_file),
        'Scene',
    ]

    proc = subprocess.run(cmd, cwd=temp_dir, capture_output=True, text=True)
    if proc.returncode != 0:
        raise RuntimeError(f'Manim failed: {proc.stderr[:1200]}')

    videos = list((temp_dir / 'media').rglob('*.mp4'))
    if not videos:
        raise RuntimeError('No rendered video found')

    return videos[0]


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
        headers={'api-subscription-key': SARVAM_API_KEY, 'Content-Type': 'application/json'},
        timeout=60.0,
    )
    resp.raise_for_status()
    data = resp.json()
    out_wav.write_bytes(base64.b64decode(data['audios'][0]))


def mux(video_path: Path, audio_path: Path, output_path: Path) -> None:
    cmd = [
        'ffmpeg', '-y',
        '-i', str(video_path),
        '-i', str(audio_path),
        '-map', '0:v:0',
        '-map', '1:a:0',
        '-c:v', 'libx264',
        '-c:a', 'aac',
        '-shortest',
        str(output_path),
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        raise RuntimeError(f'ffmpeg mux failed: {proc.stderr[:1200]}')


def verify_streams(path: Path) -> None:
    cmd = [
        'ffprobe', '-v', 'error',
        '-show_entries', 'stream=codec_type',
        '-of', 'csv=p=0',
        str(path),
    ]
    out = subprocess.check_output(cmd, text=True)
    if 'video' not in out or 'audio' not in out:
        raise RuntimeError(f'Missing audio/video stream in {path}')


def main() -> None:
    for topic in TOPICS:
        print(f"Fixing {topic['title']}...")
        with tempfile.TemporaryDirectory(prefix='topic_fix_') as td:
            temp_dir = Path(td)
            code = build_manim_code(topic['title'], topic['points'])
            rendered = render_manim_video(code, temp_dir)

            wav = temp_dir / 'voice.wav'
            tts_to_wav(topic['narration'], wav)

            out = OUT_DIR / topic['file']
            mux(rendered, wav, out)
            verify_streams(out)

            print(f"Updated {out}")

    print('DONE: dna.mp4, bonding.mp4, calculus.mp4 are now topic-correct with matching audio.')


if __name__ == '__main__':
    main()
