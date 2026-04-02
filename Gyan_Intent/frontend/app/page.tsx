"use client";

import { Sparkles, Hand, Video, MessageCircle, PenTool, Brain, Globe, Play } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";

const Hero3D = dynamic(() => import("@/components/Hero3D"), { ssr: false });

// Fixed particle positions to avoid hydration mismatch
const PARTICLE_SEEDS = [
  { x: 10, y: 15, duration: 7, delay: 0.5 },
  { x: 25, y: 80, duration: 8, delay: 1.2 },
  { x: 45, y: 30, duration: 6, delay: 2.0 },
  { x: 60, y: 65, duration: 9, delay: 0.8 },
  { x: 80, y: 20, duration: 7, delay: 1.5 },
  { x: 15, y: 50, duration: 8, delay: 2.5 },
  { x: 35, y: 85, duration: 6, delay: 0.3 },
  { x: 55, y: 40, duration: 9, delay: 1.8 },
  { x: 70, y: 70, duration: 7, delay: 2.2 },
  { x: 90, y: 25, duration: 8, delay: 0.7 },
  { x: 5, y: 60, duration: 6, delay: 1.0 },
  { x: 40, y: 10, duration: 9, delay: 2.8 },
  { x: 65, y: 55, duration: 7, delay: 0.2 },
  { x: 85, y: 75, duration: 8, delay: 1.6 },
  { x: 20, y: 35, duration: 6, delay: 2.3 },
];

export default function Home() {

  return (
    <main className="min-h-screen bg-black text-white overflow-hidden">
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center">
        {/* 3D Background (lazy loaded) */}
        <Hero3D />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-[1]" />

        <div className="relative z-10 text-center px-4">
          {/* Logo / Title */}
          <h1 className="text-6xl md:text-8xl font-bold mb-4">
            <span className="gradient-text">Gyan_</span>
            <span className="text-white">Intent</span>
          </h1>

          {/* Tagline */}
          <p className="text-xl md:text-2xl text-white/60 mb-8">
            From Gesture to Genius — The Intent-Aware Learning Engine
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/magic-learn/draw-in-air"
              className="glass-button px-8 py-4 rounded-full text-lg font-semibold flex items-center justify-center gap-2"
            >
              <Hand size={24} />
              Start Learning
            </Link>
            <Link
              href="/dashboard"
              className="px-8 py-4 rounded-full text-lg font-semibold border border-white/20 hover:bg-white/5 transition flex items-center justify-center gap-2"
            >
              <Sparkles size={24} />
              Explore
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <h2
            className="text-4xl md:text-5xl font-bold text-center mb-16 gradient-text"
          >
            Revolutionary Features
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div
              className="glass-panel p-8 rounded-2xl"
            >
              <div className="w-14 h-14 bg-purple-500/20 rounded-xl flex items-center justify-center mb-6">
                <Hand className="text-purple-400" size={28} />
              </div>
              <h3 className="text-xl font-semibold mb-3">Gesture Control</h3>
              <p className="text-white/60">
                Learn hands-free with MediaPipe hand tracking. Draw in the air, 
                control videos with gestures, and take quizzes without touching a screen.
              </p>
            </div>

            {/* Feature 2 */}
            <div
              className="glass-panel p-8 rounded-2xl"
            >
              <div className="w-14 h-14 bg-cyan-500/20 rounded-xl flex items-center justify-center mb-6">
                <Video className="text-cyan-400" size={28} />
              </div>
              <h3 className="text-xl font-semibold mb-3">Generative Video</h3>
              <p className="text-white/60">
                AI-generated educational videos on-demand using Manim. 
                Custom explanations in Hinglish, tailored to your learning style.
              </p>
            </div>

            {/* Feature 3 */}
            <div
              className="glass-panel p-8 rounded-2xl"
            >
              <div className="w-14 h-14 bg-amber-500/20 rounded-xl flex items-center justify-center mb-6">
                <MessageCircle className="text-amber-400" size={28} />
              </div>
              <h3 className="text-xl font-semibold mb-3">WhatsApp Bot</h3>
              <p className="text-white/60">
                WhatsApp integration for instant learning. Send a photo of your 
                doubt, get a video explanation back — no app installation needed.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="relative py-32 px-4 overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] bg-cyan-500/8 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-20">
            <p className="text-sm uppercase tracking-[0.3em] text-purple-400 mb-4 font-medium">Simple & Powerful</p>
            <h2 className="text-4xl md:text-6xl font-bold gradient-text">
              How It Works
            </h2>
          </div>

          <div className="relative">
            {/* Vertical timeline line */}
            <div className="absolute left-[28px] md:left-1/2 md:-translate-x-px top-0 bottom-0 w-[2px] bg-gradient-to-b from-purple-500/0 via-purple-500/50 to-cyan-500/0" />

            {[
              {
                step: "1",
                title: "Express Your Intent",
                desc: "Draw in the air, speak your doubts, type a question, or snap a photo — any modality, one platform.",
                icon: PenTool,
                color: "purple",
                gradient: "from-purple-500 to-violet-600",
                glow: "group-hover:shadow-purple-500/25",
                iconBg: "bg-purple-500/15 group-hover:bg-purple-500/25",
              },
              {
                step: "2",
                title: "AI Understands",
                desc: "LangGraph multi-agent system intelligently routes your query to the right expert team.",
                icon: Brain,
                color: "cyan",
                gradient: "from-cyan-500 to-blue-600",
                glow: "group-hover:shadow-cyan-500/25",
                iconBg: "bg-cyan-500/15 group-hover:bg-cyan-500/25",
              },
              {
                step: "3",
                title: "Learn Your Way",
                desc: "Get personalized explanations in your language — Hinglish, Hindi, or English, your choice.",
                icon: Globe,
                color: "amber",
                gradient: "from-amber-500 to-orange-600",
                glow: "group-hover:shadow-amber-500/25",
                iconBg: "bg-amber-500/15 group-hover:bg-amber-500/25",
              },
              {
                step: "4",
                title: "Generate Video",
                desc: "Watch a custom Manim animation that visually explains the concept, generated just for you.",
                icon: Play,
                color: "emerald",
                gradient: "from-emerald-500 to-teal-600",
                glow: "group-hover:shadow-emerald-500/25",
                iconBg: "bg-emerald-500/15 group-hover:bg-emerald-500/25",
              },
            ].map((item, i) => (
              <div
                key={i}
                className={`relative flex items-center mb-16 last:mb-0 ${
                  i % 2 === 0
                    ? "md:flex-row md:pr-[calc(50%+40px)]"
                    : "md:flex-row-reverse md:pl-[calc(50%+40px)]"
                }`}
              >
                {/* Timeline node */}
                <div className="absolute left-[28px] md:left-1/2 md:-translate-x-1/2 z-10">
                  <div className={`w-[14px] h-[14px] rounded-full bg-gradient-to-br ${item.gradient} ring-4 ring-black/80`} />
                </div>

                {/* Card */}
                <div
                  className={`group ml-16 md:ml-0 flex-1 glass-panel p-6 md:p-8 rounded-2xl transition-all duration-500 hover:border-white/20 hover:shadow-2xl ${item.glow} cursor-default`}
                >
                  <div className="flex items-start gap-5">
                    {/* Icon */}
                    <div
                      className={`flex-shrink-0 w-14 h-14 rounded-xl ${item.iconBg} flex items-center justify-center transition-all duration-500`}
                    >
                      <item.icon className="w-7 h-7 text-white/90" />
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Step label */}
                      <span className={`text-xs font-bold uppercase tracking-widest bg-gradient-to-r ${item.gradient} bg-clip-text text-transparent`}>
                        Step {item.step}
                      </span>
                      <h3 className="text-xl md:text-2xl font-bold mt-1 mb-2 text-white">
                        {item.title}
                      </h3>
                      <p className="text-white/50 leading-relaxed text-sm md:text-base">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-white/10">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-white/40">
            Gyan_Intent — Making education accessible to everyone
          </p>
        </div>
      </footer>
    </main>
  );
}
