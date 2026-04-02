import subprocess
import os
import sys
from config import VIDEO_OUTPUT_DIR

class ManimError(Exception):
    pass

def run_manim(code, scene_class="TutorScene"):
    """
    Executes Manim to render the video.
    """
    os.makedirs(VIDEO_OUTPUT_DIR, exist_ok=True)
    temp_code_file = os.path.join(VIDEO_OUTPUT_DIR, "scene.py")
    
    with open(temp_code_file, "w", encoding="utf-8") as f:
        f.write(code)
        
    print(f"  Rendering Manim Scene: {scene_class}...")
    try:
        cmd = [
            sys.executable, "-m", "manim", "-ql", "--media_dir", VIDEO_OUTPUT_DIR,
            temp_code_file, scene_class
        ]
        subprocess.run(cmd, check=True)
        
        latest_file = None
        latest_time = 0
        
        for root, dirs, files in os.walk(VIDEO_OUTPUT_DIR):
            # Skip the partial movie segments cache
            if "partial_movie_files" in root:
                continue
            for file in files:
                if file.endswith(".mp4"):
                    file_path = os.path.join(root, file)
                    mtime = os.path.getmtime(file_path)
                    if mtime > latest_time:
                        latest_time = mtime
                        latest_file = file_path
                        
        return latest_file
    except Exception as e:
        print(f"  Manim rendering failed: {e}")
        raise ManimError(e)
