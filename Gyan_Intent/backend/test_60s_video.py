from manim import *
import numpy as np

class ConceptScene(Scene):
    def construct(self):
        # SECTION 1: Title (0-5s)
        title = Text("Photosynthesis", font_size=52)
        title.set_color_by_gradient(GREEN, YELLOW)
        self.play(Write(title), run_time=2)
        self.play(title.animate.to_edge(UP), run_time=1)
        subtitle = Text("How Plants Make Food", font_size=28)
        subtitle.next_to(title, DOWN)
        self.play(FadeIn(subtitle), run_time=1)
        self.wait(1)
        
        # SECTION 2: Sun and light energy (5-15s)
        self.play(FadeOut(subtitle))
        
        sun = Circle(radius=0.8, color=YELLOW, fill_opacity=0.8)
        sun.shift(UP*2.5 + LEFT*5)
        self.play(Create(sun), run_time=1.5)
        
        rays = VGroup()
        for i in range(12):
            angle = i * PI / 6
            ray = Line(sun.get_center(), sun.get_center() + 1.2 * np.array([np.cos(angle), np.sin(angle), 0]), color=YELLOW, stroke_width=3)
            rays.add(ray)
        self.play(Create(rays), run_time=1.5)
        
        light_label = Text("Light Energy", font_size=20, color=YELLOW)
        light_label.next_to(sun, RIGHT)
        self.play(Write(light_label), run_time=1)
        
        # SECTION 3: Plant structure (15-25s)
        ground = Rectangle(width=14, height=0.5, color=MAROON_B, fill_opacity=0.5)
        ground.to_edge(DOWN)
        self.play(Create(ground), run_time=1)
        
        stem = Rectangle(width=0.3, height=2.5, color=GREEN_D, fill_opacity=0.8)
        stem.shift(DOWN*1.5)
        self.play(Create(stem), run_time=1)
        
        leaf1 = Ellipse(width=2, height=1, color=GREEN, fill_opacity=0.7)
        leaf1.rotate(PI/6)
        leaf1.shift(UP*0.5 + LEFT*0.8)
        leaf2 = Ellipse(width=2, height=1, color=GREEN, fill_opacity=0.7)
        leaf2.rotate(-PI/6)
        leaf2.shift(UP*0.5 + RIGHT*0.8)
        self.play(Create(leaf1), Create(leaf2), run_time=1.5)
        
        chloro_label = Text("Chloroplast", font_size=18, color=GREEN)
        chloro_label.shift(UP*0.5)
        self.play(Write(chloro_label), run_time=1)
        
        # SECTION 4: Inputs - CO2 and H2O (25-35s)
        co2_molecules = VGroup()
        for i, pos in enumerate([LEFT*4 + UP*1, LEFT*5 + UP*0.5, LEFT*4.5 + UP*1.5]):
            co2 = MathTex("CO_2", font_size=22, color=BLUE)
            co2.move_to(pos)
            co2_molecules.add(co2)
        self.play(Write(co2_molecules), run_time=2)
        
        arrow_co2 = Arrow(LEFT*3.5 + UP*0.5, leaf1.get_left(), color=BLUE)
        self.play(Create(arrow_co2), run_time=1)
        
        h2o = MathTex("H_2O", font_size=22, color=TEAL)
        h2o.shift(DOWN*2 + RIGHT*2)
        self.play(Write(h2o), run_time=1)
        
        arrow_h2o = Arrow(h2o.get_top() + UP*0.3, stem.get_bottom() + RIGHT*0.5, color=TEAL)
        self.play(Create(arrow_h2o), run_time=1)
        
        water_label = Text("Water from roots", font_size=16, color=TEAL)
        water_label.next_to(h2o, RIGHT)
        self.play(Write(water_label), run_time=0.5)
        
        # SECTION 5: Outputs - Glucose and O2 (35-45s)
        transform_arrow = Arrow(leaf2.get_right(), RIGHT*3, color=WHITE)
        self.play(Create(transform_arrow), run_time=1)
        
        glucose = MathTex("C_6H_{12}O_6", font_size=24, color=YELLOW)
        glucose.shift(RIGHT*4)
        glucose_label = Text("Glucose (Food)", font_size=16, color=YELLOW)
        glucose_label.next_to(glucose, DOWN)
        self.play(Write(glucose), Write(glucose_label), run_time=2)
        
        o2 = MathTex("O_2", font_size=24, color=BLUE)
        o2.shift(RIGHT*4 + UP*1.5)
        o2_label = Text("Oxygen", font_size=16, color=BLUE)
        o2_label.next_to(o2, RIGHT)
        self.play(Write(o2), Write(o2_label), run_time=1.5)
        
        # SECTION 6: Chemical Equation (45-55s)
        self.play(FadeOut(co2_molecules), FadeOut(arrow_co2), FadeOut(h2o), FadeOut(arrow_h2o), FadeOut(water_label), FadeOut(transform_arrow))
        
        equation = MathTex("6CO_2 + 6H_2O", "\\xrightarrow{light}", "C_6H_{12}O_6 + 6O_2")
        equation.scale(0.8)
        equation.to_edge(DOWN)
        equation.shift(UP*0.5)
        box = SurroundingRectangle(equation, color=WHITE, buff=0.2)
        self.play(Write(equation), Create(box), run_time=2)
        
        # SECTION 7: Summary (55-60s)
        summary = Text("Plants convert light energy into chemical energy!", font_size=24)
        summary.to_edge(DOWN)
        self.play(Write(summary), run_time=2)
        
        self.wait(2)
        
        self.play(*[FadeOut(mob) for mob in self.mobjects])
        final = Text("Photosynthesis", font_size=64)
        final.set_color_by_gradient(GREEN, YELLOW)
        self.play(Write(final), run_time=2)
        self.wait(1)
