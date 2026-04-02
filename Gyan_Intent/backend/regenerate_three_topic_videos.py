import shutil
import time
from pathlib import Path

import requests

BASE = "http://localhost:8000/api/v1/video"

TOPICS = [
    ("DNA Replication", "Explain DNA replication with base pairing and enzyme steps for students.", "dna.mp4"),
    ("Chemical Bonding", "Explain ionic and covalent bonding with easy examples and differences.", "bonding.mp4"),
    ("Calculus Basics", "Explain derivatives and integrals in simple terms with one practical example each.", "calculus.mp4"),
]

OUT_DIR = Path("/Users/coder.op/Gyan_Ed/Gyan_Intent/frontend/public/videos")
BACKEND_MEDIA_DIR = Path("/Users/coder.op/Gyan_Ed/Gyan_Intent/backend/media/videos")


def wait_for_job(session: requests.Session, job_id: str, timeout_seconds: int = 900) -> dict:
    start = time.time()
    while time.time() - start < timeout_seconds:
        resp = session.get(f"{BASE}/status/{job_id}", timeout=30)
        resp.raise_for_status()
        data = resp.json()
        status = data.get("status")
        if status in {"completed", "failed"}:
            return data
        time.sleep(2)
    raise TimeoutError(f"Timed out waiting for job {job_id}")


def generate_with_retries(session: requests.Session, concept: str, explanation: str, retries: int = 3) -> str:
    last_error = "unknown"
    for attempt in range(1, retries + 1):
        payload = {
            "concept": concept,
            "explanation": explanation,
            "language": "english",
            "visual_style": "educational",
            "duration": 60,
        }
        gen = session.post(f"{BASE}/generate", json=payload, timeout=30)
        gen.raise_for_status()
        job_id = gen.json()["job_id"]
        print(f"  Attempt {attempt}/{retries}, job={job_id}")

        final = wait_for_job(session, job_id)
        if final.get("status") == "completed":
            return job_id

        last_error = final.get("error_message") or "generation failed"
        print(f"  Failed attempt {attempt}: {last_error}")

    raise RuntimeError(f"All retries failed for {concept}: {last_error}")


def verify_audio(video_path: Path) -> bool:
    import subprocess
    cmd = [
        "ffprobe", "-v", "error",
        "-show_entries", "stream=codec_type",
        "-of", "csv=p=0",
        str(video_path),
    ]
    out = subprocess.check_output(cmd, text=True)
    return "video" in out and "audio" in out


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    session = requests.Session()

    for idx, (concept, explanation, output_name) in enumerate(TOPICS, start=1):
        print(f"[{idx}/3] Regenerating {concept}")
        job_id = generate_with_retries(session, concept, explanation, retries=3)
        src = BACKEND_MEDIA_DIR / f"{job_id}.mp4"
        if not src.exists():
            raise FileNotFoundError(f"Generated file missing: {src}")

        dst = OUT_DIR / output_name
        shutil.copy2(src, dst)
        if not verify_audio(dst):
            raise RuntimeError(f"Missing audio/video streams after copy: {dst}")

        print(f"[{idx}/3] Updated {dst} from job {job_id}")

    print("DONE: dna.mp4, bonding.mp4, calculus.mp4 regenerated with correct audio-enabled output")


if __name__ == "__main__":
    main()
