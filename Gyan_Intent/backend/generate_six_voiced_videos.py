import shutil
import time
from pathlib import Path

import requests

BASE = "http://localhost:8000/api/v1/video"

JOBS = [
    (
        "Pythagorean Theorem",
        "Explain theorem and right-triangle formula with one worked example.",
        "pythagorean.mp4",
    ),
    (
        "Photosynthesis",
        "Explain inputs, process in chloroplast, and outputs in simple school language.",
        "photosynthesis.mp4",
    ),
    (
        "Newton's Laws",
        "Explain three laws with daily life examples and one short recap.",
        "newton.mp4",
    ),
    (
        "DNA Replication",
        "Explain base pairing and replication steps clearly for students.",
        "dna.mp4",
    ),
    (
        "Chemical Bonding",
        "Explain ionic vs covalent bonding with examples.",
        "bonding.mp4",
    ),
    (
        "Calculus Basics",
        "Explain derivative as rate of change and integral as area under curve.",
        "calculus.mp4",
    ),
]

OUT_DIR = Path("/Users/coder.op/Gyan_Ed/Gyan_Intent/frontend/public/videos")
BACKEND_MEDIA_DIR = Path("/Users/coder.op/Gyan_Ed/Gyan_Intent/backend/media/videos")


def wait_for_job(session: requests.Session, job_id: str, max_wait_seconds: int = 700) -> dict:
    start = time.time()
    while time.time() - start < max_wait_seconds:
        resp = session.get(f"{BASE}/status/{job_id}", timeout=30)
        resp.raise_for_status()
        data = resp.json()
        status = data.get("status")
        if status in {"completed", "failed"}:
            return data
        time.sleep(2)
    raise TimeoutError(f"Timed out waiting for job {job_id}")


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    session = requests.Session()

    for idx, (concept, explanation, out_name) in enumerate(JOBS, start=1):
        payload = {
            "concept": concept,
            "explanation": explanation,
            "language": "english",
            "visual_style": "educational",
            "duration": 60,
        }

        print(f"[{idx}/6] Generating: {concept}")
        gen = session.post(f"{BASE}/generate", json=payload, timeout=30)
        gen.raise_for_status()
        job_id = gen.json()["job_id"]

        final = wait_for_job(session, job_id)
        if final.get("status") != "completed":
            raise RuntimeError(f"Generation failed for {concept}: {final}")

        source_path = BACKEND_MEDIA_DIR / f"{job_id}.mp4"
        if not source_path.exists():
            raise FileNotFoundError(f"Generated source missing: {source_path}")

        target_path = OUT_DIR / out_name
        shutil.copy2(source_path, target_path)
        print(f"[{idx}/6] Saved: {target_path}")

    print("Done: all six frontend videos replaced with voiced versions.")


if __name__ == "__main__":
    main()
