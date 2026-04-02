"""
Rebuild DNA Replication, Chemical Bonding, and Calculus Basics videos
with 40–50 second Manim scenes and matching longer Sarvam TTS narration.
"""

import base64
import os
import subprocess
import tempfile
from pathlib import Path

import httpx
from dotenv import load_dotenv

load_dotenv("/Users/coder.op/Gyan_Ed/Gyan_Intent/backend/.env")

SARVAM_API_KEY = os.getenv("SARVAM_API_KEY", "")
if not SARVAM_API_KEY or SARVAM_API_KEY == "sk-your-sarvam-key-here":
    raise RuntimeError("SARVAM_API_KEY missing")

OUT_DIR = Path("/Users/coder.op/Gyan_Ed/Gyan_Intent/frontend/public/videos")

# ── Manim scenes (each ~40-50 s of animation) ──────────────────────────

DNA_SCENE = r'''from manim import *
import numpy as np

class Scene(Scene):
    def construct(self):
        # Title (0-5s)
        title = Text("DNA Replication", font_size=52)
        title.set_color_by_gradient(BLUE, GREEN)
        self.play(Write(title), run_time=2)
        self.play(title.animate.to_edge(UP), run_time=1)
        subtitle = Text("Copying the Blueprint of Life", font_size=28, color=GREY)
        subtitle.next_to(title, DOWN)
        self.play(FadeIn(subtitle), run_time=1)
        self.wait(1)

        # Double helix (5-15s)
        self.play(FadeOut(subtitle))
        helix_label = Text("Double Helix Structure", font_size=30, color=TEAL)
        helix_label.next_to(title, DOWN, buff=0.3)
        self.play(Write(helix_label), run_time=1)

        strand1 = VGroup()
        strand2 = VGroup()
        for i in range(12):
            x = i * 0.8 - 4.5
            y1 = 0.6 * np.sin(i * 0.6)
            y2 = -0.6 * np.sin(i * 0.6)
            d1 = Dot(point=[x, y1, 0], color=BLUE, radius=0.12)
            d2 = Dot(point=[x, y2, 0], color=RED, radius=0.12)
            strand1.add(d1)
            strand2.add(d2)

        rungs = VGroup()
        for d1, d2 in zip(strand1, strand2):
            rung = Line(d1.get_center(), d2.get_center(), color=YELLOW, stroke_width=2)
            rungs.add(rung)

        self.play(Create(strand1), Create(strand2), run_time=2)
        self.play(Create(rungs), run_time=1.5)
        self.wait(1)

        # Base pairing rules (15-25s)
        self.play(FadeOut(helix_label))
        rules_title = Text("Base Pairing Rules", font_size=30, color=GREEN)
        rules_title.next_to(title, DOWN, buff=0.3)
        self.play(Write(rules_title), run_time=1)

        pairs = VGroup(
            Text("A ── T  (Adenine — Thymine)", font_size=26, color=BLUE),
            Text("G ── C  (Guanine — Cytosine)", font_size=26, color=RED),
        ).arrange(DOWN, buff=0.4)
        pairs.shift(DOWN * 2.5)
        box = SurroundingRectangle(pairs, color=WHITE, buff=0.3)
        self.play(Write(pairs), Create(box), run_time=2.5)
        self.wait(2)

        # Unwinding step (25-35s)
        self.play(FadeOut(pairs), FadeOut(box), FadeOut(rules_title))
        unwind_label = Text("Step 1: Helicase Unwinds DNA", font_size=28, color=ORANGE)
        unwind_label.next_to(title, DOWN, buff=0.3)
        self.play(Write(unwind_label), run_time=1)

        self.play(
            strand1[:6].animate.shift(UP * 1.2),
            strand2[:6].animate.shift(DOWN * 1.2),
            *[FadeOut(rungs[i]) for i in range(6)],
            run_time=2.5,
        )
        self.wait(1)

        step2 = Text("Step 2: New Bases Pair Up", font_size=28, color=PURPLE)
        step2.next_to(title, DOWN, buff=0.3)
        self.play(FadeOut(unwind_label), Write(step2), run_time=1)

        new_dots = VGroup()
        for i in range(6):
            d = strand1[i]
            nd = Dot(d.get_center() + DOWN * 0.5, color=GREEN, radius=0.12)
            new_dots.add(nd)
        self.play(FadeIn(new_dots, shift=DOWN * 0.3), run_time=2)
        self.wait(1)

        # Result (35-45s)
        self.play(FadeOut(step2))
        result = Text("Result: Two Identical DNA Molecules", font_size=28, color=TEAL)
        result.next_to(title, DOWN, buff=0.3)
        self.play(Write(result), run_time=1.5)

        check = Text("Each cell gets the same genetic code!", font_size=24, color=YELLOW)
        check.shift(DOWN * 3)
        self.play(Write(check), run_time=1.5)
        self.wait(2)

        # Outro
        self.play(*[FadeOut(mob) for mob in self.mobjects])
        final = Text("DNA Replication", font_size=64)
        final.set_color_by_gradient(BLUE, GREEN)
        self.play(Write(final), run_time=2)
        self.wait(1)
'''

BONDING_SCENE = r'''from manim import *

class Scene(Scene):
    def construct(self):
        # Title (0-5s)
        title = Text("Chemical Bonding", font_size=52)
        title.set_color_by_gradient(ORANGE, YELLOW)
        self.play(Write(title), run_time=2)
        self.play(title.animate.to_edge(UP), run_time=1)
        subtitle = Text("How Atoms Connect", font_size=28, color=GREY)
        subtitle.next_to(title, DOWN)
        self.play(FadeIn(subtitle), run_time=1)
        self.wait(1)

        # Why bond (5-10s)
        self.play(FadeOut(subtitle))
        why = Text("Atoms bond to become more stable", font_size=28, color=TEAL)
        why.next_to(title, DOWN, buff=0.3)
        self.play(Write(why), run_time=1.5)

        atom = Circle(radius=0.6, color=BLUE, fill_opacity=0.3)
        atom_label = Text("Na", font_size=28, color=BLUE)
        atom_label.move_to(atom)
        atom_group = VGroup(atom, atom_label).shift(LEFT * 3 + DOWN)

        atom2 = Circle(radius=0.6, color=RED, fill_opacity=0.3)
        atom2_label = Text("Cl", font_size=28, color=RED)
        atom2_label.move_to(atom2)
        atom2_group = VGroup(atom2, atom2_label).shift(RIGHT * 3 + DOWN)

        self.play(Create(atom_group), Create(atom2_group), run_time=1.5)
        self.wait(1)

        # Ionic bonding (10-22s)
        self.play(FadeOut(why))
        ionic_title = Text("Ionic Bonding: Electron Transfer", font_size=28, color=ORANGE)
        ionic_title.next_to(title, DOWN, buff=0.3)
        self.play(Write(ionic_title), run_time=1)

        electron = Dot(color=YELLOW, radius=0.15)
        electron.move_to(atom_group.get_right() + RIGHT * 0.3)
        self.play(Create(electron), run_time=0.5)

        arrow = Arrow(atom_group.get_right(), atom2_group.get_left(), color=YELLOW)
        self.play(Create(arrow), run_time=1)
        self.play(electron.animate.move_to(atom2_group.get_left() + LEFT * 0.3), run_time=1)

        na_plus = Text("Na+", font_size=24, color=BLUE)
        na_plus.next_to(atom_group, DOWN)
        cl_minus = Text("Cl-", font_size=24, color=RED)
        cl_minus.next_to(atom2_group, DOWN)
        self.play(Write(na_plus), Write(cl_minus), run_time=1)

        example = Text("Example: Table Salt (NaCl)", font_size=24, color=YELLOW)
        example.shift(DOWN * 3)
        self.play(Write(example), run_time=1)
        self.wait(2)

        # Covalent bonding (22-35s)
        self.play(
            FadeOut(atom_group), FadeOut(atom2_group), FadeOut(arrow),
            FadeOut(electron), FadeOut(na_plus), FadeOut(cl_minus),
            FadeOut(example), FadeOut(ionic_title),
        )

        cov_title = Text("Covalent Bonding: Electron Sharing", font_size=28, color=GREEN)
        cov_title.next_to(title, DOWN, buff=0.3)
        self.play(Write(cov_title), run_time=1)

        h1 = Circle(radius=0.5, color=TEAL, fill_opacity=0.3).shift(LEFT * 1.5 + DOWN * 0.5)
        h1_label = Text("H", font_size=28, color=TEAL).move_to(h1)
        h2 = Circle(radius=0.5, color=TEAL, fill_opacity=0.3).shift(RIGHT * 1.5 + DOWN * 0.5)
        h2_label = Text("H", font_size=28, color=TEAL).move_to(h2)
        self.play(Create(h1), Write(h1_label), Create(h2), Write(h2_label), run_time=1.5)

        shared = Ellipse(width=1.5, height=0.6, color=YELLOW, fill_opacity=0.2)
        shared.shift(DOWN * 0.5)
        shared_label = Text("shared electrons", font_size=20, color=YELLOW)
        shared_label.next_to(shared, DOWN, buff=0.2)
        self.play(Create(shared), Write(shared_label), run_time=1.5)

        self.play(h1.animate.shift(RIGHT * 0.5), h1_label.animate.shift(RIGHT * 0.5),
                  h2.animate.shift(LEFT * 0.5), h2_label.animate.shift(LEFT * 0.5),
                  run_time=1.5)

        cov_example = Text("Example: Water (H2O), Oxygen (O2)", font_size=24, color=YELLOW)
        cov_example.shift(DOWN * 2.8)
        self.play(Write(cov_example), run_time=1.5)
        self.wait(2)

        # Comparison table (35-45s)
        self.play(*[FadeOut(mob) for mob in self.mobjects if mob != title])
        compare = Text("Ionic vs Covalent", font_size=30, color=WHITE)
        compare.next_to(title, DOWN, buff=0.3)
        self.play(Write(compare), run_time=1)

        rows = VGroup(
            Text("Ionic: transfer electrons, high melting point", font_size=24, color=ORANGE),
            Text("Covalent: share electrons, lower melting point", font_size=24, color=GREEN),
            Text("Both: atoms become stable by filling outer shell", font_size=24, color=TEAL),
        ).arrange(DOWN, buff=0.5, aligned_edge=LEFT)
        rows.shift(DOWN * 1)
        for row in rows:
            self.play(FadeIn(row, shift=RIGHT * 0.3), run_time=1)
        self.wait(2)

        # Outro
        self.play(*[FadeOut(mob) for mob in self.mobjects])
        final = Text("Chemical Bonding", font_size=64)
        final.set_color_by_gradient(ORANGE, YELLOW)
        self.play(Write(final), run_time=2)
        self.wait(1)
'''

CALCULUS_SCENE = r'''from manim import *
import numpy as np

class Scene(Scene):
    def construct(self):
        # Title (0-5s)
        title = Text("Calculus Basics", font_size=52)
        title.set_color_by_gradient(PURPLE, BLUE)
        self.play(Write(title), run_time=2)
        self.play(title.animate.to_edge(UP), run_time=1)
        subtitle = Text("The Mathematics of Change", font_size=28, color=GREY)
        subtitle.next_to(title, DOWN)
        self.play(FadeIn(subtitle), run_time=1)
        self.wait(1)

        # Derivative intro (5-15s)
        self.play(FadeOut(subtitle))
        deriv_title = Text("Derivative = Rate of Change", font_size=28, color=GREEN)
        deriv_title.next_to(title, DOWN, buff=0.3)
        self.play(Write(deriv_title), run_time=1)

        axes = Axes(
            x_range=[0, 5, 1], y_range=[0, 10, 2],
            x_length=5, y_length=3,
            axis_config={"include_tip": True},
        ).shift(DOWN * 1)
        labels = axes.get_axis_labels(x_label="x", y_label="f(x)")
        curve = axes.plot(lambda x: 0.4 * x ** 2, color=BLUE)

        self.play(Create(axes), Write(labels), run_time=1.5)
        self.play(Create(curve), run_time=2)

        # Tangent line (15-22s)
        x_val = 2.5
        dot = Dot(axes.c2p(x_val, 0.4 * x_val ** 2), color=YELLOW)
        tangent = axes.plot(lambda x: 2 * 0.4 * x_val * (x - x_val) + 0.4 * x_val ** 2,
                            x_range=[1, 4], color=YELLOW)
        slope_label = Text("slope = derivative", font_size=22, color=YELLOW)
        slope_label.next_to(dot, UR, buff=0.3)

        self.play(Create(dot), run_time=0.5)
        self.play(Create(tangent), Write(slope_label), run_time=2)
        self.wait(1.5)

        speed = Text("Speed is the derivative of distance!", font_size=24, color=TEAL)
        speed.shift(DOWN * 3.2)
        self.play(Write(speed), run_time=1.5)
        self.wait(1)

        # Integral intro (22-35s)
        self.play(FadeOut(deriv_title), FadeOut(dot), FadeOut(tangent),
                  FadeOut(slope_label), FadeOut(speed), FadeOut(curve),
                  FadeOut(axes), FadeOut(labels))

        int_title = Text("Integral = Area Under the Curve", font_size=28, color=ORANGE)
        int_title.next_to(title, DOWN, buff=0.3)
        self.play(Write(int_title), run_time=1)

        axes2 = Axes(
            x_range=[0, 5, 1], y_range=[0, 6, 2],
            x_length=5, y_length=3,
            axis_config={"include_tip": True},
        ).shift(DOWN * 1)
        labels2 = axes2.get_axis_labels(x_label="x", y_label="f(x)")
        curve2 = axes2.plot(lambda x: 0.3 * x ** 2 + 0.5, color=BLUE)

        self.play(Create(axes2), Write(labels2), run_time=1)
        self.play(Create(curve2), run_time=1.5)

        area = axes2.get_area(curve2, x_range=[1, 4], color=[BLUE, GREEN], opacity=0.4)
        self.play(FadeIn(area), run_time=2)

        area_label = Text("Area = Integral", font_size=22, color=GREEN)
        area_label.move_to(axes2.c2p(2.5, 1.5))
        self.play(Write(area_label), run_time=1)

        distance = Text("Distance is the integral of speed!", font_size=24, color=TEAL)
        distance.shift(DOWN * 3.2)
        self.play(Write(distance), run_time=1.5)
        self.wait(2)

        # Summary (35-45s)
        self.play(*[FadeOut(mob) for mob in self.mobjects if mob != title])
        summary_title = Text("Key Takeaway", font_size=30, color=WHITE)
        summary_title.next_to(title, DOWN, buff=0.3)
        self.play(Write(summary_title), run_time=1)

        points = VGroup(
            Text("Derivative measures instantaneous change", font_size=24, color=GREEN),
            Text("Integral measures total accumulation", font_size=24, color=ORANGE),
            Text("They are inverse operations of each other", font_size=24, color=TEAL),
        ).arrange(DOWN, buff=0.5, aligned_edge=LEFT).shift(DOWN * 1)

        for p in points:
            self.play(FadeIn(p, shift=RIGHT * 0.3), run_time=1)
        self.wait(2)

        # Outro
        self.play(*[FadeOut(mob) for mob in self.mobjects])
        final = Text("Calculus Basics", font_size=64)
        final.set_color_by_gradient(PURPLE, BLUE)
        self.play(Write(final), run_time=2)
        self.wait(1)
'''

# ── Narrations (longer, 40-50s of speech at normal pace) ──────────────

DNA_NARRATION = (
    "DNA replication is how cells copy their genetic information before dividing. "
    "DNA has a double helix structure, with two strands connected by base pairs. "
    "There are strict pairing rules: Adenine always pairs with Thymine, and Guanine always pairs with Cytosine. "
    "During replication, an enzyme called helicase unwinds the double helix, separating the two strands. "
    "Each separated strand acts as a template. New complementary bases attach to each template strand. "
    "The result is two identical DNA molecules, each with one original strand and one new strand. "
    "This ensures every new cell receives the same complete genetic code as the parent cell."
)

BONDING_NARRATION = (
    "Chemical bonding is how atoms join together to form molecules and compounds. "
    "Atoms bond because they want to fill their outer electron shell and become more stable. "
    "In ionic bonding, one atom transfers electrons to another. "
    "For example, sodium gives an electron to chlorine, forming sodium chloride, which is table salt. "
    "The resulting positive and negative ions attract each other strongly. "
    "In covalent bonding, atoms share electrons instead of transferring them. "
    "For example, two hydrogen atoms share electrons to form H2, and hydrogen and oxygen share to form water. "
    "Ionic compounds tend to have high melting points, while covalent compounds tend to have lower melting points. "
    "Both types of bonding help atoms achieve a stable, filled outer shell."
)

CALCULUS_NARRATION = (
    "Calculus is the mathematics of change and accumulation. It has two main ideas. "
    "The first is the derivative. A derivative tells you how fast something is changing at any instant. "
    "On a graph, the derivative is the slope of the tangent line at a point on the curve. "
    "A real world example: speed is the derivative of distance with respect to time. "
    "The second idea is the integral. An integral adds up tiny pieces to find a total. "
    "On a graph, the integral gives you the area under the curve between two points. "
    "A real world example: the total distance traveled is the integral of speed over time. "
    "The fundamental theorem of calculus connects these two ideas. "
    "Derivatives and integrals are inverse operations of each other."
)

TOPICS = [
    ("dna.mp4", "DNA Replication", DNA_SCENE, DNA_NARRATION),
    ("bonding.mp4", "Chemical Bonding", BONDING_SCENE, BONDING_NARRATION),
    ("calculus.mp4", "Calculus Basics", CALCULUS_SCENE, CALCULUS_NARRATION),
]


def render_manim(code: str, temp_dir: Path) -> Path:
    scene_file = temp_dir / "scene.py"
    scene_file.write_text(code)
    cmd = [
        "manim", "-qm",
        "--media_dir", str(temp_dir / "media"),
        str(scene_file), "Scene",
    ]
    proc = subprocess.run(cmd, cwd=temp_dir, capture_output=True, text=True)
    if proc.returncode != 0:
        raise RuntimeError(f"Manim failed:\n{proc.stderr[-2000:]}")
    videos = list((temp_dir / "media").rglob("*.mp4"))
    if not videos:
        raise RuntimeError("No video output")
    return videos[0]


def sarvam_tts(text: str, out_wav: Path) -> None:
    """Call Sarvam TTS, chunking if text > 2500 chars."""
    MAX = 2500
    chunks = []
    if len(text) <= MAX:
        chunks = [text]
    else:
        sentences = text.replace(". ", ".|").split("|")
        cur = ""
        for s in sentences:
            if len(cur) + len(s) > MAX:
                if cur:
                    chunks.append(cur.strip())
                cur = s
            else:
                cur += s
        if cur.strip():
            chunks.append(cur.strip())

    all_bytes = b""
    for i, chunk in enumerate(chunks):
        payload = {
            "text": chunk,
            "target_language_code": "en-IN",
            "model": "bulbul:v3",
            "speaker": "shubh",
            "pace": 1.0,
            "speech_sample_rate": 24000,
        }
        resp = httpx.post(
            "https://api.sarvam.ai/text-to-speech",
            json=payload,
            headers={"api-subscription-key": SARVAM_API_KEY, "Content-Type": "application/json"},
            timeout=60.0,
        )
        resp.raise_for_status()
        audio_b64 = resp.json()["audios"][0]
        raw = base64.b64decode(audio_b64)
        if i == 0:
            all_bytes = raw
        else:
            all_bytes += raw[44:]  # skip WAV header on subsequent chunks

    out_wav.write_bytes(all_bytes)


def mux(video: Path, audio: Path, output: Path) -> None:
    cmd = [
        "ffmpeg", "-y",
        "-i", str(video),
        "-i", str(audio),
        "-map", "0:v:0", "-map", "1:a:0",
        "-c:v", "libx264", "-c:a", "aac",
        "-shortest",
        str(output),
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        raise RuntimeError(f"ffmpeg mux failed: {proc.stderr[-800:]}")


def get_duration(path: Path) -> float:
    cmd = ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)]
    return float(subprocess.check_output(cmd, text=True).strip())


def verify(path: Path) -> None:
    cmd = ["ffprobe", "-v", "error", "-show_entries", "stream=codec_type", "-of", "csv=p=0", str(path)]
    out = subprocess.check_output(cmd, text=True)
    assert "video" in out and "audio" in out, f"Missing streams in {path}"


def main() -> None:
    for filename, label, scene_code, narration in TOPICS:
        print(f"\n{'='*50}")
        print(f"Building: {label}")
        with tempfile.TemporaryDirectory(prefix="rebuild_") as td:
            td_path = Path(td)

            print("  Rendering Manim...")
            video = render_manim(scene_code, td_path)
            dur_v = get_duration(video)
            print(f"  Video duration: {dur_v:.1f}s")

            print("  Generating TTS...")
            wav = td_path / "voice.wav"
            sarvam_tts(narration, wav)
            dur_a = get_duration(wav)
            print(f"  Audio duration: {dur_a:.1f}s")

            print("  Muxing...")
            out = OUT_DIR / filename
            mux(video, wav, out)
            verify(out)
            final_dur = get_duration(out)
            print(f"  Final: {out}  ({final_dur:.1f}s)")

    print(f"\nDONE: All 3 videos rebuilt (40-50s with audio).")


if __name__ == "__main__":
    main()
