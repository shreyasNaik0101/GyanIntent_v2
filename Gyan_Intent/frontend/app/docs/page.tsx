"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";
import {
  BookOpen, Video, Hand, MessageCircle, Trophy, Brain, Globe, Zap,
  Code, Server, Shield, Users, TrendingUp, CheckCircle, ArrowRight,
  Mic, PenTool, BarChart3, Smartphone, Layers, Database,
  ChevronDown, ChevronRight as ChevronRightIcon, Copy, Check,
  Star, Building2, GraduationCap, Rocket, Heart, Clock, Calculator,
} from "lucide-react";

const fadeIn = { initial: { opacity: 0, y: 20 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true } };

// ─── Pricing Data ───
const pricingPlans = [
  {
    name: "Starter",
    price: "Free",
    period: "",
    description: "For individual learners and small classrooms",
    color: "from-gray-500 to-gray-600",
    border: "border-white/10",
    features: [
      "Up to 50 students",
      "5 AI video generations/month",
      "Basic gesture quiz",
      "Community support",
      "1 Telegram bot instance",
      "500 chat messages/month",
    ],
    cta: "Get Started Free",
    popular: false,
  },
  {
    name: "Pro",
    price: "₹2,499",
    period: "/month",
    description: "For schools and coaching institutes",
    color: "from-purple-500 to-pink-500",
    border: "border-purple-500/50",
    features: [
      "Up to 500 students",
      "100 AI video generations/month",
      "Advanced gesture + voice quiz",
      "Priority support",
      "5 Telegram bot instances",
      "10,000 chat messages/month",
      "Google Classroom integration",
      "Custom branding",
      "Analytics dashboard",
    ],
    cta: "Start Pro Trial",
    popular: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For universities and EdTech companies",
    color: "from-amber-500 to-orange-500",
    border: "border-amber-500/30",
    features: [
      "Unlimited students",
      "Unlimited AI video generations",
      "Full API access",
      "Dedicated account manager",
      "Unlimited Telegram bots",
      "Unlimited chat messages",
      "White-label solution",
      "Custom model training",
      "SLA guarantee (99.9%)",
      "On-premise deployment",
    ],
    cta: "Contact Sales",
    popular: false,
  },
];

// ─── API Pricing ───
const apiPricing = [
  { endpoint: "Video Generation", method: "POST", path: "/api/v1/video/generate", free: "5/mo", pro: "100/mo", enterprise: "Unlimited", perCall: "₹15" },
  { endpoint: "Chat Completion", method: "POST", path: "/api/v1/chat", free: "500/mo", pro: "10K/mo", enterprise: "Unlimited", perCall: "₹0.05" },
  { endpoint: "Speech-to-Text", method: "POST", path: "/api/v1/stt", free: "100/mo", pro: "5K/mo", enterprise: "Unlimited", perCall: "₹0.10" },
  { endpoint: "Text-to-Speech", method: "POST", path: "/api/v1/tts", free: "100/mo", pro: "5K/mo", enterprise: "Unlimited", perCall: "₹0.08" },
  { endpoint: "Draw & Solve", method: "POST", path: "/api/v1/solve", free: "50/mo", pro: "2K/mo", enterprise: "Unlimited", perCall: "₹0.20" },
  { endpoint: "Quiz Generation", method: "POST", path: "/api/v1/quiz/generate", free: "20/mo", pro: "500/mo", enterprise: "Unlimited", perCall: "₹0.50" },
];

// ─── Features ───
const features = [
  { icon: Video, title: "AI Video Generator", desc: "Generate Manim-powered educational animations for any concept in seconds. From calculus to chemistry.", color: "from-purple-500 to-pink-500" },
  { icon: Hand, title: "Gesture Quiz", desc: "Answer questions using hand gestures via webcam. Thumbs up/down for True/False — gamified learning.", color: "from-cyan-500 to-blue-500" },
  { icon: Mic, title: "Voice Assistant", desc: "Speak your questions, get AI answers read back in natural human voice. Powered by Sarvam AI.", color: "from-green-500 to-emerald-500" },
  { icon: PenTool, title: "Draw & Solve", desc: "Draw equations, chemical formulas, or diagrams on canvas. GPT-4o Vision identifies and solves them.", color: "from-amber-500 to-orange-500" },
  { icon: MessageCircle, title: "Telegram Bot", desc: "Access AI tutoring directly from Telegram. Get explanations, video links, and quiz questions on the go.", color: "from-blue-500 to-cyan-500" },
  { icon: BarChart3, title: "Progress Tracking", desc: "Track learning streaks, points, quiz scores. Google Classroom integration for real student data.", color: "from-red-500 to-pink-500" },
];


// ─── Scale Strategy ───
const scaleSteps = [
  { phase: "Phase 1", title: "Regional Pilot", timeline: "Months 1-3", desc: "Deploy in 10 rural schools across Karnataka. Validate Telegram bot engagement and voice assistant usage in low-connectivity areas.", metrics: ["500 active students", "80% retention rate", "10 schools onboarded"], icon: GraduationCap },
  { phase: "Phase 2", title: "State Expansion", timeline: "Months 4-8", desc: "Expand to 100 schools across 3 states. Add Hindi, Kannada, Tamil language support. Partner with state education boards.", metrics: ["10,000 students", "15 language models", "3 state partnerships"], icon: Globe },
  { phase: "Phase 3", title: "B2B SaaS Launch", timeline: "Months 9-14", desc: "Launch white-label platform for coaching institutes and EdTech companies. API marketplace for developers.", metrics: ["50 B2B clients", "₹50L ARR", "API marketplace live"], icon: Building2 },
  { phase: "Phase 4", title: "National Scale", timeline: "Months 15-24", desc: "Full India rollout with NEP 2020 alignment. Government partnerships for Digital India Education. Integrate with DIKSHA platform.", metrics: ["1M+ students", "₹5Cr ARR", "Government MoU"], icon: Rocket },
];

function CodeBlock({ code, language = "bash" }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative group">
      <pre className="bg-black/60 border border-white/10 rounded-xl p-4 overflow-x-auto text-sm font-mono">
        <code className={`text-green-400 language-${language}`}>{code}</code>
      </pre>
      <button
        onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
        className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition opacity-0 group-hover:opacity-100"
      >
        {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} className="text-white/60" />}
      </button>
    </div>
  );
}

function PricingCalculator() {
  const [students, setStudents] = useState(10000);
  const basePricePer10k = 50000; // ₹50,000 per 10,000 students per month
  const tiers = students > 100000 ? 0.85 : students > 50000 ? 0.9 : 1; // volume discounts
  const monthlyPrice = Math.ceil(students / 10000) * basePricePer10k * tiers;
  const yearlyPrice = monthlyPrice * 10; // 2 months free on yearly

  return (
    <div className="mt-6 p-4 rounded-xl bg-white/5 border border-white/10">
      <h4 className="font-semibold mb-3 flex items-center gap-2">
        <Calculator size={16} className="text-amber-400" /> Pricing Calculator
      </h4>
      <div className="space-y-3">
        <div>
          <label className="text-sm text-white/40 block mb-1">Number of Students</label>
          <input
            type="number"
            value={students}
            onChange={(e) => setStudents(Math.max(1, parseInt(e.target.value) || 0))}
            min="1"
            step="1000"
            className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white focus:border-purple-500/50 focus:outline-none"
          />
          <div className="flex gap-2 mt-2">
            <button onClick={() => setStudents(10000)} className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs transition">10K</button>
            <button onClick={() => setStudents(50000)} className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs transition">50K</button>
            <button onClick={() => setStudents(100000)} className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs transition">100K</button>
            <button onClick={() => setStudents(500000)} className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs transition">500K</button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="p-3 rounded-lg bg-black/40">
            <p className="text-white/40 text-xs">Monthly</p>
            <p className="text-xl font-bold text-amber-400">₹{monthlyPrice.toLocaleString("en-IN")}</p>
            <p className="text-xs text-white/30">≈ ₹{Math.round(monthlyPrice / students)} per student</p>
          </div>
          <div className="p-3 rounded-lg bg-black/40">
            <p className="text-white/40 text-xs">Yearly (2 months free)</p>
            <p className="text-xl font-bold text-green-400">₹{yearlyPrice.toLocaleString("en-IN")}</p>
            <p className="text-xs text-white/30">Save ₹{(monthlyPrice * 2).toLocaleString("en-IN")}</p>
          </div>
        </div>
        {students > 50000 && (
          <div className="text-xs text-green-400 p-2 rounded-lg bg-green-500/10 border border-green-500/20">
            🎉 Volume discount applied: {Math.round((1 - tiers) * 100)}% off
          </div>
        )}
      </div>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} className="text-white/60 hover:text-white transition text-sm">
      {children}
    </a>
  );
}

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState("overview");

  return (
    <div className="min-h-screen bg-black text-white">
      {/* ─── Navbar ─── */}
      <nav className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <BookOpen size={16} />
            </div>
            <span className="font-bold text-lg">Gyan Setu</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 font-medium">Docs</span>
          </Link>
          <div className="hidden md:flex items-center gap-6">
            <NavLink href="#overview">Overview</NavLink>
            <NavLink href="#features">Features</NavLink>
            <NavLink href="#api">API Reference</NavLink>
            <NavLink href="#pricing">Pricing</NavLink>
            <NavLink href="#scaling">Scale</NavLink>
            <Link href="/dashboard" className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-sm font-medium hover:opacity-90 transition">
              Launch App →
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 via-transparent to-transparent" />
        <div className="max-w-7xl mx-auto px-6 pt-20 pb-16 relative">
          <motion.div {...fadeIn} className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-sm mb-6">
              <Zap size={14} />
              AI-Powered Education Infrastructure
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
              Build the Future of
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-amber-400 bg-clip-text text-transparent"> Education</span>
            </h1>
            <p className="text-xl text-white/60 mb-8 leading-relaxed">
              Gyan Setu is an open education platform that bridges the digital divide with AI-powered
              video generation, voice assistants, gesture-based learning, and multilingual support —
              designed for India&apos;s 260M+ students.
            </p>
            <div className="flex items-center justify-center gap-4">
              <a href="#api" className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 font-semibold hover:opacity-90 transition flex items-center gap-2">
                <Code size={18} /> API Docs
              </a>
              <a href="#pricing" className="px-6 py-3 rounded-xl border border-white/20 font-semibold hover:bg-white/5 transition flex items-center gap-2">
                <BarChart3 size={18} /> View Pricing
              </a>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div {...fadeIn} transition={{ delay: 0.2 }} className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16 max-w-4xl mx-auto">
            {[
              { value: "6+", label: "AI Features", icon: Brain },
              { value: "22+", label: "Indian Languages", icon: Globe },
              { value: "< 3s", label: "Voice Response", icon: Mic },
              { value: "99.9%", label: "Uptime SLA", icon: Shield },
            ].map((s, i) => (
              <div key={i} className="glass-panel p-5 rounded-2xl text-center border border-white/5">
                <s.icon size={20} className="mx-auto mb-2 text-purple-400" />
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-white/40">{s.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-20">
        <motion.div {...fadeIn} className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">Platform Features</h2>
          <p className="text-white/50 max-w-2xl mx-auto">Everything you need to build engaging, accessible educational experiences at scale.</p>
        </motion.div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <motion.div key={i} {...fadeIn} transition={{ delay: i * 0.1 }} className="glass-panel p-6 rounded-2xl border border-white/5 hover:border-purple-500/30 transition group">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-4 group-hover:scale-110 transition`}>
                <f.icon size={22} />
              </div>
              <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-white/50 text-sm leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      
      {/* ─── API Reference ─── */}
      <section id="api" className="max-w-7xl mx-auto px-6 py-20">
        <motion.div {...fadeIn} className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">API Reference</h2>
          <p className="text-white/50 max-w-2xl mx-auto">RESTful APIs for every feature. Integrate Gyan Setu into your own platform.</p>
        </motion.div>

        {/* Auth Example */}
        <motion.div {...fadeIn} className="mb-10">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Shield size={20} className="text-green-400" /> Authentication
          </h3>
          <p className="text-white/50 text-sm mb-4">All API requests require a Bearer token. Get your API key from the dashboard.</p>
          <CodeBlock code={`curl -X POST https://api.gyansetu.in/v1/chat \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"messages": [{"role": "user", "content": "Explain photosynthesis"}]}'`} />
        </motion.div>

        {/* Endpoints */}
        <div className="space-y-4">
          {apiPricing.map((api, i) => (
            <motion.div key={i} {...fadeIn} transition={{ delay: i * 0.05 }} className="glass-panel rounded-xl border border-white/5 overflow-hidden">
              <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${api.method === "POST" ? "bg-green-500/20 text-green-400" : "bg-blue-500/20 text-blue-400"}`}>
                    {api.method}
                  </span>
                  <div>
                    <p className="font-semibold">{api.endpoint}</p>
                    <p className="text-sm text-white/40 font-mono">{api.path}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <div className="text-center">
                    <p className="text-white/40 text-xs">Free</p>
                    <p className="font-medium">{api.free}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-purple-400 text-xs">Pro</p>
                    <p className="font-medium">{api.pro}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-amber-400 text-xs">Enterprise</p>
                    <p className="font-medium">{api.enterprise}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-white/40 text-xs">Per Call</p>
                    <p className="font-semibold text-green-400">{api.perCall}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Code Examples */}
        <div className="mt-12 grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2"><Video size={16} className="text-purple-400" /> Video Generation</h4>
            <CodeBlock language="python" code={`import requests

response = requests.post(
  "https://api.gyansetu.in/v1/video/generate",
  headers={"Authorization": "Bearer YOUR_KEY"},
  json={
    "topic": "Pythagorean Theorem",
    "style": "manim",
    "language": "en",
    "duration": 60
  }
)

video_url = response.json()["video_url"]
print(f"Video ready: {video_url}")`} />
          </div>
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2"><Mic size={16} className="text-green-400" /> Voice Chat</h4>
            <CodeBlock language="javascript" code={`const response = await fetch(
  "https://api.gyansetu.in/v1/voice/chat",
  {
    method: "POST",
    headers: {
      "Authorization": "Bearer YOUR_KEY",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      audio_base64: audioData,
      language: "hi-IN",
      respond_with_audio: true
    })
  }
);

const { transcript, reply, audio } = 
  await response.json();`} />
          </div>
        </div>
      </section>

      {/* ─── Pricing ─── */}
      <section id="pricing" className="max-w-7xl mx-auto px-6 py-20">
        <motion.div {...fadeIn} className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">Simple, Transparent Pricing</h2>
          <p className="text-white/50 max-w-2xl mx-auto">Start free, scale as you grow. No hidden fees. Education-first pricing for Indian institutions.</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {pricingPlans.map((plan, i) => (
            <motion.div
              key={i}
              {...fadeIn}
              transition={{ delay: i * 0.1 }}
              className={`relative glass-panel rounded-2xl border ${plan.border} p-8 ${plan.popular ? "scale-105 shadow-2xl shadow-purple-500/10" : ""}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-xs font-bold">
                  Most Popular
                </div>
              )}
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${plan.color} flex items-center justify-center mb-4`}>
                {i === 0 ? <Star size={20} /> : i === 1 ? <Zap size={20} /> : <Building2 size={20} />}
              </div>
              <h3 className="text-xl font-bold">{plan.name}</h3>
              <p className="text-white/40 text-sm mb-4">{plan.description}</p>
              <div className="mb-6">
                <span className="text-4xl font-bold">{plan.price}</span>
                <span className="text-white/40">{plan.period}</span>
              </div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((f, j) => (
                  <li key={j} className="flex items-center gap-2 text-sm">
                    <CheckCircle size={14} className="text-green-400 shrink-0" />
                    <span className="text-white/70">{f}</span>
                  </li>
                ))}
              </ul>
              {i === 2 && <PricingCalculator />}
              <button className={`w-full py-3 rounded-xl font-semibold transition ${
                plan.popular
                  ? "bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90"
                  : "border border-white/20 hover:bg-white/5"
              }`}>
                {plan.cta}
              </button>
            </motion.div>
          ))}
        </div>

        {/* API Pay-as-you-go */}
        <motion.div {...fadeIn} className="mt-12 glass-panel rounded-2xl border border-white/5 p-8 max-w-3xl mx-auto text-center">
          <h3 className="text-xl font-bold mb-2">Pay-as-you-go API Access</h3>
          <p className="text-white/50 text-sm mb-4">Need just the APIs? Pay per call with no monthly commitment.</p>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="p-3 rounded-xl bg-white/5">
              <p className="text-2xl font-bold text-purple-400">₹0.05</p>
              <p className="text-white/40">per chat message</p>
            </div>
            <div className="p-3 rounded-xl bg-white/5">
              <p className="text-2xl font-bold text-green-400">₹0.10</p>
              <p className="text-white/40">per voice call</p>
            </div>
            <div className="p-3 rounded-xl bg-white/5">
              <p className="text-2xl font-bold text-amber-400">₹15</p>
              <p className="text-white/40">per video gen</p>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ─── Scaling Strategy ─── */}
      <section id="scaling" className="max-w-7xl mx-auto px-6 py-20">
        <motion.div {...fadeIn} className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">Scaling Roadmap</h2>
          <p className="text-white/50 max-w-2xl mx-auto">From 10 schools to 1 million students — our phased approach to scaling Gyan Setu across India.</p>
        </motion.div>

        <div className="space-y-8 max-w-4xl mx-auto">
          {scaleSteps.map((step, i) => (
            <motion.div key={i} {...fadeIn} transition={{ delay: i * 0.1 }} className="flex gap-6">
              {/* Timeline */}
              <div className="flex flex-col items-center shrink-0">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${
                  i === 0 ? "from-blue-500 to-cyan-500" :
                  i === 1 ? "from-green-500 to-emerald-500" :
                  i === 2 ? "from-purple-500 to-pink-500" :
                  "from-amber-500 to-orange-500"
                } flex items-center justify-center`}>
                  <step.icon size={24} />
                </div>
                {i < scaleSteps.length - 1 && <div className="w-0.5 flex-1 bg-white/10 mt-2" />}
              </div>

              {/* Content */}
              <div className="glass-panel p-6 rounded-2xl border border-white/5 flex-1 mb-2">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-400 font-medium">{step.phase}</span>
                  <span className="text-xs text-white/40 flex items-center gap-1"><Clock size={12} /> {step.timeline}</span>
                </div>
                <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                <p className="text-white/50 text-sm mb-4 leading-relaxed">{step.desc}</p>
                <div className="flex flex-wrap gap-2">
                  {step.metrics.map((m, j) => (
                    <span key={j} className="text-xs px-3 py-1.5 rounded-full bg-white/5 text-white/60 border border-white/10">
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── Business Model ─── */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <motion.div {...fadeIn} className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">Revenue Streams</h2>
          <p className="text-white/50 max-w-2xl mx-auto">Multiple monetization paths for sustainable growth.</p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: Layers, title: "SaaS Subscriptions", desc: "Monthly/annual plans for schools, coaching centers, and universities. Tiered pricing based on student count.", revenue: "₹2,499 - Custom/mo", color: "from-purple-500 to-pink-500" },
            { icon: Code, title: "API Marketplace", desc: "Pay-per-call API access for EdTech developers. Video gen, STT, TTS, quiz APIs.", revenue: "₹0.05 - ₹15/call", color: "from-blue-500 to-cyan-500" },
            { icon: Building2, title: "White-Label", desc: "Fully branded solution for large institutions. Custom deployment, training, and support.", revenue: "₹5L - ₹25L/year", color: "from-amber-500 to-orange-500" },
            { icon: Globe, title: "Government Contracts", desc: "Partner with state/central education boards. NEP 2020 aligned digital learning infrastructure.", revenue: "₹1Cr+ per contract", color: "from-green-500 to-emerald-500" },
          ].map((r, i) => (
            <motion.div key={i} {...fadeIn} transition={{ delay: i * 0.1 }} className="glass-panel p-6 rounded-2xl border border-white/5">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${r.color} flex items-center justify-center mb-4`}>
                <r.icon size={22} />
              </div>
              <h3 className="font-semibold mb-2">{r.title}</h3>
              <p className="text-white/50 text-sm mb-3">{r.desc}</p>
              <p className="text-sm font-semibold text-green-400">{r.revenue}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <motion.div {...fadeIn} className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-900/50 via-pink-900/30 to-purple-900/50 border border-purple-500/20 p-12 text-center">
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
          <div className="relative z-10">
            <h2 className="text-4xl font-bold mb-4">Ready to Transform Education?</h2>
            <p className="text-white/60 text-lg mb-8 max-w-xl mx-auto">
              Join schools and institutions already using Gyan Setu to make quality education accessible to every student.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link href="/dashboard" className="px-8 py-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 font-semibold text-lg hover:opacity-90 transition flex items-center gap-2">
                Start Building <ArrowRight size={20} />
              </Link>
              <a href="mailto:contact@gyansetu.in" className="px-8 py-4 rounded-xl border border-white/20 font-semibold text-lg hover:bg-white/5 transition">
                Contact Sales
              </a>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-white/10 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <BookOpen size={16} />
                </div>
                <span className="font-bold">Gyan Setu</span>
              </div>
              <p className="text-sm text-white/40">Bridging the digital divide in education with AI.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm">Product</h4>
              <div className="space-y-2 text-sm text-white/40">
                <p><a href="#features" className="hover:text-white transition">Features</a></p>
                <p><a href="#pricing" className="hover:text-white transition">Pricing</a></p>
                <p><a href="#api" className="hover:text-white transition">API Docs</a></p>
                <p><Link href="/dashboard" className="hover:text-white transition">Dashboard</Link></p>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm">Company</h4>
              <div className="space-y-2 text-sm text-white/40">
                <p><a href="#scaling" className="hover:text-white transition">Roadmap</a></p>
                <p><a href="#" className="hover:text-white transition">Blog</a></p>
                <p><a href="#" className="hover:text-white transition">Careers</a></p>
                <p><a href="mailto:contact@gyansetu.in" className="hover:text-white transition">Contact</a></p>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm">Legal</h4>
              <div className="space-y-2 text-sm text-white/40">
                <p><a href="#" className="hover:text-white transition">Privacy Policy</a></p>
                <p><a href="#" className="hover:text-white transition">Terms of Service</a></p>
                <p><a href="#" className="hover:text-white transition">Data Processing</a></p>
              </div>
            </div>
          </div>
          <div className="border-t border-white/10 pt-6 space-y-3">
            <div className="flex flex-col md:flex-row items-center justify-between text-sm text-white/30">
              <p>&copy; 2026 Gyan Setu. Built with ❤️ for India&apos;s students.</p>
              <p className="flex items-center gap-1">Powered by <span className="text-purple-400">Sarvam AI</span> &middot; <span className="text-green-400">OpenAI</span> &middot; <span className="text-cyan-400">Next.js</span></p>
            </div>
            <div className="text-center text-sm text-white/40">
              <p className="flex items-center justify-center gap-2">
                Made with <Heart size={14} className="text-red-400 fill-red-400" /> by 
                <span className="text-purple-400">Shreyas</span>, 
                <span className="text-pink-400">Mahi</span>, 
                <span className="text-cyan-400">Gaurav</span>, 
                <span className="text-green-400">Anshul</span>, 
                <span className="text-amber-400">Manvi</span>, 
                <span className="text-blue-400">Swayam</span>
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
